/** Halloween mapping ideas, plus a riff engine that builds new ideas from old ones. */

export const PARTS = {
  where: [
    "the front door",
    "a bay window",
    "the garage door",
    "a porch ceiling",
    "a round attic window",
    "a tree trunk",
    "the driveway fence",
    "a porch column",
    "an entry arch",
    "two walls of a corner",
    "a pumpkin on the steps",
    "the whole house facade",
    "bushes by the walk",
    "a chimney",
    "a gable",
  ],
  haunt: [
    "a jack-o'-lantern grin",
    "a drifting ghost",
    "a river of bats",
    "a spiderweb that breathes",
    "a blood moon",
    "watching orange eyes",
    "dripping slime",
    "flickering candles",
    "crawling veins",
    "a tombstone that fades in",
    "a witch silhouette",
    "fog that never settles",
    "a cursed TV wall",
    "a raven that turns its head",
    "stained-glass haunt",
  ],
  shape: ["quad", "screen", "circle", "arch", "grid", "cube", "corner", "cylinder", "triangle"],
  pattern: ["pumpkin", "ghost", "bats", "web", "moon", "eyes", "slime", "candles", "veins", "tomb", "fog", "window", "door"],
  files: [
    "PNG or WebP with a black background (then Omit black)",
    "looping MP4 / WebM (fire, smoke, bats, flicker)",
    "a vertical still for a door",
    "a 1:1 still for a pumpkin or round window",
    "a 16:9 still or video for a garage",
    "UV-mapped OBJ from Blender",
    "splash.json + the OBJ it names",
    "a GIF of a blinking face",
  ],
};

const LOOK = {
  omit: { omitBlack: 1, invertCh: false, anim: { dirU: 0, dirV: 0, speed: 0 } },
  only: { omitBlack: 2, invertCh: false, anim: { dirU: 0, dirV: 0, speed: 0 } },
  driftU: { omitBlack: 1, invertCh: false, anim: { dirU: 1, dirV: 0, speed: 0.06 } },
  driftV: { omitBlack: 1, invertCh: false, anim: { dirU: 0, dirV: 1, speed: 0.05 } },
  invert: { omitBlack: 0, invertCh: true, anim: { dirU: 0, dirV: 0, speed: 0 } },
  crawl: { omitBlack: 1, invertCh: false, anim: { dirU: -1, dirV: 1, speed: 0.04 } },
};

function pack(id, title, where, haunt, shape, pattern, look, files, how) {
  return { id, title, where, haunt, shape, pattern, files, how, ...LOOK[look] };
}

export const IDEAS = [
  pack("jack", "Jack-o'-lantern on a real pumpkin", "a pumpkin on the steps", "a jack-o'-lantern grin", "circle", "pumpkin", "omit",
    "1:1 PNG with a black background, or a looping face MP4",
    "Circle + omit black. Place the gold quad onto the pumpkin. Dim the porch lights."),
  pack("ghost-window", "Ghost in the bay window", "a bay window", "a drifting ghost", "quad", "ghost", "driftV",
    "PNG ghost on black, or a smoke/fog WebM",
    "Quad on the window glass. Omit black so only the ghost reads. Slow V motion."),
  pack("bat-garage", "Bats pouring from the garage", "the garage door", "a river of bats", "screen", "bats", "driftU",
    "16:9 looping MP4 of bats, or this built-in swarm",
    "Screen shape. Omit black. U pan so they stream across the door."),
  pack("haunted-door", "Something waits behind the door", "the front door", "watching orange eyes", "quad", "door", "omit",
    "Vertical PNG of a door, or eyes-only on black",
    "Quad mapped to the door. Omit black. Knock, then Present."),
  pack("porch-web", "Breathing spiderweb on the ceiling", "a porch ceiling", "a spiderweb that breathes", "quad", "web", "driftV",
    "High-contrast web PNG, black background",
    "Quad on the ceiling. Flop V if it feels upside down. Slow drift."),
  pack("blood-moon", "Blood moon in a round window", "a round attic window", "a blood moon", "circle", "moon", "omit",
    "Photo of the moon on black, or this crescent",
    "Circle. Omit black. Place into the round window. Add a little black level if the brick is dark."),
  pack("fence-tombs", "Tombstones along the fence", "the driveway fence", "a tombstone that fades in", "grid", "tomb", "omit",
    "Several RIP PNGs, or one atlas image",
    "Grid. Pin media to a face, or use the whole atlas. Hide leftover cells."),
  pack("witch-arch", "Witch in the garden arch", "an entry arch", "a witch silhouette", "arch", "ghost", "only",
    "Black silhouette PNG on a pale ground, then Only black",
    "Arch shape. Only black keeps the silhouette. Place onto the real arch."),
  pack("column-candles", "Candles climbing a column", "a porch column", "flickering candles", "cylinder", "candles", "driftV",
    "Looping fire MP4, or this still with V pan",
    "Cylinder. Omit black. Slow V so flames crawl up the column."),
  pack("corner-faces", "Two faces in the corner", "two walls of a corner", "watching orange eyes", "corner", "eyes", "omit",
    "Two different PNGs, pin one per wall",
    "Corner shape. Pin to this face, drop a second still on the other wall."),
  pack("cursed-cube", "Cursed TV cube", "a table-top box or pedestal", "a cursed TV wall", "cube", "window", "invert",
    "Six short loops, or one pattern on all sides",
    "Cube. Swap red/blue for a sick look. Duplicate faces if you add more boxes."),
  pack("vein-wall", "The house is bleeding", "the whole house facade", "crawling veins", "grid", "veins", "crawl",
    "Red-on-black PNG, or this generated veins",
    "Grid on the facade. Omit black. Diagonal crawl. Mask off windows you want dark."),
  pack("fog-garage", "Fog graveyard on the garage", "the garage door", "fog that never settles", "screen", "fog", "driftU",
    "Smoke WebM with a black plate, tomb PNG overlay",
    "Screen. Omit black. Slow U. Drop a tomb PNG on one face if you split the door."),
  pack("house-grin", "The house grins", "the whole house facade", "a jack-o'-lantern grin", "grid", "pumpkin", "omit",
    "A wide grin PNG, black outside the mouth",
    "Grid across siding. Omit black so only the mouth and eyes hit the house."),
  pack("bush-eyes", "Eyes in the bushes", "bushes by the walk", "watching orange eyes", "circle", "eyes", "omit",
    "Several small eye PNGs, or duplicate this face",
    "Circle. Duplicate (D) for more pairs. Place each onto a bush."),
  pack("fence-bones", "Bones on the fence", "the driveway fence", "a tombstone that fades in", "quad", "tomb", "driftU",
    "Skeleton PNG/GIF on black, or a walk-cycle WebM",
    "Quad along the fence. Omit black. Slow U so they patrol."),
  pack("chimney-raven", "Raven on the chimney", "a chimney", "a raven that turns its head", "cylinder", "bats", "omit",
    "Bird silhouette PNG, or a short turnaround MP4",
    "Cylinder. Omit black. Keep motion off unless you want it to pace."),
  pack("stained-glass", "Haunted stained glass", "a bay window", "stained-glass haunt", "grid", "window", "invert",
    "Stained-glass still, or this window grid",
    "Grid as panes. Swap red/blue. Place onto the real muntins."),
  pack("treat-path", "Trick-or-treat path lights", "the walk to the door", "flickering candles", "quad", "candles", "omit",
    "Candle PNGs, duplicate for each step light",
    "Quad. Duplicate down the path. Omit black. Present when kids arrive."),
  pack("full-house", "Full haunted house", "door + windows + gable", "a drifting ghost", "corner", "ghost", "driftV",
    "Folder of stills: door, window, moon. Drop the folder.",
    "Start Corner for the entry. Add Grid or Quad for more windows. Drop a folder of media."),
];

function hash(text) {
  let h = 2166136261;
  const s = String(text || "");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}

function titleFor(haunt, where) {
  return `${haunt} on ${where}`.replace(/^a /, "A ").replace(/^an /, "An ");
}

function assemble(parts, seedLabel) {
  const lookKey = pick(rng(hash(seedLabel + "look")), Object.keys(LOOK));
  const look = LOOK[lookKey];
  const shape = parts.shape;
  const pattern = parts.pattern;
  const where = parts.where;
  const haunt = parts.haunt;
  return {
    id: `riff-${hash(seedLabel).toString(16)}`,
    title: titleFor(haunt, where),
    where,
    haunt,
    shape,
    pattern,
    files: parts.files,
    how: `${shape} → ${pattern} look → Place onto ${where}. ${parts.files}.`,
    riff: true,
    ...look,
  };
}

export function riffFrom(idea, extra = "") {
  const rand = rng(hash(`${idea.title}|${idea.haunt}|${extra}|${Date.now()}`));
  const keepWhere = rand() > 0.45;
  const keepHaunt = rand() > 0.4;
  const keepShape = rand() > 0.5;
  return assemble({
    where: keepWhere ? idea.where : pick(rand, PARTS.where),
    haunt: keepHaunt ? idea.haunt : pick(rand, PARTS.haunt),
    shape: keepShape ? idea.shape : pick(rand, PARTS.shape),
    pattern: pick(rand, PARTS.pattern),
    files: pick(rand, PARTS.files),
  }, `${idea.title}:${extra}:${rand()}`);
}

export function riffFromText(text) {
  const seed = hash(text || "halloween");
  const rand = rng(seed);
  const where = PARTS.where.find((w) => String(text).toLowerCase().includes(w.split(" ").slice(-1)[0])) || pick(rand, PARTS.where);
  return assemble({
    where,
    haunt: pick(rand, PARTS.haunt),
    shape: pick(rand, PARTS.shape),
    pattern: pick(rand, PARTS.pattern),
    files: pick(rand, PARTS.files),
  }, text || "halloween");
}

export function surprise() {
  return riffFromText(`surprise-${Date.now()}`);
}
