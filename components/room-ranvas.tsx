"use client";

import { useCallback, useEffect, useRef } from "react";
import { useGameStore } from "@/game/store";
import {
  CANVAS_H,
  CANVAS_W,
  ENTRY_DEFS,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  ROOM,
  WALL_THICKNESS,
} from "@/game/layouts";
import { clamp, distToRect, dist } from "@/game/physics";
import { drawEntry } from "./entry-art";
import { drawPlayer } from "./player-art";
import type { Vec2 } from "@/game/types";

const INTERACT_RANGE = 46;
const MOVE_KEYS = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
]);

export default function RoomCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysDown = useRef<Set<string>>(new Set());
  const posRef = useRef<Vec2>({ ...useGameStore.getState().player.pos });
  const movingRef = useRef(false);

  const findNearby = useCallback(() => {
    const s = useGameStore.getState();
    let best: { kind: "pile" | "entry"; id: string; d: number } | null = null;

    for (const pile of s.piles) {
      if (pile.boards <= 0) continue;
      const d = dist(posRef.current, pile.pos);
      if (d <= INTERACT_RANGE && (!best || d < best.d))
        best = { kind: "pile", id: pile.id, d };
    }
    for (const def of ENTRY_DEFS) {
      if (s.entries[def.id].barricadeLevel >= 3) continue;
      const d = distToRect(posRef.current, def.zone);
      if (d <= INTERACT_RANGE && (!best || d < best.d))
        best = { kind: "entry", id: def.id, d };
    }
    return best;
  }, []);

  const tryInteract = useCallback(() => {
    const nearby = findNearby();
    if (!nearby) return;
    const s = useGameStore.getState();
    if (nearby.kind === "pile") s.collectPile(nearby.id);
    else s.upgradeBarricade(nearby.id as (typeof ENTRY_DEFS)[number]["id"]);
  }, [findNearby]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (MOVE_KEYS.has(k)) keysDown.current.add(k);
      if (k === "e") tryInteract();
    }
    function onKeyUp(e: KeyboardEvent) {
      keysDown.current.delete(e.key.toLowerCase());
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [tryInteract]);

  useEffect(() => {
    const maybeCanvas = canvasRef.current;
    if (!maybeCanvas) return;
    const canvas: HTMLCanvasElement = maybeCanvas;
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    let last = performance.now();
    const tickInterval = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = useGameStore.getState();
      if (s.phase !== "day") return;

      let dx = 0;
      let dy = 0;
      if (keysDown.current.has("w") || keysDown.current.has("arrowup")) dy -= 1;
      if (keysDown.current.has("s") || keysDown.current.has("arrowdown"))
        dy += 1;
      if (keysDown.current.has("a") || keysDown.current.has("arrowleft"))
        dx -= 1;
      if (keysDown.current.has("d") || keysDown.current.has("arrowright"))
        dx += 1;

      movingRef.current = dx !== 0 || dy !== 0;
      if (movingRef.current) {
        const len = Math.hypot(dx, dy) || 1;
        posRef.current = {
          x: clamp(
            posRef.current.x + (dx / len) * PLAYER_SPEED * dt,
            ROOM.x + PLAYER_RADIUS,
            ROOM.x + ROOM.w - PLAYER_RADIUS,
          ),
          y: clamp(
            posRef.current.y + (dy / len) * PLAYER_SPEED * dt,
            ROOM.y + PLAYER_RADIUS,
            ROOM.y + ROOM.h - PLAYER_RADIUS,
          ),
        };
        s.setPlayerPos(posRef.current);
      }
    }, 1000 / 60);

    let raf = 0;
    function paint(now: number) {
      draw(ctx, canvas, now / 1000);
      raf = requestAnimationFrame(paint);
    }

    function draw(
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
      t: number,
    ) {
      const s = useGameStore.getState();

      ctx.fillStyle = "#1c2317";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const floorGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      floorGrad.addColorStop(0, "#2c3423");
      floorGrad.addColorStop(1, "#242b1c");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);

      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1;
      for (let x = ROOM.x; x < ROOM.x + ROOM.w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, ROOM.y);
        ctx.lineTo(x, ROOM.y + ROOM.h);
        ctx.stroke();
      }

      ctx.strokeStyle = "#3a4230";
      ctx.lineWidth = WALL_THICKNESS;
      ctx.strokeRect(
        WALL_THICKNESS / 2,
        WALL_THICKNESS / 2,
        CANVAS_W - WALL_THICKNESS,
        CANVAS_H - WALL_THICKNESS,
      );

      for (const pile of s.piles) {
        if (pile.boards <= 0) continue;
        drawPileArt(ctx, pile.pos.x, pile.pos.y, pile.boards);
      }
      for (const def of ENTRY_DEFS) drawEntry(ctx, def, s.entries[def.id], t);

      drawPlayer(ctx, posRef.current.x, posRef.current.y, t, movingRef.current);

      const nearby = findNearby();
      if (nearby) {
        ctx.save();
        ctx.font = "600 13px var(--font-body), monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#c7d94a";
        const label =
          nearby.kind === "pile" ? "[E] Salvage boards" : "[E] Board up";
        ctx.fillText(label, posRef.current.x, posRef.current.y - 34);
        ctx.restore();
      }
    }

    raf = requestAnimationFrame(paint);
    return () => {
      window.clearInterval(tickInterval);
      cancelAnimationFrame(raf);
    };
  }, [findNearby]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="h-auto w-full max-w-full rounded-sm border border-line"
    />
  );
}

function drawPileArt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  boards: number,
) {
  ctx.save();
  ctx.translate(x, y);
  const count = Math.min(4, boards);
  for (let i = 0; i < count; i++) {
    ctx.save();
    ctx.rotate((i - count / 2) * 0.18);
    ctx.fillStyle = "#4a3624";
    ctx.fillRect(-16, -3 - i * 4, 32, 6);
    ctx.fillStyle = "rgba(255,235,200,0.1)";
    ctx.fillRect(-16, -3 - i * 4, 32, 1.5);
    ctx.restore();
  }
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 10, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
