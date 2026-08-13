import { bounceBounds, resolveCircleCircle, resolveCirclePolygon } from "./geom2d.js";

const MAX_V = 3.6;

export function defaultPhysics() {
  return {
    gravity: 0.55,
    rest: 0.84,
    wind: 0,
    faces: true,
    actors: true,
    bounds: true,
    paused: false,
  };
}

export function createStage() {
  return {
    actors: [],
    physics: defaultPhysics(),
    nextId: 1,
    age: 0,
  };
}

export function clampVel(actor) {
  const s = Math.hypot(actor.vx, actor.vy);
  if (s > MAX_V) {
    actor.vx *= MAX_V / s;
    actor.vy *= MAX_V / s;
  }
}

export function spawnActor(stage, kind, opts = {}) {
  const mode = opts.mode || "bounce";
  const r = opts.r ?? 0.07;
  const actor = {
    id: stage.nextId,
    kind,
    mode,
    x: opts.x ?? (Math.random() * 1.4 - 0.7),
    y: opts.y ?? 0.55,
    vx: opts.vx ?? (Math.random() * 0.8 - 0.4),
    vy: opts.vy ?? (mode === "still" ? 0 : -0.2),
    r,
    frozen: !!opts.frozen || mode === "still",
    gravity: opts.gravity ?? (mode === "bounce" || mode === "float" || mode === "orbit" || mode === "still" ? 0 : 1),
    phase: Math.random() * 6.28,
    hue: opts.hue ?? Math.random() * 360,
    label: opts.label || kind,
  };
  if (mode === "orbit") {
    actor.frozen = false;
    actor.gravity = 0;
    actor.orbit = {
      cx: opts.cx ?? 0,
      cy: opts.cy ?? 0,
      r: opts.orbitR ?? 0.35,
      a: opts.a ?? Math.random() * 6.28,
      w: opts.w ?? 1.2,
    };
  }
  if (mode === "bounce") actor.gravity = 0;
  if (mode === "float") actor.gravity = 0;
  stage.nextId += 1;
  stage.actors.push(actor);
  return actor;
}

export function clearActors(stage) {
  stage.actors.length = 0;
}

export function scatterActors(stage, speed = 1.4) {
  for (const a of stage.actors) {
    a.frozen = false;
    const ang = Math.random() * Math.PI * 2;
    a.vx = Math.cos(ang) * speed;
    a.vy = Math.sin(ang) * speed;
  }
}

export function explodeActors(stage, speed = 2.2) {
  for (const a of stage.actors) {
    a.frozen = false;
    const ang = Math.atan2(a.y, a.x) || Math.random() * 6.28;
    a.vx = Math.cos(ang) * speed;
    a.vy = Math.sin(ang) * speed;
  }
}

export function freezeActors(stage, frozen = true) {
  for (const a of stage.actors) a.frozen = frozen;
}

function steerToward(a, tx, ty, dt, force = 1.6) {
  const dx = tx - a.x;
  const dy = ty - a.y;
  const d = Math.hypot(dx, dy) || 1;
  a.vx += (dx / d) * force * dt;
  a.vy += (dy / d) * force * dt;
}

export function stepStage(stage, dt, polygons = [], chaseTarget = null) {
  const h = Math.min(0.05, Math.max(0, dt));
  stage.age += h;
  if (stage.physics.paused) return;
  const sub = 2;
  const step = h / sub;
  const rest = stage.physics.rest;
  for (let s = 0; s < sub; s += 1) {
    for (const a of stage.actors) {
      if (a.frozen && a.mode !== "orbit") continue;
      if (a.mode === "orbit" && a.orbit) {
        a.orbit.a += a.orbit.w * step;
        a.x = a.orbit.cx + Math.cos(a.orbit.a) * a.orbit.r;
        a.y = a.orbit.cy + Math.sin(a.orbit.a) * a.orbit.r;
        a.vx = 0;
        a.vy = 0;
        continue;
      }
      if (a.mode === "float") {
        a.vy += Math.sin(stage.age * 2.2 + a.phase) * 0.55 * step;
        a.vx += Math.cos(stage.age * 1.1 + a.phase) * 0.2 * step;
      }
      if (a.mode === "chase" && chaseTarget) {
        steerToward(a, chaseTarget[0], chaseTarget[1], step, 2.1);
      }
      a.vy -= stage.physics.gravity * (a.gravity ?? 1) * step;
      a.vx += stage.physics.wind * step;
      a.x += a.vx * step;
      a.y += a.vy * step;
      clampVel(a);
      if (stage.physics.bounds) bounceBounds(a, rest);
      if (stage.physics.faces) {
        for (const poly of polygons) resolveCirclePolygon(a, poly, rest);
      }
    }
    if (stage.physics.actors) {
      for (let i = 0; i < stage.actors.length; i += 1) {
        for (let j = i + 1; j < stage.actors.length; j += 1) {
          resolveCircleCircle(stage.actors[i], stage.actors[j], rest);
        }
      }
    }
  }
}

export function facePolygons(mesh, warpApply) {
  const out = [];
  if (!mesh?.faces) return out;
  for (const face of mesh.faces) {
    if (face.omit) continue;
    if (!face.dest || face.dest.length < 3) continue;
    const pts = face.dest.map((p) => (warpApply ? warpApply(p[0], p[1]) : [p[0], p[1]]));
    out.push(pts);
  }
  return out;
}
