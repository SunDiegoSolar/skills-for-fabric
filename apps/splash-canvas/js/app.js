import { invert, lookAt, multiply, perspective, subtract, transformPoint, normalize } from "./math.js";
import { loadObj, parseObj, pickFace } from "./obj.js";
import { identityWarp, loadSplashJson } from "./project.js";
import { createRenderer } from "./render.js";

const $ = (id) => document.getElementById(id);

const state = {
  mode: "geometry",
  mesh: { faces: [] },
  warp: identityWarp(),
  camera: { yaw: 0.6, pitch: 0.35, dist: 3.2 },
  selectedFace: -1,
  selectedPoint: null,
  mediaEl: null,
  graph: { objects: [], links: [] },
  flags: {
    omitBlack: 0,
    invertMask: false,
    invertFaces: false,
    threshold: 0.08,
    blackLevel: 0,
    showGrid: true,
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

let renderer;
let drag = null;
let pointers = new Map();
let last = performance.now();

function toast(message) {
  const el = $("toast");
  el.hidden = false;
  el.textContent = message;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, 2400);
}

function resizeOverlay() {
  overlay.width = canvas.clientWidth;
  overlay.height = canvas.clientHeight;
  overlay.style.width = `${canvas.clientWidth}px`;
  overlay.style.height = `${canvas.clientHeight}px`;
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

function pickGeometry(event) {
  const [nx, ny] = ndcFromEvent(event);
  const { eye, matrix } = mvp();
  const inv = invert(matrix);
  const near = transformPoint(inv, [nx, ny, -1, 1]);
  const far = transformPoint(inv, [nx, ny, 1, 1]);
  const n3 = [near[0] / near[3], near[1] / near[3], near[2] / near[3]];
  const f3 = [far[0] / far[3], far[1] / far[3], far[2] / far[3]];
  const dir = normalize(subtract(f3, n3));
  return pickFace(state.mesh, eye, dir);
}

function hitDestCorner(nx, ny) {
  const near = (x, y, px, py) => Math.hypot(x - px, y - py) < 0.08;
  if (state.mode === "warp") {
    for (let i = 0; i < state.warp.points.length; i += 1) {
      const p = state.warp.points[i];
      if (near(nx, ny, p[0], p[1])) return { kind: "warp", index: i };
    }
  }
  const face = state.mesh.faces[state.selectedFace];
  if (face && (state.mode === "warp" || state.mode === "geometry")) {
    for (let i = 0; i < face.dest.length; i += 1) {
      const p = face.dest[i];
      if (near(nx, ny, p[0], p[1])) return { kind: "dest", face: face.id, index: i };
    }
  }
  return null;
}

function drawOverlay() {
  resizeOverlay();
  octx.clearRect(0, 0, overlay.width, overlay.height);
  if (state.mode === "present") return;
  const toX = (x) => ((x + 1) * 0.5) * overlay.width;
  const toY = (y) => (1 - (y + 1) * 0.5) * overlay.height;
  if (state.mode === "warp" || state.mode === "geometry") {
    const face = state.mesh.faces[state.selectedFace];
    if (face) {
      octx.strokeStyle = "rgba(232,192,122,0.95)";
      octx.lineWidth = 2;
      octx.beginPath();
      face.dest.forEach((p, i) => {
        const x = toX(p[0]);
        const y = toY(p[1]);
        if (i === 0) octx.moveTo(x, y);
        else octx.lineTo(x, y);
      });
      octx.closePath();
      octx.stroke();
      face.dest.forEach((p) => {
        octx.fillStyle = "#e8c07a";
        octx.beginPath();
        octx.arc(toX(p[0]), toY(p[1]), 6, 0, Math.PI * 2);
        octx.fill();
      });
    }
  }
  if (state.mode === "warp") {
    octx.strokeStyle = "rgba(244,241,234,0.28)";
    octx.lineWidth = 1;
    const [cols, rows] = state.warp.patchSize;
    for (let j = 0; j < rows; j += 1) {
      octx.beginPath();
      for (let i = 0; i < cols; i += 1) {
        const p = state.warp.points[j * cols + i];
        const x = toX(p[0]);
        const y = toY(p[1]);
        if (i === 0) octx.moveTo(x, y);
        else octx.lineTo(x, y);
      }
      octx.stroke();
    }
    for (let i = 0; i < cols; i += 1) {
      octx.beginPath();
      for (let j = 0; j < rows; j += 1) {
        const p = state.warp.points[j * cols + i];
        const x = toX(p[0]);
        const y = toY(p[1]);
        if (j === 0) octx.moveTo(x, y);
        else octx.lineTo(x, y);
      }
      octx.stroke();
    }
    state.warp.points.forEach((p) => {
      octx.fillStyle = "#f4f1ea";
      octx.beginPath();
      octx.arc(toX(p[0]), toY(p[1]), 5, 0, Math.PI * 2);
      octx.fill();
    });
  }
  if (state.mode === "mask") {
    octx.globalAlpha = 0.35;
    octx.drawImage(maskCanvas, 0, 0, overlay.width, overlay.height);
    octx.globalAlpha = 1;
  }
}

function refreshFaces() {
  const list = $("face-list");
  list.innerHTML = state.mesh.faces.map((face) => {
    const on = face.id === state.selectedFace ? "active" : "";
    const omitted = face.omit ? "omitted" : "";
    return `<button class="${on} ${omitted}" data-face="${face.id}">Face ${face.id}${face.omit ? " · omit" : ""}</button>`;
  }).join("");
  $("graph").innerHTML = [
    ...state.graph.objects.map((o) => `<div><code>${o.type}</code> ${o.name}${o.file ? ` · ${o.file}` : ""}</div>`),
    ...state.graph.links.map((l) => `<div class="link">${l.from} → ${l.to}</div>`),
  ].join("") || "<div class='muted'>Starter grid graph (mesh → object → warp → window)</div>";
}

function setMode(mode) {
  state.mode = mode;
  document.body.dataset.mode = mode;
  for (const btn of document.querySelectorAll("[data-mode]")) {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  }
}

async function loadMeshText(text, label) {
  state.mesh = parseObj(text);
  state.selectedFace = state.mesh.faces[0] ? 0 : -1;
  refreshFaces();
  toast(`Loaded ${state.mesh.faces.length} faces from ${label}`);
}

async function bootMesh() {
  state.mesh = await loadObj("./samples/grid_wall.obj");
  state.selectedFace = 0;
  state.graph = {
    objects: [
      { name: "mesh", type: "mesh", file: "samples/grid_wall.obj" },
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
  refreshFaces();
}

function ingestFiles(fileList) {
  const files = [...fileList];
  for (const file of files) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".json")) {
      loadSplashJson(file).then(async (project) => {
        state.warp = project.warp;
        state.flags.invertMask = project.invertChannels;
        state.flags.blackLevel = project.blackLevel;
        state.graph = { objects: project.objects, links: project.links };
        $("black-level").value = Math.round(state.flags.blackLevel * 255);
        refreshFaces();
        toast(`Splash graph: ${project.objects.length} nodes, ${project.links.length} links`);
        const mesh = files.find((f) => f.name.toLowerCase().endsWith(".obj"));
        if (mesh) loadMeshText(await mesh.text(), mesh.name);
      }).catch((err) => toast(`Could not read Splash JSON: ${err.message}`));
    } else if (name.endsWith(".obj")) {
      file.text().then((text) => loadMeshText(text, file.name));
    } else if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      if (file.type.startsWith("video/")) {
        const video = document.createElement("video");
        video.src = url;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.play();
        state.mediaEl = video;
      } else {
        const img = new Image();
        img.src = url;
        state.mediaEl = img;
      }
      toast(`Media assigned to the object / faces`);
    }
  }
}

function paintMask(event, erase) {
  const r = overlay.getBoundingClientRect();
  const x = ((event.clientX - r.left) / r.width) * maskCanvas.width;
  const y = ((event.clientY - r.top) / r.height) * maskCanvas.height;
  mctx.fillStyle = erase ? "#fff" : "#000";
  mctx.beginPath();
  mctx.arc(x, y, 28, 0, Math.PI * 2);
  mctx.fill();
}

function onPointerDown(event) {
  overlay.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, event);
  const [nx, ny] = ndcFromEvent(event);
  if (state.mode === "mask") {
    drag = { kind: "mask", erase: event.shiftKey || event.altKey };
    paintMask(event, drag.erase);
    return;
  }
  const handle = hitDestCorner(nx, ny);
  if (handle) {
    drag = { ...handle, x: nx, y: ny };
    return;
  }
  if (state.mode === "geometry") {
    const id = pickGeometry(event);
    if (id >= 0) {
      state.selectedFace = id;
      refreshFaces();
    }
    drag = { kind: "orbit", x: event.clientX, y: event.clientY, yaw: state.camera.yaw, pitch: state.camera.pitch };
  } else if (state.selectedFace >= 0) {
    drag = { kind: "move-face", x: nx, y: ny };
  }
}

function onPointerMove(event) {
  pointers.set(event.pointerId, event);
  if (pointers.size === 2 && state.selectedFace >= 0) {
    const pts = [...pointers.values()];
    const d0 = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
    if (!drag || drag.kind !== "pinch") {
      drag = { kind: "pinch", dist: d0, dest: state.mesh.faces[state.selectedFace].dest.map((p) => [...p]) };
    } else {
      const scale = d0 / Math.max(8, drag.dist);
      const face = state.mesh.faces[state.selectedFace];
      const cx = drag.dest.reduce((s, p) => s + p[0], 0) / drag.dest.length;
      const cy = drag.dest.reduce((s, p) => s + p[1], 0) / drag.dest.length;
      face.dest = drag.dest.map(([x, y]) => [cx + (x - cx) * scale, cy + (y - cy) * scale]);
    }
    return;
  }
  if (!drag) return;
  const [nx, ny] = ndcFromEvent(event);
  if (drag.kind === "mask") paintMask(event, drag.erase);
  else if (drag.kind === "orbit") {
    state.camera.yaw = drag.yaw + (event.clientX - drag.x) * 0.01;
    state.camera.pitch = Math.max(-1.2, Math.min(1.2, drag.pitch + (event.clientY - drag.y) * 0.01));
  } else if (drag.kind === "warp") {
    state.warp.points[drag.index] = [nx, ny];
  } else if (drag.kind === "dest") {
    state.mesh.faces[drag.face].dest[drag.index] = [nx, ny];
  } else if (drag.kind === "move-face" && state.selectedFace >= 0) {
    const face = state.mesh.faces[state.selectedFace];
    const dx = nx - drag.x;
    const dy = ny - drag.y;
    face.dest = face.dest.map(([x, y]) => [x + dx, y + dy]);
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

function bind() {
  overlay.addEventListener("pointerdown", onPointerDown);
  overlay.addEventListener("pointermove", onPointerMove);
  overlay.addEventListener("pointerup", onPointerUp);
  overlay.addEventListener("pointercancel", onPointerUp);
  overlay.addEventListener("wheel", (event) => {
    event.preventDefault();
    state.camera.dist = Math.max(1.2, Math.min(12, state.camera.dist + event.deltaY * 0.01));
  }, { passive: false });

  document.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });
  $("face-list").addEventListener("click", (event) => {
    const id = event.target.dataset.face;
    if (id == null) return;
    state.selectedFace = Number(id);
    refreshFaces();
  });
  $("omit-face").addEventListener("click", () => {
    const face = state.mesh.faces[state.selectedFace];
    if (!face) return;
    face.omit = !face.omit;
    refreshFaces();
  });
  $("omit-black").addEventListener("change", (event) => {
    state.flags.omitBlack = Number(event.target.value);
  });
  $("invert-mask").addEventListener("change", (event) => {
    state.flags.invertMask = event.target.checked;
  });
  $("invert-faces").addEventListener("change", (event) => {
    state.flags.invertFaces = event.target.checked;
  });
  $("threshold").addEventListener("input", (event) => {
    state.flags.threshold = Number(event.target.value) / 100;
  });
  $("black-level").addEventListener("input", (event) => {
    state.flags.blackLevel = Number(event.target.value) / 255;
  });
  $("anim-dir").addEventListener("change", (event) => {
    const face = state.mesh.faces[state.selectedFace];
    if (!face) return;
    const v = event.target.value;
    face.anim.dirU = v === "u+" ? 1 : v === "u-" ? -1 : 0;
    face.anim.dirV = v === "v+" ? 1 : v === "v-" ? -1 : 0;
    if (v === "off") face.anim.speed = 0;
    else if (!face.anim.speed) face.anim.speed = 0.08;
  });
  $("anim-speed").addEventListener("input", (event) => {
    const face = state.mesh.faces[state.selectedFace];
    if (face) face.anim.speed = Number(event.target.value) / 100;
  });
  $("clear-mask").addEventListener("click", () => {
    mctx.fillStyle = "#fff";
    mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
  });
  $("reset-warp").addEventListener("click", () => {
    state.warp = identityWarp();
  });
  $("pick-files").addEventListener("click", () => $("files").click());
  $("files").addEventListener("change", (event) => ingestFiles(event.target.files));
  $("fullscreen").addEventListener("click", () => {
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
    if (event.key === "1") setMode("geometry");
    if (event.key === "2") setMode("warp");
    if (event.key === "3") setMode("mask");
    if (event.key === "4" || event.key === "f" || event.key === "F") setMode("present");
    if (event.key === "o" && state.mesh.faces[state.selectedFace]) {
      state.mesh.faces[state.selectedFace].omit = !state.mesh.faces[state.selectedFace].omit;
      refreshFaces();
    }
  });
}

async function main() {
  renderer = createRenderer(canvas);
  await bootMesh();
  bind();
  setMode("geometry");
  requestAnimationFrame(tick);
}

main().catch((err) => {
  toast(err.message);
  console.error(err);
});
