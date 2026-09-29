import { getSprite, isSpriteReady } from "@/game/sprites";

const HOLLOW_SPRITE = "/sprites/enemy-hollow.png";
const WARDEN_SPRITE = "/sprites/enemy-warden.png";

const BASE_SIZE = 240;

interface DrawHollowOpts {
  cx: number;
  cy: number;
  scale: number;
  t: number;
  damage: number;
  flinch: number;
  knockback?: number;
  attacking?: number;
  isBoss?: boolean;
}

export function drawHollow(
  ctx: CanvasRenderingContext2D,
  opts: DrawHollowOpts,
) {
  const {
    cx,
    cy,
    scale,
    t,
    damage,
    flinch,
    knockback = 0,
    attacking = 0,
    isBoss = false,
  } = opts;
  const sprite = getSprite(isBoss ? WARDEN_SPRITE : HOLLOW_SPRITE);

  const hunch = damage * 10;
  const lunge =
    attacking > 0
      ? Math.sin(t * 16) * 3 * attacking
      : Math.max(0, Math.sin(t * 1.15)) ** 5 * 8;
  const size =
    BASE_SIZE *
    scale *
    (1 + (attacking > 0 ? 0.05 * attacking : 0) - knockback * 0.05);

  ctx.save();
  ctx.translate(
    cx + lunge * (attacking > 0 ? 1 : 0),
    cy + hunch + (attacking > 0 ? 0 : lunge) - knockback * 18,
  );

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.42, size * 0.32, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  if (flinch > 0.01) {
    ctx.filter = `brightness(${1 + flinch * 2.2}) saturate(${1 - flinch * 0.4})`;
  }
  ctx.imageSmoothingEnabled = false;
  if (isSpriteReady(sprite)) {
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  } else {
    ctx.fillStyle = "#3d3e34";
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.3, size * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.filter = "none";

  ctx.restore();
}
