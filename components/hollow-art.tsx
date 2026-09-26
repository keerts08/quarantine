interface DrawHollowOpts {
  cx: number;
  cy: number;
  scale: number;
  t: number;
  damage: number;
  flinch: number;
}

function jointArm(
  ctx: CanvasRenderingContext2D,
  shoulder: { x: number; y: number },
  reach: number,
  spread: number,
  t: number,
  seed: number,
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
  ctx.strokeStyle = "#5a5b4e";
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

  ctx.fillStyle = "#3f4036";
  for (const p of [shoulder, elbow, wrist]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#2c2d26";
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
  const { cx, cy, scale, t, damage, flinch } = opts;
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

  ctx.fillStyle = "#3d3e34";
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

  ctx.fillStyle = "#43443a";
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

  jointArm(ctx, { x: -16, y: -48 }, 130, -70, t, 0);
  jointArm(ctx, { x: 16, y: -48 }, 130, 70, t, 2.1);

  ctx.strokeStyle = "#33342c";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-10, 66);
  ctx.quadraticCurveTo(-20, 100, -8, 140);
  ctx.moveTo(10, 66);
  ctx.quadraticCurveTo(20, 100, 8, 140);
  ctx.stroke();

  if (flinch > 0) {
    ctx.globalAlpha = flinch;
    ctx.fillStyle = "#e9efc9";
    ctx.beginPath();
    ctx.ellipse(0, -10, 40, 90, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
