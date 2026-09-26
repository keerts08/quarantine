export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  moving: boolean,
) {
  const bob = moving ? Math.sin(t * 10) * 1.5 : 0;

  ctx.save();
  ctx.translate(x, y + bob);

  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 50);
  glow.addColorStop(0, "rgba(217,154,58,0.22)");
  glow.addColorStop(1, "rgba(217,154,58,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 50, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(0, 12, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2b3325";
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.quadraticCurveTo(-13, -6, -11, 12);
  ctx.quadraticCurveTo(0, 17, 11, 12);
  ctx.quadraticCurveTo(13, -6, 0, -14);
  ctx.fill();

  ctx.fillStyle = "rgba(199,217,74,0.12)";
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.quadraticCurveTo(-4, -4, -3, 10);
  ctx.quadraticCurveTo(0, 13, 3, 10);
  ctx.quadraticCurveTo(4, -4, 0, -14);
  ctx.fill();

  ctx.fillStyle = "#1c2118";
  ctx.beginPath();
  ctx.ellipse(0, -18, 8, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.beginPath();
  ctx.ellipse(0, -17, 4.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#4a3624";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(9, -6);
  ctx.lineTo(19, 8);
  ctx.stroke();

  ctx.restore();
}
