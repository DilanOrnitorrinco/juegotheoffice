import type { Rect } from "../types";

export const WORLD = { w: 2000, h: 1400 };
export const WALL_CAP = 14;
export const WALL_FACE = 26;
export const WALL_DEPTH = WALL_CAP + WALL_FACE;

export type WallKind = "solid" | "glass" | "outer";

export interface Wall extends Rect {
  kind: WallKind;
  horizontal: boolean;
}

type Gap = [number, number];

function hWall(x1: number, x2: number, y: number, doors: Gap[] = [], kind: WallKind = "solid"): Wall[] {
  const out: Wall[] = [];
  let cur = x1;
  for (const [a, b] of [...doors].sort((p, q) => p[0] - q[0])) {
    if (a > cur) out.push({ x: cur, y, w: a - cur, h: WALL_DEPTH, kind, horizontal: true });
    cur = b;
  }
  if (cur < x2) out.push({ x: cur, y, w: x2 - cur, h: WALL_DEPTH, kind, horizontal: true });
  return out;
}

function vWall(x: number, y1: number, y2: number, doors: Gap[] = [], kind: WallKind = "solid"): Wall[] {
  const out: Wall[] = [];
  let cur = y1;
  for (const [a, b] of [...doors].sort((p, q) => p[0] - q[0])) {
    if (a > cur) out.push({ x: x - 7, y: cur, w: 14, h: a - cur, kind, horizontal: false });
    cur = b;
  }
  if (cur < y2) out.push({ x: x - 7, y: cur, w: 14, h: y2 - cur, kind, horizontal: false });
  return out;
}

export const WALLS: Wall[] = [
  // Outer shell
  { x: 0, y: 0, w: WORLD.w, h: WALL_DEPTH, kind: "outer", horizontal: true },
  { x: 0, y: 0, w: 24, h: WORLD.h, kind: "outer", horizontal: false },
  { x: WORLD.w - 24, y: 0, w: 24, h: WORLD.h, kind: "outer", horizontal: false },
  { x: 0, y: WORLD.h - 24, w: WORLD.w, h: 24, kind: "outer", horizontal: true },
  // Conference room
  ...vWall(520, WALL_DEPTH, 380),
  ...hWall(24, 527, 380, [[370, 460]]),
  // Michael's office (glass front)
  ...vWall(760, WALL_DEPTH, 360),
  ...vWall(1160, WALL_DEPTH, 360),
  ...hWall(753, 1167, 360, [[905, 985]], "glass"),
  // Break room
  ...vWall(1400, WALL_DEPTH, 380),
  ...hWall(1393, 1976, 380, [[1560, 1650]]),
  // Bottom row
  ...hWall(24, 1976, 860, [
    [380, 470],
    [600, 760],
    [935, 1025],
    [1290, 1420],
  ]),
  ...vWall(600, 860 + WALL_DEPTH, 1376, [[1180, 1260]]),
  ...vWall(760, 860 + WALL_DEPTH, 1376),
  ...vWall(1200, 860 + WALL_DEPTH, 1376, [[1150, 1240]]),
];

export type FloorKind =
  | "carpet"
  | "carpetDark"
  | "carpetBlue"
  | "carpetGreen"
  | "carpetWarm"
  | "wood"
  | "checker"
  | "tile"
  | "concrete";

export interface Room extends Rect {
  id: string;
  name: string;
  floor: FloorKind;
}

export const ROOMS: Room[] = [
  { id: "bullpen", name: "VENTAS", x: 24, y: 380, w: 1952, h: 500, floor: "carpet" },
  { id: "conf", name: "SALA DE REUNIONES", x: 24, y: 40, w: 496, h: 360, floor: "carpetDark" },
  { id: "reception", name: "RECEPCIÓN", x: 520, y: 40, w: 240, h: 360, floor: "wood" },
  { id: "michael", name: "DESPACHO DE MICHAEL", x: 760, y: 40, w: 400, h: 340, floor: "carpetBlue" },
  { id: "hall", name: "PASILLO", x: 1160, y: 40, w: 240, h: 360, floor: "tile" },
  { id: "kitchen", name: "SALA DE DESCANSO", x: 1400, y: 40, w: 576, h: 360, floor: "checker" },
  { id: "accounting", name: "CONTABILIDAD", x: 1448, y: 440, w: 520, h: 400, floor: "carpetGreen" },
  { id: "annex", name: "ANEXO · RRHH", x: 24, y: 880, w: 576, h: 500, floor: "carpetWarm" },
  { id: "stairs", name: "ESCALERAS", x: 600, y: 880, w: 160, h: 500, floor: "tile" },
  { id: "archive", name: "FOTOCOPIAS Y ARCHIVO", x: 760, y: 880, w: 440, h: 500, floor: "tile" },
  { id: "warehouse", name: "ALMACÉN", x: 1200, y: 880, w: 776, h: 500, floor: "concrete" },
];

export type FurnitureType =
  | "desk"
  | "playerDesk"
  | "confTable"
  | "michaelDesk"
  | "receptionDesk"
  | "counter"
  | "fridge"
  | "vending"
  | "roundTable"
  | "couch"
  | "plant"
  | "cabinet"
  | "copier"
  | "printer"
  | "shelf"
  | "rack"
  | "boxes"
  | "cooler"
  | "tvCart"
  | "partition"
  | "forklift"
  | "pingpong"
  | "bookshelf"
  | "baler"
  | "stairs"
  | "partyTable";

export interface Furniture extends Rect {
  type: FurnitureType;
  owner?: string;
  color?: string;
  vertical?: boolean;
  collide?: boolean;
  /** For desks: where the chair/seat goes. */
  seat?: "south" | "north";
}

const D = { w: 96, h: 50 };
function desk(owner: string, cx: number, y: number, type: FurnitureType = "desk"): Furniture {
  return { type, owner, x: cx - D.w / 2, y, w: D.w, h: D.h, seat: "south" };
}

export const FURNITURE: Furniture[] = [
  // Bullpen — row 1
  desk("jim", 430, 470),
  desk("dwight", 570, 470),
  desk("player", 730, 470, "playerDesk"),
  desk("ryan", 900, 470),
  desk("stanley", 1040, 470),
  desk("phyllis", 1180, 470),
  // Bullpen — row 2
  desk("meredith", 430, 650),
  desk("creed", 570, 650),
  desk("devon", 900, 650),
  desk("packer", 1040, 650),
  { type: "plant", x: 700, y: 660, w: 30, h: 30 },
  { type: "plant", x: 1300, y: 800, w: 30, h: 30 },
  { type: "plant", x: 330, y: 800, w: 30, h: 30 },
  // Left corner: party planning committee + cabinets
  { type: "cabinet", x: 40, y: 424, w: 130, h: 40, color: "#8f9aa1" },
  { type: "partyTable", x: 80, y: 600, w: 150, h: 70 },
  { type: "plant", x: 250, y: 430, w: 30, h: 30 },
  // Accounting
  { type: "partition", x: 1440, y: 470, w: 12, h: 280, vertical: true },
  desk("angela", 1570, 470),
  desk("oscar", 1790, 470),
  desk("kevin", 1680, 650),
  { type: "cabinet", x: 1850, y: 650, w: 100, h: 44, color: "#9aa59b" },
  { type: "plant", x: 1930, y: 440, w: 30, h: 30 },
  // Reception
  { type: "receptionDesk", owner: "pam", x: 556, y: 200, w: 132, h: 46, seat: "north" },
  { type: "plant", x: 724, y: 60, w: 30, h: 30 },
  { type: "cabinet", x: 540, y: 52, w: 60, h: 40, color: "#a49a8d" },
  // Michael's office
  { type: "michaelDesk", owner: "michael", x: 900, y: 140, w: 130, h: 56, seat: "north" },
  { type: "bookshelf", x: 1050, y: 46, w: 96, h: 34 },
  { type: "couch", x: 776, y: 180, w: 44, h: 120, vertical: true, color: "#7d5a4a" },
  { type: "plant", x: 1120, y: 310, w: 30, h: 30 },
  // Conference room
  { type: "confTable", x: 110, y: 170, w: 300, h: 90 },
  { type: "tvCart", x: 450, y: 70, w: 44, h: 40 },
  { type: "plant", x: 40, y: 330, w: 30, h: 30 },
  // Hall
  { type: "cooler", x: 1260, y: 52, w: 32, h: 32 },
  { type: "plant", x: 1180, y: 60, w: 30, h: 30 },
  // Break room
  { type: "counter", x: 1416, y: 46, w: 300, h: 44 },
  { type: "vending", x: 1740, y: 46, w: 56, h: 56, color: "#b5373c" },
  { type: "vending", x: 1806, y: 46, w: 56, h: 56, color: "#2f5d8a" },
  { type: "fridge", x: 1890, y: 46, w: 62, h: 60 },
  { type: "roundTable", x: 1530, y: 220, w: 70, h: 70 },
  { type: "roundTable", x: 1720, y: 220, w: 70, h: 70 },
  { type: "couch", x: 1916, y: 170, w: 44, h: 150, vertical: true, color: "#56708a" },
  // Annex
  desk("kelly", 150, 980),
  desk("toby", 430, 980),
  { type: "cabinet", x: 500, y: 904, w: 80, h: 40, color: "#8f9aa1" },
  { type: "couch", x: 60, y: 1250, w: 150, h: 44, color: "#a2715a" },
  { type: "plant", x: 540, y: 1320, w: 30, h: 30 },
  // Stairs
  { type: "stairs", x: 612, y: 1270, w: 136, h: 104 },
  // Archive
  { type: "copier", x: 790, y: 908, w: 90, h: 60 },
  { type: "printer", x: 900, y: 912, w: 60, h: 46 },
  { type: "cabinet", x: 1076, y: 904, w: 110, h: 44, color: "#3f6fa8" },
  { type: "shelf", x: 790, y: 1200, w: 160, h: 40 },
  { type: "shelf", x: 1010, y: 1300, w: 170, h: 40 },
  { type: "partyTable", x: 900, y: 1060, w: 140, h: 60 },
  // Warehouse
  desk("darryl", 1290, 920),
  { type: "rack", x: 1430, y: 960, w: 40, h: 250, vertical: true },
  { type: "rack", x: 1550, y: 960, w: 40, h: 250, vertical: true },
  { type: "rack", x: 1670, y: 960, w: 40, h: 250, vertical: true },
  { type: "forklift", x: 1790, y: 930, w: 60, h: 90 },
  { type: "baler", x: 1880, y: 1080, w: 70, h: 70 },
  { type: "boxes", x: 1250, y: 1250, w: 90, h: 70 },
  { type: "boxes", x: 1760, y: 1150, w: 70, h: 60 },
  { type: "pingpong", x: 1270, y: 1080, w: 120, h: 70 },
];

export function seatOf(f: Furniture): { x: number; y: number } {
  if (f.seat === "north") return { x: f.x + f.w / 2, y: f.y - 18 };
  return { x: f.x + f.w / 2, y: f.y + f.h + 22 };
}

const seats: Record<string, { x: number; y: number }> = {};
for (const f of FURNITURE) {
  if (f.owner && f.seat) seats["seat_" + f.owner] = seatOf(f);
}

export const SPOTS: Record<string, { x: number; y: number }> = {
  ...seats,
  michael_visit: { x: 965, y: 250 },
  michael_couch: { x: 850, y: 240 },
  reception_front: { x: 620, y: 290 },
  reception_side: { x: 720, y: 300 },
  conf_s1: { x: 200, y: 300 },
  conf_s2: { x: 330, y: 300 },
  conf_n1: { x: 200, y: 135 },
  conf_n2: { x: 330, y: 135 },
  conf_board: { x: 270, y: 80 },
  coffee: { x: 1480, y: 125 },
  kitchen_t1: { x: 1565, y: 320 },
  kitchen_t2: { x: 1755, y: 320 },
  kitchen_mid: { x: 1660, y: 180 },
  vending: { x: 1800, y: 140 },
  fridge: { x: 1920, y: 135 },
  kitchen_couch: { x: 1880, y: 250 },
  cooler: { x: 1276, y: 120 },
  hall: { x: 1280, y: 260 },
  party: { x: 155, y: 720 },
  bullpen_mid: { x: 810, y: 600 },
  bullpen_east: { x: 1250, y: 600 },
  bullpen_west: { x: 300, y: 600 },
  accounting_mid: { x: 1680, y: 600 },
  annex_mid: { x: 290, y: 1130 },
  stairs: { x: 680, y: 1050 },
  copier: { x: 835, y: 1000 },
  printer: { x: 930, y: 990 },
  archive: { x: 1130, y: 990 },
  archive_table: { x: 970, y: 1160 },
  warehouse_a: { x: 1350, y: 1200 },
  warehouse_b: { x: 1610, y: 1260 },
  dock: { x: 1860, y: 1280 },
  pingpong: { x: 1330, y: 1180 },
};

export interface Window {
  x: number;
  w: number;
}
export const WINDOWS: Window[] = [
  { x: 60, w: 90 },
  { x: 380, w: 90 },
  { x: 800, w: 100 },
  { x: 1440, w: 90 },
  { x: 1600, w: 90 },
];

export const ELEVATOR = { x: 640, w: 90 };
