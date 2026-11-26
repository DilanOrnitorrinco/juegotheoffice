import { CHAR_BY_ID } from "../data/characters";
import {
  ELEVATOR,
  FLOOR_PORTALS,
  FLOOR_SPLIT_Y,
  ROOMS,
  SPOTS,
  STAIRWELL_HOLE,
  WALLS,
  WALL_CAP,
  WINDOWS,
  WORLD,
  floorOfY,
  getActiveFurniture,
  seatOf,
  type FloorKind,
  type Furniture,
  type Wall,
} from "../data/map";
import { DUNDIES, OBJECTS } from "../data/objects";
import type { EventId, OfficeDecorKind } from "../types";
import type { Game } from "./game";
import { PAL } from "./palette";
import { drawCharacter, drawItemSprite, rr, shade } from "./sprites";

type G = CanvasRenderingContext2D;

// ---------------- floor (pre-rendered) ----------------
function makeTile(size: number, draw: (g: G) => void): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  draw(c.getContext("2d")!);
  return c;
}

function noise(g: G, size: number, base: string, dots: string[], n: number, seed: number) {
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  let s = seed;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) {
    g.fillStyle = dots[i % dots.length]!;
    g.fillRect(rnd() * size, rnd() * size, 1.5, 1.5);
  }
}

function floorTile(kind: FloorKind): HTMLCanvasElement {
  switch (kind) {
    case "carpet":
      return makeTile(48, (g) => {
        noise(g, 48, "#8e98a0", ["#848e96", "#99a3ab", "#7f8890"], 260, 7);
        g.strokeStyle = "rgba(60,70,80,0.08)";
        g.strokeRect(0, 0, 48, 48);
      });
    case "carpetDark":
      return makeTile(40, (g) => noise(g, 40, "#6d6a74", ["#64616b", "#77747e"], 200, 3));
    case "carpetBlue":
      return makeTile(40, (g) => noise(g, 40, "#5f7d96", ["#56748c", "#6a88a0"], 200, 5));
    case "carpetGreen":
      return makeTile(48, (g) => {
        noise(g, 48, "#8a9a8a", ["#7f8f7f", "#95a595"], 240, 11);
        g.strokeStyle = "rgba(50,70,50,0.08)";
        g.strokeRect(0, 0, 48, 48);
      });
    case "carpetWarm":
      return makeTile(40, (g) => noise(g, 40, "#9a8a7a", ["#8f7f6f", "#a59585"], 200, 13));
    case "wood":
      return makeTile(64, (g) => {
        g.fillStyle = "#b8935f";
        g.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 4; i++) {
          g.fillStyle = i % 2 ? "#b08a57" : "#bf9a66";
          g.fillRect(0, i * 16, 64, 16);
          g.fillStyle = "rgba(80,50,20,0.25)";
          g.fillRect(0, i * 16 + 15, 64, 1);
          g.fillRect(((i * 23) % 64) | 0, i * 16, 1, 16);
        }
      });
    case "checker":
      return makeTile(48, (g) => {
        g.fillStyle = "#ece6d6";
        g.fillRect(0, 0, 48, 48);
        g.fillStyle = "#c9c0aa";
        g.fillRect(0, 0, 24, 24);
        g.fillRect(24, 24, 24, 24);
      });
    case "tile":
      return makeTile(40, (g) => {
        g.fillStyle = "#d5d3cb";
        g.fillRect(0, 0, 40, 40);
        g.strokeStyle = "rgba(90,90,80,0.25)";
        g.strokeRect(0.5, 0.5, 40, 40);
      });
    case "concrete":
      return makeTile(64, (g) => {
        noise(g, 64, "#a9a9a2", ["#9e9e97", "#b4b4ad", "#94948d"], 400, 17);
        g.strokeStyle = "rgba(60,60,55,0.18)";
        g.strokeRect(0.5, 0.5, 64, 64);
      });
  }
}

let floorCache: { canvas: HTMLCanvasElement; key: string } | null = null;

function buildFloor(event: EventId | null, decor: OfficeDecorKind | null): HTMLCanvasElement {
  const scale = 1;
  const c = document.createElement("canvas");
  c.width = WORLD.w * scale;
  c.height = WORLD.h * scale;
  const g = c.getContext("2d")!;
  g.fillStyle = PAL.void;
  g.fillRect(0, 0, WORLD.w, WORLD.h);
  for (const r of ROOMS) {
    const pat = g.createPattern(floorTile(r.floor), "repeat")!;
    g.fillStyle = pat;
    g.fillRect(r.x, r.y, r.w, r.h);
  }
  // accounting carpet border
  const acc = ROOMS.find((r) => r.id === "accounting");
  if (acc) {
    g.strokeStyle = "rgba(40,60,40,0.25)";
    g.lineWidth = 3;
    g.strokeRect(acc.x, acc.y, acc.w, acc.h);
  }

  // Rugs: Michael's office + Reception waiting area
  g.fillStyle = "#7c3e3a";
  rr(g, 422, 168, 206, 78, 8);
  g.fill();
  g.strokeStyle = "#d5b37a";
  g.lineWidth = 3;
  rr(g, 430, 176, 190, 62, 6);
  g.stroke();
  g.fillStyle = "rgba(60,80,110,0.38)";
  rr(g, 52, 312, 118, 146, 10);
  g.fill();

  // Lobby elevator doors alcove on Lobby/Reception divider wall
  const elY = ELEVATOR.y + 14;
  const elH = 22;
  g.fillStyle = "#7b858c";
  g.fillRect(ELEVATOR.x - 4, elY - 2, ELEVATOR.w + 8, elH + 4);
  g.fillStyle = "#b9c2c8";
  g.fillRect(ELEVATOR.x, elY, ELEVATOR.w / 2 - 2, elH);
  g.fillRect(ELEVATOR.x + ELEVATOR.w / 2 + 2, elY, ELEVATOR.w / 2 - 2, elH);
  g.fillStyle = "#3a434a";
  g.fillRect(ELEVATOR.x + ELEVATOR.w / 2 - 1, elY, 2, elH);

  // Bathroom doorway markers (Women top, Men bottom)
  for (const [bx, by, sym, bg] of [
    [1446, 625, "♀", "#d57b97"],
    [1446, 815, "♂", "#4c7189"],
  ] as const) {
    g.fillStyle = bg;
    rr(g, bx - 12, by - 12, 24, 24, 6);
    g.fill();
    g.fillStyle = "#fff";
    g.font = "bold 14px sans-serif";
    g.textAlign = "center";
    g.fillText(sym, bx, by + 5);
  }

  // Warehouse markings
  g.strokeStyle = "#e3b93a";
  g.lineWidth = 5;
  g.setLineDash([24, 14]);
  g.beginPath();
  g.moveTo(1045, 1345);
  g.lineTo(2150, 1345);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = "rgba(227,185,58,0.9)";
  for (let x = 1965; x < 2170; x += 28) {
    g.save();
    g.beginPath();
    g.rect(1960, 1418, 210, 96);
    g.clip();
    g.beginPath();
    g.moveTo(x, 1418);
    g.lineTo(x + 14, 1418);
    g.lineTo(x - 36, 1514);
    g.lineTo(x - 50, 1514);
    g.fill();
    g.restore();
  }
  g.fillStyle = "rgba(30,30,30,0.65)";
  g.font = "bold 14px Archivo, sans-serif";
  g.textAlign = "center";
  g.fillText("EXPEDICIÓN", 2065, 1408);

  // Window light beams along north outer wall
  for (const w of WINDOWS) {
    const grd = g.createLinearGradient(0, 40, 0, 250);
    grd.addColorStop(0, "rgba(255,248,220,0.28)");
    grd.addColorStop(1, "rgba(255,248,220,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(w.x, 40);
    g.lineTo(w.x + w.w, 40);
    g.lineTo(w.x + w.w + 55, 240);
    g.lineTo(w.x + 40, 240);
    g.closePath();
    g.fill();
  }

  // Room names painted subtly
  g.font = "900 20px 'Archivo Black', Archivo, sans-serif";
  g.textAlign = "center";
  g.fillStyle = PAL.label;
  const labelAt: Record<string, [number, number]> = {
    lobby: [176, 198],
    michael: [510, 246],
    conf: [880, 246],
    stairs: [1210, 238],
    breakroom: [1835, 244],
    reception: [215, 610],
    accounting: [240, 902],
    bullpen: [805, 898],
    kitchen: [1210, 514],
    bathrooms: [1600, 898],
    annex: [1960, 898],
    archive: [520, 1494],
    warehouse: [1580, 1494],
  };
  for (const r of ROOMS) {
    const at = labelAt[r.id];
    if (at) g.fillText(r.name, at[0], at[1]);
  }

  // Event floor decor
  if (event === "sanpatricio") {
    g.fillStyle = "rgba(47,154,79,0.35)";
    for (const [x, y] of [
      [280, 480],
      [770, 640],
      [1230, 640],
      [1840, 620],
      [510, 200],
    ] as const) {
      for (const [dx, dy] of [
        [0, -10],
        [-9, 2],
        [9, 2],
      ] as const) {
        g.beginPath();
        g.arc(x + dx, y + dy, 9, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  if (event === "halloween") {
    g.fillStyle = "rgba(160,80,20,0.55)";
    let s = 3;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 90; i++) {
      g.beginPath();
      g.ellipse(60 + rnd() * 2040, 320 + rnd() * 560, 5, 3, rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (event === "sanvalentin") {
    g.fillStyle = "rgba(224,71,107,0.4)";
    let s = 9;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 70; i++) {
      const x = 60 + rnd() * 2040;
      const y = 320 + rnd() * 560;
      g.beginPath();
      g.ellipse(x, y, 4, 2.5, rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }

  // Episode floor decor
  if (decor === "casino") {
    g.fillStyle = "#1d5c3a";
    rr(g, 1215, 1140, 170, 92, 18);
    g.fill();
    g.strokeStyle = "#d9b44a";
    g.lineWidth = 3;
    rr(g, 1221, 1146, 158, 80, 14);
    g.stroke();
    g.fillStyle = "rgba(255,245,210,0.85)";
    g.font = "bold 10px Archivo, sans-serif";
    g.textAlign = "center";
    g.fillText("NOCHE DE CASINO", 1300, 1190);
  }
  if (decor === "funrun") {
    g.fillStyle = "rgba(255,255,255,0.9)";
    for (let x = 248; x < 344; x += 12) {
      g.fillStyle = Math.floor(x / 12) % 2 === 0 ? "#1f2937" : "#f8fafc";
      g.fillRect(x, 515, 12, 10);
    }
  }
  if (decor === "diversity") {
    g.fillStyle = "rgba(63,111,168,0.16)";
    rr(g, 710, 68, 330, 178, 12);
    g.fill();
  }
  if (decor === "return") {
    // Patch mark on wall near Annex entrance after Andy punched the wall
    g.fillStyle = "#d9d4c4";
    g.fillRect(1724, 326, 20, 32);
    g.strokeStyle = "#8a7f6c";
    g.lineWidth = 1.5;
    g.strokeRect(1724, 326, 20, 32);
  }

  // Chairs (drawn on the floor so people sit "on" them)
  for (const f of getActiveFurniture()) {
    if (f.seat && f.owner) drawChair(g, seatOf(f).x, seatOf(f).y, f.seat);
  }
  // Conference chairs
  for (const x of [780, 830, 880, 930, 980]) {
    drawChair(g, x, 118, "north");
    drawChair(g, x, 224, "south");
  }
  // Michael visitor chairs
  drawChair(g, 495, 196, "south");
  drawChair(g, 560, 196, "south");
  // Kitchen & Break Room chairs
  drawChair(g, 1152, 456, "west");
  drawChair(g, 1266, 456, "east");
  for (const tx of [1585, 1755, 1925]) {
    drawChair(g, tx - 16, 183, "west");
    drawChair(g, tx + 86, 183, "east");
  }
  return c;
}

function drawChair(g: G, x: number, y: number, back: "north" | "south" | "east" | "west") {
  g.fillStyle = "rgba(0,0,0,0.18)";
  g.beginPath();
  g.ellipse(x, y + 2, 13, 6, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = PAL.chair;
  g.beginPath();
  g.ellipse(x, y - 4, 12, 9, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = PAL.chairHi;
  g.beginPath();
  g.ellipse(x, y - 5, 9, 6, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = PAL.chair;
  if (back === "north") rr(g, x - 12, y - 18, 24, 7, 3);
  else if (back === "south") rr(g, x - 12, y + 4, 24, 7, 3);
  else if (back === "west") rr(g, x - 16, y - 13, 7, 20, 3);
  else rr(g, x + 9, y - 13, 7, 20, 3);
  g.fill();
}

// ---------------- walls ----------------
function drawWall(g: G, w: Wall, t: number, event: EventId | null) {
  if (w.kind === "glass") {
    g.fillStyle = PAL.glassFrame;
    g.fillRect(w.x, w.y, w.w, 6);
    g.fillStyle = PAL.glass;
    g.fillRect(w.x, w.y + 6, w.w, w.h - 10);
    g.fillStyle = "rgba(240,240,232,0.55)";
    for (let yy = w.y + 9; yy < w.y + w.h - 18; yy += 4) g.fillRect(w.x, yy, w.w, 1.6);
    g.fillStyle = PAL.glassFrame;
    for (let xx = w.x; xx <= w.x + w.w; xx += 60) g.fillRect(xx, w.y, 3, w.h);
    g.fillRect(w.x, w.y + w.h - 5, w.w, 5);
    return;
  }
  if (!w.horizontal) {
    g.fillStyle = PAL.wallCap;
    g.fillRect(w.x, w.y, w.w, w.h);
    g.fillStyle = PAL.wallCapHi;
    g.fillRect(w.x, w.y, 3, w.h);
    if (w.kind !== "outer") {
      g.fillStyle = PAL.wallFace;
      g.fillRect(w.x, w.y + w.h - 22, w.w, 22);
      g.fillStyle = PAL.baseboard;
      g.fillRect(w.x, w.y + w.h - 4, w.w, 4);
    }
    return;
  }
  if (w.kind === "outer" && w.y > 100) {
    g.fillStyle = PAL.wallCap;
    g.fillRect(w.x, w.y, w.w, w.h);
    return;
  }
  g.fillStyle = PAL.wallCap;
  g.fillRect(w.x, w.y, w.w, WALL_CAP);
  g.fillStyle = PAL.wallCapHi;
  g.fillRect(w.x, w.y, w.w, 3);
  const fy = w.y + WALL_CAP;
  const fh = w.h - WALL_CAP;
  g.fillStyle = w.kind === "outer" ? PAL.outerFace : PAL.wallFace;
  g.fillRect(w.x, fy, w.w, fh);
  g.fillStyle = PAL.wallFaceShade;
  g.fillRect(w.x, fy, w.w, 3);
  g.fillStyle = PAL.baseboard;
  g.fillRect(w.x, fy + fh - 4, w.w, 4);

  if (w.kind === "outer") {
    for (const win of WINDOWS) {
      g.fillStyle = "#56636e";
      g.fillRect(win.x - 3, fy + 1, win.w + 6, fh - 5);
      const sky = g.createLinearGradient(0, fy, 0, fy + fh);
      sky.addColorStop(0, event === "halloween" ? "#3a2a55" : PAL.windowSky);
      sky.addColorStop(1, event === "halloween" ? "#a0522d" : PAL.windowSkyLow);
      g.fillStyle = sky;
      g.fillRect(win.x, fy + 3, win.w, fh - 9);
      g.fillStyle = PAL.blinds;
      for (let yy = fy + 4; yy < fy + fh - 8; yy += 3.5) g.fillRect(win.x, yy, win.w, 1.4);
      if (event === "navidad") {
        g.fillStyle = "rgba(255,255,255,0.9)";
        for (let i = 0; i < 8; i++) {
          const sx = win.x + ((i * 37 + t * 20) % win.w);
          const sy = fy + 4 + ((i * 13 + t * 9) % (fh - 12));
          g.fillRect(sx, sy, 2, 2);
        }
        g.fillRect(win.x, fy + fh - 9, win.w, 3);
      }
    }
    // Whiteboard in conference room (north wall)
    g.fillStyle = "#f6f6f2";
    g.fillRect(790, fy + 2, 180, fh - 8);
    g.strokeStyle = "#8a9399";
    g.lineWidth = 2;
    g.strokeRect(790, fy + 2, 180, fh - 8);
    g.strokeStyle = "#2f6ea3";
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(800, fy + 8);
    g.lineTo(860, fy + 8);
    g.moveTo(800, fy + 13);
    g.lineTo(840, fy + 13);
    g.stroke();
    g.strokeStyle = "#c8312f";
    g.beginPath();
    g.arc(925, fy + 12, 6, 0, Math.PI * 2);
    g.stroke();
    // Dunder Mifflin sign on Lobby north wall
    g.fillStyle = "#1f3a5f";
    g.fillRect(156, fy + 3, 92, 14);
    g.fillStyle = "#fff";
    g.font = "bold 8px Archivo, sans-serif";
    g.textAlign = "center";
    g.fillText("DUNDER MIFFLIN", 202, fy + 13);
  }
  // Event wall decor
  if (
    event === "navidad" ||
    event === "halloween" ||
    event === "sanpatricio" ||
    event === "sanvalentin" ||
    event === "cumplemichael"
  ) {
    const cols =
      event === "navidad"
        ? ["#e53935", "#43a047", "#fdd835", "#1e88e5"]
        : event === "halloween"
          ? ["#ff8f00", "#8e24aa"]
          : event === "sanpatricio"
            ? ["#2e7d32", "#66bb6a", "#fdd835"]
            : event === "sanvalentin"
              ? ["#e0476b", "#f8bbd0"]
              : ["#3aa7a3", "#f2c14e", "#e0476b"];
    g.strokeStyle = "rgba(40,40,40,0.5)";
    g.lineWidth = 1;
    g.beginPath();
    for (let x = w.x + 10; x < w.x + w.w - 10; x += 22) {
      g.moveTo(x, fy + 4);
      g.quadraticCurveTo(x + 11, fy + 11, x + 22, fy + 4);
    }
    g.stroke();
    let i = 0;
    for (let x = w.x + 21; x < w.x + w.w - 10; x += 22) {
      const on = Math.sin(t * 4 + i) > -0.3;
      g.fillStyle = on ? cols[i % cols.length]! : "rgba(80,80,80,0.6)";
      g.beginPath();
      g.arc(x, fy + 8, 2.6, 0, Math.PI * 2);
      g.fill();
      i++;
    }
  }
}

// ---------------- furniture ----------------
function block(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  top: string,
  front: string,
  depth = 10,
  r = 3,
) {
  g.fillStyle = "rgba(15,20,25,0.18)";
  rr(g, x + 3, y + 5, w, h, r);
  g.fill();
  g.fillStyle = front;
  rr(g, x, y, w, h, r);
  g.fill();
  g.fillStyle = top;
  rr(g, x, y, w, h - depth, r);
  g.fill();
}

const OWNER_DECOR: Record<string, (g: G, f: Furniture) => void> = {
  dwight: (g, f) => {
    g.fillStyle = "#d6c88a";
    g.beginPath();
    g.arc(f.x + 14, f.y + 10, 5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e0aa79";
    g.beginPath();
    g.arc(f.x + 14, f.y + 4, 4, 0, Math.PI * 2);
    g.fill();
  },
  angela: (g, f) => {
    g.fillStyle = "#e8e2d2";
    g.fillRect(f.x + 8, f.y + 6, 10, 12);
    g.fillStyle = "#8a8a8a";
    g.beginPath();
    g.arc(f.x + 13, f.y + 11, 3, 0, Math.PI * 2);
    g.fill();
  },
  pam: (g, f) => {
    g.fillStyle = "#3f6fa8";
    g.beginPath();
    g.ellipse(f.x + 24, f.y + 14, 9, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#f2c14e";
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.arc(f.x + 100 + i * 4, f.y + 12, 2, 0, Math.PI * 2);
      g.fill();
    }
  },
  kevin: (g, f) => {
    g.fillStyle = "#e0476b";
    g.beginPath();
    g.arc(f.x + 80, f.y + 14, 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#f2c14e";
    g.beginPath();
    g.arc(f.x + 86, f.y + 18, 3, 0, Math.PI * 2);
    g.fill();
  },
  stanley: (g, f) => {
    g.fillStyle = PAL.paper;
    g.fillRect(f.x + 70, f.y + 8, 18, 14);
    g.strokeStyle = "#555";
    g.lineWidth = 0.6;
    for (let i = 0; i < 4; i++) {
      g.strokeRect(f.x + 72 + i * 4, f.y + 10, 4, 4);
      g.strokeRect(f.x + 72 + i * 4, f.y + 14, 4, 4);
    }
  },
};

const STAMFORD_DESK_OWNERS = new Set(["andy", "karen", "martin", "tony", "hannah"]);

function drawDesk(g: G, f: Furniture, t: number, isPlayer: boolean, seatLabel?: string) {
  block(g, f.x, f.y, f.w, f.h, isPlayer ? "#d0a46e" : PAL.woodTop, PAL.woodDark, 10);
  // monitor
  const mx = f.x + f.w / 2 - 16;
  g.fillStyle = PAL.beigeDark;
  rr(g, mx, f.y + 1, 32, 24, 3);
  g.fill();
  g.fillStyle = PAL.beige;
  rr(g, mx, f.y, 32, 20, 3);
  g.fill();
  g.fillStyle = isPlayer ? "#14321f" : PAL.screen;
  g.fillRect(mx + 4, f.y + 3, 24, 14);
  if (isPlayer) {
    g.fillStyle = `rgba(86,227,138,${0.6 + Math.sin(t * 3) * 0.3})`;
    for (let i = 0; i < 3; i++) g.fillRect(mx + 6, f.y + 5 + i * 4, 14 - i * 3, 1.5);
  } else {
    g.fillStyle = "rgba(120,200,255,0.35)";
    g.fillRect(mx + 4, f.y + 3, 24, 5);
  }
  // keyboard
  g.fillStyle = PAL.plastic;
  rr(g, f.x + f.w / 2 - 14, f.y + 26, 28, 8, 2);
  g.fill();
  // papers
  g.fillStyle = PAL.paper;
  g.save();
  g.translate(f.x + 14, f.y + 26);
  g.rotate(-0.15);
  g.fillRect(-6, -5, 14, 11);
  g.restore();
  // phone
  g.fillStyle = "#2b2f33";
  rr(g, f.x + f.w - 22, f.y + 22, 14, 10, 2);
  g.fill();
  const deco = f.owner ? OWNER_DECOR[f.owner] : undefined;
  if (deco) deco(g, f);
  if (isPlayer) {
    g.strokeStyle = `rgba(242,193,78,${0.55 + Math.sin(t * 3) * 0.35})`;
    g.lineWidth = 3;
    rr(g, f.x - 4, f.y - 4, f.w + 8, f.h + 8, 6);
    g.stroke();
    g.fillStyle = "#1f3a5f";
    rr(g, f.x + f.w / 2 - 26, f.y + f.h - 9, 52, 12, 3);
    g.fill();
    g.fillStyle = "#fff";
    g.font = "bold 8px Archivo, sans-serif";
    g.textAlign = "center";
    g.fillText("TU MESA", f.x + f.w / 2, f.y + f.h);
  } else if (seatLabel) {
    g.fillStyle = "#2c4663";
    rr(g, f.x + f.w / 2 - 24, f.y + f.h - 9, 48, 11, 3);
    g.fill();
    g.fillStyle = "#f2c14e";
    g.font = "bold 7px Archivo, sans-serif";
    g.textAlign = "center";
    g.fillText(seatLabel, f.x + f.w / 2, f.y + f.h - 1);
  }
}

function drawFurniture(g: G, f: Furniture, t: number, seatLabel?: string) {
  switch (f.type) {
    case "desk":
      return drawDesk(g, f, t, false, seatLabel);
    case "playerDesk":
      return drawDesk(g, f, t, true);
    case "michaelDesk": {
      block(g, f.x, f.y, f.w, f.h, PAL.darkWoodTop, PAL.darkWood, 12);
      g.fillStyle = PAL.beige;
      rr(g, f.x + 12, f.y + 4, 34, 22, 3);
      g.fill();
      g.fillStyle = PAL.screen;
      g.fillRect(f.x + 16, f.y + 7, 26, 14);
      g.fillStyle = "#fff";
      rr(g, f.x + 90, f.y + 10, 12, 14, 2);
      g.fill();
      g.fillStyle = "#222";
      g.font = "bold 4px sans-serif";
      g.textAlign = "center";
      g.fillText("BEST", f.x + 96, f.y + 17);
      g.fillText("BOSS", f.x + 96, f.y + 21);
      g.fillStyle = "#c9a548";
      g.fillRect(f.x + 52, f.y + 30, 30, 7);
      return;
    }
    case "receptionDesk": {
      block(g, f.x, f.y, f.w, f.h, "#d8c3a0", "#8a6a48", 14, 10);
      if (f.h > f.w) {
        // Curved/vertical desk facing east into bullpen
        g.fillStyle = PAL.beige;
        rr(g, f.x + 8, f.y + 44, 20, 28, 3);
        g.fill();
        g.fillStyle = PAL.screen;
        g.fillRect(f.x + 12, f.y + 48, 12, 20);
        g.fillStyle = "#2b2f33";
        rr(g, f.x + 14, f.y + 82, 12, 16, 2);
        g.fill();
        g.fillStyle = "#3f6fa8";
        g.beginPath();
        g.ellipse(f.x + 24, f.y + 20, 9, 6, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#c9a548";
        g.fillRect(f.x + f.w - 11, f.y + 40, 6, 44);
      } else {
        g.fillStyle = PAL.beige;
        rr(g, f.x + 52, f.y + 2, 30, 18, 3);
        g.fill();
        g.fillStyle = PAL.screen;
        g.fillRect(f.x + 56, f.y + 4, 22, 12);
        g.fillStyle = "#2b2f33";
        rr(g, f.x + 90, f.y + 8, 16, 11, 2);
        g.fill();
        OWNER_DECOR["pam"]?.(g, f);
        g.fillStyle = "#c9a548";
        g.fillRect(f.x + 44, f.y + f.h - 12, 44, 7);
      }
      return;
    }
    case "confTable":
      block(g, f.x, f.y, f.w, f.h, "#9c7349", "#6d4e31", 12, 30);
      g.fillStyle = PAL.paper;
      for (const x of [150, 220, 300, 360]) g.fillRect(x, f.y + 20 + ((x / 10) % 3) * 8, 14, 10);
      g.fillStyle = "#2b2f33";
      g.beginPath();
      g.arc(f.x + f.w / 2, f.y + f.h / 2 - 6, 9, 0, Math.PI * 2);
      g.fill();
      return;
    case "counter":
      block(g, f.x, f.y, f.w, f.h, "#d7d2c6", "#8e8778", 12, 2);
      g.fillStyle = "#b9c2c8";
      g.fillRect(f.x + 150, f.y + 6, 40, 20);
      g.fillStyle = "#8f9aa1";
      g.fillRect(f.x + 156, f.y + 10, 28, 12);
      // coffee maker
      g.fillStyle = "#2b2f33";
      rr(g, f.x + 50, f.y + 2, 26, 26, 3);
      g.fill();
      g.fillStyle = "#5a3a22";
      g.beginPath();
      g.arc(f.x + 63, f.y + 20, 6, 0, Math.PI * 2);
      g.fill();
      // microwave
      g.fillStyle = "#e6e1d3";
      rr(g, f.x + 230, f.y + 2, 50, 26, 3);
      g.fill();
      g.fillStyle = "#3a3f44";
      g.fillRect(f.x + 234, f.y + 6, 32, 18);
      return;
    case "fridge":
      block(g, f.x, f.y, f.w, f.h, "#f3f1ea", "#c9c4b6", 22, 4);
      g.fillStyle = "#9aa3aa";
      g.fillRect(f.x + f.w - 10, f.y + 42, 3, 12);
      g.fillStyle = "#f2c14e";
      g.fillRect(f.x + 10, f.y + 44, 8, 6);
      g.fillStyle = "#e0476b";
      g.fillRect(f.x + 22, f.y + 46, 7, 7);
      return;
    case "vending": {
      const col = f.color ?? "#b5373c";
      block(g, f.x, f.y, f.w, f.h, shade(col, 20), col, 26, 4);
      g.fillStyle = "#1c2328";
      g.fillRect(f.x + 6, f.y + 32, f.w - 22, 20);
      const snack = ["#f2c14e", "#e0476b", "#3aa7a3", "#e8862f"];
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 4; c++) {
          g.fillStyle = snack[(r + c) % 4]!;
          g.fillRect(f.x + 8 + c * 7, f.y + 34 + r * 6, 5, 4);
        }
      g.fillStyle = "#c9ced2";
      g.fillRect(f.x + f.w - 13, f.y + 34, 7, 14);
      return;
    }
    case "roundTable":
      g.fillStyle = "rgba(15,20,25,0.18)";
      g.beginPath();
      g.ellipse(f.x + f.w / 2 + 3, f.y + f.h / 2 + 6, f.w / 2, f.h / 2.4, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#c2a57a";
      g.beginPath();
      g.ellipse(f.x + f.w / 2, f.y + f.h / 2, f.w / 2, f.h / 2.4, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#d4b88c";
      g.beginPath();
      g.ellipse(f.x + f.w / 2, f.y + f.h / 2 - 3, f.w / 2 - 4, f.h / 2.4 - 4, 0, 0, Math.PI * 2);
      g.fill();
      return;
    case "couch": {
      const col = f.color ?? "#7d5a4a";
      block(g, f.x, f.y, f.w, f.h, shade(col, 15), shade(col, -25), 8, 8);
      g.fillStyle = shade(col, -10);
      if (f.vertical) {
        g.fillRect(f.x + f.w - 12, f.y + 4, 8, f.h - 12);
        for (let i = 1; i < 3; i++) g.fillRect(f.x + 4, f.y + (i * (f.h - 8)) / 3, f.w - 16, 2);
      } else {
        g.fillRect(f.x + 4, f.y + 4, f.w - 8, 10);
        for (let i = 1; i < 3; i++) g.fillRect(f.x + (i * f.w) / 3, f.y + 14, 2, f.h - 22);
      }
      return;
    }
    case "plant": {
      const cx = f.x + f.w / 2;
      const cy = f.y + f.h / 2;
      g.fillStyle = "rgba(15,20,25,0.2)";
      g.beginPath();
      g.ellipse(cx + 2, cy + 12, 14, 5, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = PAL.pot;
      rr(g, cx - 10, cy, 20, 14, 3);
      g.fill();
      for (const [dx, dy, r, col] of [
        [0, -10, 12, PAL.plantLeaf],
        [-9, -4, 9, PAL.plantLeaf],
        [9, -4, 9, PAL.plantLeaf],
        [-3, -14, 7, PAL.plantLeafHi],
        [5, -8, 6, PAL.plantLeafHi],
      ] as const) {
        g.fillStyle = col;
        g.beginPath();
        g.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
        g.fill();
      }
      return;
    }
    case "cabinet": {
      const col = f.color ?? "#8f9aa1";
      block(g, f.x, f.y, f.w, f.h, shade(col, 18), col, 18, 2);
      g.fillStyle = shade(col, -30);
      for (let x = f.x + 6; x < f.x + f.w - 8; x += 26) g.fillRect(x + 6, f.y + f.h - 12, 10, 3);
      return;
    }
    case "copier":
      block(g, f.x, f.y, f.w, f.h, "#e3e0d6", "#a9a596", 18, 4);
      g.fillStyle = "#4a5056";
      g.fillRect(f.x + 8, f.y + 8, f.w - 30, 16);
      g.fillStyle = "#56e38a";
      g.fillRect(f.x + f.w - 18, f.y + 10, 8, 5);
      return;
    case "printer":
      block(g, f.x, f.y, f.w, f.h, "#d6d3c9", "#9d9a8e", 14, 4);
      g.fillStyle = PAL.paper;
      g.fillRect(f.x + 14, f.y + 4, f.w - 28, 10);
      return;
    case "shelf":
    case "bookshelf":
      block(g, f.x, f.y, f.w, f.h, "#8a6845", "#5f4730", 14, 2);
      for (let x = f.x + 4; x < f.x + f.w - 8; x += 9) {
        g.fillStyle = ["#3f6fa8", "#c8312f", "#e3b93a", "#3f7a4c", "#e6e1d3"][Math.floor(x) % 5]!;
        g.fillRect(x, f.y + 3, 7, f.h - 20);
      }
      return;
    case "rack":
      g.fillStyle = "rgba(15,20,25,0.2)";
      g.fillRect(f.x + 4, f.y + 6, f.w, f.h);
      g.fillStyle = "#3d5a80";
      g.fillRect(f.x, f.y, f.w, f.h);
      g.fillStyle = "#e3893a";
      for (let y = f.y; y < f.y + f.h; y += 50) g.fillRect(f.x, y, f.w, 4);
      for (let y = f.y + 6; y < f.y + f.h - 20; y += 50) {
        g.fillStyle = PAL.cardboard;
        g.fillRect(f.x + 4, y, f.w - 8, 18);
        g.fillStyle = PAL.cardboardDark;
        g.fillRect(f.x + 4, y + 22, f.w - 8, 18);
        g.fillStyle = "#fff";
        g.fillRect(f.x + 10, y + 6, 8, 5);
      }
      return;
    case "boxes":
      for (let i = 0; i < 4; i++) {
        const bx = f.x + (i % 2) * (f.w / 2);
        const by = f.y + Math.floor(i / 2) * (f.h / 2);
        block(g, bx, by, f.w / 2 - 2, f.h / 2 - 2, PAL.cardboard, PAL.cardboardDark, 8, 1);
        g.fillStyle = "rgba(255,255,255,0.4)";
        g.fillRect(bx + f.w / 4 - 2, by, 3, f.h / 2 - 10);
      }
      return;
    case "cooler":
      block(g, f.x, f.y, f.w, f.h, "#e6e1d3", "#b5aa90", 12, 4);
      g.fillStyle = "rgba(90,170,230,0.8)";
      g.beginPath();
      g.arc(f.x + f.w / 2, f.y + 6, 10, 0, Math.PI * 2);
      g.fill();
      return;
    case "tvCart":
      block(g, f.x, f.y, f.w, f.h, "#555", "#333", 10, 3);
      g.fillStyle = "#222";
      g.fillRect(f.x + 4, f.y - 10, f.w - 8, 24);
      g.fillStyle = "#3a5a7a";
      g.fillRect(f.x + 7, f.y - 7, f.w - 14, 16);
      return;
    case "partition":
      g.fillStyle = "#7b8a99";
      g.fillRect(f.x, f.y, f.w, f.h);
      g.fillStyle = "#93a3b2";
      g.fillRect(f.x, f.y, 4, f.h);
      return;
    case "forklift":
      block(g, f.x, f.y, f.w, f.h, "#f2b632", "#c18a1a", 12, 6);
      g.fillStyle = "#2b2f33";
      g.fillRect(f.x + 8, f.y + 20, f.w - 16, 30);
      g.fillStyle = "#6c757c";
      g.fillRect(f.x + 10, f.y - 18, 5, 24);
      g.fillRect(f.x + f.w - 15, f.y - 18, 5, 24);
      return;
    case "baler":
      block(g, f.x, f.y, f.w, f.h, "#5d7a6a", "#3e5548", 16, 4);
      g.fillStyle = "#c8312f";
      g.fillRect(f.x + 8, f.y + 8, 10, 10);
      return;
    case "pingpong":
      block(g, f.x, f.y, f.w, f.h, "#2f7a55", "#1e5239", 10, 3);
      g.strokeStyle = "#fff";
      g.lineWidth = 1.5;
      g.strokeRect(f.x + 3, f.y + 3, f.w - 6, f.h - 16);
      g.beginPath();
      g.moveTo(f.x + f.w / 2, f.y + 2);
      g.lineTo(f.x + f.w / 2, f.y + f.h - 12);
      g.stroke();
      g.fillStyle = "#ddd";
      g.fillRect(f.x + f.w / 2 - 1.5, f.y - 3, 3, f.h - 6);
      return;
    case "stairs":
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? "#b4b2aa" : "#a09e96";
        g.fillRect(f.x, f.y + i * (f.h / 8), f.w, f.h / 8);
      }
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(f.x, f.y + f.h - 20, f.w, 20);
      g.fillStyle = "#555";
      g.fillRect(f.x, f.y, 4, f.h);
      g.fillRect(f.x + f.w - 4, f.y, 4, f.h);
      return;
    case "partyTable":
      block(g, f.x, f.y, f.w, f.h, "#e9e4d6", "#a9a393", 8, 3);
      g.fillStyle = "#3aa7a3";
      g.fillRect(f.x + 10, f.y + 8, 20, 14);
      g.fillStyle = "#e0476b";
      g.beginPath();
      g.arc(f.x + f.w - 24, f.y + 18, 8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = PAL.paper;
      g.fillRect(f.x + 50, f.y + 10, 24, 16);
      return;
    case "sideTable":
      block(g, f.x, f.y, f.w, f.h, "#cf9658", "#8f5c2d", 10, 2);
      g.fillStyle = "#f4e6be";
      g.beginPath();
      g.arc(f.x + f.w / 2, f.y + f.h / 2 - 4, 6, 0, Math.PI * 2);
      g.fill();
      return;
  }
}

// ---------------- event decorations ----------------
interface Deco {
  y: number;
  draw: (g: G, t: number) => void;
}

function eventDecos(event: EventId | null): Deco[] {
  const out: Deco[] = [];
  const pumpkin = (x: number, y: number) =>
    out.push({
      y,
      draw: (g, t) => {
        const glow = g.createRadialGradient(x, y - 8, 2, x, y - 8, 40);
        glow.addColorStop(0, `rgba(255,170,60,${0.35 + Math.sin(t * 6 + x) * 0.08})`);
        glow.addColorStop(1, "rgba(255,170,60,0)");
        g.fillStyle = glow;
        g.fillRect(x - 40, y - 48, 80, 80);
        g.fillStyle = "#e8862f";
        g.beginPath();
        g.ellipse(x, y - 8, 13, 10, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#c46a1f";
        g.fillRect(x - 1, y - 18, 2, 18);
        g.fillStyle = "#3c7a33";
        g.fillRect(x - 1.5, y - 22, 3, 5);
        g.fillStyle = "#ffe17a";
        g.beginPath();
        g.moveTo(x - 7, y - 11);
        g.lineTo(x - 3, y - 11);
        g.lineTo(x - 5, y - 15);
        g.moveTo(x + 7, y - 11);
        g.lineTo(x + 3, y - 11);
        g.lineTo(x + 5, y - 15);
        g.fill();
        g.fillRect(x - 6, y - 6, 12, 2.5);
      },
    });
  const balloons = (x: number, y: number, cols: string[]) =>
    out.push({
      y,
      draw: (g, t) => {
        cols.forEach((col, i) => {
          const bx = x + (i - 1) * 10 + Math.sin(t * 1.5 + i) * 2;
          const by = y - 50 - i * 6;
          g.strokeStyle = "rgba(60,60,60,0.6)";
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(bx, by + 10);
          g.stroke();
          g.fillStyle = col;
          g.beginPath();
          g.ellipse(bx, by, 8, 10, 0, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = "rgba(255,255,255,0.4)";
          g.beginPath();
          g.arc(bx - 3, by - 4, 2, 0, Math.PI * 2);
          g.fill();
        });
      },
    });

  if (event === "halloween") {
    (
      [
        [270, 320],
        [450, 560],
        [1340, 560],
        [2130, 895],
        [70, 890],
        [2130, 240],
        [1980, 1460],
        [90, 1460],
      ] as const
    ).forEach(([x, y]) => pumpkin(x, y));
    // cobwebs in corners
    for (const [x, y, sx] of [
      [24, 40, 1],
      [2176, 40, -1],
      [24, 300, 1],
      [2176, 300, -1],
      [1020, 960, 1],
      [2176, 960, -1],
    ] as const) {
      out.push({
        y: y + 1,
        draw: (g) => {
          g.strokeStyle = "rgba(240,240,240,0.55)";
          g.lineWidth = 1;
          for (let i = 0; i < 5; i++) {
            const a = (i / 4) * (Math.PI / 2);
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x + sx * Math.cos(a) * 46, y + Math.sin(a) * 46);
            g.stroke();
          }
          for (const r of [14, 26, 38]) {
            g.beginPath();
            g.arc(x, y, r, sx > 0 ? 0 : Math.PI / 2, sx > 0 ? Math.PI / 2 : Math.PI);
            g.stroke();
          }
        },
      });
    }
  }
  if (event === "navidad") {
    out.push({
      y: 356,
      draw: (g, t) => {
        const x = 295;
        const y = 356;
        g.fillStyle = "#6d4a33";
        g.fillRect(x - 4, y - 10, 8, 10);
        for (const [w, yy] of [
          [30, -14],
          [24, -30],
          [17, -46],
        ] as const) {
          g.fillStyle = "#2e7d32";
          g.beginPath();
          g.moveTo(x - w, y + yy);
          g.lineTo(x, y + yy - 24);
          g.lineTo(x + w, y + yy);
          g.fill();
        }
        const cols = ["#e53935", "#fdd835", "#1e88e5", "#ffffff"];
        for (let i = 0; i < 12; i++) {
          g.fillStyle = Math.sin(t * 3 + i) > 0 ? cols[i % 4]! : "rgba(255,255,255,0.3)";
          g.beginPath();
          g.arc(x - 20 + ((i * 13) % 40), y - 20 - ((i * 7) % 44), 2.2, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = "#c8312f";
        g.fillRect(x - 28, y - 8, 14, 10);
        g.fillStyle = "#1e88e5";
        g.fillRect(x + 12, y - 6, 12, 8);
      },
    });
    out.push({
      y: 760,
      draw: (g) => {
        for (const [x, y] of [
          [350, 320],
          [1320, 320],
          [1860, 320],
        ] as const) {
          g.strokeStyle = "#2e7d32";
          g.lineWidth = 6;
          g.beginPath();
          g.arc(x, y + 10, 10, 0, Math.PI * 2);
          g.stroke();
          g.fillStyle = "#c8312f";
          g.fillRect(x - 3, y + 18, 6, 5);
        }
      },
    });
  }
  if (event === "cumplemichael") {
    balloons(360, 295, ["#3aa7a3", "#f2c14e", "#e0476b"]);
    balloons(650, 295, ["#e0476b", "#3aa7a3", "#f2c14e"]);
    balloons(1240, 360, ["#f2c14e", "#e0476b", "#3aa7a3"]);
    out.push({
      y: 300,
      draw: (g) => {
        g.fillStyle = "#e0476b";
        g.fillRect(380, 268, 260, 22);
        g.fillStyle = "#fff";
        g.font = "bold 13px 'Archivo Black', sans-serif";
        g.textAlign = "center";
        g.fillText("¡FELIZ CUMPLE, MICHAEL!", 510, 284);
      },
    });
  }
  if (event === "sanvalentin") {
    balloons(295, 345, ["#e0476b", "#f8bbd0", "#e0476b"]);
    balloons(1250, 880, ["#f8bbd0", "#e0476b", "#f8bbd0"]);
  }
  if (event === "pretzel") {
    out.push({
      y: 545,
      draw: (g) => {
        const x = 305;
        const y = 545;
        block(g, x - 34, y - 26, 68, 26, "#d8b07a", "#9a6a3a", 10, 3);
        g.fillStyle = "#c8312f";
        g.fillRect(x - 38, y - 58, 76, 10);
        g.fillStyle = "#fff";
        for (let i = 0; i < 6; i += 2) g.fillRect(x - 38 + i * 12.6, y - 58, 12.6, 10);
        g.fillStyle = "#6c757c";
        g.fillRect(x - 36, y - 48, 3, 24);
        g.fillRect(x + 33, y - 48, 3, 24);
        g.strokeStyle = "#9a5a2a";
        g.lineWidth = 3;
        for (const dx of [-16, 0, 16]) {
          g.beginPath();
          g.arc(x + dx - 3, y - 22, 4, 0, Math.PI * 2);
          g.arc(x + dx + 3, y - 22, 4, 0, Math.PI * 2);
          g.stroke();
        }
      },
    });
  }
  if (event === "sanpatricio") {
    balloons(280, 890, ["#2e7d32", "#66bb6a", "#2e7d32"]);
    balloons(1380, 860, ["#66bb6a", "#2e7d32", "#fdd835"]);
  }
  return out;
}

function episodeBannerDecos(decor: OfficeDecorKind | null): Deco[] {
  if (!decor) return [];
  const out: Deco[] = [];
  if (decor === "merger") {
    out.push({
      y: 295,
      draw: (g) => {
        g.fillStyle = "#1f3a5f";
        g.fillRect(365, 266, 290, 22);
        g.fillStyle = "#f2c14e";
        g.font = "bold 12px 'Archivo Black', sans-serif";
        g.textAlign = "center";
        g.fillText("¡BIENVENIDO, STAMFORD!", 510, 282);
      },
    });
  } else if (decor === "convict") {
    out.push({
      y: 268,
      draw: (g) => {
        g.fillStyle = "#6c3fb5";
        g.fillRect(725, 266, 230, 22);
        g.fillStyle = "#fff";
        g.font = "bold 12px 'Archivo Black', sans-serif";
        g.textAlign = "center";
        g.fillText("PRISON MIKE SEMINAR", 840, 282);
      },
    });
  } else if (decor === "funrun") {
    out.push({
      y: 295,
      draw: (g) => {
        g.fillStyle = "#166534";
        g.fillRect(355, 266, 310, 22);
        g.fillStyle = "#fff";
        g.font = "bold 11px 'Archivo Black', sans-serif";
        g.textAlign = "center";
        g.fillText("CARRERA CONTRA LA RABIA", 510, 282);
      },
    });
  }
  return out;
}

// ---------------- main render ----------------
export interface View {
  vw: number;
  vh: number;
  dpr: number;
  zoom: number;
  cam: { x: number; y: number };
}

export function renderWorld(g: G, game: Game, view: View) {
  const { vw, vh, dpr, zoom, cam } = view;
  const t = game.time;
  const eventId = game.event?.id ?? null;
  const epId = game.episode?.id ?? null;
  const decor = game.episode?.decor ?? null;
  const cacheKey = `${eventId ?? ""}|${epId ?? ""}`;
  if (!floorCache || floorCache.key !== cacheKey)
    floorCache = { canvas: buildFloor(eventId, decor), key: cacheKey };

  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = PAL.void;
  g.fillRect(0, 0, vw, vh);
  g.setTransform(dpr * zoom, 0, 0, dpr * zoom, -cam.x * zoom * dpr, -cam.y * zoom * dpr);
  g.imageSmoothingEnabled = true;
  g.drawImage(floorCache.canvas, 0, 0);

  const targetedObjects = game.targetedObjects();
  const targetedNPCs = game.targetedNPCs();
  const offers = game.npcsWithOffers();
  const deskLabelByOriginalOwner: Record<string, string> = {};
  for (const [npcId, seatName] of Object.entries(game.seatOverrides)) {
    if (seatName.startsWith("seat_")) {
      const targetOwner = seatName.slice("seat_".length);
      deskLabelByOriginalOwner[targetOwner] = npcId.toUpperCase();
    }
  }

  // dundies on the floor
  for (const d of DUNDIES) {
    if (game.dundiesFound.includes(d.id)) continue;
    drawItemSprite(g, "trophy", d.x, d.y, t);
    const sp = (Math.sin(t * 4 + d.x) + 1) / 2;
    g.fillStyle = `rgba(255,240,180,${sp * 0.8})`;
    g.fillRect(d.x + 5, d.y - 14, 2, 2);
  }

  // Drawables sorted by y
  const list: { y: number; draw: () => void }[] = [];
  for (const w of WALLS) list.push({ y: w.y + w.h, draw: () => drawWall(g, w, t, eventId) });
  for (const f of getActiveFurniture()) {
    const label = f.owner
      ? (deskLabelByOriginalOwner[f.owner] ??
        (STAMFORD_DESK_OWNERS.has(f.owner) ? f.owner.toUpperCase() : undefined))
      : undefined;
    list.push({ y: f.y + f.h, draw: () => drawFurniture(g, f, t, label) });
  }
  for (const d of eventDecos(eventId)) list.push({ y: d.y, draw: () => d.draw(g, t) });
  for (const d of episodeBannerDecos(decor)) list.push({ y: d.y, draw: () => d.draw(g, t) });
  const activeEvEffect = game.activeOfficeEventEffect();
  // Active canon episode props on furniture & walls
  if (epId === "s1e1" || activeEvEffect === "gelatin_stapler") {
    list.push({
      y: 531,
      draw: () => {
        // Gelatin-encased stapler on Dwight's desk
        g.fillStyle = "rgba(240,210,55,0.88)";
        rr(g, 595, 492, 20, 15, 4);
        g.fill();
        g.fillStyle = "#c8312f";
        rr(g, 599, 497, 12, 5, 2);
        g.fill();
      },
    });
  }
  if (epId === "s2e10" || activeEvEffect === "yankee_swap") {
    list.push({
      y: 209,
      draw: () => {
        // Gift boxes + white iPod box on conference table
        g.fillStyle = "#c8312f";
        g.fillRect(825, 160, 16, 14);
        g.fillStyle = "#f2c14e";
        g.fillRect(831, 160, 4, 14);
        g.fillStyle = "#2f6ea3";
        g.fillRect(895, 162, 16, 12);
        g.fillStyle = "#ffffff";
        rr(g, 862, 158, 13, 17, 2);
        g.fill();
        g.fillStyle = "#3aa7a3";
        g.fillRect(865, 161, 7, 6);
      },
    });
  }
  if (epId === "s2e22") {
    list.push({
      y: 1235,
      draw: () => {
        // Poker chips & cards on casino table in Warehouse
        for (const [cx, cy, col] of [
          [1255, 1175, "#e53935"],
          [1265, 1185, "#1e88e5"],
          [1335, 1178, "#fdd835"],
          [1345, 1188, "#43a047"],
        ] as const) {
          g.fillStyle = col;
          g.beginPath();
          g.arc(cx, cy, 4, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = "#ffffff";
        g.fillRect(1292, 1172, 10, 13);
        g.fillRect(1300, 1176, 10, 13);
      },
    });
  }
  if (epId === "s3e13" && (game.mins >= 562 || activeEvEffect === "wall_hole")) {
    list.push({
      y: 365,
      draw: () => {
        // Punched drywall hole near Annex entrance
        g.fillStyle = "#241d19";
        g.beginPath();
        g.ellipse(1734, 342, 7, 10, 0.2, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#8a7f6c";
        g.lineWidth = 1.5;
        g.stroke();
      },
    });
  }
  if (epId === "s4e1") {
    list.push({
      y: 530,
      draw: () => {
        // Fun Run water cups next to starting line
        for (const cx of [318, 328, 338]) {
          g.fillStyle = "#ffffff";
          g.fillRect(cx, 506, 6, 8);
          g.fillStyle = "#4fc3f7";
          g.fillRect(cx + 1, 506, 4, 2);
        }
      },
    });
  }
  for (const o of OBJECTS) {
    if (!targetedObjects.has(o.id)) continue;
    list.push({
      y: o.y + 1,
      draw: () => {
        const pulse = (Math.sin(t * 4) + 1) / 2;
        g.strokeStyle = `rgba(242,193,78,${0.4 + pulse * 0.5})`;
        g.lineWidth = 2.5;
        g.beginPath();
        g.ellipse(o.x, o.y + 4, 16 + pulse * 6, 7 + pulse * 2.5, 0, 0, Math.PI * 2);
        g.stroke();
        drawItemSprite(g, o.sprite, o.x, o.y - 4, t);
        // arrow
        const ay = o.y - 30 - pulse * 5;
        g.fillStyle = PAL.marker;
        g.strokeStyle = PAL.markerDark;
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(o.x - 7, ay - 8);
        g.lineTo(o.x + 7, ay - 8);
        g.lineTo(o.x, ay);
        g.closePath();
        g.fill();
        g.stroke();
      },
    });
  }
  for (const n of game.npcs) {
    list.push({
      y: n.y,
      draw: () => {
        drawCharacter(g, {
          x: n.x,
          y: n.y,
          facing: n.facing,
          moving: n.moving,
          walkT: n.walkT,
          look: n.def.look,
          costume:
            (n.def.id === "michael" ? game.cinematicCostume : undefined) ??
            game.event?.costumes[n.def.id] ??
            undefined,
        });
        // Diversity Day sticky notes on foreheads inside conf
        if (
          (activeEvEffect === "sticky_notes" ||
            (epId === "s1e2" && n.x >= 680 && n.x <= 1080 && n.y <= 280)) &&
          n.facing !== "up"
        ) {
          g.fillStyle = n.def.id === "dwight" ? "#fff59d" : "#f8fafc";
          g.strokeStyle = "#94a3b8";
          g.lineWidth = 0.8;
          g.fillRect(n.x - 5, n.y - 54, 10, 6);
          g.strokeRect(n.x - 5, n.y - 54, 10, 6);
        }
        // Prison Mike purple bandana
        if (
          n.def.id === "michael" &&
          (activeEvEffect === "prison_mike" || (epId === "s3e9" && game.mins < 630))
        ) {
          g.fillStyle = "#6c3fb5";
          rr(g, n.x - 11.5, n.y - 55, 23, 7, 2);
          g.fill();
          g.fillStyle = "#532c94";
          g.beginPath();
          g.arc(n.x + 11, n.y - 52, 3, 0, Math.PI * 2);
          g.fill();
        }
      },
    });
  }
  const p = game.player;
  list.push({
    y: p.y,
    draw: () => {
      g.strokeStyle = `rgba(242,193,78,0.8)`;
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(p.x, p.y + 1, 16, 6.5, 0, 0, Math.PI * 2);
      g.stroke();
      drawCharacter(g, {
        x: p.x,
        y: p.y,
        facing: p.facing,
        moving: p.moving,
        walkT: p.walkT,
        isPlayer: true,
        costume: game.playerSkin ?? game.event?.playerCostume,
        look: game.playerLook,
      });
      if (game.meetingOpen) {
        g.fillStyle = "#f2c14e";
        g.strokeStyle = "#1b232b";
        g.lineWidth = 1.5;
        rr(g, p.x - 11, p.y - 78, 22, 18, 6);
        g.fill();
        g.stroke();
        g.fillStyle = "#1b232b";
        g.font = "12px sans-serif";
        g.textAlign = "center";
        g.fillText("✋", p.x, p.y - 65);
      }
    },
  });
  list.sort((a, b) => a.y - b.y);
  for (const d of list) d.draw();

  // Names, markers
  g.textAlign = "center";
  for (const n of game.npcs) {
    const dist = Math.hypot(n.x - p.x, n.y - p.y);
    if (dist < 280) {
      const alpha = Math.min(1, (280 - dist) / 80);
      g.globalAlpha = alpha;
      g.font = "700 11px Archivo, sans-serif";
      const name = n.def.name.split(" ")[0] ?? n.def.name;
      const w = g.measureText(name).width + 12;
      g.fillStyle = "rgba(24,32,40,0.78)";
      rr(g, n.x - w / 2, n.y + 6, w, 15, 7);
      g.fill();
      g.fillStyle = "#fff";
      g.fillText(name, n.x, n.y + 17);
      if (!game.isCinematic && dist < 150 && n.action && n.action !== "Charlando") {
        g.font = "italic 600 10px Archivo, sans-serif";
        g.fillStyle = "rgba(20,26,32,0.85)";
        g.fillText(n.action, n.x, n.y + 32);
      }
      g.globalAlpha = 1;
    }
    if (!game.isCinematic) {
      const markY = n.y - 80 + Math.sin(t * 4 + n.x) * 3;
      if (game.approachingNpcId() === n.def.id) drawBadge(g, n.x, markY, "💬", "#38bdf8");
      else if (targetedNPCs.has(n.def.id)) drawBadge(g, n.x, markY, "?", PAL.teal);
      else if (offers.has(n.def.id)) drawBadge(g, n.x, markY, "!", PAL.marker);
    }
  }

  // Screen-space overlays
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawLighting(g, game, vw, vh);
  if (!game.isCinematic) {
    drawOffscreenArrows(g, game, view);
    drawBubblesScreenSpace(g, game, view);
    drawHoverScreenSpace(g, game, view);
  }
}

function drawBadge(g: G, x: number, y: number, text: string, col: string) {
  g.fillStyle = col;
  g.strokeStyle = "rgba(20,26,32,0.85)";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x, y, 10, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(x - 4, y + 8);
  g.lineTo(x, y + 15);
  g.lineTo(x + 4, y + 8);
  g.fill();
  g.fillStyle = "#1b232b";
  g.font = "900 13px 'Archivo Black', sans-serif";
  g.textAlign = "center";
  g.fillText(text, x, y + 5);
}

function wrap(g: G, text: string, max: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (g.measureText(test).width > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlapsRect(a: ScreenRect, b: ScreenRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function hudObstructions(
  game: Game,
  vw: number,
  vh: number,
): { safeTop: number; safeBottom: number; boxes: ScreenRect[] } {
  const modalOpen = !!(
    game.dialog ||
    game.chatWith ||
    game.pc ||
    game.journal ||
    game.paused ||
    game.meetingOpen
  );
  if (modalOpen) {
    return { safeTop: 72, safeBottom: vh - 16, boxes: [{ x: 0, y: 0, w: vw, h: 72 }] };
  }
  const hasInv = Object.keys(game.inventory).length > 0;
  const boxes: ScreenRect[] = [
    // Top bar (brand + clock/stats strip, generous vertical clearance so bubbles never hide behind it)
    { x: 0, y: 0, w: vw, h: vw < 1100 ? 104 : 76 },
    // Agenda panel (top-right, including daily objective box)
    { x: Math.max(0, vw - 310), y: 0, w: 310, h: 332 },
    // Controls panel (bottom-left)
    { x: 0, y: Math.max(0, vh - 178), w: 344, h: 178 },
    // Minimap (bottom-right)
    { x: Math.max(0, vw - 246), y: Math.max(0, vh - 184), w: 246, h: 184 },
  ];
  if (hasInv) {
    boxes.push({ x: vw * 0.22, y: Math.max(0, vh - 68), w: vw * 0.56, h: 68 });
  }
  return { safeTop: vw < 1100 ? 104 : 78, safeBottom: vh - 16, boxes };
}

function resolveScreenPlacement(
  ax: number,
  ayAbove: number,
  ayBelow: number,
  w: number,
  h: number,
  vw: number,
  vh: number,
  safeTop: number,
  safeBottom: number,
  avoid: ScreenRect[],
): { bx: number; by: number; tailOnBottom: boolean } {
  const clampX = (x: number) => Math.max(12, Math.min(vw - w - 12, x));
  const clampY = (y: number) => Math.max(safeTop, Math.min(safeBottom - h, y));

  const tryPos = (bx: number, by: number, tailOnBottom: boolean) => {
    const rect: ScreenRect = { x: bx, y: by, w, h };
    const hits = avoid.some((box) => overlapsRect(rect, box));
    return { bx, by, tailOnBottom, hits };
  };

  // Candidate 1: Directly above head
  const c1 = tryPos(clampX(ax - w / 2), ayAbove - h, true);
  if (!c1.hits && c1.by >= safeTop && c1.by + h <= safeBottom) return c1;

  // Candidate 2: Flip below speaker's feet if clipped at top or hitting top HUD
  const c2 = tryPos(clampX(ax - w / 2), ayBelow, false);
  if (!c2.hits && c2.by >= safeTop && c2.by + h <= safeBottom) return c2;

  // Candidate 3: Push out of overlapping HUD panels vertically or horizontally
  let bx = clampX(ax - w / 2);
  let by = ayAbove - h < safeTop ? ayBelow : clampY(ayAbove - h);
  let tailOnBottom = by < ayAbove;

  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    const cur: ScreenRect = { x: bx, y: by, w, h };
    for (const box of avoid) {
      if (!overlapsRect(cur, box)) continue;
      moved = true;
      // Push below top bars, above bottom bars, or horizontally inward toward center
      if (box.y === 0 && box.h < vh * 0.45 && by < box.y + box.h) {
        const shiftedDown = box.y + box.h + 8;
        if (shiftedDown + h <= safeBottom) {
          by = shiftedDown;
          tailOnBottom = by + h <= ayAbove + 18;
          continue;
        }
      }
      if (box.y > vh * 0.5 && by + h > box.y) {
        const shiftedUp = box.y - h - 10;
        if (shiftedUp >= safeTop) {
          by = shiftedUp;
          tailOnBottom = true;
          continue;
        }
      }
      if (box.x > vw * 0.5) {
        bx = clampX(box.x - w - 10);
      } else {
        bx = clampX(box.x + box.w + 10);
      }
    }
    if (!moved) break;
  }

  return {
    bx: clampX(bx),
    by: clampY(by),
    tailOnBottom,
  };
}

function drawBubblesScreenSpace(g: G, game: Game, view: View) {
  const { vw, vh, zoom, cam } = view;
  const { safeTop, safeBottom, boxes } = hudObstructions(game, vw, vh);
  const placed: ScreenRect[] = [...boxes];

  for (const b of game.bubbles()) {
    const ax = (b.x - cam.x) * zoom;
    const ayAbove = (b.y - cam.y) * zoom;
    const ayBelow = (b.y + 82 - cam.y) * zoom;
    if (ax < -60 || ax > vw + 60 || ayAbove < -90 || ayAbove > vh + 90) continue;

    g.font = b.muted ? "900 16px Archivo, sans-serif" : "600 12px Archivo, sans-serif";
    const lines = b.muted ? [b.text] : wrap(g, b.text, 200);
    const lh = 15;
    const w = Math.max(...lines.map((l) => g.measureText(l).width)) + 20;
    const h = lines.length * lh + 12;

    const { bx, by, tailOnBottom } = resolveScreenPlacement(
      ax,
      ayAbove,
      ayBelow,
      w,
      h,
      vw,
      vh,
      safeTop,
      safeBottom,
      placed,
    );
    placed.push({ x: bx - 4, y: by - 4, w: w + 8, h: h + 8 });

    const tailX = Math.max(bx + 14, Math.min(bx + w - 14, ax));
    g.fillStyle = "rgba(15,20,25,0.2)";
    rr(g, bx + 3, by + 3, w, h, 10);
    g.fill();
    g.fillStyle = b.muted ? "rgba(255,253,246,0.88)" : PAL.bubble;
    g.strokeStyle = PAL.bubbleStroke;
    g.lineWidth = 2;
    rr(g, bx, by, w, h, 10);
    g.fill();
    g.stroke();

    if (tailOnBottom) {
      g.beginPath();
      g.moveTo(tailX - 7, by + h - 1);
      g.lineTo(tailX, by + h + 9);
      g.lineTo(tailX + 7, by + h - 1);
      g.fill();
      g.beginPath();
      g.moveTo(tailX - 7, by + h);
      g.lineTo(tailX, by + h + 9);
      g.lineTo(tailX + 7, by + h);
      g.stroke();
    } else {
      g.beginPath();
      g.moveTo(tailX - 7, by + 1);
      g.lineTo(tailX, by - 9);
      g.lineTo(tailX + 7, by + 1);
      g.fill();
      g.beginPath();
      g.moveTo(tailX - 7, by);
      g.lineTo(tailX, by - 9);
      g.lineTo(tailX + 7, by);
      g.stroke();
    }

    g.fillStyle = b.muted ? PAL.muted : PAL.ink;
    g.textAlign = "center";
    lines.forEach((l, i) => g.fillText(l, bx + w / 2, by + 18 + i * lh - (b.muted ? 2 : 0)));
  }
}

function drawHoverScreenSpace(g: G, game: Game, view: View) {
  const h = game.hover;
  if (!h || game.frozen) return;
  const { vw, vh, zoom, cam } = view;
  const { safeTop, safeBottom, boxes } = hudObstructions(game, vw, vh);
  const sx = (h.x - cam.x) * zoom;
  const sy = (h.y - cam.y) * zoom;
  g.font = "800 11px Archivo, sans-serif";
  const w = g.measureText(h.label).width + 18;
  const bh = 20;
  const { bx, by } = resolveScreenPlacement(
    sx,
    sy - 2,
    sy + 80,
    w,
    bh,
    vw,
    vh,
    safeTop,
    safeBottom,
    boxes,
  );
  g.fillStyle = "rgba(24,32,40,0.92)";
  rr(g, bx, by, w, bh, 6);
  g.fill();
  g.fillStyle = PAL.marker;
  g.textAlign = "center";
  g.fillText(h.label, bx + w / 2, by + 14);
}

function drawLighting(g: G, game: Game, vw: number, vh: number) {
  const m = game.mins;
  const ev = game.event?.id;
  // time of day tint
  if (m < 11 * 60) {
    g.fillStyle = `rgba(170,200,255,${0.07 * (1 - (m - 540) / 120)})`;
    g.fillRect(0, 0, vw, vh);
  } else if (m > 14.5 * 60) {
    const k = Math.min(1, (m - 870) / 150);
    g.fillStyle = `rgba(255,150,60,${0.12 * k})`;
    g.fillRect(0, 0, vw, vh);
  }
  if (ev === "halloween") {
    g.fillStyle = "rgba(40,15,70,0.22)";
    g.fillRect(0, 0, vw, vh);
    const t = game.time;
    g.fillStyle = "rgba(20,10,30,0.85)";
    for (let i = 0; i < 4; i++) {
      const bx = ((t * 60 + i * 400) % (vw + 200)) - 100;
      const by = 80 + i * 90 + Math.sin(t * 2 + i) * 30;
      const flap = Math.sin(t * 14 + i) * 6;
      g.beginPath();
      g.moveTo(bx, by);
      g.quadraticCurveTo(bx - 10, by - 8 - flap, bx - 18, by + 2);
      g.quadraticCurveTo(bx - 9, by - 2, bx, by + 4);
      g.quadraticCurveTo(bx + 9, by - 2, bx + 18, by + 2);
      g.quadraticCurveTo(bx + 10, by - 8 - flap, bx, by);
      g.fill();
    }
  }
  if (ev === "navidad") {
    g.fillStyle = "rgba(255,255,255,0.8)";
    const t = game.time;
    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + Math.sin(t + i) * 20) % vw;
      const y = (i * 53 + t * (30 + (i % 5) * 8)) % vh;
      g.beginPath();
      g.arc(x, y, 1.5 + (i % 3) * 0.6, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (ev === "sanvalentin") {
    g.fillStyle = "rgba(255,120,160,0.06)";
    g.fillRect(0, 0, vw, vh);
  }
  if (ev === "sanpatricio") {
    g.fillStyle = "rgba(80,200,110,0.06)";
    g.fillRect(0, 0, vw, vh);
  }
  const vg = g.createRadialGradient(
    vw / 2,
    vh / 2,
    Math.min(vw, vh) * 0.35,
    vw / 2,
    vh / 2,
    Math.max(vw, vh) * 0.75,
  );
  vg.addColorStop(0, "rgba(10,14,20,0)");
  vg.addColorStop(1, ev === "halloween" ? "rgba(10,5,20,0.6)" : "rgba(10,14,20,0.35)");
  g.fillStyle = vg;
  g.fillRect(0, 0, vw, vh);
}

function drawOffscreenArrows(g: G, game: Game, view: View) {
  const { vw, vh, zoom, cam } = view;
  const targets: { x: number; y: number; col: string }[] = [];
  const tObj = game.targetedObjects();
  for (const o of OBJECTS) if (tObj.has(o.id)) targets.push({ x: o.x, y: o.y, col: PAL.marker });
  const tNpc = game.targetedNPCs();
  for (const n of game.npcs)
    if (tNpc.has(n.def.id)) targets.push({ x: n.x, y: n.y - 30, col: PAL.teal });
  const cx = vw / 2;
  const cy = vh / 2;
  for (const tg of targets) {
    const sx = (tg.x - cam.x) * zoom;
    const sy = (tg.y - cam.y) * zoom;
    if (sx > 30 && sx < vw - 30 && sy > 30 && sy < vh - 30) continue;
    const ang = Math.atan2(sy - cy, sx - cx);
    const margin = 46;
    const kx = (vw / 2 - margin) / Math.abs(Math.cos(ang) || 1e-6);
    const ky = (vh / 2 - margin) / Math.abs(Math.sin(ang) || 1e-6);
    const k = Math.min(kx, ky);
    const ax = cx + Math.cos(ang) * k;
    const ay = cy + Math.sin(ang) * k;
    g.save();
    g.translate(ax, ay);
    g.rotate(ang);
    g.fillStyle = tg.col;
    g.strokeStyle = "rgba(20,26,32,0.9)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(14, 0);
    g.lineTo(-8, -10);
    g.lineTo(-3, 0);
    g.lineTo(-8, 10);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }
}

// ---------------- minimap ----------------
export function renderMinimap(g: G, game: Game, w: number, h: number, dpr: number) {
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const playerFloor = floorOfY(game.player.y);
  const yMin = playerFloor === 0 ? 0 : FLOOR_SPLIT_Y;
  const yMax = playerFloor === 0 ? FLOOR_SPLIT_Y : WORLD.h;
  const floorH = Math.max(1, yMax - yMin);
  const sx = w / WORLD.w;
  const sy = h / floorH;
  const py = (y: number) => (y - yMin) * sy;

  g.fillStyle = "#26313b";
  g.fillRect(0, 0, w, h);
  const floorCol: Record<string, string> = {
    carpet: "#7d8790",
    carpetDark: "#62606a",
    carpetBlue: "#567189",
    carpetGreen: "#7c8b7c",
    carpetWarm: "#8a7b6c",
    wood: "#a8865a",
    checker: "#cfc8b6",
    tile: "#bdbbb3",
    concrete: "#97978f",
  };
  for (const r of ROOMS) {
    if (floorOfY(r.y + r.h * 0.5) !== playerFloor) continue;
    g.fillStyle = floorCol[r.floor] ?? "#888";
    g.fillRect(r.x * sx, py(r.y), r.w * sx, r.h * sy);
  }
  if (playerFloor === 0) {
    g.fillStyle = "#1a2028";
    g.fillRect(
      STAIRWELL_HOLE.x * sx,
      py(STAIRWELL_HOLE.y),
      STAIRWELL_HOLE.w * sx,
      STAIRWELL_HOLE.h * sy,
    );
  }
  g.fillStyle = "#1b232b";
  for (const wl of WALLS) {
    if (floorOfY(wl.y + Math.min(wl.h, 24) * 0.5) !== playerFloor) continue;
    g.fillRect(wl.x * sx, py(wl.y), Math.max(1, wl.w * sx), Math.max(1, wl.h * sy * 0.6));
  }
  g.fillStyle = "rgba(60,50,40,0.6)";
  for (const f of getActiveFurniture()) {
    if (floorOfY(f.y + f.h * 0.5) !== playerFloor) continue;
    g.fillRect(f.x * sx, py(f.y), f.w * sx, f.h * sy);
  }

  for (const pt of FLOOR_PORTALS) {
    if (pt.fromFloor !== playerFloor) continue;
    const px = pt.x * sx;
    const pyPt = py(pt.y);
    g.fillStyle = pt.kind === "stairs" ? "#f2c14e" : "#4fc3f7";
    g.strokeStyle = "#10171f";
    g.lineWidth = 1;
    g.beginPath();
    g.rect(px - 3.5, pyPt - 3.5, 7, 7);
    g.fill();
    g.stroke();
  }

  const tObj = game.targetedObjects();
  const tNpc = game.targetedNPCs();
  const offers = game.npcsWithOffers();
  for (const o of OBJECTS) {
    if (!tObj.has(o.id) || floorOfY(o.y) !== playerFloor) continue;
    g.fillStyle = PAL.marker;
    g.beginPath();
    g.arc(o.x * sx, py(o.y), 3.5, 0, Math.PI * 2);
    g.fill();
  }
  for (const n of game.npcs) {
    if (floorOfY(n.y) !== playerFloor) continue;
    g.fillStyle = tNpc.has(n.def.id) ? PAL.teal : offers.has(n.def.id) ? PAL.marker : "#e9e4d6";
    g.beginPath();
    g.arc(n.x * sx, py(n.y), tNpc.has(n.def.id) || offers.has(n.def.id) ? 3 : 2, 0, Math.PI * 2);
    g.fill();
  }
  const activeEv = game.getSnapshot().activeOfficeEvent;
  if (activeEv) {
    const pos = SPOTS[activeEv.spot];
    if (pos) {
      const pulse = (Math.sin(game.time * 5) + 1) / 2;
      g.strokeStyle = `rgba(242,193,78,${0.55 + pulse * 0.45})`;
      g.lineWidth = 2;
      if (floorOfY(pos.y) === playerFloor) {
        g.beginPath();
        g.arc(pos.x * sx, py(pos.y), 6 + pulse * 5, 0, Math.PI * 2);
        g.stroke();
      } else {
        for (const pt of FLOOR_PORTALS) {
          if (pt.fromFloor !== playerFloor) continue;
          g.beginPath();
          g.arc(pt.x * sx, py(pt.y), 5 + pulse * 4, 0, Math.PI * 2);
          g.stroke();
        }
      }
    }
  }
  g.fillStyle = "#4fc3f7";
  g.strokeStyle = "#fff";
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(game.player.x * sx, py(game.player.y), 4, 0, Math.PI * 2);
  g.fill();
  g.stroke();
}

export function portraitOf(id: string) {
  return CHAR_BY_ID[id];
}

export { SPOTS };
