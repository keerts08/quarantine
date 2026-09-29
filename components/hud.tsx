"use client";

import { useGameStore } from "@/game/store";
import { swordSpriteFor } from "@/game/sprites";

function fmtTime(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function Hud() {
  const night = useGameStore((s) => s.night);
  const phase = useGameStore((s) => s.phase);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const hp = useGameStore((s) => s.player.hp);
  const maxHp = useGameStore((s) => s.player.maxHp);
  const boards = useGameStore((s) => s.player.boards);
  const coins = useGameStore((s) => s.player.coins);
  const weaponLevel = useGameStore((s) => s.player.weaponLevel);
  const isBossLevel = night % 3 === 0;

  const hpPct = Math.round((hp / maxHp) * 100);

  return (
    <div className="flex items-center justify-between gap-6 border-b border-line bg-panel/80 px-5 py-3 font-[family-name:var(--font-display)] uppercase tracking-widest text-sm">
      <div className="flex items-center gap-4">
        <span className={isBossLevel ? "text-danger" : "text-accent"}>
          Level {night}
        </span>
        {phase === "day" && (
          <span className="text-ink-dim">
            Night in {fmtTime(timeRemaining)}
          </span>
        )}
        {(phase === "night" || phase === "combat") && (
          <span className="text-ink-dim">Dawn in {fmtTime(timeRemaining)}</span>
        )}
        {phase === "dawn" && (
          <span className="text-ink-dim">Day in {fmtTime(timeRemaining)}</span>
        )}
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <span className="text-ink-faint text-xs">HP</span>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-void border border-line">
            <div
              className={`h-full transition-all ${hpPct > 50 ? "bg-accent" : hpPct > 25 ? "bg-warn" : "bg-danger"}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-ink-dim">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sprites/icon-boards.png"
            alt="Boards"
            className="h-5 w-5 [image-rendering:pixelated]"
          />
          <span className="text-ink font-semibold">{boards}</span>
        </div>
        <div className="flex items-center gap-1.5 text-ink-dim">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={swordSpriteFor(weaponLevel)}
            alt="Sword"
            className="h-5 w-5 [image-rendering:pixelated]"
          />
          <span className="text-ink font-semibold">+{weaponLevel}</span>
        </div>
        <div className="flex items-center gap-1.5 text-warn">
          <span className="text-ink-faint text-xs">Coins</span>
          <span className="font-semibold">{coins}</span>
        </div>
      </div>
    </div>
  );
}
