/** "The Hollow" — an elongated, faceless thing that folds itself through gaps. */

function lighten(hex: string, amt: number): string {
  if (amt <= 0) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const t = Math.min(1, amt);
  return `rgb(${Math.round(r + (255 - r) * t)},${Math.round(g + (255 - g) * t)},${Math.round(b + (255 - b) * t)})`;
}

interface DrawHollowOpts {
  cx: number;
  cy: number;
  scale: number;
  t: number;
  damage: number;
  flinch: number;
  /** NEW in Part 3 — 0-1, it's in contact and actively hurting the player right now. */
  attacking?: number;
}

function jointArm(
  ctx: CanvasRenderingContext2D,
  shoulder: { x: number; y: number },
  reach: number,
  spread: number,
  t: number,
  seed: number,
  flinch: number,
) {
  const twitch = Math.sin(t * 3 + seed) * 6;
  const elbow = {
    x: shoulder.x + spread * 0.5,
    y: shoulder.y + reach * 0.42 + twitch,
  };
  const wrist = {
    x: shoulder.x + spread * 0.85,
    y: shoulder.y + reach * 0.75 - twitch * 0.5,
  };
  const tip = { x: shoulder.x + spread, y: shoulder.y + reach };

  ctx.lineCap = "round";
  ctx.lineWidth = 6;
  ctx.strokeStyle = lighten("#5a5b4e", flinch * 0.85);
  ctx.beginPath();
  ctx.moveTo(shoulder.x, shoulder.y);
  ctx.quadraticCurveTo(elbow.x, elbow.y, wrist.x, wrist.y);
  ctx.stroke();

  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(wrist.x, wrist.y);
  ctx.quadraticCurveTo(
    (wrist.x + tip.x) / 2,
    (wrist.y + tip.y) / 2 + twitch * 0.4,
    tip.x,
    tip.y,
  );
  ctx.stroke();

  ctx.fillStyle = lighten("#3f4036", flinch * 0.85);
  for (const p of [shoulder, elbow, wrist]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = lighten("#2c2d26", flinch * 0.85);
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x + i * 5, tip.y + 10);
    ctx.stroke();
  }
}

export function drawHollow(
  ctx: CanvasRenderingContext2D,
  opts: DrawHollowOpts,
) {
  const { cx, cy, scale, t, damage, flinch, attacking = 0 } = opts;
  const hunch = damage * 18;

  ctx.save();
  ctx.translate(cx, cy + hunch);
  ctx.scale(scale, scale);

  const halo = ctx.createRadialGradient(0, 0, 10, 0, 0, 140);
  halo.addColorStop(0, "rgba(199,217,74,0.10)");
  halo.addColorStop(1, "rgba(199,217,74,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, 140, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = lighten("#3d3e34", flinch * 0.85);
  ctx.beginPath();
  ctx.moveTo(-18, -60);
  ctx.quadraticCurveTo(-26, 0, -14 + hunch * 0.3, 70);
  ctx.quadraticCurveTo(0, 78, 14 - hunch * 0.3, 70);
  ctx.quadraticCurveTo(26, 0, 18, -60);
  ctx.quadraticCurveTo(0, -72, -18, -60);
  ctx.fill();

  ctx.strokeStyle = "rgba(15,16,12,0.5)";
  ctx.lineWidth = 1;
  const crackCount = 3 + Math.round(damage * 6);
  for (let i = 0; i < crackCount; i++) {
    const cxk = -14 + (i * 28) / crackCount + Math.sin(i * 12.3) * 4;
    const cyk = -40 + (i * 90) / crackCount;
    ctx.beginPath();
    ctx.moveTo(cxk, cyk);
    ctx.lineTo(cxk + Math.sin(i) * 6, cyk + 10);
    ctx.stroke();
  }

  ctx.fillStyle = lighten("#43443a", flinch * 0.85);
  ctx.beginPath();
  ctx.ellipse(0, -78, 15, 19, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(5,6,4,0.6)";
  ctx.beginPath();
  ctx.ellipse(0, -76, 6, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(199,217,74,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(17, -60);
  ctx.quadraticCurveTo(24, 0, 16, 68);
  ctx.stroke();

  jointArm(ctx, { x: -16, y: -48 }, 130, -70, t, 0, flinch);
  jointArm(ctx, { x: 16, y: -48 }, 130, 70, t, 2.1, flinch);

  // CHANGED from Part 2: the right leg now kicks toward the viewer whenever
  // `attacking` is set — a visible cause for every point of contact damage.
  const kick = attacking > 0 ? attacking * (0.5 + 0.5 * Math.sin(t * 10)) : 0;
  ctx.strokeStyle = lighten("#33342c", flinch * 0.85);
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-10, 66);
  ctx.quadraticCurveTo(-20, 100, -8, 140);
  ctx.moveTo(10, 66);
  ctx.quadraticCurveTo(
    20 + kick * 22,
    96 - kick * 14,
    8 + kick * 38,
    132 - kick * 30,
  );
  ctx.stroke();

  ctx.restore();
}
