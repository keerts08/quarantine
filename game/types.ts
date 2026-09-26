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
  | "atticWindow";

export type EntryKind = "door" | "window";

export interface EntryDef {
  id: EntryId;
  label: string;
  kind: EntryKind;
  zone: RectZone;
  facing: "up" | "down" | "left" | "right";
}

export type BarricadeLevel = 0 | 1 | 2 | 3;

export const BARRICADE_COST: Record<BarricadeLevel, number> = {
  0: 0,
  1: 2,
  2: 3,
  3: 4,
};

export interface EntryState {
  barricadeLevel: BarricadeLevel;
}

export interface MaterialPile {
  id: string;
  pos: Vec2;
  boards: number;
}

export type Phase = "title" | "day";

export interface PlayerState {
  pos: Vec2;
  boards: number;
}

export interface GameState {
  phase: Phase;
  player: PlayerState;
  entries: Record<EntryId, EntryState>;
  piles: MaterialPile[];
  log: string[];
}
