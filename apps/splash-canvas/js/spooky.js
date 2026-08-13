function canvas2d(size = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#050306";
  ctx.fillRect(0, 0, size, size);
  return { canvas, ctx, size };
}

function pumpkin(ctx, size) {
  ctx.fillStyle = "#e85d04";
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.55, size * 0.38, size * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6a994e";
  ctx.fillRect(size * 0.47, size * 0.14, size * 0.06, size * 0.14);
  ctx.fillStyle = "#050306";
  const eye = (x, y, flip) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (flip ? -90 : 90), y + 70);
    ctx.lineTo(x + (flip ? 40 : -40), y + 70);
    ctx.closePath();
    ctx.fill();
  };
  eye(size * 0.34, size * 0.4, true);
  eye(size * 0.66, size * 0.4, false);
  ctx.beginPath();
  ctx.moveTo(size * 0.28, size * 0.68);
  ctx.lineTo(size * 0.38, size * 0.78);
  ctx.lineTo(size * 0.5, size * 0.7);
  ctx.lineTo(size * 0.62, size * 0.8);
  ctx.lineTo(size * 0.74, size * 0.68);
  ctx.lineTo(size * 0.62, size * 0.74);
  ctx.lineTo(size * 0.5, size * 0.66);
  ctx.lineTo(size * 0.38, size * 0.74);
  ctx.closePath();
  ctx.fill();
}

function moon(ctx, size) {
  ctx.fillStyle = "#f4e3b2";
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.5, size * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#050306";
  ctx.beginPath();
  ctx.arc(size * 0.62, size * 0.42, size * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9b2226";
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.5, size * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function web(ctx, size) {
  ctx.strokeStyle = "#d6d3cd";
  ctx.lineWidth = 3;
  const cx = size / 2;
  const cy = size / 2;
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * size, cy + Math.sin(a) * size);
    ctx.stroke();
  }
  for (let r = 0.08; r < 0.7; r += 0.08) {
    ctx.beginPath();
    for (let i = 0; i <= 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      const x = cx + Math.cos(a) * size * r;
      const y = cy + Math.sin(a) * size * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function ghost(ctx, size) {
  ctx.fillStyle = "#f4f1ea";
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.38, size * 0.22, Math.PI, 0);
  ctx.lineTo(size * 0.72, size * 0.82);
  ctx.quadraticCurveTo(size * 0.64, size * 0.7, size * 0.56, size * 0.82);
  ctx.quadraticCurveTo(size * 0.5, size * 0.7, size * 0.44, size * 0.82);
  ctx.quadraticCurveTo(size * 0.36, size * 0.7, size * 0.28, size * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#050306";
  ctx.beginPath();
  ctx.arc(size * 0.43, size * 0.4, 22, 0, Math.PI * 2);
  ctx.arc(size * 0.57, size * 0.4, 22, 0, Math.PI * 2);
  ctx.fill();
}

function bats(ctx, size) {
  ctx.fillStyle = "#c1121f";
  const bat = (x, y, s) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 40 * s, y - 20 * s, x - 70 * s, y + 10 * s);
    ctx.quadraticCurveTo(x - 20 * s, y + 8 * s, x, y + 6 * s);
    ctx.quadraticCurveTo(x + 20 * s, y + 8 * s, x + 70 * s, y + 10 * s);
    ctx.quadraticCurveTo(x + 40 * s, y - 20 * s, x, y);
    ctx.fill();
  };
  bat(size * 0.5, size * 0.28, 1.6);
  bat(size * 0.28, size * 0.5, 1);
  bat(size * 0.72, size * 0.46, 1.2);
  bat(size * 0.4, size * 0.72, 0.8);
  bat(size * 0.66, size * 0.78, 0.7);
}

function candles(ctx, size) {
  for (let i = 0; i < 5; i += 1) {
    const x = size * (0.18 + i * 0.16);
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(x - 18, size * 0.48, 36, size * 0.4);
    ctx.fillStyle = "#e85d04";
    ctx.beginPath();
    ctx.ellipse(x, size * 0.42, 16, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4e3b2";
    ctx.beginPath();
    ctx.ellipse(x, size * 0.38, 7, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function veins(ctx, size) {
  ctx.strokeStyle = "#9b2226";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  const branch = (x, y, a, len, depth) => {
    if (depth > 7 || len < 12) return;
    const x2 = x + Math.cos(a) * len;
    const y2 = y + Math.sin(a) * len;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    branch(x2, y2, a - 0.5, len * 0.72, depth + 1);
    branch(x2, y2, a + 0.45, len * 0.7, depth + 1);
  };
  branch(size * 0.5, size * 0.08, Math.PI / 2, 140, 0);
}

function hauntedWindow(ctx, size) {
  ctx.fillStyle = "#1d3557";
  ctx.fillRect(size * 0.18, size * 0.12, size * 0.64, size * 0.76);
  ctx.strokeStyle = "#e8c07a";
  ctx.lineWidth = 18;
  ctx.strokeRect(size * 0.18, size * 0.12, size * 0.64, size * 0.76);
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.12);
  ctx.lineTo(size * 0.5, size * 0.88);
  ctx.moveTo(size * 0.18, size * 0.5);
  ctx.lineTo(size * 0.82, size * 0.5);
  ctx.stroke();
  ctx.fillStyle = "#f4f1ea";
  ctx.beginPath();
  ctx.arc(size * 0.38, size * 0.34, 18, 0, Math.PI * 2);
  ctx.arc(size * 0.62, size * 0.34, 18, 0, Math.PI * 2);
  ctx.fill();
}

function slime(ctx, size) {
  ctx.fillStyle = "#6a994e";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, 0);
  ctx.lineTo(size, size * 0.2);
  for (let x = size; x >= 0; x -= 40) {
    ctx.quadraticCurveTo(x - 20, size * (0.35 + (x % 80) / 200), x - 40, size * 0.22);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#a7c957";
  ctx.beginPath();
  ctx.ellipse(size * 0.3, size * 0.55, 40, 90, 0.2, 0, Math.PI * 2);
  ctx.ellipse(size * 0.7, size * 0.62, 28, 70, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

function tomb(ctx, size) {
  ctx.fillStyle = "#6c757d";
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.38, size * 0.28, Math.PI, 0);
  ctx.lineTo(size * 0.78, size * 0.88);
  ctx.lineTo(size * 0.22, size * 0.88);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#050306";
  ctx.font = "700 72px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("RIP", size * 0.5, size * 0.52);
}

function eyes(ctx, size) {
  const pair = (x, y, s) => {
    ctx.fillStyle = "#e85d04";
    ctx.beginPath();
    ctx.ellipse(x - 28 * s, y, 18 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 28 * s, y, 18 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#050306";
    ctx.beginPath();
    ctx.arc(x - 28 * s, y, 6 * s, 0, Math.PI * 2);
    ctx.arc(x + 28 * s, y, 6 * s, 0, Math.PI * 2);
    ctx.fill();
  };
  pair(size * 0.5, size * 0.28, 1.4);
  pair(size * 0.28, size * 0.58, 0.9);
  pair(size * 0.74, size * 0.62, 1);
  pair(size * 0.5, size * 0.82, 0.7);
}

function fog(ctx, size) {
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = `rgba(244,241,234,${0.06 + i * 0.03})`;
    ctx.beginPath();
    ctx.ellipse(size * (0.2 + (i % 4) * 0.2), size * (0.35 + (i % 3) * 0.18), 180, 60, i * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function door(ctx, size) {
  ctx.fillStyle = "#3d2b1f";
  ctx.fillRect(size * 0.22, size * 0.08, size * 0.56, size * 0.84);
  ctx.strokeStyle = "#e8c07a";
  ctx.lineWidth = 14;
  ctx.strokeRect(size * 0.22, size * 0.08, size * 0.56, size * 0.84);
  ctx.fillStyle = "#e85d04";
  ctx.beginPath();
  ctx.arc(size * 0.68, size * 0.54, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#050306";
  ctx.fillRect(size * 0.32, size * 0.18, size * 0.14, size * 0.18);
  ctx.fillRect(size * 0.54, size * 0.18, size * 0.14, size * 0.18);
}

const DRAW = {
  pumpkin, moon, web, ghost, bats, candles, veins, window: hauntedWindow,
  slime, tomb, eyes, fog, door,
};

export function makeSpooky(name = "pumpkin", size = 1024) {
  const { canvas, ctx } = canvas2d(size);
  const draw = DRAW[name] || pumpkin;
  draw(ctx, size);
  return canvas;
}

export const SPOOKY_PATTERNS = Object.keys(DRAW);
