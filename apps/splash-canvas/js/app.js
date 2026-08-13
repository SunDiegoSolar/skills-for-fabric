import { invert, lookAt, multiply, perspective, subtract, transformPoint, normalize, applyWarp, inverseWarp } from "./math.js";
import { loadObj, parseObj, pickFace, setFaceDest, syncFaceDest } from "./obj.js";
import { basename, identityWarp, loadSplashJson, toSplashJson } from "./project.js";
import { createRenderer } from "./render.js";
import { makeTestPattern } from "./pattern.js";
import { makeShape, SHAPES } from "./shapes.js";
import { makeSpooky } from "./spooky.js";
import { IDEAS, riffFrom, riffFromText, surprise } from "./ideas.js";

const $ = (id) => document.getElementById(id);

const HINTS = {
  geometry: "Click a shape, then drop a photo. Drag to orbit. Open Place to put it on a wall.",
  warp: "Drag gold corners to place this face. White points warp the whole output. Scroll to scale.",
  mask: "Paint to hide pixels. Shift-drag restores. Clear mask if you go too far.",
  present: "",
};

const state = {
  mode: "geometry",
  shapeId: "quad",
  mesh: { faces: [] },
  warp: identityWarp(),
  camera: { yaw: 0.55, pitch: 0.28, dist: 3.1 },
  selectedFace: -1,
  mediaEl: null,
  graph: { objects: [], links: [] },
  flags: {
    omitBlack: 0,
    invertMask: false,
    invertFaces: false,
    invertChannels: false,
    flip: false,
    flop: false,
    threshold: 0.08,
    blackLevel: 0,
    showGrid: true,
    mediaTarget: "all",
  },
};

const canvas = $("gl");
const overlay = $("overlay");
const octx = overlay.getContext("2d");
const maskCanvas = document.createElement("canvas");
maskCanvas.width = 1024;
maskCanvas.height = 1024;
const mctx = maskCanvas.getContext("2d");
mctx.fillStyle = "#fff";
mctx.fillRect(0, 0, 1024, 1024);

const history = [];
const future = [];
let renderer;
let drag = null;
let pointers = new Map();
let last = performance.now();

function toast(message) {
  const el = $("toast");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, 2200);
}

function capture() {
  return JSON.stringify({
    shapeId: state.shapeId,
    warp: state.warp,
    flags: state.flags,
    selectedFace: state.selectedFace,
    faces: state.mesh.faces.map((face) => ({
      id: face.id,
      name: face.name,
      dest: face.dest.map((p) => [...p]),
      omit: face.omit,
      anim: { ...face.anim },
    })),
  });
}

function snapshot() {
  history.push(capture());
  if (history.length > 60) history.shift();
  future.length = 0;
}

function applySnap(raw) {
  const snap = JSON.parse(raw);
  state.warp = snap.warp;
  Object.assign(state.flags, snap.flags);
  if (snap.shapeId) state.shapeId = snap.shapeId;
  for (const saved of snap.faces) {
    const face = state.mesh.faces[saved.id];
    if (!face) continue;
    face.dest = saved.dest;
    face.omit = saved.omit;
    face.anim = saved.anim;
    syncFaceDest(face);
  }
  if (typeof snap.selectedFace === "number") state.selectedFace = snap.selectedFace;
  refreshFaces();
}

function undo() {
  if (!history.length) return;
  future.push(capture());
  applySnap(history.pop());
  toast("Undo");
}

function redo() {
  if (!future.length) return;
  history.push(capture());
  applySnap(future.pop());
  toast("Redo");
}

function resizeOverlay() {
  overlay.width = canvas.clientWidth;
  overlay.height = canvas.clientHeight;
}

function mvp() {
  const eye = [
    Math.cos(state.camera.yaw) * Math.cos(state.camera.pitch) * state.camera.dist,
    Math.sin(state.camera.pitch) * state.camera.dist,
    Math.sin(state.camera.yaw) * Math.cos(state.camera.pitch) * state.camera.dist,
  ];
  return {
    eye,
    matrix: multiply(
      perspective(45, canvas.clientWidth / Math.max(1, canvas.clientHeight), 0.05, 40),
      lookAt(eye, [0, 0, 0], [0, 1, 0]),
    ),
  };
}

function ndcFromEvent(event) {
  const r = canvas.getBoundingClientRect();
  return [
    ((event.clientX - r.left) / r.width) * 2 - 1,
    -(((event.clientY - r.top) / r.height) * 2 - 1),
  ];
}

function projectPoint(v3, matrix) {
  const p = transformPoint(matrix, [v3[0], v3[1], v3[2], 1]);
  const w = p[3] || 1;
  return [
    ((p[0] / w + 1) * 0.5) * overlay.width,
    (1 - (p[1] / w + 1) * 0.5) * overlay.height,
  ];
}

function toScreen(x, y) {
  return [((x + 1) * 0.5) * overlay.width, (1 - (y + 1) * 0.5) * overlay.height];
}

function destScreen(face, index) {
  const d = face.dest[index];
  const warped = applyWarp(state.warp, d[0], d[1]);
  return toScreen(warped[0], warped[1]);
}

function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const xi = pts[i][0];
    const yi = pts[i][1];
    const xj = pts[j][0];
    const yj = pts[j][1];
    const hit = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-8) + xi);
    if (hit) inside = !inside;
  }
  return inside;
}

function pickGeometry(event) {
  const [nx, ny] = ndcFromEvent(event);
  const { eye, matrix } = mvp();
  const inv = invert(matrix);
  const near = transformPoint(inv, [nx, ny, -1, 1]);
  const far = transformPoint(inv, [nx, ny, 1, 1]);
  const n3 = [near[0] / near[3], near[1] / near[3], near[2] / near[3]];
  const f3 = [far[0] / far[3], far[1] / far[3], far[2] / far[3]];
  return pickFace(state.mesh, eye, normalize(subtract(f3, n3)));
}

function hitHandle(event) {
  const r = overlay.getBoundingClientRect();
  const sx = event.clientX - r.left;
  const sy = event.clientY - r.top;
  const near = (x, y) => Math.hypot(x - sx, y - sy) < 14;
  if (state.mode !== "warp") return null;
  for (let i = 0; i < state.warp.points.length; i += 1) {
    const [x, y] = toScreen(state.warp.points[i][0], state.warp.points[i][1]);
    if (near(x, y)) return { kind: "warp", index: i };
  }
  const face = state.mesh.faces[state.selectedFace];
  if (face) {
    for (let i = 0; i < face.dest.length; i += 1) {
      const [x, y] = destScreen(face, i);
      if (near(x, y)) return { kind: "dest", face: face.id, index: i };
    }
    const poly = face.dest.map((_, i) => destScreen(face, i));
    if (pointInPoly(sx, sy, poly)) return { kind: "move-face" };
  }
  return null;
}

function drawOverlay() {
  resizeOverlay();
  octx.clearRect(0, 0, overlay.width, overlay.height);
  if (state.mode === "present") return;
  const matrix = mvp().matrix;
  const face = state.mesh.faces[state.selectedFace];
  if (face && state.mode === "geometry") {
    octx.strokeStyle = "rgba(232,192,122,0.95)";
    octx.lineWidth = 2;
    octx.beginPath();
    face.verts.forEach((v, i) => {
      const [x, y] = projectPoint(v, matrix);
      if (i === 0) octx.moveTo(x, y);
      else octx.lineTo(x, y);
    });
    octx.closePath();
    octx.stroke();
    const [lx, ly] = projectPoint(face.verts[0], matrix);
    octx.fillStyle = "#e8c07a";
    octx.font = "600 12px Outfit, sans-serif";
    octx.fillText(face.name || `Face ${face.id}`, lx + 8, ly - 8);
  }
  if (face && state.mode === "warp") {
    octx.strokeStyle = "rgba(232,192,122,0.95)";
    octx.lineWidth = 2;
    octx.beginPath();
    face.dest.forEach((_, i) => {
      const [x, y] = destScreen(face, i);
      if (i === 0) octx.moveTo(x, y);
      else octx.lineTo(x, y);
    });
    octx.closePath();
    octx.stroke();
    face.dest.forEach((_, i) => {
      const [x, y] = destScreen(face, i);
      octx.fillStyle = "#e8c07a";
      octx.beginPath();
      octx.arc(x, y, 6, 0, Math.PI * 2);
      octx.fill();
    });
  }
  if (state.mode === "warp") {
    octx.strokeStyle = "rgba(244,241,234,0.28)";
    const [cols, rows] = state.warp.patchSize;
    for (let j = 0; j < rows; j += 1) {
      octx.beginPath();
      for (let i = 0; i < cols; i += 1) {
        const [x, y] = toScreen(state.warp.points[j * cols + i][0], state.warp.points[j * cols + i][1]);
        if (i === 0) octx.moveTo(x, y);
        else octx.lineTo(x, y);
      }
      octx.stroke();
    }
    for (let i = 0; i < cols; i += 1) {
      octx.beginPath();
      for (let j = 0; j < rows; j += 1) {
        const [x, y] = toScreen(state.warp.points[j * cols + i][0], state.warp.points[j * cols + i][1]);
        if (j === 0) octx.moveTo(x, y);
        else octx.lineTo(x, y);
      }
      octx.stroke();
    }
    state.warp.points.forEach((p) => {
      const [x, y] = toScreen(p[0], p[1]);
      octx.fillStyle = "#f4f1ea";
      octx.beginPath();
      octx.arc(x, y, 5, 0, Math.PI * 2);
      octx.fill();
    });
  }
  if (state.mode === "mask") {
    octx.globalAlpha = 0.38;
    octx.drawImage(maskCanvas, 0, 0, overlay.width, overlay.height);
    octx.globalAlpha = 1;
  }
}

function updateHint() {
  const el = $("hint");
  if (el) el.textContent = HINTS[state.mode] || HINTS.geometry;
}

function refreshFaces() {
  const list = $("face-list");
  if (list) {
    list.innerHTML = state.mesh.faces.map((face) => {
      const on = face.id === state.selectedFace ? "active" : "";
      const omitted = face.omit ? "omitted" : "";
      const label = face.name || `Face ${face.id}`;
      return `<button class="${on} ${omitted}" data-face="${face.id}">${label}${face.omit ? " · hidden" : ""}${face.media ? " · media" : ""}</button>`;
    }).join("");
  }
  const face = state.mesh.faces[state.selectedFace];
  const meta = $("face-meta");
  if (meta) {
    if (!face) meta.textContent = "Click a shape to begin";
    else meta.textContent = `${face.name || "Face " + face.id} · ${state.mesh.label || state.shapeId} · ${state.mesh.faces.length} face${state.mesh.faces.length === 1 ? "" : "s"}`;
  }
  const dir = $("anim-dir");
  const speed = $("anim-speed");
  if (face && dir && speed) {
    if (!face.anim.speed) dir.value = "off";
    else if (face.anim.dirU > 0) dir.value = "u+";
    else if (face.anim.dirU < 0) dir.value = "u-";
    else if (face.anim.dirV > 0) dir.value = "v+";
    else if (face.anim.dirV < 0) dir.value = "v-";
    else dir.value = "off";
    speed.value = Math.round((face.anim.speed || 0) * 100);
  }
  for (const btn of document.querySelectorAll("[data-shape]")) {
    btn.classList.toggle("active", btn.dataset.shape === state.shapeId);
  }
  document.body.dataset.shape = state.shapeId;
}

function setGraph(label) {
  state.graph = {
    objects: [
      { name: "mesh", type: "mesh", file: label },
      { name: "object", type: "object", file: "" },
      { name: "warp", type: "warp", file: "4×4 bezier" },
      { name: "window", type: "window", file: "" },
    ],
    links: [
      { from: "mesh", to: "object" },
      { from: "object", to: "warp" },
      { from: "warp", to: "window" },
    ],
  };
}

function setMode(mode) {
  state.mode = mode;
  document.body.dataset.mode = mode;
  for (const btn of document.querySelectorAll("[data-mode]")) {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  }
  updateHint();
}

function useMesh(mesh, shapeId, message) {
  state.mesh = mesh;
  state.shapeId = shapeId || state.shapeId;
  state.selectedFace = mesh.faces[0] ? 0 : -1;
  state.camera = { yaw: 0.55, pitch: 0.28, dist: 3.1 };
  setGraph(mesh.label || shapeId);
  refreshFaces();
  if (message) toast(message);
}

function applyShape(id) {
  const spec = SHAPES.find((s) => s.id === id) || SHAPES[0];
  snapshot();
  useMesh(spec.make(), spec.id, `${spec.label} ready — drop a photo, then open Place`);
}

function applyLook(idea) {
  state.flags.omitBlack = idea.omitBlack ?? 0;
  state.flags.invertChannels = !!idea.invertCh;
  const anim = idea.anim || { dirU: 0, dirV: 0, speed: 0 };
  for (const face of state.mesh.faces) {
    face.anim = { u: 0, v: 0, speed: anim.speed || 0, dirU: anim.dirU || 0, dirV: anim.dirV || 0 };
  }
  if ($("omit-black")) $("omit-black").value = String(state.flags.omitBlack);
  if ($("invert-ch")) $("invert-ch").checked = !!state.flags.invertChannels;
}

function applyIdea(idea) {
  if (!idea) return;
  snapshot();
  const spec = SHAPES.find((s) => s.id === idea.shape) || SHAPES[0];
  useMesh(spec.make(), spec.id);
  applyLook(idea);
  state.mediaEl = makeSpooky(idea.pattern);
  refreshFaces();
  if ($("idea-seed")) $("idea-seed").value = idea.title;
  toast(idea.how);
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

function ideaCard(idea) {
  return `<article class="idea-card" data-idea="${esc(idea.id)}">
    <h3>${esc(idea.title)}</h3>
    <p>${esc(idea.how)}</p>
    <p>Shape <code>${esc(idea.shape)}</code> · drop <code>${esc(idea.files)}</code></p>
    <div class="row">
      <button type="button" data-use="${esc(idea.id)}">Use</button>
      <button type="button" class="ghost" data-riff="${esc(idea.id)}">Riff this</button>
    </div>
  </article>`;
}

const riffs = [];

function renderIdeas() {
  const list = $("idea-list");
  const extra = $("idea-riffs");
  if (list) list.innerHTML = IDEAS.map(ideaCard).join("");
  if (extra) extra.innerHTML = riffs.length ? riffs.map(ideaCard).join("") : "<p class='muted'>Type a spark above, or riff any starter.</p>";
}

function findIdea(id) {
  return riffs.find((i) => i.id === id) || IDEAS.find((i) => i.id === id);
}

function addRiff(idea) {
  riffs.unshift(idea);
  if (riffs.length > 12) riffs.pop();
  renderIdeas();
  applyIdea(idea);
}

function openIdeas() {
  const panel = $("ideas");
  if (!panel) return;
  panel.hidden = false;
  document.body.dataset.ideas = "on";
  $("idea-seed")?.focus();
}

function closeIdeas() {
  const panel = $("ideas");
  if (panel) panel.hidden = true;
  document.body.dataset.ideas = "off";
}

async function loadMeshText(text, label) {
  snapshot();
  const mesh = parseObj(text);
  mesh.label = label;
  useMesh(mesh, "obj", `Loaded ${mesh.faces.length} faces from ${label}`);
}

function setMedia(el, label) {
  if (state.flags.mediaTarget === "face" && state.mesh.faces[state.selectedFace]) {
    state.mesh.faces[state.selectedFace].media = el;
    toast(`Media on ${state.mesh.faces[state.selectedFace].name || "this face"}`);
  } else {
    state.mediaEl = el;
    toast(label);
  }
  refreshFaces();
}

function ingestMediaFile(file) {
  const url = URL.createObjectURL(file);
  if (file.type.startsWith("video/")) {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.play();
    setMedia(video, "Video on the surface");
  } else {
    const img = new Image();
    img.src = url;
    img.onload = () => setMedia(img, "Photo on the surface");
  }
}

async function ingestFiles(fileList) {
  const files = [...fileList];
  const jsons = files.filter((f) => f.name.toLowerCase().endsWith(".json"));
  const objs = files.filter((f) => f.name.toLowerCase().endsWith(".obj"));
  for (const file of jsons) {
    try {
      const project = await loadSplashJson(file);
      state.warp = project.warp;
      state.flags.invertChannels = project.invertChannels;
      state.flags.blackLevel = project.blackLevel;
      state.graph = { objects: project.objects, links: project.links };
      if ($("black-level")) $("black-level").value = Math.round(state.flags.blackLevel * 255);
      if ($("invert-ch")) $("invert-ch").checked = !!state.flags.invertChannels;
      const wanted = basename(project.meshFile);
      const mesh = objs.find((f) => f.name === wanted) || objs[0];
      if (mesh) await loadMeshText(await mesh.text(), mesh.name);
      else toast(`Graph loaded. Drop ${wanted || "the OBJ"} next.`);
    } catch (err) {
      toast(`Could not read Splash JSON: ${err.message}`);
    }
  }
  if (!jsons.length) {
    for (const file of objs) await loadMeshText(await file.text(), file.name);
  }
  for (const file of files) {
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) ingestMediaFile(file);
  }
}

function cloneFace(face) {
  const corners = face.corners.map((c) => ({
    v: [...c.v],
    t: [...c.t],
    dest: [c.dest[0] + 0.06, c.dest[1] - 0.04],
  }));
  const tris = [];
  for (let i = 1; i < corners.length - 1; i += 1) tris.push([corners[0], corners[i], corners[i + 1]]);
  return {
    id: 0,
    name: `${face.name || "Face"} copy`,
    verts: corners.map((c) => c.v),
    uvs: corners.map((c) => c.t),
    dest: corners.map((c) => c.dest),
    corners,
    tris,
    omit: false,
    media: face.media,
    anim: { ...face.anim },
  };
}

function reindex() {
  state.mesh.faces.forEach((face, i) => { face.id = i; });
}

function duplicateFace() {
  const face = state.mesh.faces[state.selectedFace];
  if (!face) return;
  snapshot();
  const copy = cloneFace(face);
  state.mesh.faces.push(copy);
  reindex();
  state.selectedFace = copy.id;
  refreshFaces();
  toast("Duplicated — drag the copy in Place");
}

function deleteFace() {
  if (state.mesh.faces.length <= 1) {
    toast("Keep at least one face, or pick another shape");
    return;
  }
  snapshot();
  state.mesh.faces.splice(state.selectedFace, 1);
  reindex();
  state.selectedFace = Math.min(state.selectedFace, state.mesh.faces.length - 1);
  refreshFaces();
  toast("Face removed");
}

function fitDest() {
  const face = state.mesh.faces[state.selectedFace];
  if (!face) return;
  snapshot();
  const n = face.dest.length;
  if (n === 3) {
    face.dest = [[0, 1], [1, -1], [-1, -1]];
  } else {
    const pts = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
    face.dest = face.dest.map((_, i) => pts[i % 4]);
  }
  syncFaceDest(face);
  refreshFaces();
  toast("This face fills the output");
}

function paintMask(event, erase) {
  const r = overlay.getBoundingClientRect();
  const x = ((event.clientX - r.left) / r.width) * maskCanvas.width;
  const y = ((event.clientY - r.top) / r.height) * maskCanvas.height;
  const rad = 34;
  const grad = mctx.createRadialGradient(x, y, 2, x, y, rad);
  if (erase) {
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
  } else {
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
  }
  mctx.globalCompositeOperation = "source-over";
  mctx.fillStyle = grad;
  mctx.beginPath();
  mctx.arc(x, y, rad, 0, Math.PI * 2);
  mctx.fill();
}

function scaleDest(face, amount) {
  const cx = face.dest.reduce((s, p) => s + p[0], 0) / face.dest.length;
  const cy = face.dest.reduce((s, p) => s + p[1], 0) / face.dest.length;
  face.dest = face.dest.map(([x, y]) => [cx + (x - cx) * amount, cy + (y - cy) * amount]);
  syncFaceDest(face);
}

function onPointerDown(event) {
  overlay.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, event);
  if (state.mode === "mask") {
    drag = { kind: "mask", erase: event.shiftKey || event.altKey };
    paintMask(event, drag.erase);
    return;
  }
  const handle = hitHandle(event);
  if (handle) {
    snapshot();
    const [x, y] = ndcFromEvent(event);
    drag = { ...handle, x, y };
    return;
  }
  if (state.mode === "geometry") {
    const id = pickGeometry(event);
    if (id >= 0) {
      state.selectedFace = id;
      refreshFaces();
    }
    drag = { kind: "orbit", x: event.clientX, y: event.clientY, yaw: state.camera.yaw, pitch: state.camera.pitch, moved: false };
  }
}

function onPointerMove(event) {
  pointers.set(event.pointerId, event);
  if (pointers.size === 2 && state.selectedFace >= 0) {
    const pts = [...pointers.values()];
    const d0 = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
    if (!drag || drag.kind !== "pinch") {
      snapshot();
      drag = { kind: "pinch", dist: d0, dest: state.mesh.faces[state.selectedFace].dest.map((p) => [...p]) };
    } else {
      const scale = d0 / Math.max(8, drag.dist);
      const face = state.mesh.faces[state.selectedFace];
      const cx = drag.dest.reduce((s, p) => s + p[0], 0) / drag.dest.length;
      const cy = drag.dest.reduce((s, p) => s + p[1], 0) / drag.dest.length;
      face.dest = drag.dest.map(([x, y]) => [cx + (x - cx) * scale, cy + (y - cy) * scale]);
      syncFaceDest(face);
    }
    return;
  }
  if (!drag) return;
  const [nx, ny] = ndcFromEvent(event);
  if (drag.kind === "mask") paintMask(event, drag.erase);
  else if (drag.kind === "orbit") {
    const dist = Math.hypot(event.clientX - drag.x, event.clientY - drag.y);
    if (dist < 5 && !drag.moved) return;
    drag.moved = true;
    state.camera.yaw = drag.yaw + (event.clientX - drag.x) * 0.01;
    state.camera.pitch = Math.max(-1.2, Math.min(1.2, drag.pitch + (event.clientY - drag.y) * 0.01));
  } else if (drag.kind === "warp") state.warp.points[drag.index] = [nx, ny];
  else if (drag.kind === "dest") {
    setFaceDest(state.mesh.faces[drag.face], drag.index, inverseWarp(state.warp, nx, ny));
  } else if (drag.kind === "move-face" && state.selectedFace >= 0) {
    const face = state.mesh.faces[state.selectedFace];
    const from = inverseWarp(state.warp, drag.x, drag.y);
    const to = inverseWarp(state.warp, nx, ny);
    face.dest = face.dest.map(([x, y]) => [x + to[0] - from[0], y + to[1] - from[1]]);
    syncFaceDest(face);
    drag.x = nx;
    drag.y = ny;
  }
}

function onPointerUp(event) {
  pointers.delete(event.pointerId);
  drag = null;
}

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  for (const face of state.mesh.faces) {
    if (!face.anim.speed) continue;
    face.anim.u = (face.anim.u + face.anim.speed * (face.anim.dirU || 0) * dt) % 1;
    face.anim.v = (face.anim.v + face.anim.speed * (face.anim.dirV || 0) * dt) % 1;
  }
  renderer.draw({
    mesh: state.mesh,
    warp: state.warp,
    camera: state.camera,
    mode: state.mode === "geometry" ? "geometry" : "output",
    selectedFace: state.selectedFace,
    media: state.mediaEl,
    maskCanvas,
    flags: state.flags,
  });
  drawOverlay();
  requestAnimationFrame(tick);
}

function exportProject() {
  const blob = new Blob([JSON.stringify(toSplashJson(state), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "splash-canvas.json";
  a.click();
  toast("Exported mapping JSON");
}

function bind() {
  overlay.addEventListener("pointerdown", onPointerDown);
  overlay.addEventListener("pointermove", onPointerMove);
  overlay.addEventListener("pointerup", onPointerUp);
  overlay.addEventListener("pointercancel", onPointerUp);
  overlay.addEventListener("wheel", (event) => {
    event.preventDefault();
    if (state.mode === "warp" && state.mesh.faces[state.selectedFace]) {
      scaleDest(state.mesh.faces[state.selectedFace], event.deltaY > 0 ? 0.94 : 1.06);
      return;
    }
    state.camera.dist = Math.max(1.2, Math.min(12, state.camera.dist + event.deltaY * 0.01));
  }, { passive: false });

  document.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });
  $("shape-list")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-shape]");
    if (!btn) return;
    applyShape(btn.dataset.shape);
  });
  $("face-list")?.addEventListener("click", (event) => {
    const id = event.target.dataset.face;
    if (id == null) return;
    state.selectedFace = Number(id);
    refreshFaces();
  });
  $("omit-face")?.addEventListener("click", () => {
    const face = state.mesh.faces[state.selectedFace];
    if (!face) return;
    snapshot();
    face.omit = !face.omit;
    refreshFaces();
  });
  $("dup-face")?.addEventListener("click", duplicateFace);
  $("del-face")?.addEventListener("click", deleteFace);
  $("fit-dest")?.addEventListener("click", fitDest);
  $("reset-camera")?.addEventListener("click", () => {
    state.camera = { yaw: 0.55, pitch: 0.28, dist: 3.1 };
    toast("View reset");
  });
  $("omit-black")?.addEventListener("change", (event) => { state.flags.omitBlack = Number(event.target.value); });
  $("invert-mask")?.addEventListener("change", (event) => { state.flags.invertMask = event.target.checked; });
  $("invert-faces")?.addEventListener("change", (event) => { state.flags.invertFaces = event.target.checked; });
  $("invert-ch")?.addEventListener("change", (event) => { state.flags.invertChannels = event.target.checked; });
  $("flip")?.addEventListener("change", (event) => { state.flags.flip = event.target.checked; });
  $("flop")?.addEventListener("change", (event) => { state.flags.flop = event.target.checked; });
  $("media-target")?.addEventListener("change", (event) => { state.flags.mediaTarget = event.target.value; });
  $("threshold")?.addEventListener("input", (event) => { state.flags.threshold = Number(event.target.value) / 100; });
  $("black-level")?.addEventListener("input", (event) => { state.flags.blackLevel = Number(event.target.value) / 255; });
  $("anim-dir")?.addEventListener("change", (event) => {
    const face = state.mesh.faces[state.selectedFace];
    if (!face) return;
    const v = event.target.value;
    face.anim.dirU = v === "u+" ? 1 : v === "u-" ? -1 : 0;
    face.anim.dirV = v === "v+" ? 1 : v === "v-" ? -1 : 0;
    if (v === "off") face.anim.speed = 0;
    else if (!face.anim.speed) face.anim.speed = 0.08;
  });
  $("anim-speed")?.addEventListener("input", (event) => {
    const face = state.mesh.faces[state.selectedFace];
    if (face) face.anim.speed = Number(event.target.value) / 100;
  });
  $("anim-all")?.addEventListener("click", () => {
    const src = state.mesh.faces[state.selectedFace];
    if (!src) return;
    snapshot();
    for (const face of state.mesh.faces) face.anim = { ...src.anim };
    toast("Motion copied to every face");
  });
  $("clear-mask")?.addEventListener("click", () => {
    snapshot();
    mctx.fillStyle = "#fff";
    mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
  });
  $("reset-warp")?.addEventListener("click", () => {
    snapshot();
    state.warp = identityWarp();
    toast("Warp grid reset");
  });
  $("test-pattern")?.addEventListener("click", () => setMedia(makeTestPattern(), "Test pattern on the surface"));
  $("ideas-open")?.addEventListener("click", openIdeas);
  $("ideas-close")?.addEventListener("click", closeIdeas);
  $("idea-riff")?.addEventListener("click", () => {
    const text = $("idea-seed")?.value || "";
    const source = riffs[0] || IDEAS[0];
    addRiff(text.trim() ? riffFromText(text) : riffFrom(source, "again"));
  });
  $("idea-surprise")?.addEventListener("click", () => addRiff(surprise()));
  $("ideas")?.addEventListener("click", (event) => {
    const use = event.target.dataset?.use;
    const riff = event.target.dataset?.riff;
    if (use) applyIdea(findIdea(use));
    if (riff) addRiff(riffFrom(findIdea(riff) || IDEAS[0], "card"));
  });
  $("undo")?.addEventListener("click", undo);
  $("redo")?.addEventListener("click", redo);
  $("export-json")?.addEventListener("click", exportProject);
  $("pick-files")?.addEventListener("click", () => $("files").click());
  $("pick-media")?.addEventListener("click", () => $("media-files").click());
  $("pick-media-side")?.addEventListener("click", () => $("media-files").click());
  $("files")?.addEventListener("change", (event) => ingestFiles(event.target.files));
  $("media-files")?.addEventListener("change", (event) => ingestFiles(event.target.files));
  $("folder")?.addEventListener("change", (event) => ingestFiles(event.target.files));
  $("fullscreen")?.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });
  window.addEventListener("dragover", (event) => event.preventDefault());
  window.addEventListener("drop", (event) => {
    event.preventDefault();
    ingestFiles(event.dataTransfer.files);
  });
  window.addEventListener("keydown", (event) => {
    if (event.target.matches("input, select, textarea")) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      redo();
      return;
    }
    if (event.key === "Escape") {
      if (!$("ideas")?.hidden) {
        closeIdeas();
        return;
      }
      if (state.mode === "present") setMode("geometry");
      else {
        const off = document.body.dataset.chrome === "off";
        document.body.dataset.chrome = off ? "on" : "off";
      }
    }
    if ((event.key === "i" || event.key === "I") && state.mode !== "present") openIdeas();
    if (event.key === "2") setMode("warp");
    if (event.key === "3") setMode("mask");
    if (event.key === "4" || event.key === "f" || event.key === "F") setMode("present");
    if (event.key === "d" || event.key === "D") duplicateFace();
    if (event.key === "Delete" || event.key === "Backspace") deleteFace();
    if (event.key === "o" && state.mesh.faces[state.selectedFace]) {
      snapshot();
      state.mesh.faces[state.selectedFace].omit = !state.mesh.faces[state.selectedFace].omit;
      refreshFaces();
    }
  });
}

async function main() {
  renderer = createRenderer(canvas);
  state.mediaEl = makeTestPattern();
  useMesh(makeShape("quad"), "quad");
  bind();
  renderIdeas();
  setMode("geometry");
  toast("Quad ready — drop a photo, or pick another shape");
  requestAnimationFrame(tick);
}

main().catch((err) => {
  toast(err.message);
  console.error(err);
});
