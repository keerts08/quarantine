import { GRID, GRID_COLS, GRID_ROWS, type MapCell } from "./map-data";
import { SOLID_BOXES } from "./collision-data";
import { getTintedSprite } from "./sprites";

export const TILE = 32;
const SHEET_COLS = 12;
const SRC_TILE = 16;
const SHEET_SRC = "/sprites/tilemap.png";

const NEEDS_FLOOR_BACKFILL = new Set<number>([
  54, 55, 56, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 76,
  77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95,
  96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111,
  112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126,
  127, 128, 129, 130, 131,
]);

function floorBackfillFor(row: number, col: number): MapCell {
  const neighbors = [
    cellAt(row, col + 1),
    cellAt(row + 1, col),
    cellAt(row, col - 1),
    cellAt(row - 1, col),
  ].filter((c): c is MapCell => !!c && !NEEDS_FLOOR_BACKFILL.has(c.t));
  if (neighbors.length === 0) return { t: 48, rot: 0 };

  const tally = new Map<number, number>();
  const exampleFor = new Map<number, MapCell>();
  for (const c of neighbors) {
    tally.set(c.t, (tally.get(c.t) ?? 0) + 1);
    if (!exampleFor.has(c.t)) exampleFor.set(c.t, c);
  }
  let best = neighbors[0].t;
  let bestCount = 0;
  for (const [t, n] of tally) {
    if (n > bestCount) {
      bestCount = n;
      best = t;
    }
  }
  return exampleFor.get(best)!;
}

function cellAt(row: number, col: number): MapCell | null {
  if (row < 0 || col < 0 || row >= GRID_ROWS || col >= GRID_COLS) return null;
  return GRID[row][col];
}

export function isSolidAt(px: number, py: number): boolean {
  if (px < 0 || py < 0 || px > GRID_COLS * TILE || py > GRID_ROWS * TILE)
    return true;
  for (const b of SOLID_BOXES) {
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h)
      return true;
  }
  return false;
}

function circleHitsSolid(cx: number, cy: number, radius: number): boolean {
  return (
    isSolidAt(cx - radius, cy) ||
    isSolidAt(cx + radius, cy) ||
    isSolidAt(cx, cy - radius) ||
    isSolidAt(cx, cy + radius)
  );
}

export function moveWithCollision(
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius: number,
) {
  let nx = x;
  let ny = y;
  if (dx !== 0) {
    const candidate = x + dx;
    if (!circleHitsSolid(candidate, y, radius)) nx = candidate;
  }
  if (dy !== 0) {
    const candidate = y + dy;
    if (!circleHitsSolid(nx, candidate, radius)) ny = candidate;
  }
  return { x: nx, y: ny };
}

function srcRectFor(t: number) {
  const sc = t % SHEET_COLS;
  const sr = Math.floor(t / SHEET_COLS);
  return { sx: sc * SRC_TILE, sy: sr * SRC_TILE };
}

export function drawSheetTile(
  ctx: CanvasRenderingContext2D,
  t: number,
  cx: number,
  cy: number,
  rot: 0 | 90 | 180 | 270,
  size: number = TILE,
  shakeX = 0,
  shakeY = 0,
) {
  const sheet = getTintedSprite(SHEET_SRC);
  if (!sheet) return;
  const { sx, sy } = srcRectFor(t);
  if (rot === 0 && shakeX === 0 && shakeY === 0) {
    ctx.drawImage(
      sheet,
      sx,
      sy,
      SRC_TILE,
      SRC_TILE,
      cx - size / 2,
      cy - size / 2,
      size,
      size,
    );
    return;
  }
  ctx.save();
  ctx.translate(cx + shakeX, cy + shakeY);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(
    sheet,
    sx,
    sy,
    SRC_TILE,
    SRC_TILE,
    -size / 2,
    -size / 2,
    size,
    size,
  );
  ctx.restore();
}

export function drawTileGrid(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const cell = GRID[row][col];
      if (!cell) continue;
      const cx = col * TILE + TILE / 2;
      const cy = row * TILE + TILE / 2;
      if (NEEDS_FLOOR_BACKFILL.has(cell.t)) {
        const floor = floorBackfillFor(row, col);
        drawSheetTile(ctx, floor.t, cx, cy, floor.rot);
      }
      drawSheetTile(ctx, cell.t, cx, cy, cell.rot);
    }
  }
  ctx.restore();
}

export function findTorches(): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (GRID[row][col]?.t === 29) {
        out.push({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 });
      }
    }
  }
  return out;
}

export const LEVEL_DOOR_TILES: readonly [number, number][] = [
  [10, 11],
  [22, 23],
  [34, 35],
  [46, 47],
];

export interface GateCell {
  facing: "up" | "down" | "left" | "right";
  rot: 0 | 90 | 180 | 270;
  aX: number;
  aY: number;
  bX: number;
  bY: number;
}

function centerOf(row: number, col: number) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

export function findGates(): GateCell[] {
  const seen = new Set<string>();
  const gates: GateCell[] = [];

  function makeGate(
    r46: number,
    c46: number,
    r47: number,
    c47: number,
    facing: GateCell["facing"],
  ): GateCell {
    const a = centerOf(r46, c46);
    const b = centerOf(r47, c47);
    return {
      facing,
      rot: GRID[r46][c46]!.rot,
      aX: a.x,
      aY: a.y,
      bX: b.x,
      bY: b.y,
    };
  }

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const cell = GRID[row][col];
      if (!cell || (cell.t !== 46 && cell.t !== 47)) continue;
      const key = `${row},${col}`;
      if (seen.has(key)) continue;

      const right = cellAt(row, col + 1);
      if (right && (right.t === 46 || right.t === 47) && right.t !== cell.t) {
        seen.add(key);
        seen.add(`${row},${col + 1}`);
        const facing = row === 0 ? "up" : "down";
        gates.push(
          cell.t === 46
            ? makeGate(row, col, row, col + 1, facing)
            : makeGate(row, col + 1, row, col, facing),
        );
        continue;
      }
      const below = cellAt(row + 1, col);
      if (below && (below.t === 46 || below.t === 47) && below.t !== cell.t) {
        seen.add(key);
        seen.add(`${row + 1},${col}`);
        const facing = col === 0 ? "left" : "right";
        gates.push(
          cell.t === 46
            ? makeGate(row, col, row + 1, col, facing)
            : makeGate(row + 1, col, row, col, facing),
        );
      }
    }
  }
  return gates;
}

export interface GateTiles {
  rot: 0 | 90 | 180 | 270;
  aX: number;
  aY: number;
  bX: number;
  bY: number;
}

export function drawGateDoor(
  ctx: CanvasRenderingContext2D,
  gate: GateTiles,
  level: 0 | 1 | 2 | 3,
  breached: boolean,
  shakeX = 0,
  shakeY = 0,
) {
  const [aTile, bTile] = breached
    ? LEVEL_DOOR_TILES[0]
    : LEVEL_DOOR_TILES[level];
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  drawSheetTile(ctx, aTile, gate.aX, gate.aY, gate.rot, TILE, shakeX, shakeY);
  drawSheetTile(ctx, bTile, gate.bX, gate.bY, gate.rot, TILE, shakeX, shakeY);

  if (breached) {
    ctx.save();
    ctx.strokeStyle = "rgba(20,10,8,0.85)";
    ctx.lineWidth = 2;
    const midX = (gate.aX + gate.bX) / 2;
    const midY = (gate.aY + gate.bY) / 2;
    const horizontal =
      Math.abs(gate.bX - gate.aX) > Math.abs(gate.bY - gate.aY);
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(midX - 6, midY - TILE / 2);
      ctx.lineTo(midX + 4, midY - 2);
      ctx.lineTo(midX - 3, midY + 4);
      ctx.lineTo(midX + 6, midY + TILE / 2);
    } else {
      ctx.moveTo(midX - TILE / 2, midY - 6);
      ctx.lineTo(midX - 2, midY + 4);
      ctx.lineTo(midX + 4, midY - 3);
      ctx.lineTo(midX + TILE / 2, midY + 6);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(10,6,5,0.7)";
    ctx.beginPath();
    ctx.ellipse(midX, midY, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
