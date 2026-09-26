export interface Vec2 {
  x: number;
  y: number;
}

export interface RectZone {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type EntryId =
  | "frontDoor"
  | "backDoor"
  | "livingWindow"
  | "kitchenWindow"
  | "atticWindow"
  | "cellarHatch"
  | "sideWindow";
  
export type EntryKind = "door" | "window";

export interface EntryDef {
  id: EntryId;
  label: string;
  kind: EntryKind;
  zone: RectZone;
  facing: "up" | "down" | "left" | "right";
  activeFromNight: number;
}

export type BarricadeLevel = 0 | 1 | 2 | 3;

export const BARRICADE_COST: Record<BarricadeLevel, number> = {
  0: 0,
  1: 2,
  2: 3,
  3: 4,
};

export const BARRICADE_MAX_INTEGRITY: Record<BarricadeLevel, number> = {
  0: 0,
  1: 40,
  2: 75,
  3: 100,
}

export interface EntryState {
  barricadeLevel: BarricadeLevel;
  integrity: number;
  breached: boolean;
  underAttack: boolean;
  warmup: number;
  respite: number;
}

export interface MaterialPile {
  id: string;
  pos: Vec2;
  boards: number;
  respawnsNight: boolean;
}

export type Phase = "title" | "day" | "night" | "combat" | "dawn" | "gameover";

export interface CombatState {
  entryId: EntryId;
  isBoss: boolean;
  hollowHp: number;
  hollowMaxHp: number;
  hitsLanded: number;
  hitsNeeded: number;
  misses: number;
  maxMisses: number;
  marker: number;
  markerDir: 1 | -1;
  markerSpeed: number;
  zoneStart: number;
  zoneWidth: number;
  resolution: "pending" | "win" | "lose";
}

export interface PlayerState {
  pos: Vec2;
  hp: number;
  maxHp: number;
  boards: number;
  coins: number;
  weaponLevel: number;
}

export interface NightConfig {
  night: number;
  pressure: number;
  duration: number;
  aggression: number;
}

export interface GameState {
  phase: Phase;
  night: number;
  timeRemaining: number;
  player: PlayerState;
  entries: Record<EntryId, EntryState>;
  piles: MaterialPile[];
  combat: CombatState | null;
  log: string[];
  lastCoinsEarned: number;
}
