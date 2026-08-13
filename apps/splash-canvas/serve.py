#!/usr/bin/env python3
"""Local Splash Canvas server: static files, no-store cache, optional login API."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import secrets
import time
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DATA = ROOT / ".data"
ACCOUNTS = DATA / "accounts.json"
SESSIONS: dict[str, dict] = {}


def _hash(name: str, password: str) -> str:
    return hashlib.sha256(f"splash:{name}:{password}".encode("utf-8")).hexdigest()


def _load_accounts() -> dict:
    DATA.mkdir(exist_ok=True)
    if ACCOUNTS.exists():
        try:
            return json.loads(ACCOUNTS.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    user = os.environ.get("SPLASH_USER", "").strip()
    password = os.environ.get("SPLASH_PASSWORD", "")
    accounts: dict[str, str] = {}
    if user:
        accounts[user] = _hash(user, password)
        ACCOUNTS.write_text(json.dumps(accounts, indent=2), encoding="utf-8")
    else:
        ACCOUNTS.write_text("{}", encoding="utf-8")
    return accounts


def _save_accounts(accounts: dict) -> None:
    DATA.mkdir(exist_ok=True)
    ACCOUNTS.write_text(json.dumps(accounts, indent=2), encoding="utf-8")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def _json(self, payload: dict, status: int = 200, cookie: str | None = None) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return {}
        return data if isinstance(data, dict) else {}

    def _session_name(self) -> str | None:
        cookie = SimpleCookie(self.headers.get("Cookie") or "")
        morsel = cookie.get("splash_session")
        if not morsel:
            return None
        rec = SESSIONS.get(morsel.value)
        if not rec:
            return None
        if rec["exp"] < time.time():
            SESSIONS.pop(morsel.value, None)
            return None
        return rec["name"]

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/api/session":
            name = self._session_name()
            self._json({
                "ok": True,
                "name": name,
                "requireLogin": os.environ.get("SPLASH_REQUIRE_LOGIN", "").lower() in {"1", "true", "yes"},
            })
            return
        if path == "/login":
            self.path = "/login.html"
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/api/login":
            self._login(create=False)
            return
        if path == "/api/register":
            self._login(create=True)
            return
        if path == "/api/logout":
            cookie = SimpleCookie(self.headers.get("Cookie") or "")
            morsel = cookie.get("splash_session")
            if morsel:
                SESSIONS.pop(morsel.value, None)
            self._json({"ok": True}, cookie="splash_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax")
            return
        self.send_error(404, "Not found")

    def _login(self, create: bool) -> None:
        body = self._read_json()
        name = str(body.get("name") or "").strip()
        password = str(body.get("password") or "")
        if not name:
            self._json({"error": "Enter a name."}, 400)
            return
        accounts = _load_accounts()
        digest = _hash(name, password)
        if create:
            if name in accounts and accounts[name] != digest:
                self._json({"error": "That name is already on this server."}, 409)
                return
            accounts[name] = digest
            _save_accounts(accounts)
        elif name in accounts:
            if accounts[name] != digest:
                self._json({"error": "Name or password does not match."}, 401)
                return
        else:
            accounts[name] = digest
            _save_accounts(accounts)
        token = secrets.token_hex(16)
        SESSIONS[token] = {"name": name, "exp": time.time() + 60 * 60 * 24 * 14}
        self._json(
            {"ok": True, "name": name, "where": "server"},
            cookie=f"splash_session={token}; Path=/; Max-Age=1209600; HttpOnly; SameSite=Lax",
        )

    def log_message(self, fmt: str, *args) -> None:
        sys_stderr = __import__("sys").stderr
        sys_stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--bind", default="127.0.0.1")
    args = parser.parse_args()
    _load_accounts()
    server = ThreadingHTTPServer((args.bind, args.port), Handler)
    print(f"Splash Canvas  http://{args.bind}:{args.port}", flush=True)
    print("Login opens in the app. Optional server accounts: SPLASH_USER / SPLASH_PASSWORD", flush=True)
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
