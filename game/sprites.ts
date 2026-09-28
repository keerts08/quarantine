"use client";

const cache = new Map<string, HTMLImageElement>();

export function getSprite(src: string): HTMLImageElement {
  let img = cache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    cache.set(src, img);
  }
  return img;
}

export function isSpriteReady(img: HTMLImageElement) {
  return img.complete && img.naturalWidth > 0;
}

const tintedCache = new Map<string, HTMLCanvasElement>();

export function getTintedSprite(src: string): HTMLCanvasElement | null {
  const sprite = getSprite(src);
  if (!isSpriteReady(sprite)) return null;
  const cached = tintedCache.get(src);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = sprite.naturalWidth;
  canvas.height = sprite.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.filter = "grayscale(0.35) brightness(0.75) saturate(0.9)";
  ctx.drawImage(sprite, 0, 0);
  tintedCache.set(src, canvas);
  return canvas;
}

export const PLAYER_SPRITE = "/sprites/player.png";

export function swordSpriteFor(weaponLevel: number) {
  const tier = Math.min(4, Math.max(0, weaponLevel));
  return `/sprites/sword-${tier}.png`;
}
