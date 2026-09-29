import { BARREL_BOXES, CHEST_BOXES } from "./collision-data";
import { GRID_COLS, GRID_ROWS } from "./map-data";
import { findGates, TILE } from "./tilemap";
import type { EntryDef, EntryId, Vec2 } from "./types";

export const CANVAS_W = GRID_COLS * TILE;
export const CANVAS_H = GRID_ROWS * TILE;

export const ROOM = {
  x: TILE,
  y: TILE,
  w: CANVAS_W - TILE * 2,
  h: CANVAS_H - TILE * 2,
};

export const PLAYER_RADIUS = 12;
export const PLAYER_SPEED = 210;

const GATES = findGates();

function zoneFor(gate: { aX: number; aY: number; bX: number; bY: number }) {
  const left = Math.min(gate.aX, gate.bX) - TILE / 2;
  const top = Math.min(gate.aY, gate.bY) - TILE / 2;
  const right = Math.min(gate.aY, gate.bX) + TILE / 2;
  const bottom = Math.min(gate.aY, gate.bY) + TILE / 2;
  return { x: left, y: top, w: right - left, h: bottom - top };
}

const ENTRY_META: Array<{
  id: EntryId;
  label: string;
  kind: EntryDef["kind"];
  activeFromNight: number;
}> = [
  { id: "frontDoor", label: "Front Door", kind: "door", activeFromNight: 1 },
  { id: "backDoor", label: "Back Door", kind: "door", activeFromNight: 1 },
  {
    id: "livingWindow",
    label: "West Window",
    kind: "window",
    activeFromNight: 1,
  },
  {
    id: "kitchenWindow",
    label: "East Window",
    kind: "window",
    activeFromNight: 1,
  },
  { id: "atticWindow", label: "Skylight", kind: "window", activeFromNight: 3 },
  {
    id: "cellarHatch",
    label: "Floor Hatch",
    kind: "window",
    activeFromNight: 5,
  },
  {
    id: "sideWindow",
    label: "Upper Window",
    kind: "window",
    activeFromNight: 7,
  },
];

if (GATES.length !== ENTRY_META.length) {
  throw new Error(
    `layouts.ts: painted map has ${GATES.length} gate(s) but ENTRY_META lists ${ENTRY_META.length}. ` +
      "The map changed — add/remove an entry here to match before shipping.",
  );
}

export const ENTRY_DEFS: EntryDef[] = ENTRY_META.map((meta, i) => ({
  ...meta,
  facing: GATES[i].facing,
  zone: zoneFor(GATES[i]),
  gate: {
    rot: GATES[i].rot,
    aX: GATES[i].aX,
    aY: GATES[i].aY,
    bX: GATES[i].bX,
    bY: GATES[i].bY,
  },
}));

export interface MaterialPileDef {
  id: string;
  pos: Vec2;
  boards: number;
  isChest: boolean;
  minNight: number;
}

function centerOf(b: { x: number; y: number; w: number; h: number }): Vec2 {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

const barrelDefs: MaterialPileDef[] = BARREL_BOXES.map((b, i) => ({
  id: `barrel-${i}`,
  pos: centerOf(b),
  boards: 3,
  isChest: false,
  minNight: i === BARREL_BOXES.length - 1 ? 5 : 1,
}));

const chestDefs: MaterialPileDef[] = CHEST_BOXES.map((b, i) => ({
  id: `chest-${i}`,
  pos: centerOf(b),
  boards: 8,
  isChest: true,
  minNight: 1,
}));

export const MATERIAL_PILE_DEFS: MaterialPileDef[] = [
  ...barrelDefs,
  ...chestDefs,
];

export const PLAYER_START: Vec2 = {
  x: 15 * TILE + TILE / 2,
  y: 9 * TILE + TILE / 2,
};
