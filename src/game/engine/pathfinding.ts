import { WORLD } from "../data/map";
import { blockedAt } from "./collision";

export const CELL = 20;
const COLS = Math.ceil(WORLD.w / CELL);
const ROWS = Math.ceil(WORLD.h / CELL);
const NPC_RADIUS = 11;

let grid: Uint8Array | null = null;

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

/** Nearest walkable cell to a point (spiral search). */
export function nearestFree(x: number, y: number): [number, number] {
  const [c0, r0] = toCell(x, y);
  if (isWalkableCell(c0, r0)) return [c0, r0];
  for (let rad = 1; rad < 12; rad++) {
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
        const c = c0 + dc;
        const r = r0 + dr;
        if (!isWalkableCell(c, r)) continue;
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

/** Snap a target point to somewhere walkable, keeping the original if it's already free. */
export function walkableTarget(x: number, y: number): { x: number; y: number } {
  if (!blockedAt(x, y, NPC_RADIUS)) return { x, y };
  const [c, r] = nearestFree(x, y);
  return { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 };
}

/** Binary-heap A* over the grid with 8-way movement (no corner cutting). */
export function findPath(sx: number, sy: number, tx: number, ty: number): { x: number; y: number }[] {
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
        const cost = gScore[cur]! + (dr && dc ? 1.414 : 1);
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
  const center = (i: number) => ({ x: (i % COLS) * CELL + CELL / 2, y: ((i / COLS) | 0) * CELL + CELL / 2 });
  // Keep only the turning points.
  const pts: { x: number; y: number }[] = [];
  let lastDir = "";
  for (let k = 1; k < cells.length; k++) {
    const a = cells[k - 1]!;
    const b = cells[k]!;
    const dir = `${(b % COLS) - (a % COLS)},${((b / COLS) | 0) - ((a / COLS) | 0)}`;
    if (dir !== lastDir && k > 1) pts.push(center(a));
    lastDir = dir;
  }
  pts.push(center(goal));
  pts.push({ x: tx, y: ty });
  return pts;
}
