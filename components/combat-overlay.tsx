"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/game/store";
import { ENTRY_DEFS } from "@/game/layouts";
import { drawHollow } from "./hollow-art";

export default function CombatOverlay() {
  const combat = useGameStore((s) => s.combat);
  const hitsLanded = combat?.hitsLanded;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flinchRef = useRef(0);
  const knockbackRef = useRef(0);
  const lastHits = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (hitsLanded !== undefined && hitsLanded > lastHits.current) {
      flinchRef.current = 1;
      knockbackRef.current = 1;
    }
    lastHits.current = hitsLanded ?? 0;
  }, [hitsLanded]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const start = performance.now();

    function frame(now: number) {
      const t = (now - start) / 1000;
      flinchRef.current = Math.max(0, flinchRef.current - 0.05);
      knockbackRef.current = Math.max(0, knockbackRef.current - 0.06);
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const c = useGameStore.getState().combat;
      if (c) {
        drawHollow(ctx!, {
          cx: canvas!.width / 2,
          cy: canvas!.height / 2 + 40,
          scale: 1.05,
          t,
          damage: c.hitsLanded / c.hitsNeeded,
          flinch: flinchRef.current,
          knockback: knockbackRef.current,
          isBoss: c.isBoss,
        });
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        useGameStore.getState().hitCombat();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!combat) return null;
  const def = ENTRY_DEFS.find((d) => d.id === combat.entryId)!;
  const hpPct = Math.max(
    0,
    100 - (combat.hitsLanded / combat.hitsNeeded) * 100,
  );
  const title = combat.isBoss
    ? `The Warden forces the ${def.label}`
    : `It's forcing the ${def.label}`;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-void/85 breach-shake">
      <p className="font-[family-name:var(--font-display)] uppercase tracking-widest text-danger text-lg">
        {title}
      </p>

      <canvas ref={canvasRef} width={220} height={260} />

      <div className="flex gap-1.5">
        {Array.from({ length: combat.hitsNeeded }).map((_, i) => (
          <span
            key={i}
            className={`h-2.5 w-6 rounded-sm ${i < combat.hitsLanded ? "bg-accent" : "bg-line"}`}
          />
        ))}
      </div>

      <div className="relative h-6 w-72 rounded-sm border border-line bg-panel">
        <div
          className="absolute inset-y-0 rounded-sm bg-accent/30"
          style={{
            left: `${combat.zoneStart * 100}%`,
            width: `${combat.zoneWidth * 100}%`,
          }}
        />
        <div
          className="absolute top-0 h-full w-1 bg-ink"
          style={{ left: `calc(${combat.marker * 100}% - 2px)` }}
        />
      </div>

      <div className="flex gap-1.5">
        {Array.from({ length: combat.maxMisses }).map((_, i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full ${i < combat.misses ? "bg-danger" : "bg-line"}`}
          />
        ))}
      </div>

      <p className="text-ink-dim text-xs uppercase tracking-widest">
        Press <span className="text-ink">Space</span> when the marker crosses
        the bright zone
      </p>
    </div>
  );
}
