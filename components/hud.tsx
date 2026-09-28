"use client";

import { useGameStore } from "@/game/store";
import { ENTRY_DEFS } from "@/game/layouts";
import { BARRICADE_MAX_INTEGRITY, type EntryState } from "@/game/types";

function fmtTime(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function entryDotColor(entry: EntryState) {
  if (entry.breached) return "bg-void border border-danger";
  if (entry.underAttack) return "bg-danger";
  if (entry.barricadeLevel === 0) return "bg-ink-faint";
  const pct = entry.integrity / BARRICADE_MAX_INTEGRITY[entry.barricadeLevel];
  if (pct > 0.6) return "bg-accent";
  if (pct > 0.3) return "bg-warn";
  return "bg-danger";
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
  const entries = useGameStore((s) => s.entries);
  const isBossLevel = night % 3 === 0;

  const hpPct = Math.round((hp / maxHp) * 100);
  const activeEntries = ENTRY_DEFS.filter(
    (def) => night >= def.activeFromNight,
  );

  return (
    <div className="flex items-center justify-between gap-6 border-b border-line bg-panel/80 px-5 py-3 font-[family-name:var(--font-display)] uppercase tracking-widest text-sm">
      <div className="flex items-center gap-4">
        <span className={isBossLevel ? "text-danger" : "text-accent"}>
          Level {night}
          {isBossLevel ? " — Warden" : ""}
        </span>
        {phase === "night" && (
          <span className="text-ink-dim">{fmtTime(timeRemaining)}</span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {activeEntries.map((def) => (
          <span
            key={def.id}
            title={def.label}
            className={`h-2.5 w-2.5 rounded-full ${entryDotColor(entries[def.id])}`}
          />
        ))}
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
          <span className="text-ink-faint text-xs">Boards</span>
          <span className="text-ink font-semibold">{boards}</span>
        </div>
        <div className="flex items-center gap-1.5 text-ink-dim">
          <span className="text-ink-faint text-xs">Stake+{weaponLevel}</span>
        </div>
        <div className="flex items-center gap-1.5 text-warn">
          <span className="text-ink-faint text-xs">Coins</span>
          <span className="font-semibold">{coins}</span>
        </div>
      </div>
    </div>
  );
}
