export const CHARACTER_KINDS = [
  { id: "ball", label: "Ball", color: "#7CFF6B" },
  { id: "neo", label: "Neo", color: "#d8ffe0" },
  { id: "trinity", label: "Trinity", color: "#9b2226" },
  { id: "agent", label: "Agent", color: "#6c757d" },
  { id: "ghost", label: "Ghost", color: "#f4f1ea" },
  { id: "cat", label: "Cat", color: "#e8c07a" },
  { id: "bat", label: "Bat", color: "#c1121f" },
  { id: "pumpkin", label: "Pumpkin", color: "#e85d04" },
  { id: "robot", label: "Robot", color: "#5a90d0" },
  { id: "bird", label: "Bird", color: "#90e0ef" },
  { id: "spark", label: "Spark", color: "#ffe66d" },
  { id: "moth", label: "Moth", color: "#d6d3cd" },
  { id: "skull", label: "Skull", color: "#f4f1ea" },
  { id: "fox", label: "Fox", color: "#e85d04" },
  { id: "kid", label: "Kid", color: "#e8c07a" },
  { id: "witch", label: "Witch", color: "#6a994e" },
  { id: "raven", label: "Raven", color: "#3d405b" },
  { id: "slime", label: "Slime", color: "#a7c957" },
  { id: "drone", label: "Drone", color: "#5a90d0" },
  { id: "heart", label: "Heart", color: "#e63946" },
];

export const SPAWN_MODES = [
  { id: "bounce", label: "Bounce" },
  { id: "gravity", label: "Gravity" },
  { id: "still", label: "Still" },
  { id: "rain", label: "Rain in" },
  { id: "float", label: "Float" },
  { id: "chase", label: "Chase" },
  { id: "scatter", label: "Scatter" },
  { id: "orbit", label: "Orbit" },
];

const KIND = Object.fromEntries(CHARACTER_KINDS.map((k) => [k.id, k]));

function body(ctx, color, r) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}

function head(ctx, color, y, r) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawKind(ctx, kind, t) {
  const spec = KIND[kind] || KIND.ball;
  const c = spec.color;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.2;
  if (kind === "ball" || kind === "spark") {
    body(ctx, c, 10);
    if (kind === "spark") {
      ctx.strokeStyle = c;
      for (let i = 0; i < 6; i += 1) {
        const a = t * 4 + i;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
        ctx.stroke();
      }
    }
    return;
  }
  if (kind === "heart") {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-14, -4, -8, -14, 0, -6);
    ctx.bezierCurveTo(8, -14, 14, -4, 0, 6);
    ctx.fill();
    return;
  }
  if (kind === "ghost") {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(0, -3, 8, Math.PI, 0);
    ctx.lineTo(8, 10);
    ctx.quadraticCurveTo(4, 6, 0, 10);
    ctx.quadraticCurveTo(-4, 6, -8, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#0b0c10";
    ctx.beginPath();
    ctx.arc(-3, -3, 1.6, 0, Math.PI * 2);
    ctx.arc(3, -3, 1.6, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (kind === "pumpkin") {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(0, 1, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6a994e";
    ctx.fillRect(-1.5, -10, 3, 4);
    ctx.fillStyle = "#0b0c10";
    ctx.beginPath();
    ctx.moveTo(-5, -2);
    ctx.lineTo(-2, 1);
    ctx.lineTo(-6, 1);
    ctx.moveTo(5, -2);
    ctx.lineTo(2, 1);
    ctx.lineTo(6, 1);
    ctx.fill();
    return;
  }
  if (kind === "bat" || kind === "raven" || kind === "moth" || kind === "bird") {
    ctx.fillStyle = c;
    ctx.beginPath();
    const flap = Math.sin(t * 10) * 4;
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-12, -8 + flap, -16, 2);
    ctx.quadraticCurveTo(-6, 2, 0, 2);
    ctx.quadraticCurveTo(6, 2, 16, 2);
    ctx.quadraticCurveTo(12, -8 + flap, 0, 0);
    ctx.fill();
    return;
  }
  if (kind === "slime") {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(0, 3, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0b0c10";
    ctx.beginPath();
    ctx.arc(-3, 1, 1.4, 0, Math.PI * 2);
    ctx.arc(3, 1, 1.4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (kind === "drone") {
    ctx.fillStyle = c;
    ctx.fillRect(-7, -3, 14, 6);
    ctx.beginPath();
    ctx.arc(-9, 0, 4, 0, Math.PI * 2);
    ctx.arc(9, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (kind === "skull") {
    head(ctx, c, -1, 8);
    ctx.fillStyle = "#0b0c10";
    ctx.beginPath();
    ctx.arc(-3, -2, 1.8, 0, Math.PI * 2);
    ctx.arc(3, -2, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-2, 4, 4, 3);
    return;
  }
  // biped: neo, trinity, agent, cat, robot, fox, kid, witch
  ctx.fillStyle = c;
  ctx.fillRect(-3.5, -1, 7, 10);
  head(ctx, kind === "agent" ? "#cfcfcf" : c, -8, 5);
  ctx.fillStyle = "#0b0c10";
  ctx.beginPath();
  ctx.arc(-1.8, -8, 1, 0, Math.PI * 2);
  ctx.arc(1.8, -8, 1, 0, Math.PI * 2);
  ctx.fill();
  if (kind === "neo" || kind === "trinity") {
    ctx.strokeStyle = "#7CFF6B";
    ctx.lineWidth = 1;
    ctx.strokeRect(-5, -14, 10, 16);
  }
  if (kind === "witch") {
    ctx.fillStyle = "#3d405b";
    ctx.beginPath();
    ctx.moveTo(-7, -10);
    ctx.lineTo(0, -18);
    ctx.lineTo(7, -10);
    ctx.fill();
  }
  if (kind === "cat" || kind === "fox") {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-5, -10);
    ctx.lineTo(-2, -16);
    ctx.lineTo(0, -10);
    ctx.moveTo(5, -10);
    ctx.lineTo(2, -16);
    ctx.lineTo(0, -10);
    ctx.fill();
  }
}

export function drawActor(ctx, actor, sx, sy, pxR, time = 0) {
  ctx.save();
  ctx.translate(sx, sy);
  const scale = Math.max(0.7, pxR / 10);
  ctx.scale(scale, scale);
  drawKind(ctx, actor.kind, time + (actor.phase || 0));
  ctx.restore();
}

export function drawCast(ctx, actors, toScreen, time = 0) {
  for (const actor of actors) {
    const [sx, sy] = toScreen(actor.x, actor.y);
    const pxR = actor.r * (ctx.canvas?.width ? ctx.canvas.width / 2 : 200);
    drawActor(ctx, actor, sx, sy, pxR, time);
  }
}
