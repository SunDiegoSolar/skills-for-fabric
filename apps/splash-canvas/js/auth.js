const SESSION_KEY = "splash-canvas-session";
const ACCOUNTS_KEY = "splash-canvas-accounts";

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function tryFetch(url, options) {
  try {
    const res = await fetch(url, { credentials: "same-origin", ...options });
    if (res.status === 404) return { ok: false, missing: true };
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, missing: true };
  }
}

export function createAuth({ toast } = {}) {
  const $ = (id) => document.getElementById(id);
  const state = {
    user: null,
    mode: "local",
    server: false,
    requireLogin: false,
  };

  function say(message) {
    if (toast) toast(message);
  }

  function paint() {
    const btn = $("login-open");
    const who = $("login-user");
    const mode = $("login-mode");
    const err = $("login-error");
    if (err) err.textContent = "";
    if (mode) {
      mode.textContent = state.server
        ? "Server session available — sign in here or on the host."
        : "Local session on this machine. Start ./start.sh for a server session too.";
    }
    if (btn) {
      btn.textContent = state.user ? state.user.name : "Log in";
      btn.classList.toggle("active", !!state.user);
    }
    if (who) {
      who.hidden = !state.user;
      who.textContent = state.user
        ? `${state.user.name} · ${state.user.where === "server" ? "server" : "local"}`
        : "";
    }
    document.body.dataset.signedIn = state.user ? "1" : "0";
    const signed = $("login-signed");
    const form = $("login-form");
    if (signed && form) {
      signed.hidden = !state.user;
      form.hidden = !!state.user;
    }
    const signedName = $("login-signed-name");
    if (signedName && state.user) {
      signedName.textContent = `${state.user.name} (${state.user.where === "server" ? "server" : "this browser"})`;
    }
  }

  function open() {
    const dialog = $("login-dialog");
    if (!dialog) {
      if (!document.body.classList.contains("login-page")) window.location.href = "./login.html";
      return;
    }
    if (!dialog.open && typeof dialog.showModal === "function") dialog.showModal();
    else if (!dialog.open) dialog.setAttribute("open", "");
    const name = $("login-name");
    if (name && !state.user) name.focus();
    paint();
  }

  function close() {
    const dialog = $("login-dialog");
    if (dialog?.open) dialog.close();
  }

  function localRead() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function localWrite(session) {
    if (!session) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function accounts() {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  async function localLogin(name, password, create) {
    const n = String(name || "").trim();
    if (!n) throw new Error("Enter a name.");
    const store = accounts();
    const hash = password ? await sha256(`splash:${n}:${password}`) : "";
    if (create) {
      if (store[n] && store[n] !== hash) throw new Error("That name is already on this machine.");
      store[n] = hash;
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(store));
    } else if (store[n] != null) {
      if (store[n] !== hash) throw new Error("Name or password does not match.");
    } else if (password) {
      store[n] = hash;
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(store));
    }
    const session = { name: n, where: "local", at: Date.now() };
    localWrite(session);
    state.user = session;
    state.mode = "local";
    return session;
  }

  async function serverLogin(name, password, path) {
    const res = await tryFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    });
    if (res.missing) return null;
    if (!res.ok) throw new Error(res.data.error || "Server sign-in failed.");
    state.server = true;
    state.user = { name: res.data.name, where: "server", at: Date.now() };
    state.mode = "server";
    localWrite(state.user);
    return state.user;
  }

  async function submit(create) {
    const name = $("login-name")?.value || "";
    const password = $("login-pass")?.value || "";
    const err = $("login-error");
    try {
      if (state.server) {
        await serverLogin(name, password, create ? "/api/register" : "/api/login");
      } else {
        await localLogin(name, password, create);
      }
      paint();
      close();
      say(create ? `Account ready — hi ${state.user.name}` : `Signed in as ${state.user.name}`);
      if (document.body.classList.contains("login-page")) window.location.href = "./index.html";
    } catch (e) {
      if (err) err.textContent = e.message;
      else say(e.message);
    }
  }

  async function logout() {
    if (state.server) await tryFetch("/api/logout", { method: "POST" });
    localWrite(null);
    state.user = null;
    paint();
    close();
    say("Signed out");
  }

  async function probe() {
    const res = await tryFetch("/api/session");
    if (res.ok) {
      state.server = true;
      state.requireLogin = !!res.data.requireLogin;
      if (res.data.name) {
        state.user = { name: res.data.name, where: "server", at: Date.now() };
        localWrite(state.user);
      }
    } else {
      state.server = false;
      const local = localRead();
      if (local?.name) state.user = local;
    }
    paint();
    if (state.requireLogin && !state.user) open();
  }

  function bind() {
    $("login-open")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      open();
    });
    $("login-cancel")?.addEventListener("click", (event) => {
      event.preventDefault();
      close();
    });
    $("login-cancel-signed")?.addEventListener("click", (event) => {
      event.preventDefault();
      close();
    });
    $("login-page")?.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = "./login.html";
    });
    $("login-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      submit(false);
    });
    $("login-register")?.addEventListener("click", (event) => {
      event.preventDefault();
      submit(true);
    });
    $("login-guest")?.addEventListener("click", (event) => {
      if (document.body.classList.contains("login-page")) return;
      event.preventDefault();
      close();
      say("Continuing as guest");
    });
    $("login-signout")?.addEventListener("click", (event) => {
      event.preventDefault();
      logout();
    });
    $("login-dialog")?.addEventListener("click", (event) => {
      if (event.target === $("login-dialog")) close();
    });
    probe();
  }

  return { bind, open, close, probe, get user() { return state.user; } };
}

export function openLoginDialog() {
  const dialog = document.getElementById("login-dialog");
  if (dialog?.showModal) dialog.showModal();
  else window.location.href = "./login.html";
}
