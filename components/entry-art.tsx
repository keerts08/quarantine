import type { EntryDef, EntryState } from "@/game/types";

function isHorizontalGap(def: EntryDef) {
  return def.zone.w >= def.zone.h;
}

function drawPlank(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  length: number,
  thickness: number,
  angle: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const w = length;
  const h = thickness;

  ctx.fillStyle = "#4a3624";
  ctx.fillRect(-w / 2, -h / 2, w, h);

  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "#2c1f14";
  ctx.lineWidth = 1;
  for (let i = -w / 2 + 4; i < w / 2 - 2; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, -h / 2 + 1.5);
    ctx.lineTo(i + 2, h / 2 - 1.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(255,235,200,0.14)";
  ctx.fillRect(-w / 2, -h / 2, w, 1.5);

  ctx.fillStyle = "#8a8378";
  ctx.beginPath();
  ctx.arc(-w / 2 + 5, 0, 1.6, 0, Math.PI * 2);
  ctx.arc(w / 2 - 5, 0, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBracket(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#6b6a63";
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(-size / 2, size / 2 - 1.5, size, 1.5);
  ctx.fillStyle = "#c7d94a";
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawVoidGap(ctx: CanvasRenderingContext2D, def: EntryDef, t: number) {
  const { x, y, w, h } = def.zone;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "#020302");
  grad.addColorStop(0.5, "#0a0d09");
  grad.addColorStop(1, "#020302");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  ctx.save();
  ctx.globalAlpha = 0.12 + Math.sin(t * 1.3) * 0.05;
  ctx.fillStyle = "#c7d94a";
  const cx = x + w / 2 + Math.sin(t * 0.7) * w * 0.15;
  const cy = y + h / 2 + Math.cos(t * 0.5) * h * 0.15;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.3, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawEntry(ctx: CanvasRenderingContext2D, def: EntryDef, state: EntryState, t: number) {
  const { x, y, w, h } = def.zone;
  const horizontal = isHorizontalGap(def);

  ctx.save();
  drawVoidGap(ctx, def, t);

  const level = state.barricadeLevel;
  const shortSpan = horizontal ? h : w;
  const longSpan = horizontal ? w : h;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const baseAngle = horizontal ? 0 : Math.PI / 2;

  const plankLen = longSpan * 0.92;
  const plankThick = Math.max(7, shortSpan * 0.32);

  if (level >= 1) {
    const offset = shortSpan * 0.18;
    drawPlank(ctx, cx, cy + (horizontal ? offset : 0), plankLen, plankThick, baseAngle + 0.05);
  }
  if (level >= 2) {
    const offset = shortSpan * -0.18;
    drawPlank(ctx, cx, cy + (horizontal ? offset : 0), plankLen, plankThick, baseAngle - 0.05);
    drawPlank(ctx, cx, cy, plankLen * 0.85, plankThick * 0.8, baseAngle + (horizontal ? 0.22 : Math.PI / 2 + 0.22));
  }
  if (level >= 3) {
    drawPlank(ctx, cx, cy, plankLen, plankThick * 0.9, baseAngle + (horizontal ? -0.22 : Math.PI / 2 - 0.22));
    const bracketPositions = horizontal
      ? [{ x: x + 6, y: y + h / 2 }, { x: x + w - 6, y: y + h / 2 }]
      : [{ x: x + w / 2, y: y + 6 }, { x: x + w / 2, y: y + h - 6 }];
    for (const p of bracketPositions) drawBracket(ctx, p.x, p.y, 7);
  }

  ctx.restore();
}
