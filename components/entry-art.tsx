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

function drawBracket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
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

/** A cheap glimpse of something waiting at the gap — not the full combat render. */
function drawPeekingSilhouette(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
) {
  ctx.save();
  ctx.translate(cx, cy + Math.sin(t * 2.2) * 2);
  ctx.globalAlpha = 0.55 + Math.sin(t * 6) * 0.15;
  ctx.fillStyle = "#1c1e17";
  ctx.beginPath();
  ctx.moveTo(-6, 10);
  ctx.quadraticCurveTo(-9, -4, -4, -12);
  ctx.quadraticCurveTo(0, -16, 4, -12);
  ctx.quadraticCurveTo(9, -4, 6, 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#14150f";
  ctx.beginPath();
  ctx.ellipse(0, -16, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(199,217,74,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, -16, 4, 5, 0, 0, Math.PI * 2);
  ctx.stroke();
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

export function drawEntry(
  ctx: CanvasRenderingContext2D,
  def: EntryDef,
  state: EntryState,
  t: number,
  isNight: boolean,
) {
  const { x, y, w, h } = def.zone;
  const horizontal = isHorizontalGap(def);

  ctx.save();

  if (state.breached) {
    drawVoidGap(ctx, def, t);
    ctx.strokeStyle = "#3a2c1c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(x + w * 0.15, y);
      ctx.lineTo(x + w * 0.25, y + h * 0.4);
      ctx.moveTo(x + w * 0.7, y + h);
      ctx.lineTo(x + w * 0.8, y + h * 0.5);
    } else {
      ctx.moveTo(x, y + h * 0.15);
      ctx.lineTo(x + w * 0.4, y + h * 0.25);
      ctx.moveTo(x + w, y + h * 0.7);
      ctx.lineTo(x + w * 0.5, y + h * 0.8);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

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
    drawPlank(
      ctx,
      cx,
      cy + (horizontal ? offset : 0),
      plankLen,
      plankThick,
      baseAngle + (level >= 2 ? 0 : 0.05),
    );
  }
  if (level >= 2) {
    const offset = shortSpan * -0.18;
    drawPlank(
      ctx,
      cx,
      cy + (horizontal ? offset : 0),
      plankLen,
      plankThick,
      baseAngle - 0.05,
    );
    drawPlank(
      ctx,
      cx,
      cy,
      plankLen * 0.85,
      plankThick * 0.8,
      baseAngle + (horizontal ? 0.22 : Math.PI / 2 + 0.22),
    );
  }
  if (level >= 3) {
    drawPlank(
      ctx,
      cx,
      cy,
      plankLen,
      plankThick * 0.9,
      baseAngle + (horizontal ? -0.22 : Math.PI / 2 - 0.22),
    );
    const bracketPositions = horizontal
      ? [
          { x: x + 6, y: y + h / 2 },
          { x: x + w - 6, y: y + h / 2 },
        ]
      : [
          { x: x + w / 2, y: y + 6 },
          { x: x + w / 2, y: y + h - 6 },
        ];
    for (const p of bracketPositions) drawBracket(ctx, p.x, p.y, 7);
  }

  if (state.underAttack) {
    const shake = Math.sin(t * 40) * 2;
    ctx.save();
    ctx.translate(horizontal ? shake : 0, horizontal ? 0 : shake);
    ctx.strokeStyle = `rgba(193,68,58,${0.5 + Math.sin(t * 10) * 0.3})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(t * 8) * 0.2;
    ctx.strokeStyle = "#c1443a";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const px = x + (horizontal ? w * (0.25 + i * 0.25) : w / 2 + (i - 1) * 4);
      const py = y + (horizontal ? h / 2 + (i - 1) * 4 : h * (0.25 + i * 0.25));
      ctx.beginPath();
      ctx.moveTo(px - 4, py - 4);
      ctx.lineTo(px + 4, py + 4);
      ctx.stroke();
    }
    ctx.restore();

    if (state.warmup > 0) {
      drawPeekingSilhouette(ctx, cx, cy, t);
    }
  } else if (state.respite > 0 && isNight) {
    ctx.save();
    ctx.globalAlpha = 0.25 * (state.respite / 4);
    ctx.strokeStyle = "#c7d94a";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.restore();
  }

  ctx.restore();
}

export function drawEntryLabelAnchor(def: EntryDef): { x: number; y: number } {
  const { x, y, w, h } = def.zone;
  const cx = x + w / 2;
  const cy = y + h / 2;
  switch (def.facing) {
    case "up":
      return { x: cx, y: y + h + 14 };
    case "down":
      return { x: cx, y: y - 10 };
    case "left":
      return { x: x + w + 8, y: cy };
    case "right":
      return { x: x - 8, y: cy };
    default:
      return { x: cx, y: cy };
  }
}
