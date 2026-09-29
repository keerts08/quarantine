import {
  getSprite,
  isSpriteReady,
  PLAYER_SPRITE,
  swordSpriteFor,
} from "@/game/sprites";

const SPRITE_SIZE = 16;
const DRAW_SIZE = 40;

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  moving: boolean,
  weaponLevel: number,
  swingProgress = 0,
  attackType = 0,
) {
  const bob = moving ? Math.sin(t * 10) * 1.5 : 0;

  ctx.save();
  ctx.translate(x, y + bob);

  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(0, 16, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const sprite = getSprite(PLAYER_SPRITE);
  if (isSpriteReady(sprite)) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sprite,
      -DRAW_SIZE / 2,
      -DRAW_SIZE / 2 - 4,
      DRAW_SIZE,
      DRAW_SIZE,
    );
  } else {
    ctx.fillStyle = "#2b3325";
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const weapon = getSprite(swordSpriteFor(weaponLevel));
  if (isSpriteReady(weapon)) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(11, 6);
    const idleAngle = 0.55 + (moving ? Math.sin(t * 10) * 0.05 : 0);
    const eased = swingProgress * swingProgress;
    const variant = ((attackType % 4) + 4) % 4;

    if (variant === 3) {
      const reach = eased * 15;
      ctx.rotate(idleAngle);
      ctx.translate(reach, 0);
      ctx.drawImage(weapon, -6, -18, 16, 24);
    } else {
      const startAngle = [-1.3, 2.3, 1.4][variant];
      const swingAngle = idleAngle + (startAngle - idleAngle) * eased;
      ctx.rotate(swingAngle);
      ctx.drawImage(weapon, -6, -18, 16, 24 + eased * 4);
    }
    ctx.restore();
  }

  ctx.restore();
}

export { SPRITE_SIZE };
