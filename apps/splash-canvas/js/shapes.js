/** Premade mapping surfaces, same idea as MadMapper/HeavyM: click a shape, drop media, warp it. */

function quadCorners(verts, uvs, name) {
  const corners = verts.map((v, i) => {
    const t = uvs[i];
    return { v, t, dest: [t[0] * 2 - 1, t[1] * 2 - 1] };
  });
  const tris = [];
  for (let i = 1; i < corners.length - 1; i += 1) {
    tris.push([corners[0], corners[i], corners[i + 1]]);
  }
  return {
    id: 0,
    name,
    verts: corners.map((c) => c.v),
    uvs: corners.map((c) => c.t),
    dest: corners.map((c) => c.dest),
    corners,
    tris,
    omit: false,
    media: null,
    anim: { u: 0, v: 0, speed: 0, dirU: 0, dirV: 0 },
  };
}

function meshOf(faces, label) {
  faces.forEach((face, i) => { face.id = i; });
  return { faces, vertexCount: faces.reduce((n, f) => n + f.verts.length, 0), label };
}

function tileDest(faces) {
  const n = faces.length;
  if (n <= 1) return;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  faces.forEach((face, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x0 = -1 + (2 * c) / cols;
    const x1 = -1 + (2 * (c + 1)) / cols;
    const y1 = 1 - (2 * r) / rows;
    const y0 = 1 - (2 * (r + 1)) / rows;
    face.dest = face.uvs.map(([u, v]) => [x0 + u * (x1 - x0), y0 + v * (y1 - y0)]);
    face.corners.forEach((corner, k) => { corner.dest = face.dest[k]; });
  });
}

export function makeQuad() {
  const verts = [
    [-0.9, 0.5, 0], [0.9, 0.5, 0], [0.9, -0.5, 0], [-0.9, -0.5, 0],
  ];
  const uvs = [[0, 1], [1, 1], [1, 0], [0, 0]];
  return meshOf([quadCorners(verts, uvs, "Quad")], "Quad");
}

export function makeScreen() {
  const verts = [
    [-0.95, 0.53, 0], [0.95, 0.53, 0], [0.95, -0.53, 0], [-0.95, -0.53, 0],
  ];
  const uvs = [[0, 1], [1, 1], [1, 0], [0, 0]];
  return meshOf([quadCorners(verts, uvs, "Screen")], "Screen 16:9");
}

export function makeTriangle() {
  const verts = [[0, 0.85, 0], [0.9, -0.7, 0], [-0.9, -0.7, 0]];
  const uvs = [[0.5, 1], [1, 0], [0, 0]];
  return meshOf([quadCorners(verts, uvs, "Triangle")], "Triangle");
}

export function makeCircle(segments = 28) {
  const faces = [];
  const center = [0, 0, 0];
  const ct = [0.5, 0.5];
  for (let i = 0; i < segments; i += 1) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const p0 = [Math.cos(a0) * 0.85, Math.sin(a0) * 0.85, 0];
    const p1 = [Math.cos(a1) * 0.85, Math.sin(a1) * 0.85, 0];
    const t0 = [0.5 + Math.cos(a0) * 0.5, 0.5 + Math.sin(a0) * 0.5];
    const t1 = [0.5 + Math.cos(a1) * 0.5, 0.5 + Math.sin(a1) * 0.5];
    faces.push(quadCorners([center, p0, p1], [ct, t0, t1], "Circle"));
  }
  return meshOf(faces, "Circle");
}

export function makeGrid(cols = 8, rows = 6) {
  const faces = [];
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const x0 = -1 + (2 * i) / cols;
      const x1 = -1 + (2 * (i + 1)) / cols;
      const y1 = 1 - (2 * j) / rows;
      const y0 = 1 - (2 * (j + 1)) / rows;
      const u0 = i / cols;
      const u1 = (i + 1) / cols;
      const v1 = 1 - j / rows;
      const v0 = 1 - (j + 1) / rows;
      const verts = [[x0, y1, 0], [x1, y1, 0], [x1, y0, 0], [x0, y0, 0]];
      const uvs = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
      faces.push(quadCorners(verts, uvs, `Cell ${i},${j}`));
    }
  }
  return meshOf(faces, `${cols}×${rows} grid`);
}

export function makeCube() {
  const p = 0.55;
  const faces = [
    quadCorners([[-p, p, p], [p, p, p], [p, -p, p], [-p, -p, p]], [[0, 1], [1, 1], [1, 0], [0, 0]], "Front"),
    quadCorners([[p, p, -p], [-p, p, -p], [-p, -p, -p], [p, -p, -p]], [[0, 1], [1, 1], [1, 0], [0, 0]], "Back"),
    quadCorners([[-p, p, -p], [-p, p, p], [-p, -p, p], [-p, -p, -p]], [[0, 1], [1, 1], [1, 0], [0, 0]], "Left"),
    quadCorners([[p, p, p], [p, p, -p], [p, -p, -p], [p, -p, p]], [[0, 1], [1, 1], [1, 0], [0, 0]], "Right"),
    quadCorners([[-p, p, -p], [p, p, -p], [p, p, p], [-p, p, p]], [[0, 1], [1, 1], [1, 0], [0, 0]], "Top"),
    quadCorners([[-p, -p, p], [p, -p, p], [p, -p, -p], [-p, -p, -p]], [[0, 1], [1, 1], [1, 0], [0, 0]], "Bottom"),
  ];
  tileDest(faces);
  return meshOf(faces, "Cube");
}

export function makeCorner() {
  const faces = [
    quadCorners([[-0.85, 0.7, 0.4], [0, 0.7, 0.4], [0, -0.7, 0.4], [-0.85, -0.7, 0.4]], [[0, 1], [1, 1], [1, 0], [0, 0]], "Left wall"),
    quadCorners([[0, 0.7, 0.4], [0.85, 0.7, -0.4], [0.85, -0.7, -0.4], [0, -0.7, 0.4]], [[0, 1], [1, 1], [1, 0], [0, 0]], "Right wall"),
  ];
  tileDest(faces);
  return meshOf(faces, "Corner");
}

export function makeCylinder(segments = 12, rows = 3) {
  const faces = [];
  const r = 0.7;
  const h = 1.2;
  for (let j = 0; j < rows; j += 1) {
    const y1 = h / 2 - (h * j) / rows;
    const y0 = h / 2 - (h * (j + 1)) / rows;
    const v1 = 1 - j / rows;
    const v0 = 1 - (j + 1) / rows;
    for (let i = 0; i < segments; i += 1) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const verts = [
        [Math.cos(a0) * r, y1, Math.sin(a0) * r],
        [Math.cos(a1) * r, y1, Math.sin(a1) * r],
        [Math.cos(a1) * r, y0, Math.sin(a1) * r],
        [Math.cos(a0) * r, y0, Math.sin(a0) * r],
      ];
      const u0 = i / segments;
      const u1 = (i + 1) / segments;
      const uvs = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
      faces.push(quadCorners(verts, uvs, "Cylinder"));
    }
  }
  return meshOf(faces, "Cylinder");
}

export function makeArch(segments = 10) {
  const faces = [];
  const r = 0.85;
  for (let i = 0; i < segments; i += 1) {
    const a0 = Math.PI * (i / segments);
    const a1 = Math.PI * ((i + 1) / segments);
    const verts = [
      [Math.cos(a0) * r, Math.sin(a0) * r, 0.35],
      [Math.cos(a1) * r, Math.sin(a1) * r, 0.35],
      [Math.cos(a1) * r, Math.sin(a1) * r, -0.35],
      [Math.cos(a0) * r, Math.sin(a0) * r, -0.35],
    ];
    const u0 = i / segments;
    const u1 = (i + 1) / segments;
    const uvs = [[u0, 1], [u1, 1], [u1, 0], [u0, 0]];
    faces.push(quadCorners(verts, uvs, "Arch"));
  }
  return meshOf(faces, "Arch");
}

export const SHAPES = [
  { id: "quad", label: "Quad", make: makeQuad },
  { id: "screen", label: "Screen", make: makeScreen },
  { id: "triangle", label: "Triangle", make: makeTriangle },
  { id: "circle", label: "Circle", make: makeCircle },
  { id: "grid", label: "Grid", make: () => makeGrid(8, 6) },
  { id: "cube", label: "Cube", make: makeCube },
  { id: "corner", label: "Corner", make: makeCorner },
  { id: "cylinder", label: "Cylinder", make: makeCylinder },
  { id: "arch", label: "Arch", make: makeArch },
];

export function makeShape(id) {
  const found = SHAPES.find((s) => s.id === id);
  return (found || SHAPES[0]).make();
}
