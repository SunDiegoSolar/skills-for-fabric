/** Live generative looks. Matrix is the first real moving world; the rest are cousins. */

function canvas2d(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.dataset.splashMotion = "1";
  canvas.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = "#050806";
  ctx.fillRect(0, 0, size, size);
  return { canvas, ctx, size };
}

const GLYPHS = "ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ZTHX#$<>*+-=:";

function glyph(rand) {
  return GLYPHS[Math.floor(rand() * GLYPHS.length)] || "0";
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

function initMatrix(size) {
  const step = 18;
  const cols = Math.floor(size / step);
  const rand = rng(0x4d415452);
  const columns = [];
  for (let i = 0; i < cols; i += 1) {
    columns.push({
      x: i * step + 2,
      y: rand() * size,
      speed: 90 + rand() * 220,
      trail: 12 + Math.floor(rand() * 18),
      glyphs: Array.from({ length: 40 }, () => glyph(rand)),
      tick: 0,
    });
  }
  return { step, columns, rand };
}

function tickMatrix(ctx, size, dt, world) {
  ctx.fillStyle = "rgba(4, 8, 6, 0.18)";
  ctx.fillRect(0, 0, size, size);
  ctx.font = `700 ${world.step - 2}px "Share Tech Mono", ui-monospace, monospace`;
  ctx.textBaseline = "top";
  for (const col of world.columns) {
    col.y += col.speed * dt;
    col.tick += dt;
    if (col.tick > 0.08) {
      col.tick = 0;
      col.glyphs.pop();
      col.glyphs.unshift(glyph(world.rand));
    }
    if (col.y - col.trail * world.step > size) {
      col.y = -world.rand() * 80;
      col.speed = 90 + world.rand() * 220;
    }
    for (let i = 0; i < col.trail; i += 1) {
      const gy = col.y - i * world.step;
      if (gy < -world.step || gy > size) continue;
      const t = 1 - i / col.trail;
      if (i === 0) ctx.fillStyle = "#e8ffe9";
      else if (i < 3) ctx.fillStyle = `rgba(180, 255, 190, ${t})`;
      else ctx.fillStyle = `rgba(20, ${Math.floor(140 + t * 90)}, 70, ${t})`;
      ctx.fillText(col.glyphs[i % col.glyphs.length], col.x, gy);
    }
  }
}

function initOrbs(n, size, rand) {
  return Array.from({ length: n }, () => ({
    x: rand() * size,
    y: rand() * size,
    r: 8 + rand() * 40,
    vx: (rand() - 0.5) * 80,
    vy: (rand() - 0.5) * 80,
    hue: rand() * 360,
  }));
}

function tickKaleido(ctx, size, dt, world, t) {
  ctx.fillStyle = "rgba(8, 6, 14, 0.22)";
  ctx.fillRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  for (const o of world.orbs) {
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    if (o.x < 0 || o.x > size) o.vx *= -1;
    if (o.y < 0 || o.y > size) o.vy *= -1;
    const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
    g.addColorStop(0, `hsla(${(o.hue + t * 40) % 360}, 90%, 62%, 0.95)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = `hsla(${(t * 50) % 360}, 80%, 70%, 0.55)`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 40 + Math.sin(t * 1.4) * 18, 0, Math.PI * 2);
  ctx.stroke();
}

function tickFire(ctx, size, dt, world) {
  ctx.fillStyle = "rgba(8, 2, 0, 0.28)";
  ctx.fillRect(0, 0, size, size);
  for (const p of world.parts) {
    p.y -= p.speed * dt;
    p.x += Math.sin(p.y * 0.04) * 12 * dt;
    p.life -= dt;
    if (p.life < 0 || p.y < 0) {
      p.x = world.rand() * size;
      p.y = size - world.rand() * 40;
      p.life = 0.6 + world.rand() * 1.2;
      p.speed = 80 + world.rand() * 140;
    }
    const a = Math.max(0, p.life);
    ctx.fillStyle = `rgba(255, ${Math.floor(80 + a * 120)}, 20, ${a})`;
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }
}

function tickStreaks(ctx, size, dt, world, color, vy) {
  ctx.fillStyle = "rgba(4, 6, 10, 0.2)";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  for (const p of world.parts) {
    p.y += vy * p.speed * dt;
    p.x += p.drift * dt;
    if (p.y > size + 20) {
      p.y = -20;
      p.x = world.rand() * size;
    }
    if (p.y < -20 && vy < 0) p.y = size + 10;
    ctx.lineWidth = p.w;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + p.drift * 0.05, p.y - Math.sign(vy) * p.len);
    ctx.stroke();
  }
}

function tickStars(ctx, size, dt, world) {
  ctx.fillStyle = "rgba(2, 2, 8, 0.35)";
  ctx.fillRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  ctx.fillStyle = "#f4f1ea";
  for (const p of world.parts) {
    p.z -= p.speed * dt;
    if (p.z < 0.08) {
      p.x = (world.rand() - 0.5) * 2;
      p.y = (world.rand() - 0.5) * 2;
      p.z = 1;
    }
    const sx = cx + (p.x / p.z) * cx;
    const sy = cy + (p.y / p.z) * cy;
    const r = (1.2 / p.z) * 2.2;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function tickSwarm(ctx, size, dt, world, t) {
  ctx.fillStyle = "rgba(6, 4, 10, 0.24)";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#e8c07a";
  for (const p of world.parts) {
    p.a += p.w * dt;
    p.x = size * 0.5 + Math.cos(p.a) * p.r + Math.sin(t * 0.7 + p.r) * 20;
    p.y = size * 0.5 + Math.sin(p.a * 1.3) * p.r * 0.7;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function tickScan(ctx, size, dt, world) {
  ctx.fillStyle = "#07090c";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(90, 144, 208, 0.25)";
  ctx.lineWidth = 1;
  for (let y = 0; y < size; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  world.y = (world.y + 140 * dt) % size;
  const g = ctx.createLinearGradient(0, world.y - 30, 0, world.y + 30);
  g.addColorStop(0, "rgba(90, 208, 160, 0)");
  g.addColorStop(0.5, "rgba(140, 255, 200, 0.85)");
  g.addColorStop(1, "rgba(90, 208, 160, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, world.y - 30, size, 60);
}

function tickPortal(ctx, size, dt, world, t) {
  ctx.fillStyle = "#05040a";
  ctx.fillRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  for (let i = 18; i >= 1; i -= 1) {
    const r = (i * 16 + t * 70) % (size * 0.7);
    ctx.strokeStyle = `hsla(${200 + i * 8}, 80%, 60%, ${0.15 + (i % 3) * 0.1})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#0b0c10";
  ctx.beginPath();
  ctx.arc(cx, cy, 18 + Math.sin(t * 3) * 6, 0, Math.PI * 2);
  ctx.fill();
}

function tickGlitch(ctx, size, dt, world) {
  if (!world.ready) {
    ctx.fillStyle = "#12040a";
    ctx.fillRect(0, 0, size, size);
    world.ready = true;
  }
  ctx.fillStyle = "rgba(10, 2, 8, 0.18)";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 12; i += 1) {
    const y = world.rand() * size;
    const h = 4 + world.rand() * 28;
    ctx.fillStyle = world.rand() > 0.5 ? "rgba(0,255,160,0.45)" : "rgba(255,40,90,0.4)";
    ctx.fillRect(world.rand() * size, y, 40 + world.rand() * 200, h);
  }
}

function tickAurora(ctx, size, dt, world, t) {
  ctx.fillStyle = "#04060c";
  ctx.fillRect(0, 0, size, size);
  for (let band = 0; band < 5; band += 1) {
    ctx.beginPath();
    ctx.moveTo(0, size);
    for (let x = 0; x <= size; x += 8) {
      const y = size * 0.35 + band * 28 + Math.sin(x * 0.01 + t * (0.8 + band * 0.2)) * 50
        + Math.sin(x * 0.03 - t) * 18;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(size, size);
    ctx.closePath();
    ctx.fillStyle = `hsla(${140 + band * 28}, 80%, 55%, 0.14)`;
    ctx.fill();
  }
}

function tickCells(ctx, size, dt, world) {
  world.acc += dt;
  if (world.acc < 0.12) return;
  world.acc = 0;
  const n = world.n;
  const next = new Uint8Array(n * n);
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      let c = 0;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          if (!ox && !oy) continue;
          const ix = (x + ox + n) % n;
          const iy = (y + oy + n) % n;
          c += world.grid[iy * n + ix];
        }
      }
      const alive = world.grid[y * n + x];
      next[y * n + x] = (alive && (c === 2 || c === 3)) || (!alive && c === 3) ? 1 : 0;
    }
  }
  world.grid = next;
  const cell = size / n;
  ctx.fillStyle = "#050806";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#3dff8a";
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (world.grid[y * n + x]) ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
    }
  }
}

function tickVortex(ctx, size, dt, world, t) {
  ctx.fillStyle = "rgba(6, 4, 12, 0.2)";
  ctx.fillRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  for (const p of world.parts) {
    p.a += p.w * dt;
    const r = p.r + Math.sin(t + p.r) * 8;
    ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, 0.8)`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(p.a) * r, cy + Math.sin(p.a) * r, p.s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function tickPulse(ctx, size, dt, world, t) {
  ctx.fillStyle = "#0b0c10";
  ctx.fillRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const beat = 0.5 + 0.5 * Math.sin(t * 3.2);
  for (let i = 0; i < 6; i += 1) {
    ctx.strokeStyle = `rgba(232, 192, 122, ${0.15 + beat * 0.35})`;
    ctx.lineWidth = 6 - i;
    ctx.beginPath();
    ctx.arc(cx, cy, 30 + i * 38 + beat * 16, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function tickInk(ctx, size, dt, world) {
  ctx.fillStyle = "rgba(244, 241, 234, 0.08)";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "rgba(11, 12, 16, 0.7)";
  for (const p of world.orbs) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.x < 40 || p.x > size - 40) p.vx *= -1;
    if (p.y < 40 || p.y > size - 40) p.vy *= -1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function tickLattice(ctx, size, dt, world, t) {
  ctx.fillStyle = "#0b0c10";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(90, 144, 208, 0.55)";
  ctx.lineWidth = 2;
  const gap = 28;
  const ox = (t * 40) % gap;
  const oy = (t * 26) % gap;
  for (let x = -gap; x < size + gap; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x + ox, 0);
    ctx.lineTo(x + ox + 40, size);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(232, 192, 122, 0.4)";
  for (let y = -gap; y < size + gap; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y + oy);
    ctx.lineTo(size, y + oy);
    ctx.stroke();
  }
}

function tickWaveform(ctx, size, dt, world, t) {
  ctx.fillStyle = "#07080c";
  ctx.fillRect(0, 0, size, size);
  const bars = 48;
  const w = size / bars;
  for (let i = 0; i < bars; i += 1) {
    const h = (0.2 + 0.8 * Math.abs(Math.sin(t * 4 + i * 0.35))) * size * 0.7;
    ctx.fillStyle = `hsla(${160 + i * 3}, 80%, 55%, 0.9)`;
    ctx.fillRect(i * w + 1, size * 0.5 - h / 2, w - 2, h);
  }
}

function tickMosaic(ctx, size, dt, world, t) {
  const n = 12;
  const cell = size / n;
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const h = (x * 29 + y * 17 + t * 40) % 360;
      ctx.fillStyle = `hsl(${h}, 55%, ${30 + ((x + y) % 3) * 10}%)`;
      ctx.fillRect(x * cell, y * cell, cell + 1, cell + 1);
    }
  }
}

function tickBloom(ctx, size, dt, world, t) {
  ctx.fillStyle = "rgba(6, 8, 14, 0.2)";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 10; i += 1) {
    const x = size * (0.5 + 0.38 * Math.cos(t * 0.4 + i));
    const y = size * (0.5 + 0.38 * Math.sin(t * 0.5 + i * 1.7));
    const g = ctx.createRadialGradient(x, y, 0, x, y, 90);
    g.addColorStop(0, `hsla(${i * 36 + t * 20}, 90%, 70%, 0.55)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 90, 0, Math.PI * 2);
    ctx.fill();
  }
}

function tickSea(ctx, size, dt, world, t) {
  ctx.fillStyle = "#071018";
  ctx.fillRect(0, 0, size, size);
  for (let layer = 0; layer < 4; layer += 1) {
    ctx.beginPath();
    ctx.moveTo(0, size);
    for (let x = 0; x <= size; x += 6) {
      const y = size * 0.45 + layer * 22 + Math.sin(x * 0.02 + t * (1 + layer * 0.2)) * (18 + layer * 6);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(size, size);
    ctx.closePath();
    ctx.fillStyle = `hsla(${190 + layer * 8}, 70%, ${28 + layer * 6}%, 0.55)`;
    ctx.fill();
  }
}

function tickClock(ctx, size, dt, world, t) {
  ctx.fillStyle = "#0b0c10";
  ctx.fillRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  ctx.strokeStyle = "#e8c07a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  const hand = (a, len, w) => {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    ctx.stroke();
  };
  hand(t * 0.2 - Math.PI / 2, size * 0.22, 8);
  hand(t * 2.4 - Math.PI / 2, size * 0.3, 4);
}

function randParts(n, size, rand, extra) {
  return Array.from({ length: n }, () => extra(rand, size));
}

function worldFor(kind, size) {
  const rand = rng(kind.split("").reduce((h, c) => h + c.charCodeAt(0), 1));
  if (kind === "matrix") return initMatrix(size);
  if (kind === "kaleido" || kind === "ink" || kind === "bloom") {
    return { orbs: initOrbs(kind === "bloom" ? 8 : 9, size, rand), rand };
  }
  if (kind === "fire") {
    return {
      rand,
      parts: randParts(90, size, rand, (r, s) => ({
        x: r() * s, y: r() * s, w: 3 + r() * 6, h: 8 + r() * 16,
        speed: 80 + r() * 140, life: r(),
      })),
    };
  }
  if (kind === "rain" || kind === "snow") {
    return {
      rand,
      parts: randParts(kind === "rain" ? 80 : 70, size, rand, (r, s) => ({
        x: r() * s, y: r() * s, w: kind === "rain" ? 1.2 : 2.4,
        len: kind === "rain" ? 18 + r() * 24 : 4, speed: 0.6 + r(), drift: (r() - 0.5) * 20,
      })),
    };
  }
  if (kind === "stars") {
    return {
      rand,
      parts: randParts(120, size, rand, (r) => ({
        x: (r() - 0.5) * 2, y: (r() - 0.5) * 2, z: r(), speed: 0.25 + r() * 0.5,
      })),
    };
  }
  if (kind === "swarm" || kind === "vortex") {
    return {
      rand,
      parts: randParts(70, size, rand, (r, s) => ({
        a: r() * 6.28, r: 40 + r() * s * 0.4, w: 0.4 + r() * 1.8,
        s: 2 + r() * 4, hue: r() * 360,
      })),
    };
  }
  if (kind === "scan") return { y: 0, rand };
  if (kind === "cells") {
    const n = 36;
    const grid = new Uint8Array(n * n);
    for (let i = 0; i < grid.length; i += 1) grid[i] = rand() > 0.72 ? 1 : 0;
    return { n, grid, acc: 0, rand };
  }
  if (kind === "glitch") return { rand, ready: false };
  return { rand, orbs: initOrbs(8, size, rand) };
}

const TICK = {
  matrix: tickMatrix,
  kaleido: tickKaleido,
  fire: tickFire,
  rain: (ctx, size, dt, world) => tickStreaks(ctx, size, dt, world, "rgba(160,200,255,0.7)", 1),
  snow: (ctx, size, dt, world) => tickStreaks(ctx, size, dt, world, "rgba(244,241,234,0.8)", 0.35),
  stars: tickStars,
  swarm: tickSwarm,
  scan: tickScan,
  portal: tickPortal,
  glitch: tickGlitch,
  aurora: tickAurora,
  cells: tickCells,
  vortex: tickVortex,
  pulse: tickPulse,
  ink: tickInk,
  lattice: tickLattice,
  waveform: tickWaveform,
  mosaic: tickMosaic,
  bloom: tickBloom,
  sea: tickSea,
  clock: tickClock,
};

export const MOTION_KINDS = [
  { id: "matrix", label: "The Matrix" },
  { id: "kaleido", label: "Kaleidoscope" },
  { id: "fire", label: "Fire" },
  { id: "rain", label: "Rain" },
  { id: "snow", label: "Snow" },
  { id: "stars", label: "Star tunnel" },
  { id: "swarm", label: "Swarm" },
  { id: "scan", label: "Scanlines" },
  { id: "portal", label: "Portal" },
  { id: "glitch", label: "Glitch" },
  { id: "aurora", label: "Aurora" },
  { id: "cells", label: "Living cells" },
  { id: "vortex", label: "Vortex" },
  { id: "pulse", label: "Pulse" },
  { id: "ink", label: "Ink blot" },
  { id: "lattice", label: "Lattice" },
  { id: "waveform", label: "Waveform" },
  { id: "mosaic", label: "Mosaic" },
  { id: "bloom", label: "Bloom" },
  { id: "sea", label: "Tide" },
  { id: "clock", label: "Clock" },
];

export function createMotion(kind = "matrix", size = 512) {
  const id = TICK[kind] ? kind : "matrix";
  const { canvas, ctx } = canvas2d(size);
  const world = worldFor(id, size);
  let last = performance.now();
  const draw = TICK[id];
  return {
    canvas,
    kind: id,
    tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      draw(ctx, size, dt, world, now / 1000);
    },
    stop() {
      canvas.remove();
    },
  };
}
