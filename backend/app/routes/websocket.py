"""
WebSocket endpoint for real-time chat with heartbeat and stability features.
"""
import asyncio
import json
import logging
import uuid
from datetime import datetime
from collections import OrderedDict
from typing import Optional, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status

from app.database import SessionLocal
from app.core.security import verify_token
from app.models.call import Call
from app.models.message import Message
from app.services.claude_ai import ClaudeService
from app.services.calls import CallService

logger = logging.getLogger(__name__)
router = APIRouter()
claude_service = ClaudeService()

# Configuration
HEARTBEAT_INTERVAL = 30  # seconds
HEARTBEAT_TIMEOUT = 10   # seconds to wait for pong
MESSAGE_DEDUP_SIZE = 1000  # max messages to track for deduplication


class LRUSet:
    """LRU-based set for message deduplication with bounded memory."""

    def __init__(self, maxsize: int = MESSAGE_DEDUP_SIZE):
        self._maxsize = maxsize
        self._data: OrderedDict = OrderedDict()

    def add(self, item: str) -> bool:
        """Add item, return True if new, False if duplicate."""
        if item in self._data:
            # Move to end (most recently used)
            self._data.move_to_end(item)
            return False

        self._data[item] = True
        while len(self._data) > self._maxsize:
            self._data.popitem(last=False)
        return True

    def __contains__(self, item: str) -> bool:
        return item in self._data


class ConnectionState:
    """State for a single WebSocket connection."""

    def __init__(self, websocket: WebSocket, call_id: int):
        self.websocket = websocket
        self.call_id = call_id
        self.last_pong: datetime = datetime.utcnow()
        self.seen_messages: LRUSet = LRUSet()
        self.lock: asyncio.Lock = asyncio.Lock()
        self.closed: bool = False


class ConnectionManager:
    """Manages WebSocket connections with heartbeat support."""

    def __init__(self):
        self.connections: dict[int, ConnectionState] = {}

    async def connect(self, websocket: WebSocket, call_id: int) -> ConnectionState:
        await websocket.accept()
        state = ConnectionState(websocket, call_id)
        self.connections[call_id] = state
        logger.info(f"WebSocket connected: call_id={call_id}")
        return state

    def disconnect(self, call_id: int):
        if call_id in self.connections:
            self.connections[call_id].closed = True
            del self.connections[call_id]
            logger.info(f"WebSocket disconnected: call_id={call_id}")

    def get(self, call_id: int) -> Optional[ConnectionState]:
        return self.connections.get(call_id)

    async def send_message(self, state: ConnectionState, message: dict):
        """Send message with lock to prevent race conditions."""
        if state.closed:
            return

        async with state.lock:
            try:
                await state.websocket.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send message: {e}")
                state.closed = True


manager = ConnectionManager()


async def heartbeat_loop(state: ConnectionState):
    """Send periodic ping messages and check for timeout."""
    while not state.closed:
        try:
            await asyncio.sleep(HEARTBEAT_INTERVAL)

            if state.closed:
                break

            # Check if last pong is too old
            elapsed = (datetime.utcnow() - state.last_pong).total_seconds()
            if elapsed > HEARTBEAT_INTERVAL + HEARTBEAT_TIMEOUT:
                logger.warning(f"Heartbeat timeout for call_id={state.call_id}")
                state.closed = True
                try:
                    await state.websocket.close(code=status.WS_1002_PROTOCOL_ERROR)
                except Exception:
                    pass
                break

            # Send ping
            await manager.send_message(state, {
                "type": "ping",
                "timestamp": datetime.utcnow().isoformat(),
            })

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Heartbeat error: {e}")
            break


@router.websocket("/ws/{call_id}")
async def websocket_endpoint(websocket: WebSocket, call_id: int, token: str = Query(...)):
    """WebSocket endpoint for real-time chat with Claude AI."""

    # Verify token
    payload = verify_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    scope = payload.get("scope")
    token_type = payload.get("type")

    db = SessionLocal()
    heartbeat_task: Optional[asyncio.Task] = None
    state: Optional[ConnectionState] = None

    try:
        # Verify call exists
        call = db.query(Call).filter(Call.id == call_id).first()
        if not call:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Authorization check based on scope
        if scope == "elderly" and token_type == "device_access":
            # Elderly device token: verify call belongs to this elderly
            elderly_id = int(payload.get("sub"))
            if call.elderly_id != elderly_id:
                logger.warning(f"Elderly {elderly_id} tried to access call {call_id} for elderly {call.elderly_id}")
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

            # Update device last_used_at
            device_id = payload.get("device_id")
            if device_id:
                from app.models.elderly_device import ElderlyDevice
                device = db.query(ElderlyDevice).filter(ElderlyDevice.id == device_id).first()
                if device:
                    device.last_used_at = datetime.utcnow()
                    db.commit()

        elif scope == "caregiver":
            # Caregiver access token: verify call's elderly belongs to this caregiver
            user_id = int(payload.get("sub"))
            from app.models.elderly import Elderly
            elderly = db.query(Elderly).filter(
                Elderly.id == call.elderly_id,
                Elderly.caregiver_id == user_id
            ).first()
            if not elderly:
                logger.warning(f"User {user_id} tried to access call {call_id} without permission")
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
        else:
            # Unknown scope or legacy token without scope - allow for backward compatibility
            # but log a warning
            logger.warning(f"Token without scope accessing call {call_id}")

        # Update call status from pending/scheduled to in_progress
        if call.status in ("pending", "scheduled"):
            call.status = "in_progress"
            call.started_at = datetime.utcnow()
            db.commit()

        # Connect and start heartbeat
        state = await manager.connect(websocket, call_id)
        heartbeat_task = asyncio.create_task(heartbeat_loop(state))

        # Send existing messages
        existing_messages = db.query(Message)\
            .filter(Message.call_id == call_id)\
            .order_by(Message.created_at)\
            .all()

        messages_list = [
            {"role": m.role, "content": m.content}
            for m in existing_messages
        ]

        for msg in existing_messages:
            await manager.send_message(state, {
                "type": "history",
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
            })

        # Get elderly context for personalized responses (used throughout the call)
        from app.models.elderly import Elderly
        elderly = db.query(Elderly).filter(Elderly.id == call.elderly_id).first()

        elderly_context = ""
        if elderly:
            elderly_context = f"{elderly.name}"
            if elderly.age:
                elderly_context += f", {elderly.age}세"
            if elderly.health_condition:
                elderly_context += f", 건강상태: {elderly.health_condition}"

        # Send initial greeting if this is a new call (no existing messages)
        if not existing_messages:

            # Generate initial greeting from AI
            logger.info(f"Generating initial greeting for call {call_id}, elderly: {elderly_context}")

            greeting_response = ""
            response_id = str(uuid.uuid4())

            # Use empty message list with is_greeting=True to get initial greeting
            async for chunk in claude_service.stream_chat_response(
                [],
                elderly_context=elderly_context,
                is_greeting=True
            ):
                if state.closed:
                    break

                await manager.send_message(state, {
                    "type": "stream_chunk",
                    "response_id": response_id,
                    "role": "assistant",
                    "content": chunk,
                })
                greeting_response += chunk

            if not state.closed and greeting_response:
                # Save greeting message
                CallService.save_message(db, call_id, "assistant", greeting_response)
                messages_list.append({"role": "assistant", "content": greeting_response})

                # Send stream end
                await manager.send_message(state, {
                    "type": "stream_end",
                    "response_id": response_id,
                    "role": "assistant",
                    "content": greeting_response,
                    "is_streaming": False,
                })

                logger.info(f"Initial greeting sent for call {call_id}: {greeting_response[:50]}...")

        # Main message loop
        while not state.closed:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=HEARTBEAT_INTERVAL + HEARTBEAT_TIMEOUT + 5
                )
            except asyncio.TimeoutError:
                logger.warning(f"Receive timeout for call_id={call_id}")
                break

            try:
                message_data = json.loads(data)
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received: {data[:100]}")
                continue

            msg_type = message_data.get("type")
            msg_id = message_data.get("message_id")

            # Handle pong response
            if msg_type == "pong":
                state.last_pong = datetime.utcnow()
                continue

            # Handle ping from client
            if msg_type == "ping":
                await manager.send_message(state, {
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat(),
                })
                continue

            # Handle chat message
            if msg_type == "message":
                # Deduplication check
                if msg_id and not state.seen_messages.add(msg_id):
                    logger.debug(f"Duplicate message ignored: {msg_id}")
                    # Send ack anyway
                    await manager.send_message(state, {
                        "type": "ack",
                        "message_id": msg_id,
                    })
                    continue

                user_message = message_data.get("content", "").strip()
                if not user_message:
                    continue

                # Send ack
                if msg_id:
                    await manager.send_message(state, {
                        "type": "ack",
                        "message_id": msg_id,
                    })

                # Save user message
                CallService.save_message(db, call_id, "user", user_message)
                messages_list.append({"role": "user", "content": user_message})

                # Echo user message
                await manager.send_message(state, {
                    "type": "message",
                    "role": "user",
                    "content": user_message,
                    "is_streaming": False,
                })

                # Stream Claude response with elderly context
                full_response = ""
                response_id = str(uuid.uuid4())

                async for chunk in claude_service.stream_chat_response(
                    messages_list,
                    elderly_context=elderly_context
                ):
                    if state.closed:
                        break

                    await manager.send_message(state, {
                        "type": "stream_chunk",
                        "response_id": response_id,
                        "role": "assistant",
                        "content": chunk,
                    })
                    full_response += chunk

                if not state.closed and full_response:
                    # Check for [CALL_END] marker (AI detected user wants to end call)
                    call_end_detected = "[CALL_END]" in full_response
                    clean_response = full_response.replace("[CALL_END]", "").strip()

                    # Save assistant response (without marker)
                    CallService.save_message(db, call_id, "assistant", clean_response)
                    messages_list.append({"role": "assistant", "content": clean_response})

                    # Send stream end with cleaned content (for TTS)
                    await manager.send_message(state, {
                        "type": "stream_end",
                        "response_id": response_id,
                        "role": "assistant",
                        "content": clean_response,
                        "is_streaming": False,
                        "call_end_detected": call_end_detected,
                    })

                    # Auto-end call if AI detected end intent
                    if call_end_detected:
                        logger.info(f"AI detected call end intent for call {call_id}, auto-ending")

                        # Wait briefly for TTS to finish on client
                        await asyncio.sleep(1.0)

                        # Update call status
                        db.refresh(call)
                        if call.status == "in_progress":
                            call.status = "completed"
                            call.ended_at = datetime.utcnow()
                            if call.started_at:
                                call.duration = int((call.ended_at - call.started_at).total_seconds())
                            call.is_successful = True
                            db.commit()

                            # Trigger analysis
                            from app.tasks.analysis import analyze_call
                            analyze_call.delay(call_id)

                            # Notify client
                            await manager.send_message(state, {
                                "type": "ended",
                                "call_id": call_id,
                                "status": "completed",
                                "auto_ended": True,
                            })

                        break

            # Handle end call (P0: 분석 태스크 트리거 연결)
            elif msg_type == "end_call":
                # Refresh call to get latest state
                db.refresh(call)
                if call.status == "in_progress":
                    call.status = "completed"
                    call.ended_at = datetime.utcnow()
                    if call.started_at:
                        call.duration = int((call.ended_at - call.started_at).total_seconds())
                    call.is_successful = True
                    db.commit()

                    # 통화 분석 비동기 실행
                    from app.tasks.analysis import analyze_call
                    analyze_call.delay(call_id)

                    await manager.send_message(state, {
                        "type": "ended",
                        "call_id": call_id,
                        "status": "completed",
                    })

                break

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected by client: call_id={call_id}")
    except Exception as e:
        logger.error(f"WebSocket error for call_id={call_id}: {e}")
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:
            pass
    finally:
        # Update call status if still in_progress (unexpected disconnect or client disconnect)
        try:
            db.refresh(call)
            if call.status == "in_progress":
                logger.info(f"Call {call_id} ended via disconnect - marking as completed")
                call.status = "completed"
                call.ended_at = datetime.utcnow()
                if call.started_at:
                    call.duration = int((call.ended_at - call.started_at).total_seconds())
                call.is_successful = True
                db.commit()

                # Trigger call analysis
                from app.tasks.analysis import analyze_call
                analyze_call.delay(call_id)
        except Exception as e:
            logger.error(f"Failed to update call status for {call_id}: {e}")

        # Cleanup
        if heartbeat_task:
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass

        manager.disconnect(call_id)
        db.close()
