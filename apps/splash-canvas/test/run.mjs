import { pointInPoly, resolveCirclePolygon, resolveCircleCircle, bounceBounds } from "../js/geom2d.js";
import {
  createStage, spawnActor, stepStage, scatterActors, clearActors, facePolygons,
} from "../js/physics.js";
import { CHARACTER_KINDS, SPAWN_MODES } from "../js/characters.js";
import { createTimeline, addCue, stepTimeline, stopTimeline, playTimeline } from "../js/timeline.js";
import { FUNCTIONS, FUNCTION_MAP, runById, functionCount, searchFunctions } from "../js/functions.js";
import { STORIES } from "../js/stories.js";
import { canRecord, createRecorder } from "../js/record.js";
import { MOTION_KINDS } from "../js/motion.js";
import { SHAPES } from "../js/shapes.js";
import { identityWarp } from "../js/project.js";
import { IDEAS, ideaCount } from "../js/ideas.js";

let failed = 0;
let passed = 0;

function assert(cond, name) {
  if (cond) {
    passed += 1;
    return;
  }
  failed += 1;
  console.error("FAIL", name);
}

function mockCtx() {
  const flags = {
    omitBlack: 0, invertChannels: false, flip: false, flop: false,
    kaleido: 0, spin: 0, spinSpeed: 0, blackLevel: 0, threshold: 0.08,
    showGrid: true, invertMask: false, warpBreathe: 0,
  };
  const mesh = {
    faces: [{
      id: 0,
      dest: [[-0.4, 0.2], [0.4, 0.2], [0.4, -0.6], [-0.4, -0.6]],
      omit: false,
      anim: { u: 0, v: 0, speed: 0, dirU: 0, dirV: 0 },
    }],
  };
  const stage = createStage();
  const timeline = createTimeline(16);
  const calls = [];
  return {
    state: {
      flags,
      mesh,
      camera: { yaw: 0.55, pitch: 0.28, dist: 3.1 },
      selectedFace: 0,
      shapeId: "quad",
      warp: identityWarp(),
    },
    stage,
    timeline,
    calls,
    playMotion: (kind) => { calls.push(["motion", kind]); },
    stopMotion: () => { calls.push(["stop"]); },
    applyShape: (id) => { calls.push(["shape", id]); },
    applyIdeaById: (id) => { calls.push(["idea", id]); },
    setMedia: () => { calls.push(["media"]); },
    toast: () => {},
    syncLook: () => {},
    refresh: () => {},
    snapshot: () => {},
    resetWarp: () => { calls.push(["warp-reset"]); },
    fitDest: () => { calls.push(["fit"]); },
    duplicateFace: () => { calls.push(["dup"]); },
    playStory: () => { playTimeline(timeline); },
    pauseStory: () => { timeline.playing = false; },
    stopStory: () => { stopTimeline(timeline); },
    setStoryLoop: (on) => { timeline.looping = on; },
    loadStory: (id) => { calls.push(["story", id]); },
    startRecord: () => { calls.push(["rec-start"]); },
    stopRecord: () => { calls.push(["rec-stop"]); },
    useRecordingLoop: () => { calls.push(["rec-loop"]); },
    makeTestPattern: () => ({ tagName: "CANVAS" }),
    setSpooky: (name) => { calls.push(["spooky", name]); },
  };
}

// geom
assert(pointInPoly(0, 0, [[-1, -1], [1, -1], [1, 1], [-1, 1]]), "point inside square");
assert(!pointInPoly(2, 2, [[-1, -1], [1, -1], [1, 1], [-1, 1]]), "point outside square");

{
  const a = { x: 0, y: 0.14, vx: 0, vy: -1, r: 0.08 };
  const box = [[-0.3, 0.1], [0.3, 0.1], [0.3, -0.4], [-0.3, -0.4]];
  const hit = resolveCirclePolygon(a, box, 0.9);
  assert(hit, "falling circle hits box");
  assert(a.vy >= -0.05, `bounce vy not down ${a.vy}`);
}

{
  const a = { x: 0, y: 0, vx: 1, vy: 0, r: 0.1, frozen: false };
  const b = { x: 0.12, y: 0, vx: -1, vy: 0, r: 0.1, frozen: false };
  resolveCircleCircle(a, b, 1);
  assert(a.vx <= 0.1, `A should bounce left ${a.vx}`);
  assert(b.vx >= -0.1, `B should bounce right ${b.vx}`);
}

{
  const a = { x: -1.2, y: 0, vx: -0.5, vy: 0, r: 0.08 };
  bounceBounds(a, 0.8);
  assert(a.x >= -0.98, "bounds clamp x");
  assert(a.vx > 0, "bounds reverse vx");
}

{
  const stage = createStage();
  spawnActor(stage, "neo", { mode: "bounce", x: 0, y: 0.7, vx: 0.4, vy: -0.2 });
  spawnActor(stage, "agent", { mode: "gravity", x: 0.2, y: 0.8, vx: 0, vy: 0 });
  const box = [[-0.5, -0.2], [0.5, -0.2], [0.5, -0.8], [-0.5, -0.8]];
  for (let i = 0; i < 90; i += 1) stepStage(stage, 1 / 30, [box]);
  assert(stage.actors.length === 2, "two actors remain");
  assert(stage.actors.every((a) => Number.isFinite(a.x) && Number.isFinite(a.y)), "finite positions");
  assert(stage.actors.every((a) => Math.abs(a.x) <= 1.2 && Math.abs(a.y) <= 1.2), "stay near NDC");
  scatterActors(stage);
  assert(stage.actors.some((a) => Math.hypot(a.vx, a.vy) > 0.2), "scatter adds speed");
  clearActors(stage);
  assert(stage.actors.length === 0, "clear cast");
}

{
  const polys = facePolygons({
    faces: [
      { omit: false, dest: [[0, 0], [1, 0], [1, 1]] },
      { omit: true, dest: [[0, 0], [1, 0], [0, 1]] },
    ],
  }, (x, y) => [x * 2, y * 2]);
  assert(polys.length === 1, "omit skipped");
  assert(polys[0][0][0] === 0 && polys[0][1][0] === 2, "warp apply");
}

{
  const tl = createTimeline(4);
  addCue(tl, { at: 0.5, fn: "motion/matrix" });
  addCue(tl, { at: 1.5, fn: "spawn/neo/bounce" });
  addCue(tl, { at: 3.9, fn: "cast/scatter" });
  playTimeline(tl);
  const a = stepTimeline(tl, 0.6).map((c) => c.fn);
  assert(a.includes("motion/matrix"), "first cue fires");
  const b = stepTimeline(tl, 1.0).map((c) => c.fn);
  assert(b.includes("spawn/neo/bounce"), "second cue fires");
  const c = stepTimeline(tl, 3).map((c) => c.fn);
  assert(c.includes("cast/scatter"), "late cue fires");
  assert(tl.playing === true, "looping still playing");
  assert(tl.t < 4, "wrapped clock");
}

{
  const n = functionCount();
  assert(n >= 1000, `at least 1000 functions (got ${n})`);
  assert(FUNCTION_MAP.size === n, "map size matches");
  const ids = FUNCTIONS.map((f) => f.id);
  assert(new Set(ids).size === ids.length, "unique function ids");
  const ctx = mockCtx();
  let throws = 0;
  for (const fn of FUNCTIONS) {
    const r = runById(fn.id, ctx);
    if (!r.ok) throws += 1;
  }
  assert(throws === 0, `all functions run (${throws} failed)`);
  const hit = searchFunctions("matrix", "motion");
  assert(hit.some((f) => f.id === "motion/matrix"), "search finds matrix");
}

{
  for (const story of STORIES) {
    for (const cue of story.cues) {
      assert(FUNCTION_MAP.has(cue.fn), `story ${story.id} cue ${cue.fn} exists`);
    }
  }
}

assert(CHARACTER_KINDS.length === 20, "20 character kinds");
assert(SPAWN_MODES.length === 8, "8 spawn modes");
assert(MOTION_KINDS.length >= 20, "live looks");
assert(SHAPES.length === 9, "9 shapes");
assert(ideaCount().motion >= 200, "200+ motion ideas still there");
assert(IDEAS[0].motion === "matrix", "Matrix still first idea");

{
  const rec = createRecorder();
  assert(!!rec.mime, "recorder mime");
  assert(typeof canRecord() === "boolean", "canRecord boolean");
}

{
  const ctx = mockCtx();
  ctx.state.shapeId = "screen";
  let n = 0;
  ctx.applyShape = () => { n += 1; };
  runById("scene/matrix/screen", ctx);
  assert(n === 0, "same shape is not rebuilt");
  runById("scene/matrix/cube", ctx);
  assert(n === 1, "new shape is applied");
}

console.log(`passed ${passed}  failed ${failed}  functions ${functionCount()}`);
if (failed) process.exit(1);

