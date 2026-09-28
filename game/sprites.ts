"use client"

const cache = new Map<string, HTMLImageElement>();

export function getSprite(src: string): HTMLImageElement {
    let img = cache.get(src)
    if (!img) {
        img = new Image();
        img.src = src;
        cache.set(src, img)
    }
    return
}

export function isSpirteReady(img: HTMLImageElement) {
    return img.complete && img.naturalHeight > 0;
}