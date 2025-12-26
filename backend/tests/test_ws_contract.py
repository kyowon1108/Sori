from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
CONTRACTS_DIR = ROOT / "contracts"
WS_MESSAGES = CONTRACTS_DIR / "ws.messages.md"
OPENAPI_SNAPSHOT = CONTRACTS_DIR / "openapi.snapshot.json"

ALLOWED_TYPES = [
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


def test_contracts_dir_exists():
    assert CONTRACTS_DIR.exists(), "contracts/ directory missing"


def test_ws_messages_contains_allowed_types():
    text = WS_MESSAGES.read_text(encoding="utf-8")
    for msg_type in ALLOWED_TYPES:
        assert msg_type in text, f"Missing ws type: {msg_type}"


def test_openapi_snapshot_is_valid_json():
    data = json.loads(OPENAPI_SNAPSHOT.read_text(encoding="utf-8"))
    assert isinstance(data, dict)
    assert "openapi" in data
