export function makeTestPattern(size = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.dataset.splashPattern = "1";
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const cells = 16;
  const cell = size / cells;
  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      const odd = (x + y) % 2;
      ctx.fillStyle = odd ? "#16202b" : "#e8c07a";
      ctx.fillRect(x * cell, y * cell, cell, cell);
      ctx.fillStyle = odd ? "#f4f1ea" : "#0b0c10";
      ctx.font = `600 ${Math.floor(cell * 0.22)}px Outfit, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${x},${y}`, x * cell + cell / 2, y * cell + cell / 2);
    }
  }
  const edge = ctx.createLinearGradient(0, 0, size, 0);
  edge.addColorStop(0, "#5a90d0");
  edge.addColorStop(0.5, "#e8c07a");
  edge.addColorStop(1, "#b04e62");
  ctx.strokeStyle = edge;
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, size - 18, size - 18);
  ctx.fillStyle = "#f4f1ea";
  ctx.font = "600 42px Outfit, sans-serif";
  ctx.fillText("U →", size * 0.5, 48);
  ctx.save();
  ctx.translate(36, size * 0.5);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("V →", 0, 0);
  ctx.restore();
  canvas.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none";
  document.body.appendChild(canvas);
  return canvas;
}
