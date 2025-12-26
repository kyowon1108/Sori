#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <BASE_URL> [WS_URL]" >&2
  exit 1
fi

BASE_URL="$1"
WS_URL="${2:-}"

if [[ "$BASE_URL" != http://* && "$BASE_URL" != https://* ]]; then
  echo "BASE_URL must start with http:// or https://" >&2
  exit 1
fi

if [[ -z "$WS_URL" ]]; then
  if [[ "$BASE_URL" == https://* ]]; then
    WS_URL="wss://${BASE_URL#https://}"
  else
    WS_URL="ws://${BASE_URL#http://}"
  fi
else
  if [[ "$WS_URL" != ws://* && "$WS_URL" != wss://* ]]; then
    echo "WS_URL must start with ws:// or wss://" >&2
    exit 1
  fi
fi

FILE="iOS/Somi/Utils/Constants.swift"
if [ ! -f "$FILE" ]; then
  echo "File not found: $FILE" >&2
  exit 1
fi

python3 - "$FILE" "$BASE_URL" "$WS_URL" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
base_url = sys.argv[2]
ws_url = sys.argv[3]

text = path.read_text()


def replace(pattern, value, text_value):
    def repl(match):
        return f"{match.group(1)}{value}{match.group(2)}"
    new_text, count = re.subn(pattern, repl, text_value)
    if count == 0:
        raise SystemExit(f"Pattern not found: {pattern}")
    return new_text

text = replace(r'(static let baseURL = ")[^"]*(")', base_url, text)
text = replace(r'(static let wsBaseURL = ")[^"]*(")', ws_url, text)

path.write_text(text)
print(f"Updated baseURL -> {base_url}")
print(f"Updated wsBaseURL -> {ws_url}")
print("NOTE: Do not commit local baseURL changes.")
PY
