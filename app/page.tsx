"use client";

import Hud from "@/components/hud";
import RoomCanvas from "@/components/room-ranvas";
import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";

export default function Home() {
  const phase = useGameStore((s) => s.phase);
  const log = useGameStore((s) => s.log);
  const startGame = useGameStore((s) => s.startGame);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <div className="relative w-full max-w-3xl">
        {phase !== "title" && <Hud />}
        <div className="relative">
          <RoomCanvas />
          {phase === "title" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
              <h1 className="text-5xl font-[family-name:var(--font-display)] font-bold uppercase tracking-widest text-ink">
                Quanrantine
              </h1>
              <p className="max-w-md text-[12px] text-center">
                Something is outside and it wants to get in. Board up every door
                and window, whatver you leave open, it will find.
              </p>
              <Button onClick={startGame} className="rounded-sm">
                Play
              </Button>
            </div>
          )}
        </div>
        {phase !== "title" && (
          <div className="mt-3 max-h-24 overflow-y-auto rounded-sm border border-line bg-panel/60 px-3 py-2 text-xs text-ink-dim">
            {log.slice(-6).map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
