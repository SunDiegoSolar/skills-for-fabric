export function parseObj(text) {
  const rawV = [];
  const rawVt = [];
  const faces = [];
  for (const line of text.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "v" && parts.length >= 4) {
      rawV.push([Number(parts[1]), Number(parts[2]), Number(parts[3])]);
    } else if (parts[0] === "vt" && parts.length >= 3) {
      rawVt.push([Number(parts[1]), Number(parts[2])]);
    } else if (parts[0] === "f" && parts.length >= 4) {
      const corners = parts.slice(1).map((token) => {
        const [vi, ti] = token.split("/");
        const v = rawV[Number(vi) - 1];
        const t = ti ? rawVt[Number(ti) - 1] : null;
        return { v, t };
      });
      const tris = [];
      for (let i = 1; i < corners.length - 1; i += 1) {
        tris.push([corners[0], corners[i], corners[i + 1]]);
      }
      const uvs = corners.map((c, idx) => c.t || [idx === 1 || idx === 2 ? 1 : 0, idx > 1 ? 1 : 0]);
      const verts = corners.map((c) => c.v);
      const dest = uvs.map(([u, v]) => [u * 2 - 1, v * 2 - 1]);
      faces.push({
        id: faces.length,
        verts,
        uvs,
        dest,
        omit: false,
        anim: { u: 0, v: 0, speed: 0 },
      });
      faces[faces.length - 1].tris = tris;
    }
  }
  return { faces, vertexCount: rawV.length };
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
    const tris = face.tris || [];
    for (const tri of tris) {
      const hit = rayHitTriangle(origin, dir, tri[0].v, tri[1].v, tri[2].v);
      if (hit != null && hit < best.t) best = { t: hit, id: face.id };
    }
  }
  return best.id;
}
