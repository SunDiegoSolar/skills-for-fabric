(() => {
  const STORAGE_KEY = "splash-canvas-layout-v2";
  const DB_NAME = "splash-canvas";
  const DEFAULT_CITY = "San Diego";

  const QUOTES = [
    ["Light makes photography. Embrace light. Admire it. Love it.", "George Eastman"],
    ["The camera is an instrument that teaches people how to see without a camera.", "Dorothea Lange"],
    ["You don't take a photograph, you make it.", "Ansel Adams"],
    ["What I like about photographs is that they capture a moment that's gone forever.", "Karl Lagerfeld"],
    ["The whole point of taking pictures is so that you don't have to explain things with words.", "Elliott Erwitt"],
  ];

  const WMO = {
    0: ["Clear", "☀"],
    1: ["Mostly clear", "🌤"],
    2: ["Partly cloudy", "⛅"],
    3: ["Overcast", "☁"],
    45: ["Fog", "🌫"],
    48: ["Icy fog", "🌫"],
    51: ["Light drizzle", "🌦"],
    61: ["Rain", "🌧"],
    71: ["Snow", "❄"],
    80: ["Showers", "🌦"],
    95: ["Thunderstorm", "⛈"],
  };

  const $ = (id) => document.getElementById(id);
  const stage = $("stage");
  const widgetsEl = $("widgets");
  const bgEl = $("bg");
  const dimEl = $("dim");
  const chrome = $("chrome");
  const inspector = $("inspector");
  const inspectorBody = $("inspector-body");
  const bgPanel = $("bg-panel");
  const addMenu = $("add-menu");
  const help = $("help");
  const toast = $("toast");
  const dropHint = $("drop-hint");

  const objectUrls = new Map();
  const weatherCache = { key: "", data: null, at: 0 };
  let dbPromise = null;
  let selectedId = null;
  let drag = null;
  let slideshowTimer = null;
  let idleTimer = null;
  let quoteIndex = 0;
  let widgetFileTarget = null;

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `w_${Math.random().toString(36).slice(2)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
    ));
  }

  function defaultState() {
    return {
      version: 1,
      editing: true,
      helpSeen: false,
      background: {
        mode: "aurora",
        dim: 16,
        kenBurns: true,
        intervalSec: 45,
        assetIds: [],
        slide: 0,
      },
      widgets: [
        { id: uid(), type: "text", x: 6, y: 8, w: 52, h: 8, props: { text: "Local display", variant: "kicker", color: "#e8c07a", size: 18, align: "left" } },
        { id: uid(), type: "clock", x: 6, y: 16, w: 58, h: 20, props: { hour12: true, seconds: false, color: "#f4f1ea", size: 92, align: "left" } },
        { id: uid(), type: "date", x: 6, y: 37, w: 42, h: 8, props: { color: "#f4f1ea", size: 22, align: "left" } },
        { id: uid(), type: "weather", x: 70, y: 8, w: 24, h: 16, props: { city: DEFAULT_CITY, color: "#f4f1ea", size: 18, align: "right" } },
        { id: uid(), type: "quote", x: 6, y: 76, w: 62, h: 16, props: { color: "#f4f1ea", size: 28, align: "left" } },
      ],
    };
  }

  let state = defaultState();

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("assets")) db.createObjectStore("assets", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function putAsset(file) {
    const id = uid();
    const record = { id, name: file.name, mime: file.type, blob: file };
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("assets", "readwrite");
      tx.objectStore("assets").put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    return id;
  }

  async function getAsset(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("assets", "readonly");
      const req = tx.objectStore("assets").get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function assetUrl(id) {
    if (!id) return "";
    if (objectUrls.has(id)) return objectUrls.get(id);
    const record = await getAsset(id);
    if (!record) return "";
    const url = URL.createObjectURL(record.blob);
    objectUrls.set(id, url);
    return url;
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1 && Array.isArray(parsed.widgets)) {
        state = { ...defaultState(), ...parsed };
      }
    } catch {
      state = defaultState();
    }
  }

  function toastMsg(message) {
    toast.hidden = false;
    toast.textContent = message;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.hidden = true; }, 2400);
  }

  function closeMenus() {
    addMenu.hidden = true;
  }

  function applyEditing() {
    document.body.classList.toggle("editing", state.editing);
    $("toggle-edit").textContent = state.editing ? "Present" : "Edit";
    $("mode-pill").textContent = state.editing ? "Edit" : "Present";
    if (!state.editing) {
      selectedId = null;
      inspector.hidden = true;
      bgPanel.hidden = true;
      closeMenus();
    }
  }

  function widgetById(id) {
    return state.widgets.find((w) => w.id === id);
  }

  function clockHtml(props, now = new Date()) {
    const opts = { hour: "numeric", minute: "2-digit", hour12: !!props.hour12 };
    if (props.seconds) opts.second = "2-digit";
    let text = now.toLocaleTimeString([], opts);
    let ampm = "";
    if (props.hour12) {
      const parts = text.split(" ");
      ampm = parts[1] || "";
      text = parts[0];
    }
    return `<div class="clock" style="font-size:${props.size}px">${escapeHtml(text)}${ampm ? `<span class="ampm">${escapeHtml(ampm)}</span>` : ""}</div>`;
  }

  function dateHtml(props, now = new Date()) {
    const text = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    return `<div class="date" style="font-size:${props.size}px">${escapeHtml(text)}</div>`;
  }

  function textHtml(widget) {
    const { variant, text, size } = widget.props;
    const cls = variant === "kicker" ? "kicker" : variant === "title" ? "title" : "text-body";
    return `<div class="${cls}" style="font-size:${size}px">${escapeHtml(text)}</div>`;
  }

  function quoteHtml(props) {
    const [line, who] = QUOTES[quoteIndex % QUOTES.length];
    return `<blockquote class="quote" style="font-size:${props.size}px">${escapeHtml(line)}<cite>${escapeHtml(who)}</cite></blockquote>`;
  }

  function weatherHtml(props) {
    const data = weatherCache.data;
    if (!data) {
      return `<div class="weather" style="font-size:${props.size}px">${escapeHtml(props.city)}<div class="weather-meta">Loading weather…</div></div>`;
    }
    const [label, icon] = WMO[data.code] || ["Weather", "·"];
    return `<div class="weather" style="font-size:${props.size}px">
      <div class="weather-row"><span>${icon}</span><span class="weather-temp">${data.temp}°</span></div>
      <div class="weather-meta">${escapeHtml(data.label)} · ${escapeHtml(label)}</div>
    </div>`;
  }

  function noteHtml(props) {
    return `<div class="note" style="font-size:${props.size}px">${escapeHtml(props.text || "Write a note…")}</div>`;
  }

  function imageHtml() {
    return `<img class="fit" alt="" />`;
  }

  function renderWidgetContent(widget) {
    switch (widget.type) {
      case "clock": return clockHtml(widget.props);
      case "date": return dateHtml(widget.props);
      case "text": return textHtml(widget);
      case "quote": return quoteHtml(widget.props);
      case "weather": return weatherHtml(widget.props);
      case "note": return noteHtml(widget.props);
      case "image": return imageHtml();
      default: return "";
    }
  }

  function styleWidget(el, widget) {
    el.style.left = `${widget.x}%`;
    el.style.top = `${widget.y}%`;
    el.style.width = `${widget.w}%`;
    el.style.height = `${widget.h}%`;
    el.style.color = widget.props.color || "#f4f1ea";
    el.style.textAlign = widget.props.align || "left";
    el.style.alignItems = widget.props.align === "center" ? "center" : widget.props.align === "right" ? "flex-end" : "flex-start";
  }

  async function fillImages() {
    for (const widget of state.widgets) {
      if (widget.type !== "image") continue;
      const el = widgetsEl.querySelector(`[data-id="${widget.id}"] img`);
      if (!el) continue;
      el.src = await assetUrl(widget.props.assetId);
    }
  }

  function renderWidgets() {
    widgetsEl.innerHTML = state.widgets.map((widget) => `
      <div class="widget${widget.id === selectedId ? " selected" : ""}" data-id="${widget.id}">
        <div class="body">${renderWidgetContent(widget)}</div>
        <div class="resize" data-resize="1"></div>
      </div>
    `).join("");
    for (const widget of state.widgets) {
      const el = widgetsEl.querySelector(`[data-id="${widget.id}"]`);
      if (el) styleWidget(el, widget);
    }
    fillImages();
  }

  async function applyBackground() {
    const bg = state.background;
    dimEl.style.background = `rgba(6, 7, 10, ${bg.dim / 100})`;
    bgEl.className = "";
    bgEl.classList.toggle("kenburns", !!bg.kenBurns && (bg.mode === "photo" || bg.mode === "online"));
    clearInterval(slideshowTimer);
    slideshowTimer = null;

    if (bg.mode === "aurora") {
      bgEl.classList.add("bg-aurora");
      bgEl.innerHTML = '<i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i><i class="blob b4"></i>';
      return;
    }
    if (bg.mode === "dusk" || bg.mode === "noir") {
      bgEl.classList.add(`bg-${bg.mode}`);
      bgEl.innerHTML = "";
      return;
    }

    if (bg.mode === "online") {
      const tick = () => {
        bgEl.innerHTML = `<img alt="" referrerpolicy="no-referrer" src="https://picsum.photos/1920/1080?random=${Date.now()}" />`;
      };
      tick();
      slideshowTimer = setInterval(tick, Math.max(8, bg.intervalSec) * 1000);
      return;
    }

    const ids = bg.assetIds || [];
    if (!ids.length) {
      bgEl.classList.add("bg-aurora");
      bgEl.innerHTML = '<i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i><i class="blob b4"></i>';
      toastMsg("Choose local files, or drop them on the screen");
      return;
    }

    const show = async (index) => {
      const asset = await getAsset(ids[index % ids.length]);
      if (!asset) return;
      const url = await assetUrl(asset.id);
      if (asset.mime.startsWith("video")) {
        bgEl.innerHTML = `<video autoplay muted loop playsinline src="${url}"></video>`;
      } else {
        bgEl.innerHTML = `<img alt="" src="${url}" />`;
      }
    };

    await show(bg.slide || 0);
    if (bg.mode === "photo" && ids.length > 1) {
      slideshowTimer = setInterval(() => {
        bg.slide = ((bg.slide || 0) + 1) % ids.length;
        persist();
        show(bg.slide);
      }, Math.max(8, bg.intervalSec) * 1000);
    }
  }

  async function refreshWeather(force = false) {
    const widget = state.widgets.find((w) => w.type === "weather");
    const city = widget?.props.city || DEFAULT_CITY;
    if (!force && weatherCache.data && weatherCache.key === city && Date.now() - weatherCache.at < 15 * 60 * 1000) {
      renderWidgets();
      return;
    }
    try {
      const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`).then((r) => r.json());
      const place = geo.results?.[0];
      if (!place) throw new Error("City not found");
      const data = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`).then((r) => r.json());
      weatherCache.key = city;
      weatherCache.at = Date.now();
      weatherCache.data = {
        temp: Math.round(data.current.temperature_2m),
        code: data.current.weather_code,
        label: [place.name, place.admin1].filter(Boolean).join(", "),
      };
    } catch {
      weatherCache.data = weatherCache.data || { temp: "–", code: 2, label: city };
    }
    renderWidgets();
  }

  function tick() {
    const now = new Date();
    for (const widget of state.widgets) {
      const body = widgetsEl.querySelector(`[data-id="${widget.id}"] .body`);
      if (!body) continue;
      if (widget.type === "clock") body.innerHTML = clockHtml(widget.props, now);
      if (widget.type === "date") body.innerHTML = dateHtml(widget.props, now);
    }
  }

  function selectWidget(id) {
    selectedId = id;
    for (const el of widgetsEl.querySelectorAll(".widget")) {
      el.classList.toggle("selected", el.dataset.id === id);
    }
    if (!id || !state.editing) {
      inspector.hidden = true;
      return;
    }
    inspector.hidden = false;
    renderInspector();
  }

  function field(label, control) {
    return `<label>${escapeHtml(label)}${control}</label>`;
  }

  function renderInspector() {
    const widget = widgetById(selectedId);
    if (!widget) {
      inspector.hidden = true;
      return;
    }
    $("inspector-title").textContent = widget.type[0].toUpperCase() + widget.type.slice(1);
    const p = widget.props;
    const parts = [
      field("Color", `<input id="p-color" type="text" value="${escapeHtml(p.color || "#f4f1ea")}" />`),
      field("Size", `<input id="p-size" type="number" min="10" max="180" value="${p.size || 24}" />`),
      field("Align", `<select id="p-align"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>`),
    ];
    if (widget.type === "text") {
      parts.unshift(field("Text", `<input id="p-text" type="text" value="${escapeHtml(p.text || "")}" />`));
      parts.push(field("Style", `<select id="p-variant"><option value="kicker">Kicker</option><option value="title">Title</option><option value="body">Body</option></select>`));
    }
    if (widget.type === "note") {
      parts.unshift(field("Note", `<textarea id="p-text" rows="4">${escapeHtml(p.text || "")}</textarea>`));
    }
    if (widget.type === "clock") {
      parts.push(`<label class="check"><input id="p-hour12" type="checkbox"${p.hour12 ? " checked" : ""} /> 12-hour clock</label>`);
      parts.push(`<label class="check"><input id="p-seconds" type="checkbox"${p.seconds ? " checked" : ""} /> Show seconds</label>`);
    }
    if (widget.type === "weather") {
      parts.unshift(field("City", `<input id="p-city" type="text" value="${escapeHtml(p.city || DEFAULT_CITY)}" />`));
    }
    if (widget.type === "image") {
      parts.unshift(`<button type="button" id="p-pick-image">Choose image…</button>`);
    }
    inspectorBody.innerHTML = parts.join("");
    const align = $("p-align");
    if (align) align.value = p.align || "left";
    const variant = $("p-variant");
    if (variant) variant.value = p.variant || "body";
  }

  function bindInspector() {
    function paintWidget(widget) {
      const el = widgetsEl.querySelector(`[data-id="${widget.id}"]`);
      if (!el) return;
      el.querySelector(".body").innerHTML = renderWidgetContent(widget);
      styleWidget(el, widget);
    }

    inspectorBody.addEventListener("input", (event) => {
      const widget = widgetById(selectedId);
      if (!widget) return;
      const id = event.target.id;
      if (id === "p-color") widget.props.color = event.target.value;
      if (id === "p-size") widget.props.size = Number(event.target.value) || widget.props.size;
      if (id === "p-align") widget.props.align = event.target.value;
      if (id === "p-text") widget.props.text = event.target.value;
      if (id === "p-variant") widget.props.variant = event.target.value;
      if (id === "p-city") widget.props.city = event.target.value;
      persist();
      paintWidget(widget);
    });
    inspectorBody.addEventListener("change", async (event) => {
      const widget = widgetById(selectedId);
      if (!widget) return;
      if (event.target.id === "p-hour12") widget.props.hour12 = event.target.checked;
      if (event.target.id === "p-seconds") widget.props.seconds = event.target.checked;
      if (event.target.id === "p-align") widget.props.align = event.target.value;
      if (event.target.id === "p-variant") widget.props.variant = event.target.value;
      persist();
      paintWidget(widget);
      if (event.target.id === "p-city") await refreshWeather(true);
    });
    inspectorBody.addEventListener("click", (event) => {
      if (event.target.id === "p-pick-image") {
        widgetFileTarget = selectedId;
        $("file-widget").click();
      }
    });
  }

  function addWidget(type) {
    const presets = {
      clock: { w: 40, h: 16, props: { hour12: true, seconds: false, color: "#f4f1ea", size: 72, align: "left" } },
      date: { w: 36, h: 8, props: { color: "#f4f1ea", size: 22, align: "left" } },
      text: { w: 40, h: 10, props: { text: "New text", variant: "title", color: "#f4f1ea", size: 42, align: "left" } },
      image: { w: 28, h: 28, props: { assetId: "", color: "#f4f1ea", size: 16, align: "left" } },
      weather: { w: 22, h: 16, props: { city: DEFAULT_CITY, color: "#f4f1ea", size: 18, align: "left" } },
      quote: { w: 48, h: 16, props: { color: "#f4f1ea", size: 26, align: "left" } },
      note: { w: 28, h: 18, props: { text: "A note on this display", color: "#f4f1ea", size: 18, align: "left" } },
    };
    const preset = presets[type];
    if (!preset) return;
    const widget = { id: uid(), type, x: 12 + (state.widgets.length % 5) * 4, y: 18 + (state.widgets.length % 4) * 6, ...preset };
    state.widgets.push(widget);
    persist();
    renderWidgets();
    selectWidget(widget.id);
    if (type === "weather") refreshWeather(true);
    if (type === "image") {
      widgetFileTarget = widget.id;
      $("file-widget").click();
    }
    closeMenus();
  }

  function deleteSelected() {
    if (!selectedId) return;
    state.widgets = state.widgets.filter((w) => w.id !== selectedId);
    selectedId = null;
    persist();
    renderWidgets();
    inspector.hidden = true;
  }

  function duplicateSelected() {
    const widget = widgetById(selectedId);
    if (!widget) return;
    const copy = { ...widget, id: uid(), x: Math.min(80, widget.x + 4), y: Math.min(80, widget.y + 4), props: { ...widget.props } };
    state.widgets.push(copy);
    persist();
    renderWidgets();
    selectWidget(copy.id);
  }

  function percentPoint(event) {
    const rect = stage.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  }

  function onPointerDown(event) {
    if (!state.editing) return;
    const widgetEl = event.target.closest(".widget");
    if (!widgetEl) {
      selectWidget(null);
      return;
    }
    const widget = widgetById(widgetEl.dataset.id);
    if (!widget) return;
    selectWidget(widget.id);
    const pt = percentPoint(event);
    drag = {
      id: widget.id,
      resize: !!event.target.closest("[data-resize]"),
      dx: pt.x - widget.x,
      dy: pt.y - widget.y,
      startW: widget.w,
      startH: widget.h,
      startX: pt.x,
      startY: pt.y,
    };
    widgetEl.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (!drag) return;
    const widget = widgetById(drag.id);
    if (!widget) return;
    const pt = percentPoint(event);
    if (drag.resize) {
      widget.w = Math.max(8, Math.min(96, drag.startW + (pt.x - drag.startX)));
      widget.h = Math.max(6, Math.min(90, drag.startH + (pt.y - drag.startY)));
    } else {
      widget.x = Math.max(0, Math.min(92, pt.x - drag.dx));
      widget.y = Math.max(0, Math.min(92, pt.y - drag.dy));
    }
    const el = widgetsEl.querySelector(`[data-id="${widget.id}"]`);
    if (el) styleWidget(el, widget);
  }

  function onPointerUp() {
    if (!drag) return;
    drag = null;
    persist();
  }

  async function ingestFiles(files, asBackground = true) {
    const list = [...files].filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (!list.length) return;
    const ids = [];
    for (const file of list) ids.push(await putAsset(file));
    if (asBackground) {
      state.background.assetIds = ids;
      state.background.mode = list[0].type.startsWith("video/") ? "video" : "photo";
      state.background.slide = 0;
      $("bg-mode").value = state.background.mode;
      persist();
      await applyBackground();
      toastMsg(list[0].type.startsWith("video/") ? "Video background set" : `${ids.length} photo${ids.length > 1 ? "s" : ""} ready`);
    } else if (widgetFileTarget) {
      const widget = widgetById(widgetFileTarget);
      if (widget) {
        widget.props.assetId = ids[0];
        persist();
        renderWidgets();
        selectWidget(widget.id);
      }
      widgetFileTarget = null;
    }
  }

  function syncBgForm() {
    $("bg-mode").value = state.background.mode;
    $("bg-dim").value = state.background.dim;
    $("bg-kenburns").checked = !!state.background.kenBurns;
    $("bg-interval").value = state.background.intervalSec;
  }

  function exportLayout() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "splash-canvas-layout.json";
    a.click();
    toastMsg("Layout exported (photos stay in this browser)");
  }

  function importLayout(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed?.widgets) throw new Error("Invalid layout");
        state = { ...defaultState(), ...parsed, version: 1 };
        persist();
        boot(false);
        toastMsg("Layout imported");
      } catch {
        toastMsg("Could not import that file");
      }
    };
    reader.readAsText(file);
  }

  function resetIdle() {
    document.body.classList.remove("idle-cursor");
    clearTimeout(idleTimer);
    if (state.editing) return;
    idleTimer = setTimeout(() => document.body.classList.add("idle-cursor"), 2500);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }

  function bind() {
    widgetsEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    $("toggle-edit").addEventListener("click", () => {
      state.editing = !state.editing;
      persist();
      applyEditing();
      resetIdle();
    });
    $("open-bg").addEventListener("click", () => {
      bgPanel.hidden = !bgPanel.hidden;
      addMenu.hidden = true;
      syncBgForm();
    });
    $("open-add").addEventListener("click", () => {
      if (!state.editing) {
        state.editing = true;
        applyEditing();
      }
      addMenu.hidden = !addMenu.hidden;
      bgPanel.hidden = true;
    });
    addMenu.addEventListener("click", (event) => {
      const type = event.target.dataset.add;
      if (type) addWidget(type);
    });
    $("fullscreen").addEventListener("click", toggleFullscreen);
    $("export-layout").addEventListener("click", exportLayout);
    $("import-layout").addEventListener("click", () => $("file-import").click());
    $("reset-layout").addEventListener("click", () => {
      if (!confirm("Reset to the starter layout?")) return;
      state = defaultState();
      persist();
      boot(false);
    });
    $("delete-widget").addEventListener("click", deleteSelected);
    $("duplicate-widget").addEventListener("click", duplicateSelected);
    $("inspector-close").addEventListener("click", () => selectWidget(null));
    $("bg-panel-close").addEventListener("click", () => { bgPanel.hidden = true; });
    $("help-close").addEventListener("click", () => {
      help.hidden = true;
      state.helpSeen = true;
      persist();
    });
    $("pick-bg").addEventListener("click", () => $("file-bg").click());
    $("clear-bg-files").addEventListener("click", async () => {
      state.background.assetIds = [];
      state.background.mode = "aurora";
      persist();
      syncBgForm();
      await applyBackground();
    });
    $("file-bg").addEventListener("change", (event) => ingestFiles(event.target.files, true));
    $("file-widget").addEventListener("change", (event) => ingestFiles(event.target.files, false));
    $("file-import").addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) importLayout(file);
    });
    $("bg-mode").addEventListener("change", async (event) => {
      state.background.mode = event.target.value;
      persist();
      await applyBackground();
    });
    $("bg-dim").addEventListener("input", (event) => {
      state.background.dim = Number(event.target.value);
      dimEl.style.background = `rgba(6, 7, 10, ${state.background.dim / 100})`;
      persist();
    });
    $("bg-kenburns").addEventListener("change", async (event) => {
      state.background.kenBurns = event.target.checked;
      persist();
      await applyBackground();
    });
    $("bg-interval").addEventListener("change", async (event) => {
      state.background.intervalSec = Number(event.target.value) || 45;
      persist();
      await applyBackground();
    });

    window.addEventListener("dragenter", (event) => {
      event.preventDefault();
      if (event.dataTransfer?.types?.contains?.("Files") || [...(event.dataTransfer?.types || [])].includes("Files")) {
        dropHint.hidden = false;
      }
    });
    window.addEventListener("dragover", (event) => event.preventDefault());
    window.addEventListener("dragleave", (event) => {
      if (!event.relatedTarget) dropHint.hidden = true;
    });
    window.addEventListener("drop", (event) => {
      event.preventDefault();
      dropHint.hidden = true;
      if (event.dataTransfer?.files?.length) ingestFiles(event.dataTransfer.files, true);
    });

    window.addEventListener("keydown", (event) => {
      if (event.target.matches("input, textarea")) return;
      if (event.key === "e" || event.key === "E") {
        state.editing = !state.editing;
        persist();
        applyEditing();
      } else if (event.key === "f" || event.key === "F") {
        toggleFullscreen();
      } else if (event.key === "?" || event.key === "/") {
        help.hidden = !help.hidden;
      } else if (event.key === "Escape") {
        help.hidden = true;
        bgPanel.hidden = true;
        closeMenus();
        if (state.editing) {
          state.editing = false;
          persist();
          applyEditing();
        } else if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      } else if ((event.key === "Backspace" || event.key === "Delete") && state.editing) {
        deleteSelected();
      }
      resetIdle();
    });

    ["pointermove", "pointerdown"].forEach((name) => window.addEventListener(name, resetIdle));
    bindInspector();
  }

  async function boot(showHelpIfNeeded = true) {
    applyEditing();
    syncBgForm();
    renderWidgets();
    await applyBackground();
    await refreshWeather(true);
    tick();
    if (showHelpIfNeeded && !state.helpSeen) help.hidden = false;
    else help.hidden = true;
  }

  loadState();
  bind();
  boot();
  setInterval(tick, 1000);
  setInterval(() => {
    quoteIndex = (quoteIndex + 1) % QUOTES.length;
    for (const widget of state.widgets) {
      if (widget.type !== "quote") continue;
      const body = widgetsEl.querySelector(`[data-id="${widget.id}"] .body`);
      if (body) body.innerHTML = quoteHtml(widget.props);
    }
  }, 90 * 1000);
  setInterval(() => refreshWeather(false), 15 * 60 * 1000);
})();
