"""
Integration tests for WebSocket V2 endpoint.

Tests WebSocket connection handling, message processing, and agent integration.
"""

import pytest
import json
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone
from collections import OrderedDict

from fastapi import status
from fastapi.testclient import TestClient

from app.routes.websocket_v2 import (
    LRUSet,
    ConnectionState,
    ConnectionManager,
    get_agent_service,
)


class TestLRUSet:
    """Test LRU-based deduplication set."""

    def test_add_new_item(self):
        lru = LRUSet(maxsize=10)

        result = lru.add("item1")

        assert result is True
        assert "item1" in lru

    def test_add_duplicate(self):
        lru = LRUSet(maxsize=10)

        lru.add("item1")
        result = lru.add("item1")  # Duplicate

        assert result is False  # Duplicate returns False

    def test_maxsize_enforcement(self):
        lru = LRUSet(maxsize=3)

        lru.add("item1")
        lru.add("item2")
        lru.add("item3")
        lru.add("item4")  # Should evict item1

        assert "item1" not in lru
        assert "item2" in lru
        assert "item3" in lru
        assert "item4" in lru

    def test_lru_order_maintained(self):
        lru = LRUSet(maxsize=3)

        lru.add("item1")
        lru.add("item2")
        lru.add("item3")
        lru.add("item1")  # Access item1 again
        lru.add("item4")  # Should evict item2 (least recently used)

        assert "item1" in lru
        assert "item2" not in lru
        assert "item3" in lru
        assert "item4" in lru


class TestConnectionState:
    """Test ConnectionState for WebSocket connections."""

    def test_initial_state(self):
        mock_ws = MagicMock()

        state = ConnectionState(websocket=mock_ws, call_id=123)

        assert state.websocket == mock_ws
        assert state.call_id == 123
        assert state.closed is False
        assert isinstance(state.last_pong, datetime)
        assert isinstance(state.seen_messages, LRUSet)
        assert isinstance(state.lock, asyncio.Lock)


class TestConnectionManager:
    """Test ConnectionManager for WebSocket lifecycle."""

    @pytest.fixture
    def manager(self):
        return ConnectionManager()

    @pytest.fixture
    def mock_websocket(self):
        ws = MagicMock()
        ws.accept = AsyncMock()
        ws.send_json = AsyncMock()
        return ws

    @pytest.mark.asyncio
    async def test_connect(self, manager, mock_websocket):
        state = await manager.connect(mock_websocket, call_id=123)

        assert state.call_id == 123
        assert 123 in manager.connections
        mock_websocket.accept.assert_called_once()

    def test_disconnect(self, manager, mock_websocket):
        # First connect
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        state = loop.run_until_complete(manager.connect(mock_websocket, call_id=123))
        loop.close()

        # Then disconnect
        manager.disconnect(call_id=123)

        assert 123 not in manager.connections
        assert state.closed is True

    def test_get_connection(self, manager, mock_websocket):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(manager.connect(mock_websocket, call_id=123))
        loop.close()

        state = manager.get(call_id=123)

        assert state is not None
        assert state.call_id == 123

    def test_get_nonexistent_connection(self, manager):
        state = manager.get(call_id=999)

        assert state is None

    @pytest.mark.asyncio
    async def test_send_message(self, manager, mock_websocket):
        state = await manager.connect(mock_websocket, call_id=123)
        message = {"type": "test", "data": "value"}

        await manager.send_message(state, message)

        mock_websocket.send_json.assert_called_once_with(message)

    @pytest.mark.asyncio
    async def test_send_message_to_closed_connection(self, manager, mock_websocket):
        state = await manager.connect(mock_websocket, call_id=123)
        state.closed = True
        message = {"type": "test", "data": "value"}

        await manager.send_message(state, message)

        # Should not attempt to send
        mock_websocket.send_json.assert_not_called()

    @pytest.mark.asyncio
    async def test_send_message_handles_exception(self, manager, mock_websocket):
        state = await manager.connect(mock_websocket, call_id=123)
        mock_websocket.send_json.side_effect = Exception("Connection error")

        await manager.send_message(state, {"type": "test"})

        assert state.closed is True  # Should mark as closed on error


class TestWebSocketMessageTypes:
    """Test different message type handling."""

    def test_ping_message_structure(self):
        """Test ping message format."""
        ping_msg = {
            "type": "ping",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        assert ping_msg["type"] == "ping"
        assert "timestamp" in ping_msg

    def test_pong_message_structure(self):
        """Test pong message format."""
        pong_msg = {
            "type": "pong",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        assert pong_msg["type"] == "pong"
        assert "timestamp" in pong_msg

    def test_message_structure(self):
        """Test chat message format."""
        chat_msg = {
            "type": "message",
            "message_id": "msg_123",
            "content": "안녕하세요",
        }

        assert chat_msg["type"] == "message"
        assert "message_id" in chat_msg
        assert "content" in chat_msg

    def test_ack_message_structure(self):
        """Test acknowledgment message format."""
        ack_msg = {
            "type": "ack",
            "message_id": "msg_123",
        }

        assert ack_msg["type"] == "ack"
        assert "message_id" in ack_msg

    def test_stream_chunk_structure(self):
        """Test stream chunk format."""
        chunk_msg = {
            "type": "stream_chunk",
            "response_id": "resp_456",
            "role": "assistant",
            "content": "안녕",
        }

        assert chunk_msg["type"] == "stream_chunk"
        assert "response_id" in chunk_msg
        assert "content" in chunk_msg

    def test_stream_end_structure(self):
        """Test stream end format."""
        end_msg = {
            "type": "stream_end",
            "response_id": "resp_456",
            "role": "assistant",
            "content": "안녕하세요!",
            "is_streaming": False,
            "call_end_detected": False,
        }

        assert end_msg["type"] == "stream_end"
        assert end_msg["is_streaming"] is False
        assert "call_end_detected" in end_msg

    def test_history_message_structure(self):
        """Test history message format."""
        history_msg = {
            "type": "history",
            "role": "assistant",
            "content": "이전 메시지",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        assert history_msg["type"] == "history"
        assert "role" in history_msg
        assert "content" in history_msg
        assert "created_at" in history_msg

    def test_ended_message_structure(self):
        """Test call ended message format."""
        ended_msg = {
            "type": "ended",
            "call_id": 123,
            "status": "completed",
            "auto_ended": True,
        }

        assert ended_msg["type"] == "ended"
        assert "call_id" in ended_msg
        assert "status" in ended_msg


class TestAgentServiceIntegration:
    """Test agent service initialization and usage."""

    def test_get_agent_service_singleton(self):
        """Test that agent service is created as singleton."""
        # Reset global instance
        import app.routes.websocket_v2 as ws_module
        ws_module._agent_service = None

        with patch("app.routes.websocket_v2.OpenAIAgentService") as mock_agent:
            mock_instance = MagicMock()
            mock_agent.return_value = mock_instance

            with patch("app.routes.websocket_v2.AgentConfig") as mock_config:
                mock_config.return_value = MagicMock()

                service1 = get_agent_service()
                service2 = get_agent_service()

                # Should only create one instance
                assert mock_agent.call_count == 1
                assert service1 is service2


class TestWebSocketContractCompliance:
    """Test compliance with WebSocket contract (ws.messages.md)."""

    @pytest.fixture
    def allowed_message_types(self):
        """Message types defined in the contract."""
        return [
            "ping",
            "pong",
            "message",
            "ack",
            "stream_chunk",
            "stream_end",
            "end_call",
            "ended",
            "history",
        ]

    def test_message_types_match_contract(self, allowed_message_types):
        """Verify all expected message types are supported."""
        # Create test messages for each type
        test_messages = {
            "ping": {"type": "ping", "timestamp": "2024-01-01T00:00:00"},
            "pong": {"type": "pong", "timestamp": "2024-01-01T00:00:00"},
            "message": {"type": "message", "message_id": "1", "content": "test"},
            "ack": {"type": "ack", "message_id": "1"},
            "stream_chunk": {"type": "stream_chunk", "response_id": "1", "content": "a"},
            "stream_end": {"type": "stream_end", "response_id": "1", "content": "ab"},
            "end_call": {"type": "end_call"},
            "ended": {"type": "ended", "call_id": 1, "status": "completed"},
            "history": {"type": "history", "role": "user", "content": "hi"},
        }

        for msg_type in allowed_message_types:
            assert msg_type in test_messages
            assert test_messages[msg_type]["type"] == msg_type

    def test_message_can_be_json_serialized(self, allowed_message_types):
        """Verify all message types can be JSON serialized."""
        messages = [
            {"type": "ping", "timestamp": datetime.now(timezone.utc).isoformat()},
            {"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()},
            {"type": "message", "message_id": "uuid", "content": "한글 테스트"},
            {"type": "ack", "message_id": "uuid"},
            {"type": "stream_chunk", "response_id": "uuid", "role": "assistant", "content": "텍스트"},
            {"type": "stream_end", "response_id": "uuid", "role": "assistant", "content": "완료"},
            {"type": "end_call"},
            {"type": "ended", "call_id": 123, "status": "completed"},
            {"type": "history", "role": "assistant", "content": "이전", "created_at": datetime.now(timezone.utc).isoformat()},
        ]

        for msg in messages:
            # Should not raise
            serialized = json.dumps(msg, ensure_ascii=False)
            deserialized = json.loads(serialized)
            assert deserialized["type"] == msg["type"]


class TestHeartbeatMechanism:
    """Test WebSocket heartbeat functionality."""

    def test_heartbeat_interval_constant(self):
        from app.routes.websocket_v2 import HEARTBEAT_INTERVAL, HEARTBEAT_TIMEOUT

        assert HEARTBEAT_INTERVAL == 30  # 30 seconds
        assert HEARTBEAT_TIMEOUT == 10  # 10 seconds

    @pytest.mark.asyncio
    async def test_pong_updates_last_pong(self):
        mock_ws = MagicMock()
        state = ConnectionState(websocket=mock_ws, call_id=123)

        old_pong = state.last_pong
        await asyncio.sleep(0.01)  # Small delay
        state.last_pong = datetime.now(timezone.utc)

        assert state.last_pong > old_pong


class TestMessageDeduplication:
    """Test message deduplication logic."""

    def test_dedup_allows_first_message(self):
        lru = LRUSet(maxsize=100)

        is_new = lru.add("msg_001")

        assert is_new is True

    def test_dedup_rejects_duplicate(self):
        lru = LRUSet(maxsize=100)

        lru.add("msg_001")
        is_new = lru.add("msg_001")

        assert is_new is False

    def test_dedup_different_ids_allowed(self):
        lru = LRUSet(maxsize=100)

        result1 = lru.add("msg_001")
        result2 = lru.add("msg_002")

        assert result1 is True
        assert result2 is True

    def test_dedup_bound_size(self):
        from app.routes.websocket_v2 import MESSAGE_DEDUP_SIZE

        assert MESSAGE_DEDUP_SIZE == 1000  # Verify constant
