"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  CONTACT_RADIUS,
  speedMultiplierFor,
  useGameStore,
  weaponStats,
} from "@/game/store";
import {
  CANVAS_H,
  CANVAS_W,
  ENTRY_DEFS,
  PLAYER_RADIUS,
  PLAYER_SPEED,
} from "@/game/layouts";
import { clamp, distToRect, dist } from "@/game/physics";
import { drawEntry } from "./entry-art";
import { drawPlayer } from "./player-art";
import type { MaterialPile, Vec2 } from "@/game/types";
import { drawHollow } from "./hollow-art";
import { playBang, playKnock, playStrain } from "@/game/sound";
import {
  drawSheetTile,
  drawTileGrid,
  findTorches,
  moveWithCollision,
  TILE,
} from "@/game/tilemap";
import { getSprite, isSpriteReady } from "@/game/sprites";

const CHEST_ANIM_MS = 500;
const CHEST_ANIM_FRAMES = [89, 90, 91, 92];

function drawChestPile(ctx: CanvasRenderingContext2D, pile: MaterialPile) {
  let tile = CHEST_ANIM_FRAMES[0];
  if (pile.openedAt !== null) {
    const elapsed = Date.now() - pile.openedAt;
    const idx = Math.min(
      CHEST_ANIM_FRAMES.length - 1,
      Math.floor((elapsed / CHEST_ANIM_MS) * CHEST_ANIM_FRAMES.length),
    );
    tile = CHEST_ANIM_FRAMES[idx];
  }
  drawSheetTile(ctx, tile, pile.pos.x, pile.pos.y, 0, TILE);
}

const TORCH_POSITIONS: Vec2[] = findTorches();

function drawTorch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  seed: number,
) {
  const sprite = getSprite("/sprites/torch.png");
  if (!isSpriteReady(sprite)) return;
  const flicker =
    0.85 + Math.sin(t * 9 + seed) * 0.1 + Math.sin(t * 23 + seed) * 0.05;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = flicker;
  ctx.drawImage(sprite, x - 9, y - 9, 18, 18);
  ctx.restore();
}

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

const RENDER_SCALE = 1.6;

export default function RoomCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysDown = useRef<Set<string>>(new Set());
  const posRef = useRef<Vec2>({ ...useGameStore.getState().player.pos });
  const movingRef = useRef(false);
  const shakeRef = useRef(0);
  const swingCooldownRef = useRef(0);
  const swingAnimRef = useRef(0);
  const attackTypeRef = useRef(0);
  const intruderFxRef = useRef<
    Map<string, { flinch: number; knockback: number; lastHp: number }>
  >(new Map());

  useEffect(() => {
    let prevPhase = useGameStore.getState().phase;
    const unsub = useGameStore.subscribe((state) => {
      if (
        state.phase === "day" &&
        (prevPhase === "title" || prevPhase === "gameover")
      ) {
        posRef.current = { ...state.player.pos };
      }
      prevPhase = state.phase;
    });
    return unsub;
  }, []);

  useEffect(() => {
    let prevLen = useGameStore.getState().log.length;
    const unsub = useGameStore.subscribe((state) => {
      if (state.log.length <= prevLen) {
        prevLen = state.log.length;
        return;
      }
      for (const line of state.log.slice(prevLen)) {
        if (line.startsWith("It broke through")) {
          playBang();
          shakeRef.current = 1;
        } else if (line.startsWith("It's breaking through")) {
          playStrain();
          shakeRef.current = Math.max(shakeRef.current, 0.4);
        } else if (line.startsWith("You see something at")) {
          playKnock();
        }
      }
      prevLen = state.log.length;
    });
    return unsub;
  }, []);

  const findNearby = useCallback(() => {
    const s = useGameStore.getState();
    if (s.phase === "combat") return null;
    let best: { kind: "pile" | "entry"; id: string; d: number } | null = null;

    for (const pile of s.piles) {
      if (pile.boards <= 0) continue;
      const d = dist(posRef.current, pile.pos);
      if (d <= INTERACT_RANGE && (!best || d < best.d)) {
        best = { kind: "pile", id: pile.id, d };
      }
    }

    for (const def of ENTRY_DEFS) {
      if (s.night < def.activeFromNight) continue;
      const entry = s.entries[def.id];
      if (entry.underAttack && entry.warmup <= 0) continue;
      if (!entry.breached && entry.barricadeLevel >= 3) continue;
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return;
      const s = useGameStore.getState();
      if (s.phase !== "day" && s.phase !== "night") return;
      e.preventDefault();
      swingAnimRef.current = 1;
      attackTypeRef.current += 1;
      if (swingCooldownRef.current > 0) return;
      s.swingWeapon();
      swingCooldownRef.current = weaponStats(s.player.weaponLevel).cooldown;
    }
    canvas.addEventListener("mousedown", onMouseDown);
    return () => canvas.removeEventListener("mousedown", onMouseDown);
  }, []);

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

      if (s.phase === "day" || s.phase === "night") {
        let dx = 0;
        let dy = 0;
        if (keysDown.current.has("w") || keysDown.current.has("arrowup"))
          dy -= 1;
        if (keysDown.current.has("s") || keysDown.current.has("arrowdown"))
          dy += 1;
        if (keysDown.current.has("a") || keysDown.current.has("arrowleft"))
          dx -= 1;
        if (keysDown.current.has("d") || keysDown.current.has("arrowright"))
          dx += 1;

        movingRef.current = dx !== 0 || dy !== 0;
        if (movingRef.current) {
          const len = Math.hypot(dx, dy) || 1;
          const speed = PLAYER_SPEED * speedMultiplierFor(s.player.speedLevel);
          posRef.current = moveWithCollision(
            posRef.current.x,
            posRef.current.y,
            (dx / len) * speed * dt,
            (dy / len) * speed * dt,
            PLAYER_RADIUS,
          );
          s.setPlayerPos(posRef.current);
        }
      }

      if (s.phase === "day") s.tickDay(dt);
      if (s.phase === "night") s.tickNight(dt);
      if (s.phase === "combat") s.tickCombat(dt);
      if (s.phase === "dawn") s.tickDawn(dt);
      if (s.phase === "day" || s.phase === "night") s.tickIntruders(dt);
      swingCooldownRef.current = Math.max(0, swingCooldownRef.current - dt);
    }, 1000 / 60);

    let raf = 0;
    function paint(now: number) {
      if (useGameStore.getState().phase !== "dawn") {
        draw(ctx, canvas, now / 1000);
      }
      raf = requestAnimationFrame(paint);
    }

    function draw(
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
      t: number,
    ) {
      const s = useGameStore.getState();
      const isNight = s.phase === "night" || s.phase === "combat";

      ctx.save();
      ctx.scale(RENDER_SCALE, RENDER_SCALE);
      if (shakeRef.current > 0.01) {
        const mag = shakeRef.current * 10;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
        shakeRef.current *= 0.88;
      } else {
        shakeRef.current = 0;
      }

      ctx.fillStyle = "#0e0c11";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawTileGrid(ctx);
      ctx.fillStyle = isNight ? "rgba(5,4,8,0.45)" : "rgba(5,4,8,0.2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      TORCH_POSITIONS.forEach((pos, i) =>
        drawTorch(ctx, pos.x, pos.y, t, i * 1.7),
      );

      for (const pile of s.piles) {
        if (pile.isChest) {
          drawChestPile(ctx, pile);
        } else if (pile.boards > 0) {
          drawPileArt(ctx, pile.pos.x, pile.pos.y, pile.boards);
        }
      }

      for (const def of ENTRY_DEFS) {
        if (s.night < def.activeFromNight) continue;
        const hasLiveIntruder = s.intruders.some((i) => i.entryId === def.id);
        drawEntry(ctx, def, s.entries[def.id], t, isNight, hasLiveIntruder);
      }

      const seenIds = new Set<string>();
      for (const intr of s.intruders) {
        seenIds.add(intr.id);
        let fx = intruderFxRef.current.get(intr.id);
        if (!fx) {
          fx = { flinch: 0, knockback: 0, lastHp: intr.hp };
          intruderFxRef.current.set(intr.id, fx);
        }
        if (intr.hp < fx.lastHp) {
          fx.flinch = 1;
          fx.knockback = 1;
        }
        fx.lastHp = intr.hp;
        fx.flinch = Math.max(0, fx.flinch - 0.05);
        fx.knockback = Math.max(0, fx.knockback - 0.06);

        const scale = (intr.isBoss ? 0.5 : 0.34) * (1 + fx.flinch * 0.06);
        const attacking =
          dist(intr.pos, posRef.current) < CONTACT_RADIUS ? 1 : 0;
        drawHollow(ctx, {
          cx: intr.pos.x,
          cy: intr.pos.y,
          scale,
          t,
          damage: 1 - intr.hp / intr.maxHp,
          flinch: fx.flinch,
          knockback: fx.knockback,
          attacking,
          isBoss: intr.isBoss,
        });

        if (intr.hp < intr.maxHp || intr.isBoss) {
          const barW = intr.isBoss ? 60 : 42;
          const barX = intr.pos.x - barW / 2;
          const barY = intr.pos.y - (intr.isBoss ? 68 : 54);
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(barX - 1, barY - 1, barW + 2, 7);
          ctx.fillStyle = intr.isBoss ? "#d99a3a" : "#c1443a";
          ctx.fillRect(barX, barY, barW * Math.max(0, intr.hp / intr.maxHp), 5);
        }
      }

      for (const id of intruderFxRef.current.keys()) {
        if (!seenIds.has(id)) intruderFxRef.current.delete(id);
      }

      swingAnimRef.current = Math.max(0, swingAnimRef.current - 0.14);
      drawPlayer(
        ctx,
        posRef.current.x,
        posRef.current.y,
        t,
        movingRef.current,
        s.player.weaponLevel,
        swingAnimRef.current,
        attackTypeRef.current,
      );

      if (s.intruders.length > 0) {
        ctx.save();
        const pulse = 0.12 + Math.sin(t * 3) * 0.06;
        const vignette = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.25,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.62,
        );
        vignette.addColorStop(0, "rgba(193,68,58,0)");
        vignette.addColorStop(1, `rgba(193,68,58,${pulse})`);
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      const nearby = findNearby();
      if (nearby) {
        ctx.save();
        ctx.font = "600 13px var(--font-body), monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#d4a03a";
        const label =
          nearby.kind === "pile"
            ? "[E] Salvage boards"
            : `[E] Board up — ${labelFor(nearby.id)}`;
        ctx.fillText(label, posRef.current.x, posRef.current.y - 34);
        ctx.restore();
      }

      ctx.restore();
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
      width={CANVAS_W * RENDER_SCALE}
      height={CANVAS_H * RENDER_SCALE}
      className="h-auto w-full max-w-full rounded-sm border border-line"
    />
  );
}

function labelFor(entryId: string) {
  return ENTRY_DEFS.find((d) => d.id === entryId)?.label ?? entryId;
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
