import type { EntryDef, Vec2 } from "./types";

export const CANVAS_W = 960;
export const CANVAS_H = 600;
export const WALL_THICKNESS = 26;

export const ROOM = {
  x: WALL_THICKNESS,
  y: WALL_THICKNESS,
  w: CANVAS_W - WALL_THICKNESS * 2,
  h: CANVAS_H - WALL_THICKNESS * 2,
};

export const PLAYER_RADIUS = 12;
export const PLAYER_SPEED = 210;

export const ENTRY_DEFS: EntryDef[] = [
  {
    id: "frontDoor",
    label: "Front Door",
    kind: "door",
    facing: "down",
    activeFromNight: 1,
    zone: {
      x: CANVAS_W / 2 - 45,
      y: CANVAS_H - WALL_THICKNESS,
      w: 90,
      h: WALL_THICKNESS,
    },
  },
  {
    id: "backDoor",
    label: "Back Door",
    kind: "door",
    facing: "up",
    activeFromNight: 1,
    zone: { x: CANVAS_W / 2 + 120, y: 0, w: 80, h: WALL_THICKNESS },
  },
  {
    id: "livingWindow",
    label: "Living Room Window",
    kind: "window",
    facing: "left",
    activeFromNight: 1,
    zone: { x: 0, y: 150, w: WALL_THICKNESS, h: 90 },
  },
  {
    id: "kitchenWindow",
    label: "Kitchen Window",
    kind: "window",
    facing: "right",
    activeFromNight: 1,
    zone: {
      x: CANVAS_W - WALL_THICKNESS,
      y: CANVAS_H - 250,
      w: WALL_THICKNESS,
      h: 90,
    },
  },
  {
    id: "atticWindow",
    label: "Attic Skylight",
    kind: "window",
    facing: "up",
    activeFromNight: 3,
    zone: { x: CANVAS_W / 2 - 160, y: 0, w: 80, h: WALL_THICKNESS },
  },
  {
    id: "cellarHatch",
    label: "Cellar Hatch",
    kind: "window",
    facing: "down",
    activeFromNight: 5,
    zone: { x: 120, y: CANVAS_H - WALL_THICKNESS, w: 80, h: WALL_THICKNESS },
  },
  {
    id: "sideWindow",
    label: "side Window",
    kind: "window",
    facing: "right",
    activeFromNight: 7,
    zone: { x: CANVAS_W - WALL_THICKNESS, y: 80, w: WALL_THICKNESS, h: 80 },
  },
];

export interface MaterialPileDef {
  id: string;
  pos: Vec2;
  boards: number;
}

export const MATERIAL_PILE_DEFS: MaterialPileDef[] = [
  { id: "pile-living", pos: { x: 170, y: 320 }, boards: 3 },
  { id: "pile-hall", pos: { x: 480, y: 160 }, boards: 3 },
  { id: "pile-kitchen", pos: { x: 740, y: 420 }, boards: 3 },
  { id: "pile-stairs", pos: { x: 560, y: 460 }, boards: 2 },
];

export const PLAYER_START: Vec2 = { x: CANVAS_W / 2, y: CANVAS_H / 2 };
