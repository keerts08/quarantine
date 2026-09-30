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
  type PlayerState,
  type UpgradeId,
  type Vec2,
} from "./types";
import { ENTRY_DEFS, MATERIAL_PILE_DEFS, PLAYER_START } from "./layouts";
import { clamp, dist } from "./physics";
import { playHitImpact, playMiss, setSoundEnabled } from "./sound";
import { moveWithCollision } from "./tilemap";

const INTRUDER_RADIUS = 12;
let wasInContact = false;
const MAX_LOG = 40;
const HOLLOW_TOUCH_DAMAGE = 8;
export const WARMUP_SECONDS = 1.8;
const BOSS_ENTRY_ID: EntryId = "frontDoor";

export const MAX_NIGHT = 10;

function maxConcurrentThreats(night: number) {
  if (night <= 3) return 1;
  if (night <= 7) return 2;
  return 3;
}

const DAY_DURATION = 25;
const DAWN_DURATION = 30;

export const MAX_WEAPON_LEVEL = 4;
export const MAX_VITALS_LEVEL = 5;
export const MAX_HANDS_LEVEL = 2;
export const MAX_RESIST_LEVEL = 4;
export const MAX_SPEED_LEVEL = 3;
export const MAX_SCAVENGER_LEVEL = 3;

const INTRUDER_SPEED = 46;
export const CONTACT_RADIUS = 30;
const CONTACT_DAMAGE_BASE = 10;
const CONTACT_DAMAGE_PER_LEVEL = 1.2;

const INTRUDER_BASE_HP = 20;
const INTRUDER_HP_PER_LEVEL = 4;
const INTRUDER_BOSS_HP_MULT = 1.8;

export const SWORD_RANGE = 68;

export function weaponStats(weaponLevel: number) {
  return { damage: 8 + weaponLevel * 4, cooldown: 0.45, range: SWORD_RANGE };
}

export function speedMultiplierFor(speedLevel: number) {
  return 1 + speedLevel * 0.12;
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

function isBossLevel(night: number) {
  return night % 3 === 0;
}

function spawnIntruder(def: EntryDef, night: number): Intruder {
  const isBoss = isBossLevel(night) && def.id === BOSS_ENTRY_ID;
  const maxHp = Math.round(
    (INTRUDER_BASE_HP + (night - 1) * INTRUDER_HP_PER_LEVEL) *
      (isBoss ? INTRUDER_BOSS_HP_MULT : 1),
  );
  return {
    id: `intr-${def.id}-${Date.now()}`,
    entryId: def.id,
    pos: spawnPosFor(def),
    hp: maxHp,
    maxHp,
    isBoss,
  };
}

export interface UpgradeDef {
  id: UpgradeId;
  label: string;
  hint: string;
  icon: string;
  maxLevel: number;
}

export const UPGRADE_DEFS: Record<UpgradeId, UpgradeDef> = {
  vitals: {
    id: "vitals",
    label: "Reinforced Vitals",
    hint: "+15 max HP, healed immediately.",
    icon: "/sprites/icon-health.png",
    maxLevel: MAX_VITALS_LEVEL,
  },
  weapon: {
    id: "weapon",
    label: "Sharpened Sword",
    hint: "More damage per swing, fewer hits needed to break a siege.",
    icon: "/sprites/sword-2.png",
    maxLevel: MAX_WEAPON_LEVEL,
  },
  hands: {
    id: "hands",
    label: "Quick Hands",
    hint: "Every barricade level costs one fewer board.",
    icon: "/sprites/icon-hands.png",
    maxLevel: MAX_HANDS_LEVEL,
  },
  resist: {
    id: "resist",
    label: "Thick Skin",
    hint: "Take noticeably less damage on contact.",
    icon: "/sprites/icon-resist.png",
    maxLevel: MAX_RESIST_LEVEL,
  },
  speed: {
    id: "speed",
    label: "Swift Boots",
    hint: "Move faster through the dungeon.",
    icon: "/sprites/icon-speed.png",
    maxLevel: MAX_SPEED_LEVEL,
  },
  scavenger: {
    id: "scavenger",
    label: "Scavenger's Eye",
    hint: "Salvage extra boards from every pile.",
    icon: "/sprites/icon-scavenger.png",
    maxLevel: MAX_SCAVENGER_LEVEL,
  },
};

function getUpgradeLevel(player: PlayerState, id: UpgradeId): number {
  switch (id) {
    case "vitals":
      return player.vitalsLevel;
    case "weapon":
      return player.weaponLevel;
    case "hands":
      return player.handsLevel;
    case "resist":
      return player.resistLevel;
    case "speed":
      return player.speedLevel;
    case "scavenger":
      return player.scavengerLevel;
  }
}

function applyUpgrade(player: PlayerState, id: UpgradeId): PlayerState {
  switch (id) {
    case "vitals": {
      const gain = 15;
      return {
        ...player,
        vitalsLevel: player.vitalsLevel + 1,
        maxHp: player.maxHp + gain,
        hp: player.hp + gain,
      };
    }
    case "weapon":
      return { ...player, weaponLevel: player.weaponLevel + 1 };
    case "hands":
      return { ...player, handsLevel: player.handsLevel + 1 };
    case "resist":
      return { ...player, resistLevel: player.resistLevel + 1 };
    case "speed":
      return { ...player, speedLevel: player.speedLevel + 1 };
    case "scavenger":
      return { ...player, scavengerLevel: player.scavengerLevel + 1 };
  }
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickUpgrades(player: PlayerState): UpgradeId[] {
  const allIds = Object.keys(UPGRADE_DEFS) as UpgradeId[];
  const eligible = allIds.filter(
    (id) => getUpgradeLevel(player, id) < UPGRADE_DEFS[id].maxLevel,
  );
  if (eligible.length === 0) return [];

  const picks: UpgradeId[] = [];
  if (eligible.includes("vitals")) picks.push("vitals");
  const rest = shuffle(eligible.filter((id) => id !== "vitals"));
  for (const id of rest) {
    if (picks.length >= 3) break;
    picks.push(id);
  }
  return picks;
}

function barricadeUpkeepCost(level: BarricadeLevel) {
  return level;
}

function barricadeCostFor(level: BarricadeLevel, handsLevel: number) {
  return Math.max(1, BARRICADE_COST[level] - handsLevel);
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

function pilesForNight(
  existing: MaterialPile[],
  night: number,
): MaterialPile[] {
  const byId = new Map(existing.map((p) => [p.id, p]));
  return MATERIAL_PILE_DEFS.filter((d) => night >= d.minNight).map((d) => {
    const prev = byId.get(d.id);
    if (prev) return prev;
    return {
      id: d.id,
      pos: d.pos,
      boards: d.boards,
      respawnsNight: true,
      isChest: d.isChest,
      openedAt: null,
    };
  });
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
      vitalsLevel: 0,
      handsLevel: 0,
      resistLevel: 0,
      speedLevel: 0,
      scavengerLevel: 0,
    },
    entries: freshEntries(),
    piles: pilesForNight([], 1),
    combat: null,
    log: [
      "You've sealed yourself into this chamber. Something is already down here with you.",
    ],
    lastCoinsEarned: 0,
    intruders: [],
    audioEnabled: true,
    pendingUpgrades: [],
    jumpscareSeq: 0,
    jumpscareKind: "generic",
  };
}

function isEntryActive(entryId: EntryId, night: number) {
  const def = ENTRY_DEFS.find((d) => d.id === entryId)!;
  return night >= def.activeFromNight;
}

function nightfallState(s: GameState): Partial<GameState> {
  const cfg = nightConfig(s.night);
  const entries = { ...s.entries };
  for (const def of ENTRY_DEFS) {
    const e = entries[def.id];
    entries[def.id] = {
      ...e,
      integrity:
        e.barricadeLevel > 0 ? BARRICADE_MAX_INTEGRITY[e.barricadeLevel] : 0,
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
    log: [
      ...s.log.slice(-(MAX_LOG - 1)),
      `Level ${s.night} — nightfall.`,
      ...bossLine,
    ],
  };
}

interface GameStore extends GameState {
  pushLog: (line: string) => void;
  startGame: () => void;
  setPlayerPos: (pos: Vec2) => void;
  collectPile: (pileId: string) => void;
  upgradeBarricade: (entryId: EntryId) => void;
  beginNight: () => void;
  tickDay: (dt: number) => void;
  tickNight: (dt: number) => void;
  tickCombat: (dt: number) => void;
  hitCombat: () => void;
  tickIntruders: (dt: number) => void;
  swingWeapon: () => void;
  tickDawn: (dt: number) => void;
  chooseUpgrade: (id: UpgradeId) => void;
  resetGame: () => void;
  toggleAudio: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState(),

  pushLog: (line) =>
    set((s) => ({ log: [...s.log.slice(-(MAX_LOG - 1)), line] })),

  startGame: () =>
    set((s) => {
      wasInContact = false;
      return {
        ...initialState(),
        audioEnabled: s.audioEnabled,
        phase: "day",
        timeRemaining: DAY_DURATION,
      };
    }),

  resetGame: () =>
    set((s) => {
      wasInContact = false;
      return { ...initialState(), audioEnabled: s.audioEnabled };
    }),

  toggleAudio: () =>
    set((s) => {
      const next = !s.audioEnabled;
      setSoundEnabled(next);
      return { audioEnabled: next };
    }),

  setPlayerPos: (pos) => set((s) => ({ player: { ...s.player, pos } })),

  collectPile: (pileId) =>
    set((s) => {
      const pile = s.piles.find((p) => p.id === pileId);
      if (!pile || pile.boards <= 0) return s;
      const gained = pile.boards + s.player.scavengerLevel;

      const jumpscareChance = clamp(0.15 + 0.02 * (s.night - 1), 0.15, 0.3);
      const scared = Math.random() < jumpscareChance;
      return {
        piles: s.piles.map((p) =>
          p.id === pileId
            ? { ...p, boards: 0, openedAt: p.isChest ? Date.now() : p.openedAt }
            : p,
        ),
        player: { ...s.player, boards: s.player.boards + gained },
        log: [
          ...s.log.slice(-(MAX_LOG - 1)),
          `Salvaged ${gained} board${gained === 1 ? "" : "s"}.`,
        ],
        jumpscareSeq: scared ? s.jumpscareSeq + 1 : s.jumpscareSeq,
        jumpscareKind: "wood",
      };
    }),

  upgradeBarricade: (entryId) =>
    set((s) => {
      const entry = s.entries[entryId];
      if (!entry) return s;
      const nextLevel = Math.min(3, entry.barricadeLevel + 1) as BarricadeLevel;
      const def = ENTRY_DEFS.find((d) => d.id === entryId)!;
      if (nextLevel === entry.barricadeLevel && !entry.breached) {
        return {
          log: [
            ...s.log.slice(-(MAX_LOG - 1)),
            `The ${def.label} is already fully reinforced.`,
          ],
        };
      }
      const cost = barricadeCostFor(nextLevel, s.player.handsLevel);
      if (s.player.boards < cost) {
        return {
          log: [
            ...s.log.slice(-(MAX_LOG - 1)),
            `Need ${cost} boards for the ${def.label} (have ${s.player.boards}).`,
          ],
        };
      }
      const hadIntruder =
        entry.breached && s.intruders.some((i) => i.entryId === entryId);
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
        intruders: s.intruders.filter((i) => i.entryId !== entryId),
        log: [
          ...s.log.slice(-(MAX_LOG - 1)),
          `Reinforced the ${def.label} (level ${nextLevel}).`,
          ...(hadIntruder
            ? [
                "You drive it back out through the gap and slam the boards home.",
              ]
            : []),
        ],
      };
    }),

  beginNight: () => set((s) => nightfallState(s)),

  tickDay: (dt) => {
    const s = get();
    if (s.phase !== "day") return;
    const timeRemaining = s.timeRemaining - dt;
    if (timeRemaining <= 0) {
      set(nightfallState(s));
      return;
    }
    set({ timeRemaining });
  },

  tickNight: (dt) => {
    const s = get();
    if (s.phase !== "night") return;

    const cfg = nightConfig(s.night);
    const entries = { ...s.entries };
    const newlySpotted: EntryId[] = [];
    const newlyReady: EntryId[] = [];
    const logLines: string[] = [];

    let activeCount = 0;
    for (const def of ENTRY_DEFS) {
      if (isEntryActive(def.id, s.night) && entries[def.id].underAttack)
        activeCount++;
    }
    const cap = maxConcurrentThreats(s.night);
    const candidates: { id: EntryId; level: number }[] = [];

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
        candidates.push({ id: def.id, level: 0 });
        continue;
      }

      const mitigation = 1 / (1 + e.barricadeLevel * 1.3);
      const jitter = 0.85 + Math.random() * 0.3;
      const decay = cfg.pressure * mitigation * jitter * dt;
      const nextIntegrity = e.integrity - decay;

      if (nextIntegrity <= 0) {
        entries[def.id] = { ...e, integrity: 0 };
        candidates.push({ id: def.id, level: e.barricadeLevel });
      } else {
        entries[def.id] = { ...e, integrity: nextIntegrity };
      }
    }
    candidates.sort((a, b) => a.level - b.level);
    const freeSlots = Math.max(0, cap - activeCount);
    candidates.forEach(({ id }, i) => {
      if (i >= freeSlots) return;
      entries[id] = {
        ...entries[id],
        underAttack: true,
        warmup: WARMUP_SECONDS,
      };
      newlySpotted.push(id);
    });

    const timeRemaining = s.timeRemaining - dt;

    for (const id of newlySpotted) {
      const def = ENTRY_DEFS.find((d) => d.id === id)!;
      logLines.push(`You see something at the ${def.label}.`);
    }
    for (const id of newlyReady) {
      const def = ENTRY_DEFS.find((d) => d.id === id)!;
      logLines.push(`It's breaking through the ${def.label}!`);
    }

    let combat = s.combat;
    let intruders = s.intruders;
    const readyQueue = [...newlyReady];
    if (!combat && readyQueue.length > 0) {
      const nextId = readyQueue.shift()!;
      combat = makeCombat(nextId, s.night, s.player.weaponLevel);
    }
    for (const id of readyQueue) {
      const def = ENTRY_DEFS.find((d) => d.id === id)!;
      entries[id] = {
        ...entries[id],
        integrity: 0,
        breached: true,
        underAttack: false,
        warmup: 0,
      };
      intruders = [...intruders, spawnIntruder(def, s.night)];
      logLines.push(
        `It got through the ${def.label} while you were busy elsewhere.`,
      );
    }
    const phase: GameState["phase"] = combat ? "combat" : "night";

    if (timeRemaining <= 0 && phase === "night") {
      if (intruders.length > 0) {
        if (s.timeRemaining > 0) {
          logLines.push("Dawn is close, but it's still down here. Finish it.");
        }
        set({
          entries,
          intruders,
          timeRemaining: 0,
          combat,
          phase,
          log: logLines.length
            ? [...s.log.slice(-(MAX_LOG - 1)), ...logLines]
            : s.log,
        });
        return;
      }
      const earned = 12 + s.night * 4;
      const player = { ...s.player, coins: s.player.coins + earned };

      if (s.night >= MAX_NIGHT) {
        set({
          phase: "victory",
          entries,
          intruders,
          player,
          lastCoinsEarned: earned,
          timeRemaining: 0,
          log: [
            ...s.log.slice(-(MAX_LOG - 1)),
            ...logLines,
            `Dawn breaks. You survived level ${s.night}. +${earned} coins.`,
            `The dungeon has nothing left to throw at you. You made it.`,
          ],
        });
        return;
      }

      set({
        phase: "dawn",
        entries,
        intruders,
        player,
        lastCoinsEarned: earned,
        timeRemaining: DAWN_DURATION,
        pendingUpgrades: pickUpgrades(player),
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
      intruders,
      timeRemaining: Math.max(0, timeRemaining),
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
    let anyContact = false;
    const logLines: string[] = [];
    const intruders = s.intruders.map((intr) => {
      const toPlayer = {
        x: s.player.pos.x - intr.pos.x,
        y: s.player.pos.y - intr.pos.y,
      };
      const d = Math.hypot(toPlayer.x, toPlayer.y) || 1;
      const step = Math.min(d, INTRUDER_SPEED * dt);

      const pos = moveWithCollision(
        intr.pos.x,
        intr.pos.y,
        (toPlayer.x / d) * step,
        (toPlayer.y / d) * step,
        INTRUDER_RADIUS,
      );
      if (dist(pos, s.player.pos) < CONTACT_RADIUS) {
        anyContact = true;
        const resistMult = Math.max(0.25, 1 - s.player.resistLevel * 0.15);
        hpDelta -=
          (CONTACT_DAMAGE_BASE + s.night * CONTACT_DAMAGE_PER_LEVEL) *
          resistMult *
          dt;
      }
      return { ...intr, pos };
    });

    if (anyContact && !wasInContact) {
      logLines.push("It claws at you.");
    }
    wasInContact = anyContact;

    const nextHp = clamp(s.player.hp + hpDelta, 0, s.player.maxHp);
    if (nextHp <= 0 && hpDelta < 0) {
      set({
        player: { ...s.player, hp: 0 },
        intruders,
        phase: "gameover",
        log: [
          ...s.log.slice(-(MAX_LOG - 1)),
          "It gets its hands on you.",
          "The chamber is overrun. It gets in.",
        ],
      });
      return;
    }

    set({
      intruders,
      player: hpDelta < 0 ? { ...s.player, hp: nextHp } : s.player,
      log: logLines.length
        ? [...s.log.slice(-(MAX_LOG - 1)), ...logLines]
        : s.log,
    });
  },

  swingWeapon: () => {
    const s = get();
    if (s.phase !== "day" && s.phase !== "night") return;
    if (s.intruders.length === 0) return;

    const { damage, range } = weaponStats(s.player.weaponLevel);
    let nearest: Intruder | null = null;
    let nearestDist = Infinity;
    for (const intr of s.intruders) {
      const d = dist(intr.pos, s.player.pos);
      if (d <= range && d < nearestDist) {
        nearest = intr;
        nearestDist = d;
      }
    }
    if (!nearest) return;

    playHitImpact();
    const hp = Math.max(0, nearest.hp - damage);

    if (hp <= 0) {
      const def = ENTRY_DEFS.find((d) => d.id === nearest!.entryId)!;
      const bonusCoins = nearest.isBoss
        ? 12 + s.night
        : 4 + Math.floor(s.night / 2);
      set({
        intruders: s.intruders.filter((i) => i.id !== nearest!.id),
        player: { ...s.player, coins: s.player.coins + bonusCoins },
        log: [
          ...s.log.slice(-(MAX_LOG - 1)),
          `You put it down for good. It won't be back — but the ${def.label} is still open. +${bonusCoins} coins.`,
        ],
      });
      return;
    }

    set({
      intruders: s.intruders.map((i) =>
        i.id === nearest!.id ? { ...i, hp } : i,
      ),
    });
  },

  chooseUpgrade: (id) =>
    set((s) => {
      if (s.phase !== "dawn") return s;
      if (!s.pendingUpgrades.includes(id)) return s;
      return applyChosenUpgrade(s, id);
    }),

  tickDawn: (dt) => {
    const s = get();
    if (s.phase !== "dawn") return;
    const timeRemaining = s.timeRemaining - dt;
    if (timeRemaining <= 0) {
      const id = s.pendingUpgrades[0];
      set(id ? applyChosenUpgrade(s, id) : nextDayState(s));
      return;
    }
    set({ timeRemaining });
  },
}));

function applyChosenUpgrade(s: GameState, id: UpgradeId): Partial<GameState> {
  const dayState = nextDayState(s);
  const player = applyUpgrade(dayState.player ?? s.player, id);
  return {
    ...dayState,
    player,
    pendingUpgrades: [],
    log: [
      ...(dayState.log ?? s.log).slice(-(MAX_LOG - 1)),
      `You take ${UPGRADE_DEFS[id].label}.`,
      `Level ${s.night + 1}. Time to prepare.`,
    ],
  };
}

function nextDayState(s: GameState): Partial<GameState> {
  let boards = s.player.boards;
  const entries = { ...s.entries };
  const upkeepLines: string[] = [];

  for (const def of ENTRY_DEFS) {
    const e = entries[def.id];
    if (e.barricadeLevel === 0 || e.breached) continue;
    const cost = barricadeUpkeepCost(e.barricadeLevel);
    if (boards >= cost) {
      boards -= cost;
    } else {
      const nextLevel = (e.barricadeLevel - 1) as BarricadeLevel;
      entries[def.id] = {
        ...e,
        barricadeLevel: nextLevel,
        integrity: BARRICADE_MAX_INTEGRITY[nextLevel],
      };
      upkeepLines.push(
        `Couldn't maintain the ${def.label} overnight — down to level ${nextLevel}.`,
      );
    }
  }

  const nextNight = s.night + 1;
  const piles = pilesForNight(s.piles, nextNight).map((p) => {
    const def = MATERIAL_PILE_DEFS.find((d) => d.id === p.id)!;
    const pileBoards = Math.max(p.boards, Math.ceil(def.boards * 0.6));
    return {
      ...p,
      boards: pileBoards,
      openedAt: pileBoards > 0 ? null : p.openedAt,
    };
  });

  return {
    phase: "day",
    night: nextNight,
    timeRemaining: DAY_DURATION,
    piles,
    entries,
    player: { ...s.player, boards },
    log: [
      ...s.log.slice(-(MAX_LOG - 1)),
      ...upkeepLines,
      `Level ${nextNight}. Time to prepare.`,
    ],
  };
}

function makeCombat(
  entryId: EntryId,
  night: number,
  weaponLevel: number,
): CombatState {
  const isBoss = isBossLevel(night) && entryId === BOSS_ENTRY_ID;
  const baseHits = (isBoss ? 6 : 4) + Math.floor((night - 1) / 5);
  const hitsNeeded = Math.max(2, baseHits - weaponLevel);
  const maxMisses = Math.max(2, 3 - Math.floor((night - 1) / 4));
  const zoneWidth = Math.max(0.11, (isBoss ? 0.24 : 0.28) - night * 0.018);
  return {
    entryId,
    isBoss,
    hollowHp: hitsNeeded,
    hollowMaxHp: hitsNeeded,
    hitsLanded: 0,
    hitsNeeded,
    misses: 0,
    maxMisses,
    marker: 0,
    markerDir: 1,
    markerSpeed: (isBoss ? 1.2 : 0.95) + night * 0.11,
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

  useGameStore.setState({
    entries,
    combat: null,
    phase: "night",
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
  const intruders = [...s.intruders, spawnIntruder(def, s.night)];

  const nextHp = clamp(s.player.hp - HOLLOW_TOUCH_DAMAGE, 0, s.player.maxHp);
  const gameover = nextHp <= 0;
  useGameStore.setState({
    entries,
    intruders,
    combat: null,
    phase: gameover ? "gameover" : "night",
    player: { ...s.player, hp: nextHp },
    log: [
      ...s.log.slice(-(MAX_LOG - 1)),
      `It broke through the ${def.label}!`,
      ...(gameover ? ["The chamber is overrun. It gets in."] : []),
    ],
  });
}

export function canAffordUpgrade(boards: number, currentLevel: BarricadeLevel) {
  const nextLevel = Math.min(3, currentLevel + 1) as BarricadeLevel;
  if (nextLevel === currentLevel) return false;
  return boards >= BARRICADE_COST[nextLevel];
}
