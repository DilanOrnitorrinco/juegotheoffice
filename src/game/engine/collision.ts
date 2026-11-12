import { FURNITURE, WALLS, WORLD } from "../data/map";
import type { Rect } from "../types";

export const SOLIDS: Rect[] = [
  ...WALLS,
  ...FURNITURE.filter((f) => f.collide !== false),
];

export function circleHitsRect(x: number, y: number, r: number, b: Rect): boolean {
  const cx = Math.max(b.x, Math.min(x, b.x + b.w));
  const cy = Math.max(b.y, Math.min(y, b.y + b.h));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < r * r;
}

export function blockedAt(x: number, y: number, r: number): boolean {
  if (x - r < 0 || y - r < 0 || x + r > WORLD.w || y + r > WORLD.h) return true;
  for (const s of SOLIDS) if (circleHitsRect(x, y, r, s)) return true;
  return false;
}
