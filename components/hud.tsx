import { ENTRY_DEFS } from "@/game/layouts";
import { useGameStore } from "@/game/store";

export default function Hud() {
  const boards = useGameStore((s) => s.player.boards);
  const entries = useGameStore((s) => s.entries);
  return (
    <div className="flex items-center justify-between gap-6 border-b border-line uppercase tracking-widest text-sm">
      <span className="text-accent">Prepare the room</span>
      <div className="flex items-center gap-1.5">
        {ENTRY_DEFS.map((def) => {
          const level = entries[def.id].barricadeLevel;
          const color =
            level === 0 ? "bg-ink-faint" : level < 3 ? "bg-warn" : "bg-accent";
          return (
            <span
              key={def.id}
              title={def.label}
              className={`h-2.5 w-2.5 rounded-full ${color}`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 text-ink-dim">
        <span className="text-ink-faint text-xs">Boards</span>
        <span className="text-ink font-semibold">{boards}</span>
      </div>
    </div>
  );
}
