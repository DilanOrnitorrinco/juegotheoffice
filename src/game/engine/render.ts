import { CHAR_BY_ID } from "../data/characters";
import { ELEVATOR, FURNITURE, ROOMS, SPOTS, WALLS, WALL_CAP, WINDOWS, WORLD, seatOf, type FloorKind, type Furniture, type Wall } from "../data/map";
import { DUNDIES, OBJECTS } from "../data/objects";
import type { EventId } from "../types";
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
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
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

let floorCache: { canvas: HTMLCanvasElement; event: EventId | null } | null = null;

function buildFloor(event: EventId | null): HTMLCanvasElement {
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
  g.strokeStyle = "rgba(40,60,40,0.25)";
  g.lineWidth = 3;
  g.strokeRect(1448, 440, 520, 400);

  // Rugs
  g.fillStyle = "#7c3e3a";
  rr(g, 840, 225, 250, 110, 8);
  g.fill();
  g.strokeStyle = "#d5b37a";
  g.lineWidth = 3;
  rr(g, 848, 233, 234, 94, 6);
  g.stroke();
  g.fillStyle = "rgba(60,80,110,0.45)";
  rr(g, 560, 270, 170, 90, 10);
  g.fill();

  // Warehouse markings
  g.strokeStyle = "#e3b93a";
  g.lineWidth = 5;
  g.setLineDash([24, 14]);
  g.beginPath();
  g.moveTo(1220, 1230);
  g.lineTo(1960, 1230);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = "rgba(227,185,58,0.9)";
  for (let x = 1800; x < 1970; x += 28) {
    g.save();
    g.beginPath();
    g.rect(1795, 1300, 175, 76);
    g.clip();
    g.beginPath();
    g.moveTo(x, 1300);
    g.lineTo(x + 14, 1300);
    g.lineTo(x - 30, 1376);
    g.lineTo(x - 44, 1376);
    g.fill();
    g.restore();
  }
  g.fillStyle = "rgba(30,30,30,0.6)";
  g.font = "bold 14px Archivo, sans-serif";
  g.textAlign = "center";
  g.fillText("EXPEDICIÓN", 1885, 1292);

  // Window light beams
  for (const w of WINDOWS) {
    const grd = g.createLinearGradient(0, 40, 0, 300);
    grd.addColorStop(0, "rgba(255,248,220,0.30)");
    grd.addColorStop(1, "rgba(255,248,220,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(w.x, 40);
    g.lineTo(w.x + w.w, 40);
    g.lineTo(w.x + w.w + 70, 280);
    g.lineTo(w.x + 50, 280);
    g.closePath();
    g.fill();
  }

  // Room names painted subtly
  g.font = "900 22px 'Archivo Black', Archivo, sans-serif";
  g.textAlign = "center";
  g.fillStyle = PAL.label;
  const labelAt: Record<string, [number, number]> = {
    conf: [270, 345],
    reception: [640, 375],
    michael: [960, 345],
    kitchen: [1690, 365],
    bullpen: [810, 830],
    accounting: [1700, 830],
    annex: [310, 1360],
    archive: [980, 1360],
    warehouse: [1520, 1355],
  };
  for (const r of ROOMS) {
    const at = labelAt[r.id];
    if (at) g.fillText(r.name, at[0], at[1]);
  }

  // Event floor decor
  if (event === "sanpatricio") {
    g.fillStyle = "rgba(47,154,79,0.35)";
    for (const [x, y] of [[300, 560], [820, 760], [1250, 560], [1700, 760], [990, 290]] as const) {
      for (const [dx, dy] of [[0, -10], [-9, 2], [9, 2]] as const) {
        g.beginPath();
        g.arc(x + dx, y + dy, 9, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  if (event === "halloween") {
    g.fillStyle = "rgba(160,80,20,0.55)";
    let s = 3;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 90; i++) {
      g.beginPath();
      g.ellipse(60 + rnd() * 1880, 420 + rnd() * 440, 5, 3, rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (event === "sanvalentin") {
    g.fillStyle = "rgba(224,71,107,0.4)";
    let s = 9;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 70; i++) {
      const x = 60 + rnd() * 1880;
      const y = 420 + rnd() * 440;
      g.beginPath();
      g.ellipse(x, y, 4, 2.5, rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }

  // Chairs (drawn on the floor so people sit "on" them)
  for (const f of FURNITURE) {
    if (f.seat && f.owner) drawChair(g, seatOf(f).x, seatOf(f).y, f.seat === "north");
  }
  // Conference chairs
  for (const x of [150, 210, 270, 330, 390]) {
    drawChair(g, x, 150, false);
    drawChair(g, x, 282, true);
  }
  // Michael visitor chairs
  drawChair(g, 930, 226, true);
  drawChair(g, 1000, 226, true);
  // Kitchen chairs
  for (const [x, y] of [[1505, 255], [1625, 255], [1695, 255], [1815, 255]] as const) drawChair(g, x, y, false);
  return c;
}

function drawChair(g: G, x: number, y: number, backNorth: boolean) {
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
  if (backNorth) rr(g, x - 12, y - 18, 24, 7, 3);
  else rr(g, x - 12, y + 4, 24, 7, 3);
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
    // Elevator
    g.fillStyle = "#8f9aa1";
    g.fillRect(ELEVATOR.x, fy + 1, ELEVATOR.w, fh - 4);
    g.fillStyle = "#b9c2c8";
    g.fillRect(ELEVATOR.x + 3, fy + 3, ELEVATOR.w / 2 - 4, fh - 8);
    g.fillRect(ELEVATOR.x + ELEVATOR.w / 2 + 1, fy + 3, ELEVATOR.w / 2 - 4, fh - 8);
    // Whiteboard in conference
    g.fillStyle = "#f6f6f2";
    g.fillRect(170, fy + 2, 200, fh - 8);
    g.strokeStyle = "#8a9399";
    g.lineWidth = 2;
    g.strokeRect(170, fy + 2, 200, fh - 8);
    g.strokeStyle = "#2f6ea3";
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(180, fy + 8);
    g.lineTo(240, fy + 8);
    g.moveTo(180, fy + 13);
    g.lineTo(220, fy + 13);
    g.stroke();
    g.strokeStyle = "#c8312f";
    g.beginPath();
    g.arc(320, fy + 12, 6, 0, Math.PI * 2);
    g.stroke();
    // Bathroom doors in hall
    for (const [x, sym] of [[1190, "♂"], [1320, "♀"]] as const) {
      g.fillStyle = "#8b7158";
      g.fillRect(x, fy + 1, 40, fh - 4);
      g.fillStyle = "#e8e2d2";
      g.font = "bold 12px sans-serif";
      g.textAlign = "center";
      g.fillText(sym, x + 20, fy + 16);
    }
    // Dunder Mifflin sign above reception
    g.fillStyle = "#1f3a5f";
    g.fillRect(552, fy + 3, 80, 14);
    g.fillStyle = "#fff";
    g.font = "bold 8px Archivo, sans-serif";
    g.fillText("DUNDER MIFFLIN", 592, fy + 13);
  }
  // Event wall decor
  if (event === "navidad" || event === "halloween" || event === "sanpatricio" || event === "sanvalentin" || event === "cumplemichael") {
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
function block(g: G, x: number, y: number, w: number, h: number, top: string, front: string, depth = 10, r = 3) {
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

function drawDesk(g: G, f: Furniture, t: number, isPlayer: boolean) {
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
  }
}

function drawFurniture(g: G, f: Furniture, t: number) {
  switch (f.type) {
    case "desk":
      return drawDesk(g, f, t, false);
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
      block(g, f.x, f.y, f.w, f.h, "#d8c3a0", "#8a6a48", 16, 8);
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
    ([[620, 360], [480, 560], [1360, 560], [1960, 860 - 10], [150, 860 - 30], [1880, 360], [1300, 1330], [90, 1340]] as const).forEach(([x, y]) => pumpkin(x, y));
    // cobwebs in corners
    for (const [x, y, sx] of [[24, 40, 1], [1976, 40, -1], [24, 420, 1], [1976, 420, -1], [760, 900, 1], [1976, 900, -1]] as const) {
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
      y: 352,
      draw: (g, t) => {
        const x = 735;
        const y = 352;
        g.fillStyle = "#6d4a33";
        g.fillRect(x - 4, y - 10, 8, 10);
        for (const [w, yy] of [[30, -14], [24, -30], [17, -46]] as const) {
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
        for (const [x, y] of [[300, 420], [1300, 420], [1700, 420]] as const) {
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
    balloons(770, 400, ["#3aa7a3", "#f2c14e", "#e0476b"]);
    balloons(1150, 400, ["#e0476b", "#3aa7a3", "#f2c14e"]);
    balloons(1650, 330, ["#f2c14e", "#e0476b", "#3aa7a3"]);
    out.push({
      y: 402,
      draw: (g) => {
        g.fillStyle = "#e0476b";
        g.fillRect(830, 372, 260, 22);
        g.fillStyle = "#fff";
        g.font = "bold 13px 'Archivo Black', sans-serif";
        g.textAlign = "center";
        g.fillText("¡FELIZ CUMPLE, MICHAEL!", 960, 388);
      },
    });
  }
  if (event === "sanvalentin") {
    balloons(690, 360, ["#e0476b", "#f8bbd0", "#e0476b"]);
    balloons(1250, 860, ["#f8bbd0", "#e0476b", "#f8bbd0"]);
  }
  if (event === "pretzel") {
    out.push({
      y: 352,
      draw: (g) => {
        const x = 690;
        const y = 352;
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
    balloons(300, 860 - 40, ["#2e7d32", "#66bb6a", "#2e7d32"]);
    balloons(1400, 820, ["#66bb6a", "#2e7d32", "#fdd835"]);
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
  if (!floorCache || floorCache.event !== eventId) floorCache = { canvas: buildFloor(eventId), event: eventId };

  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = PAL.void;
  g.fillRect(0, 0, vw, vh);
  g.setTransform(dpr * zoom, 0, 0, dpr * zoom, -cam.x * zoom * dpr, -cam.y * zoom * dpr);
  g.imageSmoothingEnabled = true;
  g.drawImage(floorCache.canvas, 0, 0);

  const targetedObjects = game.targetedObjects();
  const targetedNPCs = game.targetedNPCs();
  const offers = game.npcsWithOffers();

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
  for (const f of FURNITURE) list.push({ y: f.y + f.h, draw: () => drawFurniture(g, f, t) });
  for (const d of eventDecos(eventId)) list.push({ y: d.y, draw: () => d.draw(g, t) });
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
      draw: () =>
        drawCharacter(g, {
          x: n.x,
          y: n.y,
          facing: n.facing,
          moving: n.moving,
          walkT: n.walkT,
          look: n.def.look,
          costume: game.event?.costumes[n.def.id] ?? undefined,
        }),
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
        costume: game.event?.playerCostume,
        look: { skin: "#e6b48e", shirt: "#3f78a8", pants: "#2c3540", hair: "#3b2a20", hairStyle: "short", tie: "#f2c14e" },
      });
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
      if (dist < 150 && n.action && n.action !== "Charlando") {
        g.font = "italic 600 10px Archivo, sans-serif";
        g.fillStyle = "rgba(20,26,32,0.85)";
        g.fillText(n.action, n.x, n.y + 32);
      }
      g.globalAlpha = 1;
    }
    const markY = n.y - 80 + Math.sin(t * 4 + n.x) * 3;
    if (targetedNPCs.has(n.def.id)) drawBadge(g, n.x, markY, "?", PAL.teal);
    else if (offers.has(n.def.id)) drawBadge(g, n.x, markY, "!", PAL.marker);
  }

  // Bubbles
  for (const b of game.bubbles()) drawBubble(g, b.x, b.y, b.text, b.muted);

  // Hover prompt
  const h = game.hover;
  if (h && !game.frozen) {
    g.font = "800 11px Archivo, sans-serif";
    const w = g.measureText(h.label).width + 18;
    g.fillStyle = "rgba(24,32,40,0.92)";
    rr(g, h.x - w / 2, h.y - 22, w, 20, 6);
    g.fill();
    g.fillStyle = PAL.marker;
    g.fillText(h.label, h.x, h.y - 8);
  }

  // Screen-space overlays
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawLighting(g, game, vw, vh);
  drawOffscreenArrows(g, game, view);
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

function drawBubble(g: G, x: number, y: number, text: string, muted: boolean) {
  g.font = muted ? "900 16px Archivo, sans-serif" : "600 12px Archivo, sans-serif";
  const lines = muted ? [text] : wrap(g, text, 190);
  const lh = 15;
  const w = Math.max(...lines.map((l) => g.measureText(l).width)) + 20;
  const h = lines.length * lh + 12;
  const bx = x - w / 2;
  const by = y - h;
  g.fillStyle = "rgba(15,20,25,0.2)";
  rr(g, bx + 3, by + 3, w, h, 10);
  g.fill();
  g.fillStyle = muted ? "rgba(255,253,246,0.8)" : PAL.bubble;
  g.strokeStyle = PAL.bubbleStroke;
  g.lineWidth = 2;
  rr(g, bx, by, w, h, 10);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(x - 7, by + h - 1);
  g.lineTo(x, by + h + 10);
  g.lineTo(x + 7, by + h - 1);
  g.fill();
  g.beginPath();
  g.moveTo(x - 7, by + h);
  g.lineTo(x, by + h + 10);
  g.lineTo(x + 7, by + h);
  g.stroke();
  g.fillStyle = muted ? PAL.muted : PAL.ink;
  g.textAlign = "center";
  lines.forEach((l, i) => g.fillText(l, x, by + 18 + i * lh - (muted ? 2 : 0)));
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
  const vg = g.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
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
  for (const n of game.npcs) if (tNpc.has(n.def.id)) targets.push({ x: n.x, y: n.y - 30, col: PAL.teal });
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
  const sx = w / WORLD.w;
  const sy = h / WORLD.h;
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
    g.fillStyle = floorCol[r.floor] ?? "#888";
    g.fillRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
  }
  g.fillStyle = "#1b232b";
  for (const wl of WALLS) g.fillRect(wl.x * sx, wl.y * sy, Math.max(1, wl.w * sx), Math.max(1, wl.h * sy * 0.6));
  g.fillStyle = "rgba(60,50,40,0.6)";
  for (const f of FURNITURE) g.fillRect(f.x * sx, f.y * sy, f.w * sx, f.h * sy);
  const tObj = game.targetedObjects();
  const tNpc = game.targetedNPCs();
  const offers = game.npcsWithOffers();
  for (const o of OBJECTS) {
    if (!tObj.has(o.id)) continue;
    g.fillStyle = PAL.marker;
    g.beginPath();
    g.arc(o.x * sx, o.y * sy, 3.5, 0, Math.PI * 2);
    g.fill();
  }
  for (const n of game.npcs) {
    g.fillStyle = tNpc.has(n.def.id) ? PAL.teal : offers.has(n.def.id) ? PAL.marker : "#e9e4d6";
    g.beginPath();
    g.arc(n.x * sx, n.y * sy, tNpc.has(n.def.id) || offers.has(n.def.id) ? 3 : 2, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "#4fc3f7";
  g.strokeStyle = "#fff";
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(game.player.x * sx, game.player.y * sy, 4, 0, Math.PI * 2);
  g.fill();
  g.stroke();
}

export function portraitOf(id: string) {
  return CHAR_BY_ID[id];
}

export { SPOTS };
