import type { Rect } from "../types";

export const WORLD = { w: 2200, h: 1540 };
export const WORLD_SCALE = 0.025; // 1 meter = 40px
export const FLOOR_SPLIT_Y = 936;
export const FLOOR_HEIGHT_M = 4.2;
export const BASEMENT_DX_PX = 0;
export const BASEMENT_DZ_PX = -900;

export function floorOfY(y: number): 0 | 1 {
  return y >= FLOOR_SPLIT_Y ? 1 : 0;
}

export function to3DCoords(
  xPx: number,
  yPx: number,
  localYM = 0,
): { x: number; y: number; z: number } {
  if (yPx < FLOOR_SPLIT_Y) {
    return { x: xPx * WORLD_SCALE, y: localYM, z: yPx * WORLD_SCALE };
  }
  return {
    x: (xPx + BASEMENT_DX_PX) * WORLD_SCALE,
    y: -FLOOR_HEIGHT_M + localYM,
    z: (yPx + BASEMENT_DZ_PX) * WORLD_SCALE,
  };
}

export const WALL_CAP = 14;
export const WALL_FACE = 26;
export const WALL_DEPTH = WALL_CAP + WALL_FACE;

export type WallKind = "solid" | "glass" | "outer";

export interface Wall extends Rect {
  kind: WallKind;
  horizontal: boolean;
}

type Gap = [number, number];

function hWall(
  x1: number,
  x2: number,
  y: number,
  doors: Gap[] = [],
  kind: WallKind = "solid",
): Wall[] {
  const out: Wall[] = [];
  let cur = x1;
  for (const [a, b] of [...doors].sort((p, q) => p[0] - q[0])) {
    if (a > cur) out.push({ x: cur, y, w: a - cur, h: WALL_DEPTH, kind, horizontal: true });
    cur = b;
  }
  if (cur < x2) out.push({ x: cur, y, w: x2 - cur, h: WALL_DEPTH, kind, horizontal: true });
  return out;
}

function vWall(
  x: number,
  y1: number,
  y2: number,
  doors: Gap[] = [],
  kind: WallKind = "solid",
): Wall[] {
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
  // Floor 0 (Main Office) outer shell: y = 0..936
  { x: 0, y: 0, w: WORLD.w, h: WALL_DEPTH, kind: "outer", horizontal: true },
  { x: 0, y: 0, w: 24, h: FLOOR_SPLIT_Y, kind: "outer", horizontal: false },
  { x: WORLD.w - 24, y: 0, w: 24, h: FLOOR_SPLIT_Y, kind: "outer", horizontal: false },
  { x: 0, y: 906, w: WORLD.w, h: 30, kind: "outer", horizontal: true },

  // Lobby (top-left): double doors opening south into Reception
  ...hWall(24, 347, 230, [[242, 324]]),

  // Michael's office (north-west-center, glass south wall with door on left)
  ...vWall(340, WALL_DEPTH, 268),
  ...vWall(680, WALL_DEPTH, 268),
  ...hWall(333, 687, 260, [[372, 452]], "glass"),

  // Conference room (immediately right of Michael, glass south wall with door on left)
  ...vWall(1080, WALL_DEPTH, 268),
  ...hWall(673, 1087, 260, [[708, 788]], "glass"),

  // Stairwell (right of Conference Room, door east into corridor)
  ...vWall(1340, WALL_DEPTH, 268, [[164, 244]]),
  ...hWall(1073, 1347, 260),

  // Break room (top-right corner, doors west from corridor and south toward Annex)
  ...vWall(1500, WALL_DEPTH, 268, [[148, 232]]),
  ...hWall(1493, 2176, 260, [[1540, 1630]]),

  // Kitchen subtle side enclosure (open to bullpen & east hall)
  ...vWall(1080, 300, 390),

  // Bathrooms (east-center, tiled rooms off the east corridor)
  ...hWall(1453, 1747, 540),
  ...hWall(1453, 1747, 710),
  ...vWall(1460, 540, 906, [
    [600, 675],
    [790, 865],
  ]),
  ...vWall(1740, 540, 906),

  // Annex (far-right wing south of Break Room)
  ...vWall(1740, 300, 540, [[375, 470]]),

  // Floor 1 (Basement: Archive & Warehouse) outer shell: y = 936..1540
  { x: 0, y: FLOOR_SPLIT_Y, w: WORLD.w, h: 28, kind: "outer", horizontal: true },
  { x: 0, y: FLOOR_SPLIT_Y, w: 24, h: WORLD.h - FLOOR_SPLIT_Y, kind: "outer", horizontal: false },
  {
    x: WORLD.w - 24,
    y: FLOOR_SPLIT_Y,
    w: 24,
    h: WORLD.h - FLOOR_SPLIT_Y,
    kind: "outer",
    horizontal: false,
  },
  { x: 0, y: WORLD.h - 24, w: WORLD.w, h: 24, kind: "outer", horizontal: true },

  // Basement Elevator Shaft core (directly beneath upper Lobby/Reception Elevator)
  { x: 118, y: 1096, w: 88, h: 34, kind: "solid", horizontal: true },

  // Archive vs Warehouse divider (two doorways: one near stairs landing, one south-center)
  ...vWall(1020, 964, WORLD.h - 24, [
    [1065, 1175],
    [1220, 1340],
  ]),
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
  { id: "lobby", name: "VESTÍBULO", x: 24, y: 40, w: 316, h: 220, floor: "carpet" },
  {
    id: "michael",
    name: "DESPACHO DE MICHAEL",
    x: 340,
    y: 40,
    w: 340,
    h: 240,
    floor: "carpetBlue",
  },
  { id: "conf", name: "SALA DE REUNIONES", x: 680, y: 40, w: 400, h: 240, floor: "carpetDark" },
  { id: "stairs", name: "ESCALERAS", x: 1080, y: 40, w: 260, h: 240, floor: "tile" },
  { id: "hall", name: "PASILLO", x: 1340, y: 40, w: 400, h: 520, floor: "carpet" },
  { id: "breakroom", name: "SALA DE DESCANSO", x: 1500, y: 40, w: 676, h: 240, floor: "checker" },
  { id: "reception", name: "RECEPCIÓN", x: 24, y: 260, w: 420, h: 380, floor: "carpet" },
  { id: "accounting", name: "CONTABILIDAD", x: 24, y: 640, w: 436, h: 266, floor: "carpetGreen" },
  { id: "bullpen", name: "VENTAS", x: 340, y: 280, w: 1120, h: 626, floor: "carpet" },
  { id: "kitchen", name: "COCINA", x: 1080, y: 280, w: 280, h: 240, floor: "tile" },
  { id: "bathrooms", name: "BAÑOS", x: 1460, y: 540, w: 280, h: 366, floor: "tile" },
  { id: "annex", name: "ANEXO · RRHH", x: 1740, y: 280, w: 436, h: 626, floor: "carpetWarm" },
  { id: "archive", name: "FOTOCOPIAS Y ARCHIVO", x: 24, y: 964, w: 996, h: 552, floor: "tile" },
  { id: "warehouse", name: "ALMACÉN", x: 1020, y: 964, w: 1156, h: 552, floor: "concrete" },
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
  | "partyTable"
  | "sideTable";

export type FurnitureVariant =
  | "michaelFileCab"
  | "michaelArmoire"
  | "michaelLowBookcase"
  | "michaelCredenza"
  | "emojiBoxes"
  | "lowSouthShelf";

export interface Furniture extends Rect {
  type: FurnitureType;
  owner?: string;
  color?: string;
  variant?: FurnitureVariant;
  vertical?: boolean;
  collide?: boolean;
  /** For desks: where the chair/seat goes. */
  seat?: "south" | "north" | "east" | "west";
}

const D = { w: 96, h: 50 };
function desk(
  owner: string,
  cx: number,
  y: number,
  type: FurnitureType = "desk",
  seat: NonNullable<Furniture["seat"]> = "south",
): Furniture {
  return { type, owner, x: cx - D.w / 2, y, w: D.w, h: D.h, seat };
}

export const STAIRWELL_HOLE = { x: 1104, y: 52, w: 144, h: 112 };

export const FURNITURE: Furniture[] = [
  // Lobby
  { type: "plant", x: 294, y: 170, w: 30, h: 30 },

  // Reception (west side, south of Lobby & Michael's Office)
  { type: "couch", x: 40, y: 315, w: 44, h: 132, vertical: true, color: "#80868d" },
  { type: "couch", x: 286, y: 274, w: 44, h: 42, color: "#858b92" },
  { type: "receptionDesk", owner: "pam", x: 185, y: 360, w: 56, h: 128, seat: "west" },
  { type: "plant", x: 304, y: 332, w: 30, h: 30 },
  // Copy & supply corner south-west of Reception
  { type: "copier", x: 42, y: 505, w: 86, h: 54 },
  { type: "cabinet", x: 150, y: 580, w: 120, h: 42, color: "#8f9aa1" },

  // Accounting (bottom-left enclosed by low partitions)
  { type: "partition", x: 32, y: 642, w: 270, h: 12 },
  desk("angela", 112, 696, "desk", "south"),
  desk("oscar", 252, 696, "desk", "south"),
  desk("kevin", 182, 845, "desk", "north"),
  { type: "cabinet", x: 344, y: 846, w: 96, h: 42, color: "#9aa59b" },
  { type: "plant", x: 408, y: 660, w: 28, h: 28 },

  // Michael's Office (top-west-center, modeled closely on the Scranton set)
  { type: "plant", x: 348, y: 48, w: 32, h: 32 },
  { type: "cabinet", x: 398, y: 44, w: 60, h: 30, color: "#c98548", variant: "michaelFileCab" },
  { type: "bookshelf", x: 588, y: 44, w: 64, h: 42, color: "#c77d3e", variant: "michaelArmoire" },
  { type: "boxes", x: 624, y: 90, w: 24, h: 20, variant: "emojiBoxes", collide: false },
  {
    type: "bookshelf",
    x: 348,
    y: 88,
    w: 28,
    h: 98,
    color: "#d6a44e",
    variant: "michaelLowBookcase",
  },
  { type: "sideTable", x: 348, y: 202, w: 26, h: 26, color: "#c88644" },
  { type: "cabinet", x: 642, y: 112, w: 32, h: 68, color: "#c98548", variant: "michaelCredenza" },
  { type: "michaelDesk", owner: "michael", x: 465, y: 118, w: 126, h: 54, seat: "north" },

  // Conference Room (immediately right of Michael's Office)
  { type: "confTable", x: 750, y: 136, w: 250, h: 72 },
  { type: "tvCart", x: 1020, y: 58, w: 42, h: 36 },
  { type: "plant", x: 696, y: 54, w: 28, h: 28 },

  // Stairwell (right of Conference Room — descends continuously down to Floor 1)
  {
    type: "stairs",
    x: STAIRWELL_HOLE.x,
    y: STAIRWELL_HOLE.y,
    w: STAIRWELL_HOLE.w,
    h: STAIRWELL_HOLE.h,
    collide: false,
  },

  // Kitchen (south of Stairwell, open to Bullpen & East Hall)
  { type: "counter", x: 1094, y: 306, w: 170, h: 44 },
  { type: "fridge", x: 1272, y: 306, w: 58, h: 54 },
  { type: "roundTable", x: 1175, y: 422, w: 68, h: 68 },
  { type: "cooler", x: 1020, y: 320, w: 32, h: 32 },
  { type: "plant", x: 1300, y: 468, w: 28, h: 28 },

  // Break Room (top-right corner: 3 vending machines matching Drawbotics layout)
  { type: "vending", x: 1760, y: 46, w: 56, h: 56, color: "#2f5d8a" },
  { type: "vending", x: 1828, y: 46, w: 56, h: 56, color: "#b5373c" },
  { type: "vending", x: 1896, y: 46, w: 56, h: 56, color: "#1f242b" },
  { type: "roundTable", x: 1585, y: 148, w: 70, h: 70 },
  { type: "roundTable", x: 1755, y: 148, w: 70, h: 70 },
  { type: "roundTable", x: 1925, y: 148, w: 70, h: 70 },
  { type: "couch", x: 2116, y: 92, w: 44, h: 130, vertical: true, color: "#56708a" },

  // Bullpen north wall credenza / Party Planning Committee (east of Conference Room door)
  { type: "bookshelf", x: 808, y: 304, w: 92, h: 36 },
  { type: "partyTable", x: 916, y: 304, w: 146, h: 52 },

  // Bullpen — Cluster 1 (Jim, Dwight, Player)
  desk("jim", 545, 420, "desk", "north"),
  desk("dwight", 545, 480, "desk", "south"),
  desk("player", 685, 480, "playerDesk", "south"),

  // Bullpen — Cluster 2 (Stanley, Phyllis by south windows)
  desk("stanley", 660, 745, "desk", "south"),
  desk("phyllis", 790, 745, "desk", "south"),

  // Bullpen — Cluster 3 (Meredith, Creed, Devon, Packer on right bullpen)
  desk("meredith", 930, 585, "desk", "south"),
  desk("creed", 1070, 585, "desk", "south"),
  desk("devon", 930, 745, "desk", "south"),
  desk("packer", 1070, 745, "desk", "south"),
  { type: "plant", x: 495, y: 655, w: 30, h: 30 },
  { type: "plant", x: 1365, y: 855, w: 30, h: 30 },

  // Low south exterior binder shelves underneath south windows (as in 3D floorplan)
  {
    type: "bookshelf",
    x: 470,
    y: 874,
    w: 145,
    h: 28,
    color: "#c89d66",
    variant: "lowSouthShelf",
  },
  {
    type: "bookshelf",
    x: 920,
    y: 874,
    w: 160,
    h: 28,
    color: "#c89d66",
    variant: "lowSouthShelf",
  },

  // Bathrooms (east-center)
  { type: "couch", x: 1630, y: 586, w: 92, h: 42, color: "#d57b97" },
  { type: "cabinet", x: 1620, y: 654, w: 96, h: 36, color: "#d6d3c9" },
  { type: "cabinet", x: 1620, y: 760, w: 96, h: 36, color: "#d6d3c9" },
  { type: "plant", x: 1478, y: 656, w: 26, h: 26 },

  // Annex (far-right wing: Ryan, Kelly, Toby)
  { type: "cabinet", x: 1764, y: 312, w: 80, h: 40, color: "#8f9aa1" },
  desk("ryan", 1885, 390, "desk", "south"),
  desk("kelly", 2065, 390, "desk", "south"),
  { type: "partition", x: 1945, y: 540, w: 12, h: 260, vertical: true },
  desk("toby", 2065, 725, "desk", "south"),
  { type: "couch", x: 1775, y: 790, w: 136, h: 44, color: "#a2715a" },
  { type: "plant", x: 2124, y: 864, w: 30, h: 30 },

  // Lower Floor (Floor 1 — Downstairs Archive & Copy Room, y: 964..1516, x: 24..1020)
  { type: "copier", x: 75, y: 990, w: 90, h: 60 },
  { type: "printer", x: 215, y: 992, w: 66, h: 48 },
  { type: "cabinet", x: 350, y: 985, w: 120, h: 44, color: "#3f6fa8" },
  { type: "partyTable", x: 640, y: 1120, w: 140, h: 60 },
  { type: "shelf", x: 85, y: 1280, w: 170, h: 40 },
  { type: "shelf", x: 360, y: 1380, w: 180, h: 40 },

  // Lower Floor (Floor 1 — Downstairs Warehouse, y: 964..1516, x: 1020..2176)
  // Staircase foot aligns directly beneath upstairs STAIRWELL_HOLE (z = 70..172)
  { type: "stairs", x: 1104, y: 970, w: 144, h: 102, collide: false },
  desk("darryl", 1320, 995, "desk", "south"),
  { type: "pingpong", x: 1090, y: 1210, w: 120, h: 70 },
  { type: "rack", x: 1440, y: 1010, w: 40, h: 240, vertical: true },
  { type: "rack", x: 1580, y: 1010, w: 40, h: 240, vertical: true },
  { type: "rack", x: 1720, y: 1010, w: 40, h: 240, vertical: true },
  { type: "forklift", x: 1870, y: 1000, w: 60, h: 90 },
  { type: "baler", x: 2045, y: 1120, w: 70, h: 70 },
  { type: "boxes", x: 1085, y: 1390, w: 90, h: 70 },
  { type: "boxes", x: 1840, y: 1240, w: 70, h: 60 },
];

export const EXTRA_STAMFORD_DESKS: Furniture[] = [
  desk("karen", 790, 685, "desk", "north"),
  desk("andy", 1245, 585, "desk", "south"),
  desk("tony", 1245, 745, "desk", "south"),
  desk("hannah", 365, 710, "desk", "south"),
  desk("martin", 1865, 595, "desk", "north"),
];

let activeFurnitureList: Furniture[] = [...FURNITURE];

export function setActiveFurniture(extraOwners: string[]): Furniture[] {
  const wanted = new Set(extraOwners);
  const extras = EXTRA_STAMFORD_DESKS.filter((d) => d.owner && wanted.has(d.owner));
  activeFurnitureList = [...FURNITURE, ...extras];
  return activeFurnitureList;
}

export function getActiveFurniture(): Furniture[] {
  return activeFurnitureList;
}

export function seatOf(f: Furniture): { x: number; y: number } {
  if (f.seat === "north") return { x: f.x + f.w / 2, y: f.y - 18 };
  if (f.seat === "west") return { x: f.x - 18, y: f.y + f.h / 2 };
  if (f.seat === "east") return { x: f.x + f.w + 20, y: f.y + f.h / 2 };
  return { x: f.x + f.w / 2, y: f.y + f.h + 22 };
}

const seats: Record<string, { x: number; y: number }> = {};
for (const f of [...FURNITURE, ...EXTRA_STAMFORD_DESKS]) {
  if (f.owner && f.seat) seats["seat_" + f.owner] = seatOf(f);
}

export const SPOTS: Record<string, { x: number; y: number }> = {
  ...seats,
  michael_visit: { x: 528, y: 218 },
  michael_couch: { x: 422, y: 175 },
  reception_front: { x: 280, y: 425 },
  reception_side: { x: 295, y: 495 },
  conf_s1: { x: 810, y: 235 },
  conf_s2: { x: 935, y: 235 },
  conf_n1: { x: 810, y: 105 },
  conf_n2: { x: 935, y: 105 },
  conf_board: { x: 880, y: 80 },
  coffee: { x: 1150, y: 378 },
  kitchen_t1: { x: 1620, y: 236 },
  kitchen_t2: { x: 1790, y: 236 },
  break_t1_n: { x: 1620, y: 124 },
  break_t1_s: { x: 1620, y: 236 },
  break_t1_w: { x: 1558, y: 183 },
  break_t1_e: { x: 1682, y: 183 },
  break_t2_n: { x: 1790, y: 124 },
  break_t2_s: { x: 1790, y: 236 },
  break_t2_w: { x: 1726, y: 183 },
  break_t2_e: { x: 1854, y: 183 },
  break_t3_n: { x: 1960, y: 124 },
  break_t3_s: { x: 1960, y: 236 },
  break_t3_w: { x: 1898, y: 183 },
  break_t3_e: { x: 2022, y: 183 },
  break_couch_n: { x: 2075, y: 118 },
  kitchen_mid: { x: 1209, y: 388 },
  kitchen_round_w: { x: 1146, y: 456 },
  kitchen_round_e: { x: 1268, y: 456 },
  kitchen_round_s: { x: 1209, y: 508 },
  vending: { x: 1790, y: 124 },
  vending_2: { x: 1858, y: 126 },
  fridge: { x: 1298, y: 388 },
  kitchen_couch: { x: 2075, y: 185 },
  cooler: { x: 1036, y: 385 },
  hall: { x: 1410, y: 330 },
  party: { x: 989, y: 382 },
  bullpen_mid: { x: 775, y: 635 },
  bullpen_east: { x: 1230, y: 650 },
  bullpen_west: { x: 385, y: 500 },
  accounting_mid: { x: 215, y: 785 },
  annex_mid: { x: 1850, y: 715 },
  stairs_up: { x: 1252, y: 112 },
  stairs: { x: 1176, y: 1084 },
  elevator_up: { x: 162, y: 298 },
  elevator_down: { x: 162, y: 1166 },
  copier: { x: 120, y: 1085 },
  printer: { x: 248, y: 1075 },
  archive: { x: 410, y: 1068 },
  archive_table: { x: 710, y: 1215 },
  warehouse_a: { x: 1320, y: 1180 },
  warehouse_b: { x: 1650, y: 1310 },
  dock: { x: 2040, y: 1405 },
  pingpong: { x: 1150, y: 1315 },
  pingpong_e: { x: 1244, y: 1245 },
};

export interface FloorPortal {
  id: string;
  kind: "stairs" | "elevator";
  label: string;
  fromFloor: 0 | 1;
  toFloor: 0 | 1;
  x: number;
  y: number;
  destX: number;
  destY: number;
  destFacing: "up" | "down" | "left" | "right";
  radius: number;
}

export const FLOOR_PORTALS: FloorPortal[] = [
  {
    id: "stairs_down",
    kind: "stairs",
    label: "E · ⬇️ Bajar escaleras (Almacén)",
    fromFloor: 0,
    toFloor: 1,
    x: SPOTS["stairs_up"]!.x,
    y: SPOTS["stairs_up"]!.y,
    destX: 1176,
    destY: 1118,
    destFacing: "down",
    radius: 76,
  },
  {
    id: "stairs_up",
    kind: "stairs",
    label: "E · ⬆️ Subir escaleras (Oficina)",
    fromFloor: 1,
    toFloor: 0,
    x: SPOTS["stairs"]!.x,
    y: SPOTS["stairs"]!.y,
    destX: 1286,
    destY: 204,
    destFacing: "right",
    radius: 76,
  },
  {
    id: "elevator_down",
    kind: "elevator",
    label: "E · 🛗 Ascensor a Planta Baja (Archivo/Almacén)",
    fromFloor: 0,
    toFloor: 1,
    x: SPOTS["elevator_up"]!.x,
    y: SPOTS["elevator_up"]!.y,
    destX: SPOTS["elevator_down"]!.x,
    destY: SPOTS["elevator_down"]!.y,
    destFacing: "down",
    radius: 64,
  },
  {
    id: "elevator_up",
    kind: "elevator",
    label: "E · 🛗 Ascensor a Planta 2 (Oficina)",
    fromFloor: 1,
    toFloor: 0,
    x: SPOTS["elevator_down"]!.x,
    y: SPOTS["elevator_down"]!.y,
    destX: SPOTS["elevator_up"]!.x,
    destY: SPOTS["elevator_up"]!.y,
    destFacing: "down",
    radius: 64,
  },
];

export interface ConferenceSeat {
  id: string;
  x: number;
  y: number;
  facing: "down" | "up" | "left" | "right";
  forPlayer?: boolean;
}

export const CONF_SEATS: ConferenceSeat[] = [
  // Player reserved front-left table chair (index 0)
  { id: "conf_chair_player", x: 780, y: 222, facing: "up", forPlayer: true },
  // Remainder of confTable south row (4 chairs)
  { id: "conf_chair_s2", x: 828, y: 222, facing: "up" },
  { id: "conf_chair_s3", x: 875, y: 222, facing: "up" },
  { id: "conf_chair_s4", x: 923, y: 222, facing: "up" },
  { id: "conf_chair_s5", x: 970, y: 222, facing: "up" },
  // confTable north row (5 chairs)
  { id: "conf_chair_n1", x: 780, y: 122, facing: "down" },
  { id: "conf_chair_n2", x: 828, y: 122, facing: "down" },
  { id: "conf_chair_n3", x: 875, y: 122, facing: "down" },
  { id: "conf_chair_n4", x: 923, y: 122, facing: "down" },
  { id: "conf_chair_n5", x: 970, y: 122, facing: "down" },
  // confTable east end (2 chairs)
  { id: "conf_chair_e1", x: 1016, y: 154, facing: "left" },
  { id: "conf_chair_e2", x: 1016, y: 192, facing: "left" },
  // East wall perimeter chairs (4 chairs)
  { id: "conf_chair_ew1", x: 1054, y: 120, facing: "left" },
  { id: "conf_chair_ew2", x: 1054, y: 158, facing: "left" },
  { id: "conf_chair_ew3", x: 1054, y: 196, facing: "left" },
  { id: "conf_chair_ew4", x: 1054, y: 234, facing: "left" },
  // West wall perimeter chairs (3 chairs)
  { id: "conf_chair_ww1", x: 706, y: 118, facing: "right" },
  { id: "conf_chair_ww2", x: 706, y: 156, facing: "right" },
  { id: "conf_chair_ww3", x: 706, y: 194, facing: "right" },
  // South glass wall back row (3 chairs)
  { id: "conf_chair_sw1", x: 818, y: 245, facing: "up" },
  { id: "conf_chair_sw2", x: 896, y: 245, facing: "up" },
  { id: "conf_chair_sw3", x: 974, y: 245, facing: "up" },
];

export const CONF_HOST_SPOTS: {
  id: string;
  x: number;
  y: number;
  facing: "down" | "up" | "left" | "right";
}[] = [
  { id: "board", x: 880, y: 78, facing: "down" },
  { id: "pace_left", x: 792, y: 80, facing: "down" },
  { id: "pace_right", x: 956, y: 82, facing: "down" },
  { id: "table_west", x: 730, y: 172, facing: "right" },
  { id: "tv", x: 996, y: 98, facing: "left" },
];

export interface Window {
  x: number;
  w: number;
}
export const WINDOWS: Window[] = [
  { x: 56, w: 80 },
  { x: 470, w: 100 },
  { x: 740, w: 80 },
  { x: 910, w: 80 },
  { x: 1580, w: 88 },
  { x: 1990, w: 88 },
];

export const SOUTH_WINDOWS: Window[] = [
  { x: 470, w: 140 },
  { x: 690, w: 150 },
  { x: 925, w: 155 },
  { x: 1210, w: 120 },
];

export const ELEVATOR = { x: 118, y: 230, w: 88 };

export function spotAt(name: string): { x: number; y: number } {
  return SPOTS[name] ?? { x: 775, y: 635 };
}
