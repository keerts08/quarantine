"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/game/store";
import { playJumpscareSting } from "@/game/sound";

const DURATION_MS = 1100;
const GLITCH_LINES = ["CONNECTION LOST", "UNAUTHENTICATED", "IT'S INSIDE", "NO SIGNAL"];

function drawScreamerFace(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h * 0.46;
  const s = h * 0.0062;

  const jitterX = Math.sin(t * 47) * 1.4 + Math.sin(t * 13) * 0.8;
  const jitterY = Math.cos(t * 39) * 1.1;

  ctx.save();
  ctx.translate(cx + jitterX, cy + jitterY);
  ctx.scale(s, s);

  const glow = ctx.createRadialGradient(-8, -20, 10, 0, 0, 170);
  glow.addColorStop(0, "#f0ddb0");
  glow.addColorStop(0.45, "#4a3d2e");
  glow.addColorStop(1, "#050502");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(-6, -170);
  ctx.quadraticCurveTo(-96, -140, -100, -30);
  ctx.quadraticCurveTo(-104, 80, -60, 160);
  ctx.quadraticCurveTo(-10, 200, 30, 158);
  ctx.quadraticCurveTo(88, 90, 82, -20);
  ctx.quadraticCurveTo(78, -132, -6, -170);
  ctx.fill();

  ctx.strokeStyle = "rgba(193,68,58,0.7)";
  ctx.lineWidth = 1.6;
  const veinSeeds: [number, number, number, number][] = [
    [-58, -18, -92, -34],
    [-52, 2, -88, 18],
    [26, -6, 58, -28],
    [30, 14, 62, 30],
  ];
  for (const [x1, y1, x2, y2] of veinSeeds) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + 6, x2, y2);
    ctx.stroke();
  }

  const eyes: [number, number, number, number][] = [
    [-40, -6, 17, 1],
    [34, 4, 11, -1],
  ];
  const pulse = 0.7 + Math.sin(t * 30) * 0.3;
  for (const [ex, ey, r, tilt] of eyes) {
    const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, r * 2.4);
    eg.addColorStop(0, `rgba(232,176,84,${0.9 * pulse})`);
    eg.addColorStop(0.5, `rgba(232,176,84,${0.35 * pulse})`);
    eg.addColorStop(1, "rgba(232,176,84,0)");
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.arc(ex, ey, r * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(tilt * 0.3);
    ctx.fillStyle = "#0a0b06";
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 1.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(240,200,110,${0.95 * pulse})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.32, r * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = "#050402";
  ctx.beginPath();
  ctx.moveTo(-62, 96);
  ctx.quadraticCurveTo(-10, 150 + Math.sin(t * 9) * 4, 46, 90);
  ctx.quadraticCurveTo(20, 122, -14, 122);
  ctx.quadraticCurveTo(-40, 122, -62, 96);
  ctx.fill();

  ctx.fillStyle = "#efe8e0";
  const teeth = 9;
  for (let i = 0; i < teeth; i++) {
    const tx = -58 + i * (104 / teeth);
    const jag = Math.sin(i * 12.9) * 3;
    ctx.beginPath();
    ctx.moveTo(tx, 98 + jag);
    ctx.lineTo(tx + 4.2, 98 + jag);
    ctx.lineTo(tx + 2.1, 118 + jag);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export default function JumpscareOverlay() {
  const phase = useGameStore((s) => s.phase);
  const jumpscareSeq = useGameStore((s) => s.jumpscareSeq);
  const [visible, setVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const prevPhase = useRef(phase);
  const prevSeq = useRef(jumpscareSeq);

  useEffect(() => {
    const wasGameover = prevPhase.current === "gameover";
    prevPhase.current = phase;
    if (phase === "gameover" && !wasGameover) {
      setVisible(true);
      playJumpscareSting();
      const timeout = setTimeout(() => setVisible(false), DURATION_MS);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  useEffect(() => {
    if (jumpscareSeq === prevSeq.current) return;
    prevSeq.current = jumpscareSeq;
    setVisible(true);
    playJumpscareSting();
    const timeout = setTimeout(() => setVisible(false), DURATION_MS);
    return () => clearTimeout(timeout);
  }, [jumpscareSeq]);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const start = performance.now();

    function frame(now: number) {
      const t = (now - start) / 1000;
      drawScreamerFace(ctx!, canvas!.width, canvas!.height, t);
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black jumpscare-shake">
      <canvas
        ref={canvasRef}
        width={800}
        height={800}
        className="jumpscare-punch h-[115vh] w-[115vw] max-w-none object-cover"
      />
      <div className="jumpscare-static pointer-events-none" />
      <div className="jumpscare-flicker pointer-events-none absolute inset-0 flex flex-col items-start justify-between p-4 font-mono text-xs text-[#ff4444] mix-blend-screen">
        <span>{GLITCH_LINES[0]}</span>
        <span className="self-end">{GLITCH_LINES[1]}</span>
        <span>{GLITCH_LINES[2]}</span>
        <span className="self-end">{GLITCH_LINES[3]}</span>
      </div>
    </div>
  );
}
