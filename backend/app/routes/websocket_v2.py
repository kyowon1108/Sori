"""
WebSocket endpoint V2 with OpenAI Agent SDK integration.

This module provides an upgraded WebSocket endpoint that uses the
Perceive-Plan-Act-Reflect agent loop for more sophisticated
conversation handling with GPT-4o.

Features:
- OpenAI Function Calling for tools
- Automatic call ending detection
- Health status monitoring
- Quality evaluation and retry
- Heartbeat and connection management
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from collections import OrderedDict
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status

from app.database import SessionLocal
from app.core.security import verify_token
from app.models.call import Call
from app.models.message import Message
from app.models.elderly import Elderly
from app.services.agents import OpenAIAgentService, AgentConfig, ConversationContext
from app.services.calls import CallService

logger = logging.getLogger(__name__)
router = APIRouter()

# Configuration
HEARTBEAT_INTERVAL = 30  # seconds
HEARTBEAT_TIMEOUT = 10   # seconds to wait for pong
MESSAGE_DEDUP_SIZE = 1000  # max messages to track for deduplication

# Global agent service instance (reused across connections)
_agent_service: Optional[OpenAIAgentService] = None


def get_agent_service() -> OpenAIAgentService:
    """Get or create the global agent service."""
    global _agent_service
    if _agent_service is None:
        config = AgentConfig(
            model="gpt-4o",
            max_tokens=1024,
            max_retries=2,
            quality_threshold=0.6,
            enable_reflection=True,
            temperature=0.7,
        )
        _agent_service = OpenAIAgentService(config=config)
        logger.info("OpenAIAgentService initialized with GPT-4o")
    return _agent_service


class LRUSet:
    """LRU-based set for message deduplication with bounded memory."""

    def __init__(self, maxsize: int = MESSAGE_DEDUP_SIZE):
        self._maxsize = maxsize
        self._data: OrderedDict = OrderedDict()

    def add(self, item: str) -> bool:
        """Add item, return True if new, False if duplicate."""
        if item in self._data:
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
        self.last_pong: datetime = datetime.now(timezone.utc)
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

            elapsed = (datetime.now(timezone.utc) - state.last_pong).total_seconds()
            if elapsed > HEARTBEAT_INTERVAL + HEARTBEAT_TIMEOUT:
                logger.warning(f"Heartbeat timeout for call_id={state.call_id}")
                state.closed = True
                try:
                    await state.websocket.close(code=status.WS_1002_PROTOCOL_ERROR)
                except Exception:
                    pass
                break

            await manager.send_message(state, {
                "type": "ping",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Heartbeat error: {e}")
            break


@router.websocket("/ws/v2/{call_id}")
async def websocket_endpoint_v2(websocket: WebSocket, call_id: int, token: str = Query(...)):
    """
    WebSocket endpoint V2 with OpenAI Agent SDK (GPT-4o).

    This endpoint uses the Perceive-Plan-Act-Reflect loop for
    more sophisticated conversation handling with GPT-4o.
    """

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
    agent_service = get_agent_service()

    try:
        # Verify call exists
        call = db.query(Call).filter(Call.id == call_id).first()
        if not call:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Authorization check based on scope
        if scope == "elderly" and token_type == "device_access":
            elderly_id = int(payload.get("sub"))
            if call.elderly_id != elderly_id:
                logger.warning(f"Elderly {elderly_id} tried to access call {call_id}")
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

            # Update device last_used_at
            device_id = payload.get("device_id")
            if device_id:
                from app.models.elderly_device import ElderlyDevice
                device = db.query(ElderlyDevice).filter(ElderlyDevice.id == device_id).first()
                if device:
                    device.last_used_at = datetime.now(timezone.utc)
                    db.commit()

        elif scope == "caregiver":
            user_id = int(payload.get("sub"))
            elderly = db.query(Elderly).filter(
                Elderly.id == call.elderly_id,
                Elderly.caregiver_id == user_id
            ).first()
            if not elderly:
                logger.warning(f"User {user_id} tried to access call {call_id}")
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
        else:
            logger.warning(f"Token without scope accessing call {call_id}")

        # Update call status
        if call.status in ("pending", "scheduled"):
            call.status = "in_progress"
            call.started_at = datetime.now(timezone.utc)
            db.commit()

        # Connect and start heartbeat
        state = await manager.connect(websocket, call_id)
        heartbeat_task = asyncio.create_task(heartbeat_loop(state))

        # Get elderly info for context
        elderly = db.query(Elderly).filter(Elderly.id == call.elderly_id).first()

        # Create conversation context
        context = ConversationContext(
            conversation_id=f"call_{call_id}",
            elderly_id=elderly.id if elderly else None,
            elderly_name=elderly.name if elderly else None,
            elderly_age=elderly.age if elderly else None,
            health_condition=elderly.health_condition if elderly else None,
            medications=elderly.medications if elderly else None,
            call_id=call_id,
        )

        # Send existing messages
        existing_messages = db.query(Message)\
            .filter(Message.call_id == call_id)\
            .order_by(Message.created_at)\
            .all()

        for msg in existing_messages:
            await manager.send_message(state, {
                "type": "history",
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
            })

        # Generate initial greeting if new call
        if not existing_messages:
            logger.info(f"Generating initial greeting for call {call_id}")

            greeting_response = ""
            response_id = str(uuid.uuid4())

            async for chunk in agent_service.generate_greeting(context):
                if state.closed:
                    break

                # Skip [CALL_END] marker in greeting (shouldn't happen but safety check)
                if "[CALL_END]" in chunk:
                    continue

                await manager.send_message(state, {
                    "type": "stream_chunk",
                    "response_id": response_id,
                    "role": "assistant",
                    "content": chunk,
                })
                greeting_response += chunk

            if not state.closed and greeting_response:
                clean_response = greeting_response.replace("[CALL_END]", "").strip()
                CallService.save_message(db, call_id, "assistant", clean_response)

                await manager.send_message(state, {
                    "type": "stream_end",
                    "response_id": response_id,
                    "role": "assistant",
                    "content": clean_response,
                    "is_streaming": False,
                })

                logger.info(f"Initial greeting sent: {clean_response[:50]}...")

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
                state.last_pong = datetime.now(timezone.utc)
                continue

            # Handle ping from client
            if msg_type == "ping":
                await manager.send_message(state, {
                    "type": "pong",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                continue

            # Handle chat message
            if msg_type == "message":
                # Deduplication check
                if msg_id and not state.seen_messages.add(msg_id):
                    logger.debug(f"Duplicate message ignored: {msg_id}")
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

                # Echo user message
                await manager.send_message(state, {
                    "type": "message",
                    "role": "user",
                    "content": user_message,
                    "is_streaming": False,
                })

                # Process with agent (Perceive-Plan-Act-Reflect)
                full_response = ""
                response_id = str(uuid.uuid4())
                call_end_detected = False
                tool_calls = []

                async for chunk in agent_service.process_message(user_message, context):
                    if state.closed:
                        break

                    # Check for call end marker
                    if "[CALL_END]" in chunk:
                        call_end_detected = True
                        chunk = chunk.replace("[CALL_END]", "")

                    if chunk:
                        await manager.send_message(state, {
                            "type": "stream_chunk",
                            "response_id": response_id,
                            "role": "assistant",
                            "content": chunk,
                        })
                        full_response += chunk

                if not state.closed and full_response:
                    clean_response = full_response.replace("[CALL_END]", "").strip()

                    # Save assistant response
                    CallService.save_message(db, call_id, "assistant", clean_response)

                    # Send stream end
                    await manager.send_message(state, {
                        "type": "stream_end",
                        "response_id": response_id,
                        "role": "assistant",
                        "content": clean_response,
                        "is_streaming": False,
                        "call_end_detected": call_end_detected,
                        "tool_calls": tool_calls if tool_calls else None,
                    })

                    # Auto-end call if detected
                    if call_end_detected:
                        logger.info(f"Agent detected call end for call {call_id}")

                        await asyncio.sleep(1.0)

                        db.refresh(call)
                        if call.status == "in_progress":
                            call.status = "completed"
                            call.ended_at = datetime.now(timezone.utc)
                            if call.started_at:
                                call.duration = int((call.ended_at - call.started_at).total_seconds())
                            call.is_successful = True
                            db.commit()

                            from app.tasks.analysis import analyze_call
                            analyze_call.delay(call_id)

                            await manager.send_message(state, {
                                "type": "ended",
                                "call_id": call_id,
                                "status": "completed",
                                "auto_ended": True,
                            })

                        # Clear conversation history for this call
                        agent_service.clear_conversation(context.conversation_id)

                        break

            # Handle explicit end call
            elif msg_type == "end_call":
                db.refresh(call)
                if call.status == "in_progress":
                    call.status = "completed"
                    call.ended_at = datetime.now(timezone.utc)
                    if call.started_at:
                        call.duration = int((call.ended_at - call.started_at).total_seconds())
                    call.is_successful = True
                    db.commit()

                    from app.tasks.analysis import analyze_call
                    analyze_call.delay(call_id)

                    await manager.send_message(state, {
                        "type": "ended",
                        "call_id": call_id,
                        "status": "completed",
                    })

                # Clear conversation history
                agent_service.clear_conversation(context.conversation_id)

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
        # Update call status if still in_progress
        try:
            db.refresh(call)
            if call.status == "in_progress":
                logger.info(f"Call {call_id} ended via disconnect")
                call.status = "completed"
                call.ended_at = datetime.now(timezone.utc)
                if call.started_at:
                    call.duration = int((call.ended_at - call.started_at).total_seconds())
                call.is_successful = True
                db.commit()

                from app.tasks.analysis import analyze_call
                analyze_call.delay(call_id)
        except Exception as e:
            logger.error(f"Failed to update call status for {call_id}: {e}")

        # Clear agent conversation history
        if state:
            agent_service.clear_conversation(f"call_{call_id}")

        # Cleanup
        if heartbeat_task:
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass

        manager.disconnect(call_id)
        db.close()


# For backward compatibility, also expose the v2 endpoint at /ws/{call_id}
# by importing this router in main.py with a flag to enable it
