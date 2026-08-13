function indexOf(raw, token, count) {
  const n = Number(token);
  if (!Number.isFinite(n) || n === 0) return 0;
  return n < 0 ? count + n : n - 1;
}

function fallbackUv(idx) {
  return [idx === 1 || idx === 2 ? 1 : 0, idx > 1 ? 1 : 0];
}

function boundsOf(pts) {
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) {
    min = [Math.min(min[0], p[0]), Math.min(min[1], p[1]), Math.min(min[2], p[2])];
    max = [Math.max(max[0], p[0]), Math.max(max[1], p[1]), Math.max(max[2], p[2])];
  }
  return { min, max };
}

function normalizePoints(pts, spanTarget = 1.7) {
  if (!pts.length) return;
  const { min, max } = boundsOf(pts);
  const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const span = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
  const scale = spanTarget / span;
  for (const p of pts) {
    p[0] = (p[0] - center[0]) * scale;
    p[1] = (p[1] - center[1]) * scale;
    p[2] = (p[2] - center[2]) * scale;
  }
}

export function parseObj(text) {
  const rawV = [];
  const rawVt = [];
  const faceSpecs = [];
  for (const line of text.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "v" && parts.length >= 4) {
      rawV.push([Number(parts[1]), Number(parts[2]), Number(parts[3])]);
    } else if (parts[0] === "vt" && parts.length >= 3) {
      rawVt.push([Number(parts[1]), Number(parts[2])]);
    } else if (parts[0] === "f" && parts.length >= 4) {
      faceSpecs.push(parts.slice(1));
    }
  }
  normalizePoints(rawV);
  const faces = [];
  for (const spec of faceSpecs) {
    const corners = spec.map((token, idx) => {
      const [vi, ti] = token.split("/");
      const v = rawV[indexOf(rawV, vi, rawV.length)] || [0, 0, 0];
      const t = ti ? (rawVt[indexOf(rawVt, ti, rawVt.length)] || fallbackUv(idx)) : fallbackUv(idx);
      return { v, t, dest: [t[0] * 2 - 1, t[1] * 2 - 1] };
    });
    const tris = [];
    for (let i = 1; i < corners.length - 1; i += 1) {
      tris.push([corners[0], corners[i], corners[i + 1]]);
    }
    faces.push({
      id: faces.length,
      verts: corners.map((c) => c.v),
      uvs: corners.map((c) => c.t),
      dest: corners.map((c) => c.dest),
      corners,
      tris,
      omit: false,
      media: null,
      anim: { u: 0, v: 0, speed: 0, dirU: 0, dirV: 0 },
    });
  }
  return { faces, vertexCount: rawV.length };
}

export function syncFaceDest(face) {
  if (!face?.corners) return;
  face.corners.forEach((corner, i) => {
    if (face.dest[i]) corner.dest = face.dest[i];
  });
}

export function setFaceDest(face, index, xy) {
  face.dest[index] = xy;
  if (face.corners?.[index]) face.corners[index].dest = xy;
}

export function normalizeMesh(mesh) {
  const pts = mesh.faces.flatMap((face) => face.verts);
  normalizePoints(pts);
  return mesh;
}

export async function loadObj(url) {
  const text = await fetch(url).then((r) => r.text());
  return parseObj(text);
}

export function faceCentroid(face) {
  const n = face.verts.length || 1;
  const s = face.verts.reduce((acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]], [0, 0, 0]);
  return [s[0] / n, s[1] / n, s[2] / n];
}

export function rayHitTriangle(origin, dir, a, b, c) {
  const eps = 1e-7;
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const p = [
    dir[1] * ac[2] - dir[2] * ac[1],
    dir[2] * ac[0] - dir[0] * ac[2],
    dir[0] * ac[1] - dir[1] * ac[0],
  ];
  const det = ab[0] * p[0] + ab[1] * p[1] + ab[2] * p[2];
  if (Math.abs(det) < eps) return null;
  const inv = 1 / det;
  const tvec = [origin[0] - a[0], origin[1] - a[1], origin[2] - a[2]];
  const u = (tvec[0] * p[0] + tvec[1] * p[1] + tvec[2] * p[2]) * inv;
  if (u < 0 || u > 1) return null;
  const q = [
    tvec[1] * ab[2] - tvec[2] * ab[1],
    tvec[2] * ab[0] - tvec[0] * ab[2],
    tvec[0] * ab[1] - tvec[1] * ab[0],
  ];
  const v = (dir[0] * q[0] + dir[1] * q[1] + dir[2] * q[2]) * inv;
  if (v < 0 || u + v > 1) return null;
  const t = (ac[0] * q[0] + ac[1] * q[1] + ac[2] * q[2]) * inv;
  if (t < eps) return null;
  return t;
}

export function pickFace(mesh, origin, dir) {
  let best = { t: Infinity, id: -1 };
  for (const face of mesh.faces) {
    for (const tri of face.tris || []) {
      const hit = rayHitTriangle(origin, dir, tri[0].v, tri[1].v, tri[2].v);
      if (hit != null && hit < best.t) best = { t: hit, id: face.id };
    }
  }
  return best.id;
}
