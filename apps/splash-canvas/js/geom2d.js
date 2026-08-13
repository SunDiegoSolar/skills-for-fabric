export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function pointInPoly(x, y, pts) {
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

export function closestOnSeg(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby || 1e-8;
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / len2, 0, 1);
  return [ax + t * abx, ay + t * aby];
}

export function polyEdges(pts) {
  const edges = [];
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    edges.push([a[0], a[1], b[0], b[1]]);
  }
  return edges;
}

/** Circle vs filled polygon. Pushes out and reflects velocity. Returns true on hit. */
export function resolveCirclePolygon(actor, pts, rest = 0.82) {
  if (!pts || pts.length < 3) return false;
  const inside = pointInPoly(actor.x, actor.y, pts);
  let bestD = Infinity;
  let bestP = [actor.x, actor.y];
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const p = closestOnSeg(actor.x, actor.y, a[0], a[1], b[0], b[1]);
    const d = Math.hypot(actor.x - p[0], actor.y - p[1]);
    if (d < bestD) {
      bestD = d;
      bestP = p;
    }
  }
  const dx = actor.x - bestP[0];
  const dy = actor.y - bestP[1];
  const dist = Math.hypot(dx, dy) || 1e-6;
  const hit = inside || dist < actor.r;
  if (!hit) return false;
  let nx = dx / dist;
  let ny = dy / dist;
  if (inside) {
    nx = -nx;
    ny = -ny;
  }
  const overlap = inside ? actor.r + dist : actor.r - dist;
  actor.x += nx * (overlap + 1e-4);
  actor.y += ny * (overlap + 1e-4);
  const vn = actor.vx * nx + actor.vy * ny;
  if (vn < 0) {
    actor.vx -= (1 + rest) * vn * nx;
    actor.vy -= (1 + rest) * vn * ny;
  }
  return true;
}

export function resolveCircleCircle(a, b, rest = 0.82) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1e-6;
  const min = a.r + b.r;
  if (dist >= min) return false;
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = min - dist;
  const imA = a.frozen ? 0 : 1;
  const imB = b.frozen ? 0 : 1;
  const sum = imA + imB || 1;
  if (imA) {
    a.x -= nx * overlap * (imA / sum);
    a.y -= ny * overlap * (imA / sum);
  }
  if (imB) {
    b.x += nx * overlap * (imB / sum);
    b.y += ny * overlap * (imB / sum);
  }
  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const vn = rvx * nx + rvy * ny;
  if (vn > 0) return true;
  const impulse = -(1 + rest) * vn / sum;
  if (imA) {
    a.vx -= impulse * nx;
    a.vy -= impulse * ny;
  }
  if (imB) {
    b.vx += impulse * nx;
    b.vy += impulse * ny;
  }
  return true;
}

export function bounceBounds(actor, rest = 0.82, min = -0.98, max = 0.98) {
  let hit = false;
  if (actor.x - actor.r < min) {
    actor.x = min + actor.r;
    if (actor.vx < 0) actor.vx = -actor.vx * rest;
    hit = true;
  } else if (actor.x + actor.r > max) {
    actor.x = max - actor.r;
    if (actor.vx > 0) actor.vx = -actor.vx * rest;
    hit = true;
  }
  if (actor.y - actor.r < min) {
    actor.y = min + actor.r;
    if (actor.vy < 0) actor.vy = -actor.vy * rest;
    hit = true;
  } else if (actor.y + actor.r > max) {
    actor.y = max - actor.r;
    if (actor.vy > 0) actor.vy = -actor.vy * rest;
    hit = true;
  }
  return hit;
}
