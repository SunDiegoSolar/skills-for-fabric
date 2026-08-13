#!/usr/bin/env python3
"""Local static server with no-store cache headers so mapping studio JS reloads cleanly."""

from __future__ import annotations

import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--bind", default="127.0.0.1")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    handler = lambda *a, **k: NoCacheHandler(*a, directory=str(root), **k)  # noqa: E731
    server = ThreadingHTTPServer((args.bind, args.port), handler)
    print(f"Splash Canvas  http://{args.bind}:{args.port}", flush=True)
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
