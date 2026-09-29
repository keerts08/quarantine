import { drawGateDoor } from "@/game/tilemap";
import type { EntryDef, EntryState } from "@/game/types";

function isHorizontalGap(def: EntryDef) {
  return def.zone.w >= def.zone.h;
}

function drawPeekingSilhouette(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
) {
  ctx.save();
  ctx.translate(cx, cy + Math.sin(t * 2.2) * 2);

  const glowStrength = 0.6 + Math.sin(t * 5) * 0.2;
  for (const ex of [-3.2, 3.2]) {
    const glow = ctx.createRadialGradient(ex, 0, 0, ex, 0, 5);
    glow.addColorStop(0, `rgba(232,176,84,${0.55 * glowStrength})`);
    glow.addColorStop(1, "rgba(232,176,84,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(ex, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(232,176,84,${0.9 * glowStrength})`;
    ctx.beginPath();
    ctx.ellipse(ex, 0, 1.8, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawVoidGap(ctx: CanvasRenderingContext2D, def: EntryDef, t: number) {
  const { x, y, w, h } = def.zone;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "#030203");
  grad.addColorStop(0.5, "#0a090d");
  grad.addColorStop(1, "#030203");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  ctx.save();
  ctx.globalAlpha = 0.12 + Math.sin(t * 1.3) * 0.05;
  ctx.fillStyle = "#d4a03a";
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
  hasLiveIntruder = false,
) {
  const { x, y, w, h } = def.zone;
  const horizontal = isHorizontalGap(def);

  ctx.save();

  if (state.breached) {
    drawVoidGap(ctx, def, t);
    const swing = Math.sin(t * 0.9) * 2;
    drawGateDoor(
      ctx,
      def.gate,
      0,
      true,
      horizontal ? swing : 0,
      horizontal ? 0 : swing,
    );
    if (hasLiveIntruder) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      drawPeekingSilhouette(ctx, cx, cy, t * 0.6);

      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(t * 3) * 0.2;
      ctx.strokeStyle = "#c1443a";
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = "#5f6656";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.restore();
    }

    ctx.restore();
    return;
  }

  drawVoidGap(ctx, def, t);

  const level = state.barricadeLevel;
  const cx = x + w / 2;
  const cy = y + h / 2;

  const shake = state.underAttack ? Math.sin(t * 40) * 2 : 0;
  drawGateDoor(
    ctx,
    def.gate,
    level,
    false,
    horizontal ? shake : 0,
    horizontal ? 0 : shake,
  );

  if (state.underAttack) {
    ctx.save();
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
    ctx.strokeStyle = "#d4a03a";
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
