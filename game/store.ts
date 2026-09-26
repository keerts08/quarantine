import { create } from "zustand";
import { BARRICADE_COST, type BarricadeLevel, type EntryId, type EntryState, type GameState, type MaterialPile, type Vec2 } from "./types";
import { ENTRY_DEFS, MATERIAL_PILE_DEFS, PLAYER_START } from "./layouts";

const MAX_LOG = 40;

function freshEntries(): Record<EntryId, EntryState> {
  const out = {} as Record<EntryId, EntryState>;
  for (const def of ENTRY_DEFS) out[def.id] = { barricadeLevel: 0 };
  return out;
}

function freshPiles(): MaterialPile[] {
  return MATERIAL_PILE_DEFS.map((d) => ({ id: d.id, pos: d.pos, boards: d.boards }));
}

function initialState(): GameState {
  return {
    phase: "title",
    player: { pos: { ...PLAYER_START }, boards: 4 },
    entries: freshEntries(),
    piles: freshPiles(),
    log: ["You've boarded yourself into the house. Something is already outside."],
  };
}

interface GameStore extends GameState {
  startGame: () => void;
  resetGame: () => void;
  setPlayerPos: (pos: Vec2) => void;
  collectPile: (pileId: string) => void;
  upgradeBarricade: (entryId: EntryId) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  ...initialState(),

  startGame: () => set({ ...initialState(), phase: "day" }),
  resetGame: () => set({ ...initialState() }),
  setPlayerPos: (pos) => set((s) => ({ player: { ...s.player, pos } })),

  collectPile: (pileId) =>
    set((s) => {
      const pile = s.piles.find((p) => p.id === pileId);
      if (!pile || pile.boards <= 0) return s;
      const gained = pile.boards;
      return {
        piles: s.piles.map((p) => (p.id === pileId ? { ...p, boards: 0 } : p)),
        player: { ...s.player, boards: s.player.boards + gained },
        log: [...s.log.slice(-(MAX_LOG - 1)), `Salvaged ${gained} board${gained === 1 ? "" : "s"}.`],
      };
    }),

  upgradeBarricade: (entryId) =>
    set((s) => {
      const entry = s.entries[entryId];
      const nextLevel = Math.min(3, entry.barricadeLevel + 1) as BarricadeLevel;
      if (nextLevel === entry.barricadeLevel) return s;
      const cost = BARRICADE_COST[nextLevel];
      if (s.player.boards < cost) return s;
      const def = ENTRY_DEFS.find((d) => d.id === entryId)!;
      return {
        player: { ...s.player, boards: s.player.boards - cost },
        entries: { ...s.entries, [entryId]: { barricadeLevel: nextLevel } },
        log: [...s.log.slice(-(MAX_LOG - 1)), `Reinforced the ${def.label} (level ${nextLevel}).`],
      };
    }),
}));
