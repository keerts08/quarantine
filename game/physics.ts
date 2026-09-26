import type { RectZone, Vec2 } from "./types";

export function dist(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export function distToRect(p: Vec2, r: RectZone) {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

export function rectCenter(r: RectZone): Vec2 {
    return { x: r.x + r.w / 2, y: r.y + r.h / 2};
}