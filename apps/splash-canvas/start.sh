#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-8765}"
echo "Splash Canvas"
echo "Open http://127.0.0.1:${PORT}  then press F for fullscreen"
if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT" --bind 127.0.0.1
fi
echo "Python 3 is required to serve the app locally." >&2
exit 1
