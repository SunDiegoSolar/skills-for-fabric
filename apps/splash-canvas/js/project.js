const COMMENT = /(^|[^:])\/\/.*?$/gm;

export function parseJsonc(text) {
  return JSON.parse(String(text).replace(COMMENT, "$1"));
}

function unwrap(value) {
  if (Array.isArray(value) && value.length === 1) return unwrap(value[0]);
  return value;
}

export function identityWarp() {
  const points = [];
  for (let j = 0; j < 4; j += 1) {
    for (let i = 0; i < 4; i += 1) {
      points.push([-1 + (2 * i) / 3, -1 + (2 * j) / 3]);
    }
  }
  return { patchSize: [4, 4], points };
}

export function warpFromPatchControl(patchControl) {
  if (!Array.isArray(patchControl) || patchControl.length < 3) return identityWarp();
  const cols = Number(patchControl[0]) || 4;
  const rows = Number(patchControl[1]) || 4;
  const points = [];
  for (let i = 2; i < patchControl.length; i += 1) {
    const p = patchControl[i];
    if (Array.isArray(p) && p.length >= 2) points.push([Number(p[0]), Number(p[1])]);
  }
  while (points.length < cols * rows) {
    const i = points.length % cols;
    const j = Math.floor(points.length / cols);
    points.push([-1 + (2 * i) / Math.max(1, cols - 1), -1 + (2 * j) / Math.max(1, rows - 1)]);
  }
  return { patchSize: [cols, rows], points };
}

export function warpGrid(warp) {
  const [cols, rows] = warp.patchSize;
  const grid = [];
  for (let j = 0; j < rows; j += 1) {
    const row = [];
    for (let i = 0; i < cols; i += 1) {
      row.push(warp.points[j * cols + i]);
    }
    grid.push(row);
  }
  return grid;
}

function collectScenes(config) {
  const scenes = [];
  if (config.scenes && !Array.isArray(config.scenes) && typeof config.scenes === "object") {
    for (const [name, scene] of Object.entries(config.scenes)) {
      scenes.push({ name, objects: scene.objects || {}, links: scene.links || [] });
    }
    return scenes;
  }
  for (const scene of config.scenes || []) {
    if (typeof scene !== "object") continue;
    const name = scene.name || "scene";
    const block = config[name] || {};
    const objects = {};
    for (const [key, value] of Object.entries(block)) {
      if (key !== "links" && value && typeof value === "object") objects[key] = value;
    }
    scenes.push({ name, objects, links: block.links || [] });
  }
  return scenes;
}

export function splashToProject(config, extras = {}) {
  const scenes = collectScenes(config);
  const objects = [];
  const links = [];
  let warp = identityWarp();
  let meshFile = extras.meshFile || "./samples/grid_wall.obj";
  let imageFile = extras.imageFile || "";
  let invertChannels = false;
  let blackLevel = 0;

  for (const scene of scenes) {
    for (const [name, obj] of Object.entries(scene.objects)) {
      const type = unwrap(obj.type);
      objects.push({ scene: scene.name, name, type, file: unwrap(obj.file) || "" });
      if (type === "mesh" && obj.file) meshFile = unwrap(obj.file);
      if ((type === "image" || type === "image_ffmpeg") && obj.file) imageFile = unwrap(obj.file);
      if (type === "warp") warp = warpFromPatchControl(obj.patchControl);
      if (type === "filter" || type === "filter_black_level") {
        invertChannels = Boolean(unwrap(obj.invertChannels));
        blackLevel = Number(unwrap(obj.blackLevel) || 0);
      }
    }
    for (const link of scene.links) {
      links.push({ from: link[0], to: link[1], scene: scene.name });
    }
  }

  return {
    version: unwrap(config.version) || "web",
    meshFile,
    imageFile,
    warp,
    invertChannels,
    blackLevel: blackLevel > 1 ? blackLevel / 255 : blackLevel,
    objects,
    links,
  };
}

export async function loadSplashJson(file) {
  const text = await file.text();
  return splashToProject(parseJsonc(text));
}

export function basename(path) {
  return String(path || "").split(/[/\\]/).pop();
}

export function toSplashJson(state) {
  const [cols, rows] = state.warp.patchSize;
  const patchControl = [cols, rows, ...state.warp.points.map((p) => [p[0], p[1]])];
  return {
    description: "splashConfiguration",
    version: "web-canvas",
    world: { framerate: 60 },
    scenes: {
      local: {
        links: (state.graph.links || []).map((l) => [l.from, l.to]),
        objects: {
          mesh: { type: "mesh", file: [state.graph.objects?.find((o) => o.type === "mesh")?.file || "mesh.obj"] },
          object: { type: "object" },
          image: { type: "image", flip: [!!state.flags.flip], flop: [!!state.flags.flop] },
          object_image_filter: {
            type: "filter",
            invertChannels: [!!state.flags.invertChannels],
            blackLevel: [Math.round((state.flags.blackLevel || 0) * 255)],
          },
          warp: { type: "warp", patchSize: [cols, rows], patchControl },
          window: { type: "window" },
        },
      },
    },
  };
}
