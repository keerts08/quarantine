import { create } from "zustand";
import {
  BARRICADE_COST,
  BARRICADE_MAX_INTEGRITY,
  type BarricadeLevel,
  type CombatState,
  type EntryDef,
  type EntryId,
  type EntryState,
  type GameState,
  type Intruder,
  type MaterialPile,
  type NightConfig,
  type Vec2,
} from "./types";
import { ENTRY_DEFS, MATERIAL_PILE_DEFS, PLAYER_START, ROOM } from "./layouts";
import { clamp, dist } from "./physics";
import { playHitImpact, playMiss } from "./sound";

const MAX_LOG = 40;
const HOLLOW_TOUCH_DAMAGE = 8;
const WARMUP_SECONDS = 1.8;
const BOSS_ENTRY_ID: EntryId = "frontDoor";
export const MAX_WEAPON_LEVEL = 4;

const INTRUDER_SPEED = 46;
export const CONTACT_RADIUS = 30;
const CONTACT_DAMAGE_BASE = 10;
const CONTACT_DAMAGE_PER_LEVEL = 1.2;
const INTRUDER_BASE_HP = 20;
const INTRUDER_HP_PER_LEVEL = 4;
const INTRUDER_BOSS_HP_MULT = 1.8;
export const HOLLOW_RANGE = 68;

function isBossLevel(night: number) {
  return night % 3 === 0;
}

export function weaponUpgradeCost(weaponLevel: number) {
  return 18 + weaponLevel * 14;
}

export function weaponDamage(weaponLevel: number) {
  return 8 + weaponLevel * 4;
}

function nightConfig(night: number): NightConfig {
  return {
    night,
    pressure: 6 + (night - 1) * 2.4,
    duration: 55 + (night - 1) * 6,
    aggression: 0.5,
  };
}

function freshEntries(): Record<EntryId, EntryState> {
  const out = {} as Record<EntryId, EntryState>;
  for (const def of ENTRY_DEFS) {
      out[def.id] = {
        barricadeLevel: 0,
        integrity: 0,
        breached: false,
        underAttack: false,
        warmup: 0,
        respite: 0,
      };
  }
  return out;
}

function freshPiles(): MaterialPile[] {
  return MATERIAL_PILE_DEFS.map((d) => ({
    id: d.id,
    pos: d.pos,
    boards: d.boards,
    respawnsNight: true,
  }));
}

function initialState(): GameState {
  return {
    phase: "title",
    night: 1,
    timeRemaining: 0,
    player: {
      pos: { ...PLAYER_START },
      hp: 100,
      maxHp: 100,
      boards: 4,
      coins: 0,
      weaponLevel: 0,
    },
    entries: freshEntries(),
    piles: freshPiles(),
    combat: null,
    log: [
      "You've boarded yourself into the house. Something is already outside.",
    ],
    lastCoinsEarned: 0,
    intruders: [],
  };
}

function isEntryActive(entryId: EntryId, night: number) {
  const def = ENTRY_DEFS.find((d) => d.id === entryId)!;
  return night >= def.activeFromNight;
}

function spawnPosFor(def: EntryDef): Vec2 {
  const cx = def.zone.x + def.zone.w / 2;
  const cy = def.zone.y + def.zone.h / 2;
  const inset = 46;
  switch (def.facing) {
    case "up":
      return { x: cx, y: cy + inset };
    case "down":
      return { x: cx, y: cy - inset };
    case "left":
      return { x: cx + inset, y: cy };
    case "right":
      return { x: cx - inset, y: cy };
  }
}

function spawnIntruder(def: EntryDef, night: number): Intruder {
  const isBoss = isBossLevel(night) && def.id === BOSS_ENTRY_ID;
  const maxHp = Math.round(
    (
      INTRUDER_BASE_HP + night * INTRUDER_HP_PER_LEVEL) * (isBoss? INTRUDER_BOSS_HP_MULT : 1)
    )
  return {
    id: `${def.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    entryId: def.id,
    pos: spawnPosFor(def),
    hp: maxHp,
    maxHp,
    isBoss,
  }
}

interface GameStore extends GameState {
  combatQueue: EntryId[];
  pushLog: (line: string) => void;
  startGame: () => void;
  setPlayerPos: (pos: Vec2) => void;
  collectPile: (pileId: string) => void;
  upgradeBarricade: (entryId: EntryId) => void;
  beginNight: () => void;
  tickNight: (dt: number) => void;
  tickCombat: (dt: number) => void;
  hitCombat: () => void;
  tickIntruders: (dt: number) => void;
  swingWeapon: () => void;
  advanceAfterDawn: () => void;
  buyWeaponUpgrade: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState(),
  combatQueue: [],

  pushLog: (line) =>
    set((s) => ({ log: [...s.log.slice(-(MAX_LOG - 1)), line] })),

  startGame: () => set({ ...initialState(), phase: "day", combatQueue: [] }),

  resetGame: () => set({ ...initialState(), combatQueue: [] }),

  setPlayerPos: (pos) => set((s) => ({ player: { ...s.player, pos } })),

  collectPile: (pileId) =>
    set((s) => {
      const pile = s.piles.find((p) => p.id === pileId);
      if (!pile || pile.boards <= 0) return s;
      const gained = pile.boards;
      return {
        piles: s.piles.map((p) => (p.id === pileId ? { ...p, boards: 0 } : p)),
        player: { ...s.player, boards: s.player.boards + gained },
        log: [
          ...s.log.slice(-(MAX_LOG - 1)),
          `Salvaged ${gained} board${gained === 1 ? "" : "s"}.`,
        ],
      };
    }),

  upgradeBarricade: (entryId) =>
    set((s) => {
      const entry = s.entries[entryId];
      if (!entry) return s;
      const nextLevel = Math.min(3, entry.barricadeLevel + 1) as BarricadeLevel;
      if (nextLevel === entry.barricadeLevel) return s;
      const cost = BARRICADE_COST[nextLevel];
      if (s.player.boards < cost) return s;
      const def = ENTRY_DEFS.find((d) => d.id === entryId)!;
      return {
        player: { ...s.player, boards: s.player.boards - cost },
        entries: {
          ...s.entries,
          [entryId]: {
            ...entry,
            barricadeLevel: nextLevel,
            breached: false,
            underAttack: false,
            warmup: 0,
            respite: 3,
            integrity: BARRICADE_MAX_INTEGRITY[nextLevel],
          },
        },
        log: [
          ...s.log.slice(-(MAX_LOG - 1)),
          `Reinforced the ${def.label} (level ${nextLevel}).`,
        ],
      };
    }),

  beginNight: () =>
    set((s) => {
      const cfg = nightConfig(s.night);
      const entries = { ...s.entries };
      for (const def of ENTRY_DEFS) {
        const e = entries[def.id];
        entries[def.id] = {
          ...e,
          integrity:
            e.barricadeLevel > 0
              ? BARRICADE_MAX_INTEGRITY[e.barricadeLevel]
              : 0,
          underAttack: false,
          warmup: 0,
          respite: 4,
        };
      }

      const bossLine = isBossLevel(s.night)
        ? [`Something bigger is with it tonight. The Warden has come.`]
        : [];
      return {
        phase: "night",
        timeRemaining: cfg.duration,
        entries,
        combatQueue: [],
        log: [
          ...s.log.slice(-(MAX_LOG - 1)),
          `Level ${s.night} — nightfall.`,
          ...bossLine,
        ],
      };
    }),

  tickNight: (dt) => {
    const s = get();
    if (s.phase !== "night") return;

    const cfg = nightConfig(s.night);
    const entries = { ...s.entries };
    const newlySpotted: EntryId[] = [];
    const newlyReady: EntryId[] = [];
    const logLines: string[] = [];

    for (const def of ENTRY_DEFS) {
      if (!isEntryActive(def.id, s.night)) continue;
      const e = entries[def.id];

      if (e.breached) {
        continue;
      }

      if (e.respite > 0) {
        entries[def.id] = { ...e, respite: Math.max(0, e.respite - dt) };
        continue;
      }

      if (e.underAttack) {
        if (e.warmup > 0) {
          const nextWarmup = e.warmup - dt;
          if (nextWarmup <= 0) {
            entries[def.id] = { ...e, warmup: -1 };
            newlyReady.push(def.id);
          } else {
            entries[def.id] = { ...e, warmup: nextWarmup };
          }
        }
        continue;
      }

      if (e.barricadeLevel === 0) {
        entries[def.id] = {
          ...e,
          integrity: 0,
          underAttack: true,
          warmup: WARMUP_SECONDS,
        };
        newlySpotted.push(def.id);
        continue;
      }

      const mitigation = 1 / (1 + e.barricadeLevel * 1.3);
      const jitter = 0.85 + Math.random() * 0.3;
      const decay = cfg.pressure * mitigation * jitter * dt;
      const nextIntegrity = e.integrity - decay;

      if (nextIntegrity <= 0) {
        entries[def.id] = {
          ...e,
          integrity: 0,
          underAttack: true,
          warmup: WARMUP_SECONDS,
        };
        newlySpotted.push(def.id);
      } else {
        entries[def.id] = { ...e, integrity: nextIntegrity };
      }
    }

    const timeRemaining = s.timeRemaining - dt;
   
    for (const id of newlySpotted) {
      const def = ENTRY_DEFS.find((d) => d.id === id)!;
      logLines.push(`You see something at the ${def.label}.`);
    }

    for (const id of newlyReady) {
      const def = ENTRY_DEFS.find((d) => d.id === id)!;
      logLines.push(`It's breaking through the ${def.label}!`);
    }

    let queue =
      newlyReady.length > 0 ? [...s.combatQueue, ...newlyReady] : s.combatQueue;
    let phase: GameState["phase"] = "night";
    let combat = s.combat;

    if (!combat && queue.length > 0) {
      const [nextId, ...rest] = queue;
      combat = makeCombat(nextId, s.night, s.player.weaponLevel);
      queue = rest;
      phase = "combat";
    }

    if (timeRemaining <= 0 && phase === "night") {
      const earned = 12 + s.night * 4;
      set({
        phase: "dawn",
        entries,
        player: { ...s.player, coins: s.player.coins + earned },
        lastCoinsEarned: earned,
        timeRemaining: 0,
        log: [
          ...s.log.slice(-(MAX_LOG - 1)),
          ...logLines,
          `Dawn breaks. You survived level ${s.night}. +${earned} coins.`,
        ],
      });
      return;
    }

    set({
      entries,
      timeRemaining: Math.max(0, timeRemaining),
      combatQueue: queue,
      combat,
      phase,
      log: logLines.length
        ? [...s.log.slice(-(MAX_LOG - 1)), ...logLines]
        : s.log,
    });
  },

  tickCombat: (dt) => {
    const s = get();
    if (s.phase !== "combat" || !s.combat || s.combat.resolution !== "pending")
      return;
    const c = s.combat;
    let marker = c.marker + c.markerSpeed * c.markerDir * dt;
    let dir = c.markerDir;
    if (marker >= 1) {
      marker = 1;
      dir = -1;
    } else if (marker <= 0) {
      marker = 0;
      dir = 1;
    }

    set({ combat: { ...c, marker, markerDir: dir } });
  },

  hitCombat: () => {
    const s = get();
    if (s.phase !== "combat" || !s.combat || s.combat.resolution !== "pending")
      return;
    const c = s.combat;
    const inZone =
      c.marker >= c.zoneStart && c.marker <= c.zoneStart + c.zoneWidth;

    if (inZone) {
      playHitImpact();
      const hitsLanded = c.hitsLanded + 1;
      if (hitsLanded >= c.hitsNeeded) {
        resolveCombatWin(c);
        return;
      }
      const zoneWidth = Math.max(0.14, c.zoneWidth - 0.01);
      const zoneStart = Math.random() * (1 - zoneWidth);
      set({
        combat: {
          ...c,
          hitsLanded,
          zoneStart,
          zoneWidth,
          markerSpeed: c.markerSpeed + 0.05,
        },
      });
    } else {
      playMiss();
      const misses = c.misses + 1;
      if (misses >= c.maxMisses) {
        resolveCombatLose(c);
        return;
      }
      set({ combat: { ...c, misses } });
    }
  },

  tickIntruders: (dt) => {
    const s = get();
    if (s.phase !== "day" && s.phase !== "night") return;
    if (s.intruders.length === 0) return;

    let hpDelta = 0;
    const intruders = s.intruders.map((intr) => {
      const toPlayer = { x: s.player.pos.x - intr.pos.x, y: s.player.pos.y - intr.pos.y };
      const d = Math.hypot(toPlayer.x, toPlayer.y) || 1;
      const step = Math.min(d, INTRUDER_SPEED * dt);
      const pos = {
        x: clamp(intr.pos.x + (toPlayer.x / d) * step, ROOM.x + 10, ROOM.x + ROOM.w - 10),
        y: clamp(intr.pos.y + (toPlayer.y / d) * step, ROOM.y + 10, ROOM.y + ROOM.h - 10),
      }
      if (dist(pos, s.player.pos) < CONTACT_RADIUS) {
        hpDelta -= (CONTACT_DAMAGE_BASE + s.night * CONTACT_DAMAGE_PER_LEVEL) * dt;
      }
      return { ...intr, pos}

    })

     const nextHp = clamp(s.player.hp + hpDelta, 0, s.player.maxHp);
     if (nextHp <= 0 && hpDelta < 0) {
       set({
         player: { ...s.player, hp: 0 },
         intruders,
         phase: "gameover",
         log: [
           ...s.log.slice(-(MAX_LOG - 1)),
           "It gets its hands on you.",
           "The house is overrun. It gets in.",
         ],
       });
       return;
     }

    set({ intruders, player: hpDelta < 0 ? { ...s.player, hp: nextHp } : s.player });
  },

  swingWeapon: () => {
    const s = get();
    if (s.phase !== "day" && s.phase !== "night") return;
    if (s.intruders.length === 0) return;

    const damage = weaponDamage(s.player.weaponLevel);
    let nearest: Intruder | null = null;
    let nearestDist = Infinity;
    for (const intr of s.intruders) {
      const d = dist(intr.pos, s.player.pos);
      if (d <= HOLLOW_RANGE && d < nearestDist) {
        nearest = intr;
        nearestDist = d;
      }
    }
    if (!nearest) return;

    const hp = Math.max(0, nearest.hp - damage);
    if (hp <= 0) {
      const def = ENTRY_DEFS.find((d) => d.id === nearest!.entryId)!;
      const bonusCoins = nearest.isBoss ? 12 + s.night : 4 + Math.floor(s.night / 2);
      set({
        intruders: s.intruders.filter((i) => i.id !== nearest!.id),
        player: { ...s.player, coins: s.player.coins + bonusCoins },
        log: [
          ...s.log.slice(-(MAX_LOG - 1)),
          `You put it down for good. It won't be back - but the ${def?.label} is still open. +${bonusCoins} coins.`
        ],
      })
      return;
    }

    set({intruders: s.intruders.map((i) => (i.id === nearest!.id ? {...i, hp}: i))})
  },

  buyWeaponUpgrade: () =>
    set((s) => {
      if (s.player.weaponLevel >= MAX_WEAPON_LEVEL) return s;
      const cost = weaponUpgradeCost(s.player.weaponLevel);
      if (s.player.coins < cost) return s;
      return {
        player: {
          ...s.player,
          coins: s.player.coins - cost,
          weaponLevel: s.player.weaponLevel + 1,
        },
        log: [
          ...s.log.slice(-(MAX_LOG - 1)),
          "You sharpen your stake further.",
        ],
      };
    }),

  advanceAfterDawn: () =>
    set((s) => {
      const piles = s.piles.map((p) => {
        const def = MATERIAL_PILE_DEFS.find((d) => d.id === p.id)!;
        return {
          ...p,
          boards: Math.max(p.boards, Math.ceil(def.boards * 0.6)),
        };
      });
      return {
        phase: "day",
        night: s.night + 1,
        piles,
        log: [
          ...s.log.slice(-(MAX_LOG - 1)),
          `Level ${s.night + 1}. Time to prepare.`,
        ],
      };
    }),
}));

function makeCombat(
  entryId: EntryId,
  night: number,
  weaponLevel: number,
): CombatState {
  const isBoss = isBossLevel(night) && entryId === BOSS_ENTRY_ID;
  const baseHits = isBoss ? 6 : 4;
  const hitsNeeded = Math.max(2, baseHits - weaponLevel);
  const zoneWidth = Math.max(0.14, (isBoss ? 0.26 : 0.3) - night * 0.012);
  return {
    entryId,
    isBoss,
    hollowHp: hitsNeeded,
    hollowMaxHp: hitsNeeded,
    hitsLanded: 0,
    hitsNeeded,
    misses: 0,
    maxMisses: 3,
    marker: 0,
    markerDir: 1,
    markerSpeed: (isBoss ? 1.15 : 0.9) + night * 0.08,
    zoneStart: Math.random() * (1 - zoneWidth),
    zoneWidth,
    resolution: "pending",
  };
}

function resolveCombatWin(finishedCombat: CombatState) {
  const s = useGameStore.getState();
  const { entryId } = finishedCombat;
  const def = ENTRY_DEFS.find((d) => d.id === entryId)!;
  const entry = s.entries[entryId];
  const restored = Math.max(
    entry.integrity,
    BARRICADE_MAX_INTEGRITY[entry.barricadeLevel] * 0.4,
  );
  const entries = {
    ...s.entries,
    [entryId]: {
      ...entry,
      integrity: restored,
      underAttack: false,
      warmup: 0,
      respite: 6,
    },
  };
  let combat: CombatState | null = null;
  let queue = s.combatQueue;
  let phase: GameState["phase"] = "night";
  if (queue.length > 0) {
    const [id, ...rest] = queue;
    combat = makeCombat(id, s.night, s.player.weaponLevel);
    queue = rest;
    phase = "combat";
  }
  useGameStore.setState({
    entries,
    combat,
    combatQueue: queue,
    phase,
    log: [
      ...s.log.slice(-(MAX_LOG - 1)),
      `You drove it back from the ${def.label}.`,
    ],
  });
}

function resolveCombatLose(finishedCombat: CombatState) {
  const s = useGameStore.getState();
  const { entryId } = finishedCombat;
  const def = ENTRY_DEFS.find((d) => d.id === entryId)!;
  const entry = s.entries[entryId];
  const entries = {
    ...s.entries,
    [entryId]: {
      ...entry,
      integrity: 0,
      breached: true,
      underAttack: false,
      warmup: 0,
    },
  };
  const intruders = [...s.intruders, spawnIntruder(def, s.night)] 
  const nextHp = clamp(s.player.hp - HOLLOW_TOUCH_DAMAGE, 0, s.player.maxHp);
  const gameover = nextHp <= 0;

  let combat: CombatState | null = null;
  let queue = s.combatQueue;
  let phase: GameState["phase"] = gameover ? "gameover" : "night";
  if (!gameover && queue.length > 0) {
    const [id, ...rest] = queue;
    combat = makeCombat(id, s.night, s.player.weaponLevel);
    queue = rest;
    phase = "combat";
  }

  useGameStore.setState({
    entries,
    intruders,
    combat,
    combatQueue: queue,
    phase,
    player: { ...s.player, hp: nextHp },
    log: [
      ...s.log.slice(-(MAX_LOG - 1)),
      `It broke through the ${def.label}!`,
      ...(gameover ? ["The house is overrun. It gets in."] : []),
    ],
  });
}

export function canAffordUpgrade(boards: number, currentLevel: BarricadeLevel) {
  const nextLevel = Math.min(3, currentLevel + 1) as BarricadeLevel;
  if (nextLevel === currentLevel) return false;
  return boards >= BARRICADE_COST[nextLevel];
}
