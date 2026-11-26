import { FLOOR_PORTALS, WORLD, floorOfY } from "../data/map";
import { blockedAt } from "./collision";

export const CELL = 20;
const COLS = Math.ceil(WORLD.w / CELL);
const ROWS = Math.ceil(WORLD.h / CELL);
const NPC_RADIUS = 11;

export interface NavPoint {
  x: number;
  y: number;
  portalJump?: boolean;
}

let grid: Uint8Array | null = null;

export function resetNavGrid() {
  grid = null;
}

function buildGrid(): Uint8Array {
  const g = new Uint8Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * CELL + CELL / 2;
      const y = r * CELL + CELL / 2;
      g[r * COLS + c] = blockedAt(x, y, NPC_RADIUS) ? 1 : 0;
    }
  }
  return g;
}

function getGrid(): Uint8Array {
  if (!grid) grid = buildGrid();
  return grid;
}

export function isWalkableCell(c: number, r: number): boolean {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
  return getGrid()[r * COLS + c] === 0;
}

function toCell(x: number, y: number): [number, number] {
  return [Math.floor(x / CELL), Math.floor(y / CELL)];
}

/** Nearest walkable cell to a point on the same floor (spiral search). */
export function nearestFree(x: number, y: number): [number, number] {
  const [c0, r0] = toCell(x, y);
  const floor = floorOfY(y);
  const cellOnFloor = (c: number, r: number) =>
    isWalkableCell(c, r) && floorOfY(r * CELL + CELL / 2) === floor;
  if (cellOnFloor(c0, r0)) return [c0, r0];
  for (let rad = 1; rad < 14; rad++) {
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
        const c = c0 + dc;
        const r = r0 + dr;
        if (!cellOnFloor(c, r)) continue;
        const d = dc * dc + dr * dr;
        if (d < bestD) {
          bestD = d;
          best = [c, r];
        }
      }
    }
    if (best) return best;
  }
  return [c0, r0];
}

/** Snap a target point to somewhere walkable on the same floor, keeping the original if free. */
export function walkableTarget(x: number, y: number): { x: number; y: number } {
  if (!blockedAt(x, y, NPC_RADIUS)) return { x, y };
  const [c, r] = nearestFree(x, y);
  return { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 };
}

/** Check unobstructed line of sight along segment (same floor) using circle collision checks. */
export function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius = NPC_RADIUS,
): boolean {
  if (floorOfY(y1) !== floorOfY(y2)) return false;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  if (dist < 1) return true;
  const steps = Math.max(2, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    if (blockedAt(px, py, radius)) return false;
  }
  return true;
}

function roundAndVaryPath(rawPts: NavPoint[], pathSeed: number): NavPoint[] {
  if (rawPts.length < 2) return rawPts;

  // 1. Line-of-sight string-pulling to eliminate rigid grid staircases
  const pulled: NavPoint[] = [rawPts[0]!];
  let anchorIdx = 0;
  while (anchorIdx < rawPts.length - 1) {
    let furthest = anchorIdx + 1;
    const a = rawPts[anchorIdx]!;
    for (let j = rawPts.length - 1; j > anchorIdx + 1; j--) {
      const b = rawPts[j]!;
      if (hasLineOfSight(a.x, a.y, b.x, b.y, NPC_RADIUS)) {
        furthest = j;
        break;
      }
    }
    pulled.push(rawPts[furthest]!);
    anchorIdx = furthest;
  }

  // 2. Subtle natural lateral curve on long open segments so NPCs don't march on rails
  const curved: NavPoint[] = [pulled[0]!];
  for (let i = 0; i < pulled.length - 1; i++) {
    const a = pulled[i]!;
    const b = pulled[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len > 135 && pathSeed !== 0) {
      const sign = ((pathSeed + i) & 1) === 0 ? 1 : -1;
      const offset = (12 + ((pathSeed * 7 + i * 11) % 14)) * sign;
      const mx = (a.x + b.x) * 0.5 - (dy / len) * offset;
      const my = (a.y + b.y) * 0.5 + (dx / len) * offset;
      if (
        !blockedAt(mx, my, NPC_RADIUS) &&
        hasLineOfSight(a.x, a.y, mx, my, NPC_RADIUS) &&
        hasLineOfSight(mx, my, b.x, b.y, NPC_RADIUS)
      ) {
        curved.push({ x: mx, y: my });
      }
    }
    curved.push(b);
  }

  // 3. Smooth quadratic corner arcs around furniture/doorways instead of sharp 90/180 pivots
  if (curved.length <= 2) return curved.slice(1);
  const smoothed: NavPoint[] = [];
  for (let i = 1; i < curved.length - 1; i++) {
    const prev = curved[i - 1]!;
    const cur = curved[i]!;
    const next = curved[i + 1]!;
    const d1x = cur.x - prev.x;
    const d1y = cur.y - prev.y;
    const d2x = next.x - cur.x;
    const d2y = next.y - cur.y;
    const l1 = Math.hypot(d1x, d1y);
    const l2 = Math.hypot(d2x, d2y);
    if (l1 < 18 || l2 < 18) {
      smoothed.push(cur);
      continue;
    }
    const dot = (d1x * d2x + d1y * d2y) / (l1 * l2);
    if (dot > 0.94) {
      smoothed.push(cur);
      continue;
    }
    const r = Math.min(20, l1 * 0.34, l2 * 0.34);
    const p0x = cur.x - (d1x / l1) * r;
    const p0y = cur.y - (d1y / l1) * r;
    const p2x = cur.x + (d2x / l2) * r;
    const p2y = cur.y + (d2y / l2) * r;
    const midX = 0.25 * p0x + 0.5 * cur.x + 0.25 * p2x;
    const midY = 0.25 * p0y + 0.5 * cur.y + 0.25 * p2y;
    if (
      !blockedAt(p0x, p0y, NPC_RADIUS) &&
      !blockedAt(midX, midY, NPC_RADIUS) &&
      !blockedAt(p2x, p2y, NPC_RADIUS)
    ) {
      smoothed.push({ x: p0x, y: p0y }, { x: midX, y: midY }, { x: p2x, y: p2y });
    } else {
      smoothed.push(cur);
    }
  }
  smoothed.push(curved[curved.length - 1]!);
  return smoothed;
}

/** Single-floor binary-heap A* over the grid with 8-way movement + smooth natural pathing. */
function findSingleFloorPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  pathSeed = 0,
): NavPoint[] {
  if (hasLineOfSight(sx, sy, tx, ty, NPC_RADIUS)) {
    return roundAndVaryPath(
      [
        { x: sx, y: sy },
        { x: tx, y: ty },
      ],
      pathSeed,
    );
  }

  const g = getGrid();
  const [sc, sr] = nearestFree(sx, sy);
  const [tc, tr] = nearestFree(tx, ty);
  const start = sr * COLS + sc;
  const goal = tr * COLS + tc;
  if (start === goal) return [{ x: tx, y: ty }];

  const N = COLS * ROWS;
  const gScore = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const heap: number[] = [];
  const f = new Float32Array(N).fill(Infinity);

  const h = (i: number) => {
    const c = i % COLS;
    const r = (i / COLS) | 0;
    const dx = Math.abs(c - tc);
    const dy = Math.abs(r - tr);
    return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
  };
  const push = (i: number) => {
    heap.push(i);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (f[heap[p]!]! <= f[heap[k]!]!) break;
      [heap[p], heap[k]] = [heap[k]!, heap[p]!];
      k = p;
    }
  };
  const pop = (): number => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = k * 2 + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && f[heap[l]!]! < f[heap[m]!]!) m = l;
        if (r < heap.length && f[heap[r]!]! < f[heap[m]!]!) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k]!, heap[m]!];
        k = m;
      }
    }
    return top;
  };

  gScore[start] = 0;
  f[start] = h(start);
  push(start);
  let found = false;
  while (heap.length) {
    const cur = pop();
    if (cur === goal) {
      found = true;
      break;
    }
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cc = cur % COLS;
    const cr = (cur / COLS) | 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = cc + dc;
        const nr = cr + dr;
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
        const ni = nr * COLS + nc;
        if (g[ni] || closed[ni]) continue;
        if (dr && dc && (g[cr * COLS + nc] || g[nr * COLS + cc])) continue;
        // Prefer center of aisles over scraping furniture edges + subtle per-NPC lane bias
        const wallNear =
          (nc > 0 && g[nr * COLS + nc - 1]) ||
          (nc + 1 < COLS && g[nr * COLS + nc + 1]) ||
          (nr > 0 && g[(nr - 1) * COLS + nc]) ||
          (nr + 1 < ROWS && g[(nr + 1) * COLS + nc]);
        const laneBias = pathSeed
          ? (((nc * 73 + nr * 139 + Math.abs(pathSeed) * 37) % 13) / 13) * 0.24
          : 0;
        const stepBase = dr && dc ? 1.414 : 1;
        const cost = gScore[cur]! + stepBase + (wallNear ? 0.28 : 0) + laneBias;
        if (cost < gScore[ni]!) {
          gScore[ni] = cost;
          came[ni] = cur;
          f[ni] = cost + h(ni);
          push(ni);
        }
      }
    }
  }
  if (!found) return [];

  const cells: number[] = [];
  for (let i = goal; i !== -1; i = came[i]!) cells.push(i);
  cells.reverse();
  const center = (i: number): NavPoint => ({
    x: (i % COLS) * CELL + CELL / 2,
    y: ((i / COLS) | 0) * CELL + CELL / 2,
  });
  const rawPts: NavPoint[] = [
    { x: sx, y: sy },
    ...cells.slice(1, -1).map(center),
    { x: tx, y: ty },
  ];
  return roundAndVaryPath(rawPts, pathSeed);
}

/** A* pathfinding across single or multi-floor destinations via vertical stairs/elevator portals. */
export function findPath(sx: number, sy: number, tx: number, ty: number, pathSeed = 0): NavPoint[] {
  const fromFloor = floorOfY(sy);
  const toFloor = floorOfY(ty);
  if (fromFloor === toFloor) return findSingleFloorPath(sx, sy, tx, ty, pathSeed);

  const candidates = FLOOR_PORTALS.filter(
    (p) => p.fromFloor === fromFloor && p.toFloor === toFloor,
  ).sort(
    (a, b) =>
      Math.hypot(a.x - sx, a.y - sy) +
      Math.hypot(tx - a.destX, ty - a.destY) -
      (Math.hypot(b.x - sx, b.y - sy) + Math.hypot(tx - b.destX, ty - b.destY)),
  );

  for (const portal of candidates) {
    const leg1 = findSingleFloorPath(sx, sy, portal.x, portal.y, pathSeed);
    const leg2 = findSingleFloorPath(portal.destX, portal.destY, tx, ty, pathSeed);
    if (leg1.length > 0 && leg2.length > 0) {
      return [...leg1, { x: portal.destX, y: portal.destY, portalJump: true }, ...leg2];
    }
  }
  return [];
}
