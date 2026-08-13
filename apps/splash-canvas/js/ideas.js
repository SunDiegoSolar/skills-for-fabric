/** Motion catalog: live generators, kaleidoscopes, video recipes, plus Halloween riffs. */

import { MOTION_KINDS } from "./motion.js";

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
    "the driveway",
    "a fireplace",
    "the porch steps",
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
    "falling green code",
    "a kaleidoscope of moving art",
    "a warp tunnel of stars",
  ],
  shape: ["quad", "screen", "circle", "arch", "grid", "cube", "corner", "cylinder", "triangle"],
  pattern: ["pumpkin", "ghost", "bats", "web", "moon", "eyes", "slime", "candles", "veins", "tomb", "fog", "window", "door"],
  motion: MOTION_KINDS.map((k) => k.id),
  files: [
    "PNG or WebP with a black background (then Omit black)",
    "looping MP4 / WebM (fire, smoke, bats, flicker, ocean, trains)",
    "a vertical still for a door",
    "a 1:1 still for a pumpkin or round window",
    "a 16:9 still or video for a garage",
    "UV-mapped OBJ from Blender",
    "splash.json + the OBJ it names",
    "a GIF of a blinking face",
    "no file — live generator",
    "any home video, then turn kaleido slices up",
  ],
};

const LOOK = {
  omit: { omitBlack: 1, invertCh: false, anim: { dirU: 0, dirV: 0, speed: 0 }, kaleido: 0, spin: 0 },
  only: { omitBlack: 2, invertCh: false, anim: { dirU: 0, dirV: 0, speed: 0 }, kaleido: 0, spin: 0 },
  driftU: { omitBlack: 1, invertCh: false, anim: { dirU: 1, dirV: 0, speed: 0.06 }, kaleido: 0, spin: 0 },
  driftV: { omitBlack: 1, invertCh: false, anim: { dirU: 0, dirV: 1, speed: 0.05 }, kaleido: 0, spin: 0 },
  invert: { omitBlack: 0, invertCh: true, anim: { dirU: 0, dirV: 0, speed: 0 }, kaleido: 0, spin: 0 },
  crawl: { omitBlack: 1, invertCh: false, anim: { dirU: -1, dirV: 1, speed: 0.04 }, kaleido: 0, spin: 0 },
  live: { omitBlack: 0, invertCh: false, anim: { dirU: 0, dirV: 0, speed: 0 }, kaleido: 0, spin: 0 },
  kale8: { omitBlack: 0, invertCh: false, anim: { dirU: 0, dirV: 0, speed: 0 }, kaleido: 8, spin: 0.25 },
  kale6: { omitBlack: 0, invertCh: false, anim: { dirU: 0, dirV: 0, speed: 0 }, kaleido: 6, spin: 0.12 },
  kale12: { omitBlack: 0, invertCh: false, anim: { dirU: 0, dirV: 0, speed: 0 }, kaleido: 12, spin: 0.4 },
  panLive: { omitBlack: 0, invertCh: false, anim: { dirU: 0, dirV: 1, speed: 0.03 }, kaleido: 0, spin: 0 },
};

function pack(id, title, where, haunt, shape, pattern, look, files, how) {
  return {
    id, title, where, haunt, shape, pattern, files, how, family: "halloween", live: false, motion: "",
    ...LOOK[look],
  };
}

function live(id, title, where, haunt, shape, motion, look, files, how, family = "live") {
  return {
    id, title, where, haunt, shape, pattern: "pumpkin", files, how, family, live: family === "live" || family === "kaleido" || family === "matrix",
    motion, ...LOOK[look],
  };
}

const HALLOWEEN = [
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

const FEATURED = [
  live("matrix", "The Matrix", "a garage door or any dark wall", "falling green code that is the world",
    "screen", "matrix", "live", "No file — generated live",
    "This is the rain. Screen shape, live Matrix, Place onto a dark wall, Present, dim the lights. M plays it anytime.", "matrix"),
  live("matrix-kaleido", "The Matrix, folded into a kaleidoscope", "a round attic window", "code rain mirrored into glass",
    "circle", "matrix", "kale8", "No file — live Matrix + kaleido slices",
    "Circle + Matrix + 8 kaleido slices + spin. The rain becomes a jewel. This is the HeavyM-style fold, local.", "kaleido"),
  live("matrix-windows", "Code behind every window", "the whole house facade", "a different column of rain in each pane",
    "grid", "matrix", "live", "No file — live Matrix on a grid",
    "Grid on the facade. Matrix on every cell. Hide faces that should stay dark. The house is a terminal.", "matrix"),
  live("matrix-door", "The door is a terminal", "the front door", "glyphs that invite you in and never mean it",
    "quad", "matrix", "live", "No file — live Matrix",
    "Quad on the door. Present. People will try the handle.", "matrix"),
  live("kaleido", "Kaleidoscope of moving art", "a bay window", "mirrored shards that refuse to sit still",
    "circle", "kaleido", "kale8", "No file, or drop a video to replace the orbs later",
    "Circle + live kaleido paint + 8 slices. Drop a home video after if you want your life folded.", "kaleido"),
  live("kaleido-video", "Kaleidoscope your home movie", "the garage door", "family footage shattered into glass",
    "screen", "kaleido", "kale12", "Looping MP4 / WebM of anything — kids, ocean, fire, a walk",
    "Drop a video first if you have one, then Use. Crank kaleido slices. This is Resolume's fold, without the clip deck.", "video"),
  live("stars-garage", "The garage as a warp tunnel", "the garage door", "stars that fall into the house",
    "screen", "stars", "live", "No file — live star tunnel",
    "Screen. Live stars. Place on the door. Open it and the tunnel should feel like it continues.", "live"),
  live("fire-column", "Fire that climbs and never arrives", "a porch column", "flames that live in the brick",
    "cylinder", "fire", "live", "Or a looping fire MP4 with Omit black",
    "Cylinder + live fire. Dim porch lights. The column becomes a torch that does not burn.", "live"),
  live("rain-up", "Rain that falls up the gable", "a gable", "weather that forgot gravity",
    "triangle", "rain", "panLive", "No file — live rain, or a storm loop",
    "Triangle on the gable. Live rain. Flop V if you want it to climb.", "live"),
  live("snow-ceiling", "Snow that forgets the ground", "a porch ceiling", "flakes that never land",
    "quad", "snow", "live", "No file — live snow",
    "Quad on the ceiling. Live snow. People look up.", "live"),
  live("swarm-corner", "A swarm that thinks the corner is a hive", "two walls of a corner", "gold motes with a job",
    "corner", "swarm", "live", "No file — live swarm",
    "Corner shape. Live swarm. Two walls share a mind.", "live"),
  live("scan-house", "The house as a VHS HUD", "the whole house facade", "scanlines reading the siding",
    "grid", "scan", "live", "No file — live scanlines",
    "Grid on the facade. Live CRT scan. The house is being decoded.", "live"),
  live("portal-arch", "A portal where the garden arch is", "an entry arch", "rings that want a destination",
    "arch", "portal", "kale6", "No file — live portal",
    "Arch + live portal + a little kaleido. Walk through. Nothing happens. That is the joke and the spell.", "live"),
  live("glitch-cube", "Glitch cube on the pedestal", "a table-top box", "a TV that is having a feeling",
    "cube", "glitch", "invert", "No file, or six short loops pinned per face",
    "Cube + live glitch. Swap red/blue. Duplicate for a stack of broken sets.", "live"),
  live("aurora-round", "Aurora caught in the round window", "a round attic window", "northern lights in a small glass",
    "circle", "aurora", "live", "No file — live aurora",
    "Circle. Live aurora. The attic is farther north than the house.", "live"),
  live("cells-fence", "The fence is thinking", "the driveway fence", "cellular life in the wood grain",
    "grid", "cells", "live", "No file — live Game of Life",
    "Grid along the fence. Living cells. The wood is computing.", "live"),
  live("vortex-drive", "Vortex in the driveway", "the driveway", "a drain in the asphalt that is not a drain",
    "screen", "vortex", "kale6", "No file — live vortex",
    "Screen on the drive. Live vortex. Cars should not park on it, aesthetically.", "live"),
  live("pulse-door", "The door has a pulse", "the front door", "a heartbeat mapped to wood",
    "quad", "pulse", "live", "No file — live pulse, or a real ECG loop",
    "Quad on the door. Live pulse. Knock on the beat.", "live"),
  live("ink-memory", "Ink blot of a family memory", "a bay window", "Rorschach on glass",
    "quad", "ink", "live", "Or a faded photo, then kaleido 4",
    "Quad. Live ink. Ask people what they see. Believe none of it.", "live"),
  live("lattice-dream", "Chicken wire dreaming it is crystal", "a porch ceiling", "a moving lattice of light",
    "quad", "lattice", "live", "No file — live lattice",
    "Quad on the ceiling. Live lattice. Greenhouse in the mind.", "live"),
  live("waveform-street", "The house is listening", "the whole house facade", "a waveform of the street",
    "grid", "waveform", "live", "No file — live bars, or a real audio-reactive clip from Resolume/HeavyM exported as video",
    "Grid on the facade. Live waveform. True audio-reactive is what the other apps have; this is the cousin you can map tonight.", "video"),
  live("mosaic-rooms", "A thousand tiny rooms", "the whole house facade", "every shingle a different hour",
    "grid", "mosaic", "live", "No file — live mosaic, or a photo mosaic MP4",
    "Grid. Live mosaic. The house as a comic panel.", "live"),
  live("bloom-spores", "Bloom orbs like spores", "bushes by the walk", "soft worlds that drift",
    "circle", "bloom", "kale8", "No file — live bloom",
    "Circle on a bush. Live bloom + kaleido. Duplicate (D) down the walk.", "kaleido"),
  live("sea-inland", "The sea is inland tonight", "the garage door", "tide on a door that never knew water",
    "screen", "sea", "live", "Live tide, or a real ocean loop with Omit black off",
    "Screen. Live sea. The garage is a horizon.", "live"),
  live("clock-chimney", "An hour mapped onto the chimney", "a chimney", "hands that do not care about noon",
    "cylinder", "clock", "live", "No file — live clock",
    "Cylinder. Live clock. Time as texture.", "live"),
  live("stained-move", "Moving stained glass", "a bay window", "video folded into muntins",
    "grid", "kaleido", "kale6", "Drop a colorful looping MP4, then Use",
    "Grid as panes. Kaleido slices. Drop stained-glass or flower video. This is MadMapper materials + HeavyM shaders, in a browser.", "video"),
  live("slow-tv", "Slow TV on the wall", "a bay window", "a train window that is your window",
    "quad", "sea", "live", "Long looping MP4: train, fireplace, aquarium, rain on a windshield",
    "Drop the loop, Screen or Quad, Place, Present. Moving art that does not perform. It just continues.", "video"),
  live("hearth-loop", "A fireplace that is not a fireplace", "a fireplace", "looping fire in a real hearth",
    "quad", "fire", "live", "Fire MP4 with a black plate, Omit black — or live fire",
    "Quad in the hearth. Live or dropped fire. The oldest mapping trick, still the best.", "video"),
];

const SURFACES = [
  { id: "facade", where: "the whole house facade", shape: "grid" },
  { id: "garage", where: "the garage door", shape: "screen" },
  { id: "bay", where: "a bay window", shape: "quad" },
  { id: "door", where: "the front door", shape: "quad" },
  { id: "ceiling", where: "a porch ceiling", shape: "quad" },
  { id: "round", where: "a round attic window", shape: "circle" },
  { id: "fence", where: "the driveway fence", shape: "grid" },
  { id: "arch", where: "an entry arch", shape: "arch" },
  { id: "column", where: "a porch column", shape: "cylinder" },
  { id: "corner", where: "two walls of a corner", shape: "corner" },
  { id: "cube", where: "a table-top box", shape: "cube" },
  { id: "chimney", where: "a chimney", shape: "cylinder" },
  { id: "gable", where: "a gable", shape: "triangle" },
  { id: "drive", where: "the driveway", shape: "screen" },
  { id: "bush", where: "bushes by the walk", shape: "circle" },
  { id: "tree", where: "a tree trunk", shape: "cylinder" },
  { id: "hearth", where: "a fireplace", shape: "quad" },
  { id: "steps", where: "the porch steps", shape: "grid" },
];

const BEATS = [
  { id: "matrix", short: "green code rain", haunt: "falling glyphs that never stop", look: "live", family: "matrix", how: "Live Matrix. Dim lights. Present." },
  { id: "kaleido", short: "a kaleidoscope", haunt: "mirrored moving art", look: "kale8", family: "kaleido", how: "Live kaleido paint + slices. Drop a video to fold your own footage." },
  { id: "fire", short: "climbing fire", haunt: "flames that live in the surface", look: "live", family: "live", how: "Live fire, or drop a fire loop and Omit black." },
  { id: "rain", short: "rain", haunt: "weather that belongs to the wall", look: "live", family: "live", how: "Live rain. Works on dark brick." },
  { id: "snow", short: "snow", haunt: "flakes that refuse the ground", look: "live", family: "live", how: "Live snow. Ceiling and gable love this." },
  { id: "stars", short: "a star tunnel", haunt: "a warp that wants a ship", look: "live", family: "live", how: "Live star tunnel. Garage doors become engines." },
  { id: "swarm", short: "a gold swarm", haunt: "motes with a job", look: "live", family: "live", how: "Live swarm. Duplicate for a plague of light." },
  { id: "scan", short: "scanlines", haunt: "a HUD reading the architecture", look: "live", family: "live", how: "Live CRT scan. The building is being decoded." },
  { id: "portal", short: "a portal", haunt: "rings that want a destination", look: "kale6", family: "live", how: "Live portal. Arch and circle are the honest shapes." },
  { id: "glitch", short: "a glitch", haunt: "a surface having a feeling", look: "invert", family: "live", how: "Live glitch. Swap red/blue if it is too polite." },
  { id: "aurora", short: "aurora", haunt: "northern lights in the wrong latitude", look: "live", family: "live", how: "Live aurora. Round windows and gables." },
  { id: "cells", short: "living cells", haunt: "the material computing", look: "live", family: "live", how: "Live Game of Life. Fences and grids." },
  { id: "vortex", short: "a vortex", haunt: "a drain that is not a drain", look: "kale6", family: "live", how: "Live vortex. Driveways and cubes." },
  { id: "pulse", short: "a pulse", haunt: "a heartbeat mapped to matter", look: "live", family: "live", how: "Live pulse. Doors and columns." },
  { id: "ink", short: "an ink blot", haunt: "a Rorschach on architecture", look: "live", family: "live", how: "Live ink. Ask people what they see." },
  { id: "lattice", short: "a moving lattice", haunt: "chicken wire dreaming it is crystal", look: "live", family: "live", how: "Live lattice. Ceilings and greenhouses." },
  { id: "waveform", short: "a waveform", haunt: "the building listening", look: "live", family: "video", how: "Live bars. True audio-reactive lives in HeavyM/Resolume; map this tonight, or drop a real audio-vis loop." },
  { id: "mosaic", short: "a mosaic", haunt: "every tile a different hour", look: "live", family: "live", how: "Live mosaic. Facades and grids." },
  { id: "bloom", short: "bloom orbs", haunt: "spores of light", look: "kale8", family: "kaleido", how: "Live bloom + kaleido. Bushes, circles, night." },
  { id: "sea", short: "a tide", haunt: "the sea inland", look: "live", family: "video", how: "Live tide, or drop an ocean loop." },
  { id: "clock", short: "a clock", haunt: "time as texture", look: "live", family: "live", how: "Live clock. Chimneys and cubes." },
];

const TITLE_AT = [
  (beat, surface) => `${cap(beat.short)} on ${surface.where}`,
  (beat, surface) => `What if ${surface.where} became ${beat.haunt}`,
  (beat, surface) => `${cap(beat.short)} leaking from ${surface.where}`,
  (beat, surface) => `${cap(surface.where)} learns ${beat.haunt}`,
  (beat, surface) => `Map ${beat.short} onto ${surface.where}`,
  (beat, surface) => `${cap(surface.where)} as ${beat.haunt}`,
];

function cap(s) {
  return s.replace(/^a /, "A ").replace(/^an /, "An ").replace(/^the /, "The ").replace(/^([a-z])/, (m) => m.toUpperCase());
}

function buildCatalog() {
  const ideas = [];
  const seen = new Set();
  const add = (idea) => {
    if (seen.has(idea.id)) return;
    seen.add(idea.id);
    ideas.push(idea);
  };
  FEATURED.forEach(add);
  let n = 0;
  for (const surface of SURFACES) {
    for (const beat of BEATS) {
      const id = `${beat.id}-${surface.id}`;
      if (seen.has(id)) continue;
      const title = TITLE_AT[n % TITLE_AT.length](beat, surface);
      add(live(
        id,
        title,
        surface.where,
        beat.haunt,
        surface.shape,
        beat.id,
        beat.look,
        beat.family === "video" ? "Looping MP4 / WebM, or no file — live look" : "No file — generated live",
        `${surface.shape} + live ${beat.id}. ${beat.how} Place onto ${surface.where}.`,
        beat.family,
      ));
      n += 1;
      if (ideas.length >= 220) break;
    }
    if (ideas.length >= 220) break;
  }
  HALLOWEEN.forEach(add);
  return ideas;
}

export const IDEAS = buildCatalog();
export const FEATURED_IDS = new Set(FEATURED.map((i) => i.id));

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
  const motion = parts.motion || pick(rng(hash(seedLabel + "m")), PARTS.motion);
  return {
    id: `riff-${hash(seedLabel).toString(16)}`,
    title: titleFor(parts.haunt, parts.where),
    where: parts.where,
    haunt: parts.haunt,
    shape: parts.shape,
    pattern: parts.pattern,
    files: parts.files,
    how: `${parts.shape} → ${motion || parts.pattern} look → Place onto ${parts.where}. ${parts.files}.`,
    riff: true,
    live: !!motion,
    motion,
    family: motion ? "live" : "halloween",
    ...look,
  };
}

export function riffFrom(idea, extra = "") {
  const rand = rng(hash(`${idea.title}|${idea.haunt}|${extra}|${Date.now()}`));
  const keepWhere = rand() > 0.45;
  const keepHaunt = rand() > 0.4;
  const keepShape = rand() > 0.5;
  const keepMotion = rand() > 0.35 && idea.motion;
  return assemble({
    where: keepWhere ? idea.where : pick(rand, PARTS.where),
    haunt: keepHaunt ? idea.haunt : pick(rand, PARTS.haunt),
    shape: keepShape ? idea.shape : pick(rand, PARTS.shape),
    pattern: pick(rand, PARTS.pattern),
    motion: keepMotion ? idea.motion : pick(rand, PARTS.motion),
    files: pick(rand, PARTS.files),
  }, `${idea.title}:${extra}:${rand()}`);
}

export function riffFromText(text) {
  const seed = hash(text || "motion");
  const rand = rng(seed);
  const lower = String(text || "").toLowerCase();
  const motionHit = PARTS.motion.find((m) => lower.includes(m))
    || (lower.includes("kaleidoscope") ? "kaleido" : "")
    || (lower.includes("code") || lower.includes("neo") ? "matrix" : "");
  const where = PARTS.where.find((w) => lower.includes(w.split(" ").slice(-1)[0])) || pick(rand, PARTS.where);
  return assemble({
    where,
    haunt: pick(rand, PARTS.haunt),
    shape: pick(rand, PARTS.shape),
    pattern: pick(rand, PARTS.pattern),
    motion: motionHit || pick(rand, PARTS.motion),
    files: pick(rand, PARTS.files),
  }, text || "motion");
}

export function surprise() {
  return riffFromText(`surprise-${Date.now()}`);
}

export function ideaCount() {
  return {
    total: IDEAS.length,
    motion: IDEAS.filter((i) => i.family !== "halloween").length,
    live: IDEAS.filter((i) => i.live).length,
    halloween: HALLOWEEN.length,
    featured: FEATURED.length,
  };
}
