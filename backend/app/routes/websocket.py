from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
import json

from app.database import SessionLocal
from app.core.security import verify_token
from app.models.call import Call
from app.models.message import Message
from app.services.claude_ai import ClaudeService
from app.services.calls import CallService

router = APIRouter()
claude_service = ClaudeService()


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}

    async def connect(self, websocket: WebSocket, call_id: int):
        await websocket.accept()
        self.active_connections[call_id] = websocket

    def disconnect(self, call_id: int):
        if call_id in self.active_connections:
            del self.active_connections[call_id]

    async def send_message(self, call_id: int, message: dict):
        if call_id in self.active_connections:
            await self.active_connections[call_id].send_json(message)


manager = ConnectionManager()


@router.websocket("/ws/{call_id}")
async def websocket_endpoint(websocket: WebSocket, call_id: int, token: str = Query(...)):
    """WebSocket 실시간 채팅"""
    # 토큰 검증
    payload = verify_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    db = SessionLocal()
    try:
        # Call 존재 확인
        call = db.query(Call).filter(Call.id == call_id).first()
        if not call:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await manager.connect(websocket, call_id)

        # 기존 메시지 로드
        existing_messages = db.query(Message)\
            .filter(Message.call_id == call_id)\
            .order_by(Message.created_at)\
            .all()

        messages_list = [
            {"role": m.role, "content": m.content}
            for m in existing_messages
        ]

        # 기존 메시지 전송
        for msg in existing_messages:
            await manager.send_message(call_id, {
                "type": "history",
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat()
            })

        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)

            if message_data.get("type") == "message":
                user_message = message_data.get("content")

                # 사용자 메시지 저장
                CallService.save_message(db, call_id, "user", user_message)
                messages_list.append({"role": "user", "content": user_message})

                # 사용자 메시지 확인 전송
                await manager.send_message(call_id, {
                    "type": "message",
                    "role": "user",
                    "content": user_message,
                    "is_streaming": False
                })

                # Claude API 호출 (스트리밍)
                full_response = ""
                async for chunk in claude_service.stream_chat_response(messages_list):
                    await manager.send_message(call_id, {
                        "type": "message",
                        "role": "assistant",
                        "content": chunk,
                        "is_streaming": True
                    })
                    full_response += chunk

                # AI 응답 저장
                CallService.save_message(db, call_id, "assistant", full_response)
                messages_list.append({"role": "assistant", "content": full_response})

                # 스트리밍 완료 알림
                await manager.send_message(call_id, {
                    "type": "message",
                    "role": "assistant",
                    "content": full_response,
                    "is_streaming": False
                })

    except WebSocketDisconnect:
        manager.disconnect(call_id)
    except Exception:
        manager.disconnect(call_id)
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:
            pass
    finally:
        db.close()
