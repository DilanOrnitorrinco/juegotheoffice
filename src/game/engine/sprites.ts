import type { CostumeKind, Facing, Look } from "../types";
import { PAL } from "./palette";

type G = CanvasRenderingContext2D;

export function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let gg = (n >> 8) & 255;
  let b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r + amt)));
  gg = Math.max(0, Math.min(255, Math.round(gg + amt)));
  b = Math.max(0, Math.min(255, Math.round(b + amt)));
  return `rgb(${r},${gg},${b})`;
}
export { shade };

export interface DrawChar {
  x: number;
  y: number;
  facing: Facing;
  moving: boolean;
  walkT: number;
  look: Look;
  costume?: CostumeKind;
  isPlayer?: boolean;
  scale?: number;
}

/** Draws a 3/4 top-down character anchored at its feet. */
export function drawCharacter(g: G, c: DrawChar) {
  const { look } = c;
  const s = c.scale ?? 1;
  g.save();
  g.translate(c.x, c.y);
  g.scale(s, s);
  const swing = c.moving ? Math.sin(c.walkT) : 0;
  const bob = c.moving ? Math.abs(Math.sin(c.walkT)) * 1.5 : 0;

  // shadow
  g.fillStyle = "rgba(15,20,25,0.25)";
  g.beginPath();
  g.ellipse(0, 1, 13, 5, 0, 0, Math.PI * 2);
  g.fill();

  g.translate(0, -bob);
  const shirt = c.costume === "hawaiian" ? "#e2654a" : c.costume === "sith" || c.costume === "vampire" ? "#1d1d22" : c.costume === "ghost" ? "#f1f1ee" : c.costume === "pumpkin" ? "#e8862f" : c.costume === "santa" ? "#c8312f" : c.costume === "elf" ? "#3c8a46" : c.costume === "leprechaun" ? "#2f8a45" : look.shirt;
  const side = c.facing === "left" || c.facing === "right";

  // legs
  const pants = c.costume === "sith" ? "#141418" : look.pants;
  g.fillStyle = pants;
  if (look.dress && c.costume !== "sith") {
    g.fillStyle = "#3a3236";
    rr(g, -6, -12 + swing * 2, 5, 12, 2);
    g.fill();
    rr(g, 1, -12 - swing * 2, 5, 12, 2);
    g.fill();
  } else if (side) {
    rr(g, -4 + swing * 3, -14, 6, 14, 2);
    g.fill();
    g.fillStyle = shade(pants, -15);
    rr(g, -2 - swing * 3, -14, 6, 14, 2);
    g.fill();
  } else {
    rr(g, -7, -14 + swing * 2, 6, 14, 2);
    g.fill();
    rr(g, 1, -14 - swing * 2, 6, 14, 2);
    g.fill();
  }
  // shoes
  g.fillStyle = "#1f1b19";
  if (!side) {
    rr(g, -8, -3 + swing * 2, 7, 4, 2);
    g.fill();
    rr(g, 1, -3 - swing * 2, 7, 4, 2);
    g.fill();
  } else {
    const dir = c.facing === "right" ? 1 : -1;
    rr(g, -4 + swing * 3 + dir * 2, -3, 7, 4, 2);
    g.fill();
  }

  // body
  const bodyW = c.costume === "pumpkin" ? 30 : 24;
  const bodyTop = -36;
  g.fillStyle = shirt;
  if (look.dress && !c.costume) {
    g.beginPath();
    g.moveTo(-10, bodyTop + 2);
    g.lineTo(10, bodyTop + 2);
    g.lineTo(13, -10);
    g.lineTo(-13, -10);
    g.closePath();
    g.fill();
  } else {
    rr(g, -bodyW / 2, bodyTop, bodyW, 24, c.costume === "pumpkin" ? 12 : 7);
    g.fill();
  }
  g.strokeStyle = "rgba(0,0,0,0.25)";
  g.lineWidth = 1;
  g.stroke();
  // shirt shading
  g.fillStyle = "rgba(0,0,0,0.08)";
  rr(g, -bodyW / 2, bodyTop + 14, bodyW, 10, 5);
  g.fill();

  // hawaiian flowers
  if (c.costume === "hawaiian") {
    g.fillStyle = "#ffe17a";
    for (const [fx, fy] of [[-6, -30], [5, -24], [-3, -18]]) {
      g.beginPath();
      g.arc(fx, fy, 2.2, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (c.costume === "threeHole" && c.facing !== "up") {
    g.fillStyle = "#1b1b1b";
    for (const fy of [-31, -25, -19]) {
      g.beginPath();
      g.arc(-5, fy, 1.8, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (c.costume === "pumpkin") {
    g.strokeStyle = "rgba(120,60,10,0.5)";
    for (const fx of [-7, 0, 7]) {
      g.beginPath();
      g.moveTo(fx, bodyTop + 2);
      g.lineTo(fx, -13);
      g.stroke();
    }
  }
  if (c.costume === "santa") {
    g.fillStyle = "#f4f1ea";
    g.fillRect(-12, -16, 24, 3);
    g.fillStyle = "#1d1d1d";
    g.fillRect(-12, -22, 24, 3);
  }

  // tie
  if (look.tie && !side && c.facing !== "up" && !c.costume) {
    g.fillStyle = look.tie;
    g.beginPath();
    g.moveTo(-2, bodyTop + 1);
    g.lineTo(2, bodyTop + 1);
    g.lineTo(3, bodyTop + 15);
    g.lineTo(0, bodyTop + 18);
    g.lineTo(-3, bodyTop + 15);
    g.closePath();
    g.fill();
    g.fillStyle = "#f4f4f0";
    g.beginPath();
    g.moveTo(-6, bodyTop);
    g.lineTo(-1, bodyTop + 4);
    g.lineTo(-2, bodyTop);
    g.fill();
    g.beginPath();
    g.moveTo(6, bodyTop);
    g.lineTo(1, bodyTop + 4);
    g.lineTo(2, bodyTop);
    g.fill();
  }
  // arms
  g.fillStyle = shade(shirt.startsWith("#") ? shirt : "#888888", -12);
  if (side) {
    rr(g, -3 + swing * -3, bodyTop + 3, 6, 17, 3);
    g.fill();
  } else {
    rr(g, -bodyW / 2 - 4, bodyTop + 3 + swing * 2, 5, 17, 3);
    g.fill();
    rr(g, bodyW / 2 - 1, bodyTop + 3 - swing * 2, 5, 17, 3);
    g.fill();
  }
  // hands
  g.fillStyle = look.skin;
  if (!side) {
    g.beginPath();
    g.arc(-bodyW / 2 - 1.5, bodyTop + 21 + swing * 2, 2.6, 0, Math.PI * 2);
    g.arc(bodyW / 2 + 1.5, bodyTop + 21 - swing * 2, 2.6, 0, Math.PI * 2);
    g.fill();
  }

  // cape
  if (c.costume === "sith" || c.costume === "vampire") {
    g.fillStyle = c.costume === "vampire" ? "#7a1420" : "#0d0d10";
    if (c.facing === "up") {
      rr(g, -14, bodyTop - 2, 28, 34, 5);
      g.fill();
    } else {
      g.fillRect(-14, bodyTop, 3, 26);
      g.fillRect(11, bodyTop, 3, 26);
    }
  }

  // head
  const hy = -46;
  g.fillStyle = look.skin;
  g.beginPath();
  g.arc(0, hy, 11, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.22)";
  g.stroke();
  // ears
  if (!side || true) {
    g.fillStyle = shade(look.skin, -10);
    if (c.facing === "down" || c.facing === "up") {
      g.beginPath();
      g.arc(-11, hy + 1, 2.5, 0, Math.PI * 2);
      g.arc(11, hy + 1, 2.5, 0, Math.PI * 2);
      g.fill();
    }
  }

  if (c.costume === "ghost") {
    g.fillStyle = "rgba(245,245,240,0.95)";
    g.beginPath();
    g.arc(0, hy - 2, 14, Math.PI, 0);
    g.lineTo(14, hy + 22);
    for (let i = 0; i < 5; i++) g.lineTo(14 - i * 7 - 3.5, hy + (i % 2 ? 22 : 18));
    g.lineTo(-14, hy + 22);
    g.closePath();
    g.fill();
    if (c.facing !== "up") {
      g.fillStyle = "#1b1b1b";
      g.beginPath();
      g.ellipse(-4, hy - 1, 2, 3, 0, 0, Math.PI * 2);
      g.ellipse(4, hy - 1, 2, 3, 0, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    drawHair(g, look, c.facing, hy);
    drawFace(g, look, c.facing, hy, c.costume);
  }
  drawHat(g, c.costume, hy, c.facing);

  if (c.isPlayer) {
    g.fillStyle = "#2f6ea3";
    rr(g, -5, bodyTop + 6, 10, 7, 1.5);
    g.fill();
    g.fillStyle = "#fff";
    g.fillRect(-3.5, bodyTop + 8, 7, 1.4);
    g.fillRect(-3.5, bodyTop + 10.4, 5, 1.2);
  }
  g.restore();
}

function drawHair(g: G, look: Look, facing: Facing, hy: number) {
  const c = look.hair;
  g.fillStyle = c;
  const st = look.hairStyle;
  if (st === "bald") {
    g.fillStyle = shade(c, 0);
    if (facing !== "down") {
      g.beginPath();
      g.arc(0, hy + 3, 11, 0.1 * Math.PI, 0.9 * Math.PI);
      g.fill();
    } else {
      g.fillRect(-11, hy - 1, 3, 6);
      g.fillRect(8, hy - 1, 3, 6);
    }
    return;
  }
  if (facing === "up") {
    g.beginPath();
    g.arc(0, hy - 1, 11.5, 0, Math.PI * 2);
    g.fill();
    if (st === "long" || st === "curly") {
      rr(g, -11, hy, 22, 16, 6);
      g.fill();
    }
    if (st === "bun") {
      g.beginPath();
      g.arc(0, hy - 8, 5.5, 0, Math.PI * 2);
      g.fill();
    }
    return;
  }
  // Top cap
  g.beginPath();
  g.arc(0, hy - 2, 11.5, Math.PI * 1.02, Math.PI * 1.98);
  g.closePath();
  g.fill();
  switch (st) {
    case "short":
    case "buzz":
      g.fillRect(-11, hy - 5, 22, 3);
      break;
    case "side":
      g.beginPath();
      g.moveTo(-11, hy - 2);
      g.quadraticCurveTo(-2, hy - 10, 11, hy - 4);
      g.lineTo(11, hy - 8);
      g.lineTo(-11, hy - 8);
      g.fill();
      break;
    case "wavy":
      g.beginPath();
      g.moveTo(-12, hy - 1);
      g.quadraticCurveTo(-6, hy - 7, 0, hy - 4);
      g.quadraticCurveTo(6, hy - 8, 12, hy - 2);
      g.lineTo(12, hy - 8);
      g.lineTo(-12, hy - 8);
      g.fill();
      break;
    case "spiky":
      for (let i = -9; i <= 9; i += 4.5) {
        g.beginPath();
        g.moveTo(i - 3, hy - 9);
        g.lineTo(i, hy - 15);
        g.lineTo(i + 3, hy - 9);
        g.fill();
      }
      g.fillRect(-11, hy - 6, 22, 3);
      break;
    case "bob":
      g.fillRect(-12, hy - 6, 4, 13);
      g.fillRect(8, hy - 6, 4, 13);
      g.fillRect(-11, hy - 6, 22, 4);
      break;
    case "bun":
      g.fillRect(-11, hy - 6, 22, 3);
      g.beginPath();
      g.arc(0, hy - 13, 5, 0, Math.PI * 2);
      g.fill();
      break;
    case "long":
      g.fillRect(-13, hy - 6, 5, 22);
      g.fillRect(8, hy - 6, 5, 22);
      g.fillRect(-11, hy - 6, 22, 4);
      break;
    case "curly":
      for (const [x, y] of [[-11, hy - 2], [-12, hy + 5], [-11, hy + 12], [11, hy - 2], [12, hy + 5], [11, hy + 12], [-6, hy - 9], [0, hy - 11], [6, hy - 9]]) {
        g.beginPath();
        g.arc(x, y, 4.5, 0, Math.PI * 2);
        g.fill();
      }
      break;
  }
}

function drawFace(g: G, look: Look, facing: Facing, hy: number, costume?: CostumeKind) {
  if (facing === "up") return;
  const eyes = facing === "down" ? [-4, 4] : facing === "left" ? [-5] : [5];
  g.fillStyle = "#1e1a18";
  for (const ex of eyes) {
    g.beginPath();
    g.arc(ex, hy + 1, 1.6, 0, Math.PI * 2);
    g.fill();
  }
  if (look.glasses) {
    g.strokeStyle = "#2a2622";
    g.lineWidth = 1.2;
    for (const ex of eyes) g.strokeRect(ex - 3.5, hy - 2, 7, 5.5);
    if (eyes.length === 2) {
      g.beginPath();
      g.moveTo(-0.5, hy);
      g.lineTo(0.5, hy);
      g.stroke();
    }
  }
  // cheeks + mouth
  if (facing === "down") {
    g.strokeStyle = "rgba(90,40,30,0.55)";
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(0, hy + 4.5, 3, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
  }
  if (look.beard) {
    g.fillStyle = look.hair === "#cfcfcf" ? "#bdbdbd" : look.hair;
    g.globalAlpha = 0.55;
    g.beginPath();
    if (facing === "down") g.arc(0, hy + 5, 8, 0.05 * Math.PI, 0.95 * Math.PI);
    else g.arc(facing === "left" ? -3 : 3, hy + 5, 7, 0.05 * Math.PI, 0.95 * Math.PI);
    g.fill();
    g.globalAlpha = 1;
  }
  if (costume === "vampire" && facing === "down") {
    g.fillStyle = "#fff";
    g.beginPath();
    g.moveTo(-2.5, hy + 6);
    g.lineTo(-1.5, hy + 9);
    g.lineTo(-0.5, hy + 6);
    g.moveTo(0.5, hy + 6);
    g.lineTo(1.5, hy + 9);
    g.lineTo(2.5, hy + 6);
    g.fill();
  }
  if (costume === "sith") {
    g.fillStyle = "rgba(10,10,12,0.92)";
    g.beginPath();
    g.arc(0, hy - 1, 12.5, Math.PI * 0.9, Math.PI * 2.1);
    g.fill();
  }
}

function drawHat(g: G, costume: CostumeKind | undefined, hy: number, facing: Facing) {
  if (!costume) return;
  switch (costume) {
    case "catEars":
      g.fillStyle = "#1c1c1c";
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.moveTo(sx * 9, hy - 6);
        g.lineTo(sx * 7, hy - 18);
        g.lineTo(sx * 2, hy - 9);
        g.fill();
      }
      g.fillStyle = "#e7a0b2";
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.moveTo(sx * 7.5, hy - 8);
        g.lineTo(sx * 6.5, hy - 14);
        g.lineTo(sx * 4, hy - 9.5);
        g.fill();
      }
      break;
    case "witch":
      g.fillStyle = "#231a33";
      g.beginPath();
      g.ellipse(0, hy - 8, 17, 4, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(-8, hy - 9);
      g.lineTo(5, hy - 32);
      g.lineTo(8, hy - 9);
      g.fill();
      g.fillStyle = "#e8862f";
      g.fillRect(-7.5, hy - 13, 15, 3);
      break;
    case "santa":
      g.fillStyle = "#c8312f";
      g.beginPath();
      g.moveTo(-11, hy - 6);
      g.quadraticCurveTo(0, hy - 26, 14, hy - 18);
      g.lineTo(11, hy - 6);
      g.fill();
      g.fillStyle = "#f6f3ec";
      rr(g, -12, hy - 9, 24, 5, 2.5);
      g.fill();
      g.beginPath();
      g.arc(14, hy - 18, 3.5, 0, Math.PI * 2);
      g.fill();
      if (facing === "down") {
        g.beginPath();
        g.arc(0, hy + 6, 9, 0, Math.PI);
        g.fill();
      }
      break;
    case "elf":
      g.fillStyle = "#3c8a46";
      g.beginPath();
      g.moveTo(-11, hy - 6);
      g.lineTo(-2, hy - 28);
      g.lineTo(11, hy - 6);
      g.fill();
      g.fillStyle = "#c8312f";
      g.fillRect(-11, hy - 9, 22, 4);
      g.fillStyle = "#f2d14e";
      g.beginPath();
      g.arc(-2, hy - 28, 2.5, 0, Math.PI * 2);
      g.fill();
      break;
    case "reindeer":
      g.strokeStyle = "#7a5230";
      g.lineWidth = 2.4;
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.moveTo(sx * 6, hy - 9);
        g.lineTo(sx * 10, hy - 22);
        g.moveTo(sx * 8.5, hy - 17);
        g.lineTo(sx * 14, hy - 20);
        g.stroke();
      }
      if (facing === "down") {
        g.fillStyle = "#d8262a";
        g.beginPath();
        g.arc(0, hy + 3, 2.6, 0, Math.PI * 2);
        g.fill();
      }
      break;
    case "heart":
      g.fillStyle = "#e0476b";
      g.beginPath();
      g.moveTo(0, hy - 10);
      g.bezierCurveTo(-8, hy - 20, -14, hy - 10, 0, hy - 2 - 1);
      g.moveTo(0, hy - 10);
      g.bezierCurveTo(8, hy - 20, 14, hy - 10, 0, hy - 3);
      g.fill();
      break;
    case "partyHat":
      g.fillStyle = "#3aa7a3";
      g.beginPath();
      g.moveTo(-7, hy - 8);
      g.lineTo(0, hy - 28);
      g.lineTo(7, hy - 8);
      g.fill();
      g.fillStyle = "#f2c14e";
      g.fillRect(-4, hy - 16, 8, 2);
      g.beginPath();
      g.arc(0, hy - 28, 2.5, 0, Math.PI * 2);
      g.fill();
      break;
    case "crown":
      g.fillStyle = "#f2c14e";
      g.beginPath();
      g.moveTo(-9, hy - 8);
      g.lineTo(-9, hy - 18);
      g.lineTo(-4.5, hy - 12);
      g.lineTo(0, hy - 20);
      g.lineTo(4.5, hy - 12);
      g.lineTo(9, hy - 18);
      g.lineTo(9, hy - 8);
      g.closePath();
      g.fill();
      g.fillStyle = "#c8312f";
      g.beginPath();
      g.arc(0, hy - 11, 1.8, 0, Math.PI * 2);
      g.fill();
      break;
    case "leprechaun":
      g.fillStyle = "#2f8a45";
      g.beginPath();
      g.ellipse(0, hy - 9, 15, 3.5, 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(-8, hy - 24, 16, 15);
      g.fillStyle = "#1b1b1b";
      g.fillRect(-8, hy - 13, 16, 3);
      g.fillStyle = "#f2c14e";
      g.fillRect(-2.5, hy - 13.5, 5, 4);
      break;
    case "pumpkin":
      g.fillStyle = "#3c7a33";
      g.fillRect(-1.5, hy - 17, 3, 6);
      break;
    default:
      break;
  }
}

export function drawItemSprite(g: G, sprite: string, x: number, y: number, t: number) {
  g.save();
  g.translate(x, y + Math.sin(t * 3) * 1.5);
  switch (sprite) {
    case "paper":
    case "form":
    case "report":
    case "list":
      g.fillStyle = PAL.paper;
      g.strokeStyle = "#8b8678";
      g.lineWidth = 1;
      g.fillRect(-7, -9, 14, 18);
      g.strokeRect(-7, -9, 14, 18);
      g.fillStyle = sprite === "report" ? "#2f6ea3" : "#9a9586";
      for (let i = 0; i < 4; i++) g.fillRect(-5, -6 + i * 4, 10 - (i % 2) * 3, 1.4);
      break;
    case "mug":
      g.fillStyle = "#fff";
      rr(g, -6, -8, 12, 14, 2);
      g.fill();
      g.strokeStyle = "#555";
      g.stroke();
      g.beginPath();
      g.arc(7, -1, 3.5, -Math.PI / 2, Math.PI / 2);
      g.stroke();
      g.fillStyle = "#2b2b2b";
      g.font = "bold 4px sans-serif";
      g.textAlign = "center";
      g.fillText("BOSS", 0, 0);
      break;
    case "jello":
      g.fillStyle = "rgba(240,210,60,0.85)";
      rr(g, -9, -8, 18, 13, 4);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.5)";
      g.fillRect(-6, -6, 4, 3);
      break;
    case "stapler":
      g.fillStyle = "#b8312f";
      rr(g, -10, -5, 20, 8, 3);
      g.fill();
      g.fillStyle = "#555";
      g.fillRect(-10, 2, 20, 2);
      break;
    case "folder":
      g.fillStyle = "#3f6fa8";
      rr(g, -9, -8, 18, 14, 2);
      g.fill();
      g.fillStyle = "#5a8bc4";
      g.fillRect(-9, -10, 8, 3);
      break;
    case "box":
    case "gift":
    case "costume":
      g.fillStyle = sprite === "gift" ? "#c8312f" : sprite === "costume" ? "#5b3a7a" : PAL.cardboard;
      g.fillRect(-10, -10, 20, 16);
      g.fillStyle = sprite === "gift" ? "#f2c14e" : sprite === "costume" ? "#e8862f" : PAL.cardboardDark;
      g.fillRect(-1.5, -10, 3, 16);
      if (sprite === "gift") g.fillRect(-10, -3, 20, 3);
      break;
    case "labels":
      g.fillStyle = "#f4f1e6";
      g.beginPath();
      g.arc(0, -2, 7, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#777";
      g.beginPath();
      g.arc(0, -2, 2.5, 0, Math.PI * 2);
      g.fill();
      break;
    case "photo":
      g.fillStyle = "#6d4a33";
      g.fillRect(-8, -10, 16, 18);
      g.fillStyle = "#e8e2d2";
      g.fillRect(-6, -8, 12, 14);
      g.fillStyle = "#8a8a8a";
      g.beginPath();
      g.arc(0, -1, 3.5, 0, Math.PI * 2);
      g.fill();
      break;
    case "pen":
      g.strokeStyle = "#2f6ea3";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(-8, 4);
      g.lineTo(8, -6);
      g.stroke();
      break;
    case "flowers":
      g.fillStyle = "#3f7a4c";
      g.fillRect(-1, -2, 2, 10);
      for (const [fx, fy, col] of [[-4, -6, "#e0476b"], [4, -7, "#f2c14e"], [0, -10, "#d36ad6"]] as const) {
        g.fillStyle = col;
        g.beginPath();
        g.arc(fx, fy, 3.5, 0, Math.PI * 2);
        g.fill();
      }
      break;
    case "sprouts":
      g.fillStyle = "#e8e2d2";
      g.beginPath();
      g.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#8cc06a";
      g.lineWidth = 1.5;
      for (let i = -6; i <= 6; i += 3) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i + 1, -8);
        g.stroke();
      }
      break;
    case "candy":
      g.fillStyle = "#e8862f";
      g.beginPath();
      g.arc(0, -2, 5, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(-5, -2);
      g.lineTo(-10, -6);
      g.lineTo(-10, 2);
      g.moveTo(5, -2);
      g.lineTo(10, -6);
      g.lineTo(10, 2);
      g.fill();
      break;
    case "star":
      g.fillStyle = "#f2c14e";
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 4 : 9;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r - 2);
      }
      g.fill();
      break;
    case "cards":
      g.fillStyle = "#f7c5d2";
      g.fillRect(-9, -8, 16, 12);
      g.fillStyle = "#e0476b";
      g.fillRect(-6, -10, 16, 12);
      g.fillStyle = "#fff";
      g.font = "bold 8px sans-serif";
      g.textAlign = "center";
      g.fillText("♥", 2, -1);
      break;
    case "cake":
      g.fillStyle = "#f6e7d0";
      g.fillRect(-10, -6, 20, 10);
      g.fillStyle = "#e0476b";
      g.fillRect(-10, -8, 20, 3);
      g.fillStyle = "#f2c14e";
      g.fillRect(-1, -14, 2, 6);
      break;
    case "shamrock":
      g.fillStyle = "#2f9a4f";
      for (const [fx, fy] of [[0, -7], [-5, -2], [5, -2]]) {
        g.beginPath();
        g.arc(fx, fy, 4.2, 0, Math.PI * 2);
        g.fill();
      }
      g.fillRect(-1, 0, 2, 8);
      break;
    case "trophy":
      g.fillStyle = "#e5b93a";
      g.beginPath();
      g.moveTo(-6, -12);
      g.lineTo(6, -12);
      g.lineTo(4, -3);
      g.lineTo(-4, -3);
      g.closePath();
      g.fill();
      g.fillRect(-1.5, -3, 3, 5);
      g.fillStyle = "#6d4a33";
      g.fillRect(-5, 2, 10, 4);
      g.fillStyle = "rgba(255,255,255,0.6)";
      g.fillRect(-3, -11, 2, 6);
      break;
    default:
      break;
  }
  g.restore();
}
