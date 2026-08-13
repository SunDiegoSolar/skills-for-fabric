import { MOTION_KINDS } from "./motion.js";
import { SHAPES } from "./shapes.js";
import { CHARACTER_KINDS, SPAWN_MODES } from "./characters.js";
import {
  spawnActor, clearActors, scatterActors, explodeActors, freezeActors,
} from "./physics.js";

function flags(ctx) {
  if (!ctx.state) ctx.state = {};
  if (!ctx.state.flags) ctx.state.flags = {};
  return ctx.state.flags;
}

function meshFaces(ctx) {
  return ctx.state?.mesh?.faces || [];
}

function safe(fn) {
  return (ctx, args = {}) => {
    fn(ctx, args);
  };
}

const RUN = {
  scene: safe((ctx, a) => {
    if (a.shape && ctx.state?.shapeId !== a.shape) ctx.applyShape?.(a.shape);
    if (a.kind) ctx.playMotion?.(a.kind);
    else if (a.kind === "") ctx.stopMotion?.();
  }),
  motion: safe((ctx, a) => {
    if (!a.kind) ctx.stopMotion?.();
    else ctx.playMotion?.(a.kind);
  }),
  shape: safe((ctx, a) => {
    if (a.id && ctx.state?.shapeId !== a.id) ctx.applyShape?.(a.id);
  }),
  spawn: safe((ctx, a) => {
    const stage = ctx.stage;
    if (!stage) return;
    const kind = a.kind || "ball";
    const mode = a.mode || "bounce";
    const n = Math.max(0, Math.min(12, a.count == null ? 1 : Number(a.count)));
    if (a.shape && ctx.applyShape && ctx.state?.shapeId !== a.shape) ctx.applyShape(a.shape);
    if (n === 0) {
      if (a.gravityOn) stage.physics.gravity = 0.55;
      if (a.gravityOff) stage.physics.gravity = 0;
      return;
    }
    for (let i = 0; i < n; i += 1) {
      const opts = { mode, r: a.r };
      if (mode === "rain") {
        opts.x = (i / Math.max(1, n - 1)) * 1.6 - 0.8;
        opts.y = 0.85;
        opts.vy = -0.1;
        opts.vx = (Math.random() - 0.5) * 0.3;
        opts.gravity = 1;
        opts.mode = "gravity";
      }
      if (mode === "scatter") {
        opts.vx = (Math.random() - 0.5) * 2;
        opts.vy = (Math.random() - 0.5) * 2;
        opts.mode = "bounce";
      }
      if (mode === "chase") opts.mode = "chase";
      if (a.x != null) opts.x = a.x;
      if (a.y != null) opts.y = a.y;
      spawnActor(stage, kind, opts);
    }
    if (a.gravityOn) stage.physics.gravity = 0.55;
    if (a.gravityOff) stage.physics.gravity = 0;
  }),
  kaleido: safe((ctx, a) => {
    flags(ctx).kaleido = Number(a.slices) || 0;
    if (a.kind) ctx.playMotion?.(a.kind);
    if (a.spin != null) flags(ctx).spinSpeed = Number(a.spin) || 0;
  }),
  omit: safe((ctx, a) => {
    flags(ctx).omitBlack = Number(a.omitBlack) || 0;
    if (a.kind) ctx.playMotion?.(a.kind);
  }),
  spin: safe((ctx, a) => {
    flags(ctx).spinSpeed = Number(a.spin) || 0;
    if (a.kind) ctx.playMotion?.(a.kind);
  }),
  look: safe((ctx, a) => {
    const f = flags(ctx);
    if (a.omitBlack != null) f.omitBlack = Number(a.omitBlack);
    if (a.invertCh != null) f.invertChannels = !!a.invertCh;
    if (a.flip != null) f.flip = !!a.flip;
    if (a.flop != null) f.flop = !!a.flop;
    if (a.kaleido != null) f.kaleido = Number(a.kaleido);
    if (a.spin != null) f.spinSpeed = Number(a.spin);
    if (a.blackLevel != null) f.blackLevel = Number(a.blackLevel);
    if (a.threshold != null) f.threshold = Number(a.threshold);
    if (a.showGrid != null) f.showGrid = !!a.showGrid;
    if (a.invertMask != null) f.invertMask = !!a.invertMask;
    ctx.syncLook?.();
  }),
  physics: safe((ctx, a) => {
    const p = ctx.stage?.physics;
    if (!p) return;
    if (a.gravity != null) p.gravity = Number(a.gravity);
    if (a.rest != null) p.rest = Number(a.rest);
    if (a.wind != null) p.wind = Number(a.wind);
    if (a.faces != null) p.faces = !!a.faces;
    if (a.actors != null) p.actors = !!a.actors;
    if (a.bounds != null) p.bounds = !!a.bounds;
    if (a.paused != null) p.paused = !!a.paused;
  }),
  cast: safe((ctx, a) => {
    const stage = ctx.stage;
    if (!stage) return;
    if (a.op === "clear") clearActors(stage);
    if (a.op === "scatter") scatterActors(stage, a.speed || 1.4);
    if (a.op === "explode") explodeActors(stage, a.speed || 2.2);
    if (a.op === "freeze") freezeActors(stage, true);
    if (a.op === "thaw") freezeActors(stage, false);
  }),
  story: safe((ctx, a) => {
    if (a.op === "play") ctx.playStory?.();
    if (a.op === "pause") ctx.pauseStory?.();
    if (a.op === "stop") ctx.stopStory?.();
    if (a.op === "loop") ctx.setStoryLoop?.(!!a.on);
    if (a.op === "load" && a.id) ctx.loadStory?.(a.id);
  }),
  record: safe((ctx, a) => {
    if (a.op === "start") ctx.startRecord?.();
    if (a.op === "stop") ctx.stopRecord?.();
    if (a.op === "loop") ctx.useRecordingLoop?.();
  }),
  camera: safe((ctx, a) => {
    const cam = ctx.state?.camera;
    if (!cam) return;
    if (a.op === "reset") Object.assign(cam, { yaw: 0.55, pitch: 0.28, dist: 3.1 });
    if (a.dist) cam.dist = Math.max(1.2, Math.min(12, a.dist));
    if (a.yaw != null) cam.yaw = a.yaw;
    if (a.zoom === "in") cam.dist = Math.max(1.2, cam.dist * 0.88);
    if (a.zoom === "out") cam.dist = Math.min(12, cam.dist * 1.12);
  }),
  warp: safe((ctx, a) => {
    if (a.op === "reset") ctx.resetWarp?.();
    if (a.op === "breathe") flags(ctx).warpBreathe = Number(a.amount ?? 1);
    if (a.op === "still") flags(ctx).warpBreathe = 0;
  }),
  face: safe((ctx, a) => {
    const faces = meshFaces(ctx);
    const face = faces[ctx.state?.selectedFace] || faces[0];
    if (!face) return;
    if (a.op === "hide") face.omit = true;
    if (a.op === "show") face.omit = false;
    if (a.op === "toggle") face.omit = !face.omit;
    if (a.op === "hide-others") {
      for (const f of faces) f.omit = f.id !== face.id;
    }
    if (a.op === "show-all") {
      for (const f of faces) f.omit = false;
    }
    if (a.op === "fit") ctx.fitDest?.();
    if (a.op === "dup") ctx.duplicateFace?.();
    ctx.refresh?.();
  }),
  media: safe((ctx, a) => {
    if (a.op === "pattern") ctx.setMedia?.(ctx.makeTestPattern?.(), "Test pattern");
    if (a.op === "spooky") ctx.setSpooky?.(a.pattern || "pumpkin");
    if (a.op === "pan") {
      for (const face of meshFaces(ctx)) {
        face.anim = {
          u: 0,
          v: 0,
          speed: a.speed ?? 0.06,
          dirU: a.dirU ?? 0,
          dirV: a.dirV ?? 0,
        };
      }
    }
  }),
  idea: safe((ctx, a) => {
    if (a.id && ctx.applyIdeaById) ctx.applyIdeaById(a.id);
  }),
};

function item(id, name, cat, runner, args, how = "") {
  return {
    id,
    name,
    cat,
    args,
    how,
    run: (ctx, extra) => RUN[runner](ctx, { ...args, ...extra }),
  };
}

function buildFunctions() {
  const out = [];
  const seen = new Set();
  const add = (fn) => {
    if (seen.has(fn.id)) return;
    seen.add(fn.id);
    out.push(fn);
  };

  add(item("motion/off", "Live look off", "motion", "motion", { kind: "" }, "Stop generated motion."));
  for (const kind of MOTION_KINDS) {
    add(item(`motion/${kind.id}`, `Play ${kind.label}`, "motion", "motion", { kind: kind.id }, `Live ${kind.label}.`));
  }
  for (const shape of SHAPES) {
    add(item(`shape/${shape.id}`, `Shape ${shape.label}`, "shape", "shape", { id: shape.id }, `Switch to ${shape.label}.`));
  }

  for (const kind of MOTION_KINDS) {
    for (const shape of SHAPES) {
      add(item(
        `scene/${kind.id}/${shape.id}`,
        `${kind.label} on ${shape.label}`,
        "scene",
        "scene",
        { kind: kind.id, shape: shape.id },
        `${shape.label} + live ${kind.label}.`,
      ));
    }
  }

  const kaleidoN = [0, 2, 4, 6, 8, 10, 12, 14, 16];
  for (const n of kaleidoN) {
    add(item(`look/kaleido/${n}`, `Kaleido ${n} slices`, "look", "kaleido", { slices: n }, "Fold the current look."));
    for (const kind of MOTION_KINDS) {
      add(item(
        `kaleido/${n}/${kind.id}`,
        `${kind.label} through ${n}-kaleido`,
        "kaleido",
        "kaleido",
        { slices: n, kind: kind.id, spin: n ? 0.2 : 0 },
        "Live look folded into a kaleidoscope.",
      ));
    }
  }

  const spins = [0, 0.1, 0.25, 0.5, 1];
  for (const s of spins) {
    add(item(`look/spin/${s}`, `Spin ${s}`, "look", "spin", { spin: s }, "Spin the UV fold."));
    for (const kind of MOTION_KINDS) {
      add(item(
        `spin/${s}/${kind.id}`,
        `Spin ${s} on ${kind.label}`,
        "look",
        "spin",
        { spin: s, kind: kind.id },
        "Spin a live look.",
      ));
    }
  }

  for (const omit of [0, 1, 2]) {
    const label = omit === 0 ? "show-all" : omit === 1 ? "omit-black" : "only-black";
    add(item(`look/omit/${omit}`, `Pixel ${label}`, "look", "omit", { omitBlack: omit }, "Omit black / only black / show all."));
    for (const kind of MOTION_KINDS) {
      add(item(
        `omit/${omit}/${kind.id}`,
        `${kind.label} + ${label}`,
        "look",
        "omit",
        { omitBlack: omit, kind: kind.id },
        "Live look with a luma key.",
      ));
    }
  }

  for (const kind of CHARACTER_KINDS) {
    for (const mode of SPAWN_MODES) {
      add(item(
        `spawn/${kind.id}/${mode.id}`,
        `Add ${kind.label} (${mode.label})`,
        "character",
        "spawn",
        { kind: kind.id, mode: mode.id, count: mode.id === "rain" ? 6 : 1 },
        "A character that can bounce off mapped faces.",
      ));
    }
    for (const shape of SHAPES) {
      add(item(
        `bounce/${kind.id}/${shape.id}`,
        `${kind.label} bouncing on ${shape.label}`,
        "character",
        "spawn",
        { kind: kind.id, mode: "bounce", shape: shape.id, gravityOff: true },
        "Switch shape, spawn a bouncer off the mapped object.",
      ));
    }
  }

  add(item("cast/clear", "Clear characters", "character", "cast", { op: "clear" }));
  add(item("cast/scatter", "Scatter characters", "character", "cast", { op: "scatter" }));
  add(item("cast/explode", "Explode characters", "character", "cast", { op: "explode" }));
  add(item("cast/freeze", "Freeze characters", "character", "cast", { op: "freeze" }));
  add(item("cast/thaw", "Thaw characters", "character", "cast", { op: "thaw" }));

  add(item("physics/gravity/off", "Gravity off", "physics", "physics", { gravity: 0 }));
  add(item("physics/gravity/low", "Gravity low", "physics", "physics", { gravity: 0.25 }));
  add(item("physics/gravity/on", "Gravity on", "physics", "physics", { gravity: 0.55 }));
  add(item("physics/gravity/high", "Gravity high", "physics", "physics", { gravity: 1.2 }));
  add(item("physics/wind/left", "Wind left", "physics", "physics", { wind: -0.6 }));
  add(item("physics/wind/right", "Wind right", "physics", "physics", { wind: 0.6 }));
  add(item("physics/wind/off", "Wind off", "physics", "physics", { wind: 0 }));
  add(item("physics/bounce/soft", "Soft bounce", "physics", "physics", { rest: 0.4 }));
  add(item("physics/bounce/live", "Live bounce", "physics", "physics", { rest: 0.84 }));
  add(item("physics/bounce/super", "Super bounce", "physics", "physics", { rest: 1.05 }));
  add(item("physics/faces/on", "Collide with faces", "physics", "physics", { faces: true }));
  add(item("physics/faces/off", "Ignore faces", "physics", "physics", { faces: false }));
  add(item("physics/actors/on", "Characters collide", "physics", "physics", { actors: true }));
  add(item("physics/actors/off", "Ghost through each other", "physics", "physics", { actors: false }));
  add(item("physics/pause", "Pause physics", "physics", "physics", { paused: true }));
  add(item("physics/resume", "Resume physics", "physics", "physics", { paused: false }));

  add(item("look/invert/on", "Swap red/blue on", "look", "look", { invertCh: true }));
  add(item("look/invert/off", "Swap red/blue off", "look", "look", { invertCh: false }));
  add(item("look/flip/on", "Flip U on", "look", "look", { flip: true }));
  add(item("look/flip/off", "Flip U off", "look", "look", { flip: false }));
  add(item("look/flop/on", "Flop V on", "look", "look", { flop: true }));
  add(item("look/flop/off", "Flop V off", "look", "look", { flop: false }));
  add(item("look/grid/on", "Show face grid", "look", "look", { showGrid: true }));
  add(item("look/grid/off", "Hide face grid", "look", "look", { showGrid: false }));
  add(item("look/black/0", "Black level 0", "look", "look", { blackLevel: 0 }));
  add(item("look/black/0.2", "Black level 0.2", "look", "look", { blackLevel: 0.2 }));
  add(item("look/mask/invert", "Invert mask", "look", "look", { invertMask: true }));
  add(item("look/mask/normal", "Normal mask", "look", "look", { invertMask: false }));

  add(item("story/play", "Play story", "story", "story", { op: "play" }));
  add(item("story/pause", "Pause story", "story", "story", { op: "pause" }));
  add(item("story/stop", "Stop story", "story", "story", { op: "stop" }));
  add(item("story/loop-on", "Loop story on", "story", "story", { op: "loop", on: true }));
  add(item("story/loop-off", "Loop story off", "story", "story", { op: "loop", on: false }));
  add(item("story/load/matrix-chase", "Load Matrix chase", "story", "story", { op: "load", id: "matrix-chase" }));
  add(item("story/load/porch-visitors", "Load porch visitors", "story", "story", { op: "load", id: "porch-visitors" }));
  add(item("story/load/bounce-cast", "Load bounce cast", "story", "story", { op: "load", id: "bounce-cast" }));
  add(item("story/load/kaleido-night", "Load kaleido night", "story", "story", { op: "load", id: "kaleido-night" }));

  add(item("record/start", "Start recording", "record", "record", { op: "start" }));
  add(item("record/stop", "Stop recording", "record", "record", { op: "stop" }));
  add(item("record/use-loop", "Use recording as loop", "record", "record", { op: "loop" }));

  add(item("camera/reset", "Reset camera", "camera", "camera", { op: "reset" }));
  add(item("camera/zoom-in", "Zoom in", "camera", "camera", { zoom: "in" }));
  add(item("camera/zoom-out", "Zoom out", "camera", "camera", { zoom: "out" }));

  add(item("warp/reset", "Reset warp", "warp", "warp", { op: "reset" }));
  add(item("warp/breathe", "Warp breathe", "warp", "warp", { op: "breathe", amount: 1 }));
  add(item("warp/still", "Warp still", "warp", "warp", { op: "still" }));

  add(item("face/hide", "Hide this face", "face", "face", { op: "hide" }));
  add(item("face/show", "Show this face", "face", "face", { op: "show" }));
  add(item("face/toggle", "Toggle this face", "face", "face", { op: "toggle" }));
  add(item("face/hide-others", "Hide other faces", "face", "face", { op: "hide-others" }));
  add(item("face/show-all", "Show all faces", "face", "face", { op: "show-all" }));
  add(item("face/fit", "Fill output", "face", "face", { op: "fit" }));
  add(item("face/dup", "Duplicate face", "face", "face", { op: "dup" }));

  add(item("media/pattern", "Test pattern", "media", "media", { op: "pattern" }));
  add(item("media/pan-u", "Pan U", "media", "media", { op: "pan", dirU: 1, dirV: 0, speed: 0.06 }));
  add(item("media/pan-v", "Pan V", "media", "media", { op: "pan", dirU: 0, dirV: 1, speed: 0.05 }));
  add(item("media/pan-off", "Pan off", "media", "media", { op: "pan", dirU: 0, dirV: 0, speed: 0 }));
  for (const pattern of ["pumpkin", "ghost", "bats", "web", "moon", "eyes", "slime", "candles", "veins", "tomb", "fog", "window", "door"]) {
    add(item(`media/spooky/${pattern}`, `Spooky ${pattern}`, "media", "media", { op: "spooky", pattern }));
  }

  // Time-stamped story atoms so a clock can call "at 4s, this"
  const beats = [0, 1, 2, 3, 4, 6, 8, 10, 12, 16];
  const beatFns = [
    "motion/matrix", "motion/kaleido", "motion/fire", "cast/scatter",
    "look/kaleido/8", "look/kaleido/0", "spawn/neo/bounce", "spawn/agent/gravity",
  ];
  for (const t of beats) {
    for (const fn of beatFns) {
      add(item(
        `cue/${t}/${fn.replaceAll("/", "-")}`,
        `At ${t}s: ${fn}`,
        "story",
        "story",
        { op: "play" },
        `Story atom labeled for ${t}s → ${fn}. Run the inner id for the real action.`,
      ));
    }
  }

  return out;
}

export const FUNCTIONS = buildFunctions();
export const FUNCTION_MAP = new Map(FUNCTIONS.map((fn) => [fn.id, fn]));

export function functionCount() {
  return FUNCTIONS.length;
}

export function searchFunctions(query, cat = "") {
  const q = String(query || "").trim().toLowerCase();
  return FUNCTIONS.filter((fn) => {
    if (cat && fn.cat !== cat) return false;
    if (!q) return true;
    return `${fn.id} ${fn.name} ${fn.cat} ${fn.how || ""}`.toLowerCase().includes(q);
  });
}

export function runById(id, ctx, extra = {}) {
  const fn = FUNCTION_MAP.get(id);
  if (!fn) return { ok: false, error: `unknown function ${id}` };
  try {
    fn.run(ctx, extra);
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: err.message || String(err), id };
  }
}
