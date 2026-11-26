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
  costume?: CostumeKind | undefined;
  isPlayer?: boolean;
  scale?: number;
}

/** Draws a detailed 3/4 top-down character & portrait anchored at its feet. */
export function drawCharacter(g: G, c: DrawChar) {
  const { look } = c;
  const s = c.scale ?? 1;
  g.save();
  g.translate(c.x, c.y);
  g.scale(s, s);
  const swing = c.moving ? Math.sin(c.walkT) : 0;
  const bob = c.moving ? Math.abs(Math.sin(c.walkT)) * 1.5 : 0;

  const build = look.build ?? "regular";
  const bodyW =
    c.costume === "pumpkin"
      ? 30
      : build === "heavy"
        ? 29
        : build === "broad"
          ? 27
          : build === "petite"
            ? 20
            : build === "slim"
              ? 22
              : 24;
  const heightShift = build === "tall" ? -1.5 : build === "petite" ? 1.5 : 0;

  // shadow
  g.fillStyle = "rgba(15,20,25,0.25)";
  g.beginPath();
  g.ellipse(0, 1, bodyW * 0.54, 5, 0, 0, Math.PI * 2);
  g.fill();

  g.translate(0, -bob);
  const topKind = c.costume ? "shirt" : (look.topKind ?? "shirt");
  const effectiveSkin = c.costume === "india" ? "#b87344" : look.skin;
  const shirt =
    c.costume === "hawaiian"
      ? "#e2654a"
      : c.costume === "sith" || c.costume === "vampire"
        ? "#1d1d22"
        : c.costume === "ghost"
          ? "#f1f1ee"
          : c.costume === "pumpkin"
            ? "#e8862f"
            : c.costume === "santa"
              ? "#c8312f"
              : c.costume === "elf"
                ? "#3c8a46"
                : c.costume === "leprechaun"
                  ? "#2f8a45"
                  : c.costume === "india"
                    ? "#921436"
                    : look.shirt;
  const jacket =
    look.jacketColor ??
    (topKind === "suit" ? shade(shirt, -34) : topKind === "vest" ? shade(shirt, -18) : shirt);
  const side = c.facing === "left" || c.facing === "right";
  const legSpread = build === "heavy" ? 1.5 : build === "petite" ? -0.6 : 0;

  if (c.costume === "india") {
    // Glowing golden Mandala Halo + Diwali spokes behind character silhouette
    const haloSpin = c.walkT * 0.25;
    const cx = 0;
    const cy = -40;
    g.save();
    g.strokeStyle = "rgba(255, 210, 77, 0.85)";
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(cx, cy, 20, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "rgba(255, 123, 28, 0.7)";
    g.lineWidth = 1.1;
    g.beginPath();
    g.arc(cx, cy, 15, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = haloSpin + (i / 8) * Math.PI * 2;
      g.fillStyle = i % 2 === 0 ? "#ffd24d" : "#ff8c1a";
      g.beginPath();
      g.arc(cx + Math.cos(a) * 21.5, cy + Math.sin(a) * 21.5, 2.2, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  // legs
  const pants = c.costume === "sith" ? "#141418" : c.costume === "india" ? "#f4ebd9" : look.pants;
  g.fillStyle = pants;
  if (look.dress && c.costume !== "sith" && c.costume !== "india") {
    g.fillStyle = effectiveSkin;
    rr(g, -6, -12 + swing * 2, 4.8, 12, 2);
    g.fill();
    rr(g, 1.2, -12 - swing * 2, 4.8, 12, 2);
    g.fill();
  } else if (side) {
    rr(g, -4 + swing * 3, -14, 6.2, 14, 2);
    g.fill();
    g.fillStyle = shade(pants, -15);
    rr(g, -2 - swing * 3, -14, 6.2, 14, 2);
    g.fill();
  } else {
    rr(g, -7 - legSpread, -14 + swing * 2, 6 + legSpread * 0.4, 14, 2);
    g.fill();
    rr(g, 1 + legSpread * 0.6, -14 - swing * 2, 6 + legSpread * 0.4, 14, 2);
    g.fill();
  }

  // shoes
  g.fillStyle = c.costume === "india" ? "#7a142c" : "#1f1b19";
  if (!side) {
    rr(g, -8 - legSpread, -3 + swing * 2, 7.2, 4, 2);
    g.fill();
    rr(g, 0.8 + legSpread * 0.6, -3 - swing * 2, 7.2, 4, 2);
    g.fill();
    if (c.costume === "india") {
      // Curled 24k golden Mojari tips
      g.fillStyle = "#ffd24d";
      g.beginPath();
      g.arc(-8.5 - legSpread, -2.5 + swing * 2, 1.6, 0, Math.PI * 2);
      g.arc(8.5 + legSpread * 0.6, -2.5 - swing * 2, 1.6, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    const dir = c.facing === "right" ? 1 : -1;
    rr(g, -4 + swing * 3 + dir * 2, -3, 7.5, 4, 2);
    g.fill();
    if (c.costume === "india") {
      g.fillStyle = "#ffd24d";
      g.beginPath();
      g.arc(-4 + swing * 3 + dir * 9.5, -2.8, 1.7, 0, Math.PI * 2);
      g.fill();
    }
  }

  // torso / outfit
  const bodyTop = -36 + heightShift;
  const bodyH = 24 - heightShift;
  const baseBodyColor =
    topKind === "suit" || topKind === "cardigan" || topKind === "vest" ? jacket : shirt;

  g.fillStyle = baseBodyColor;
  if (look.dress && !c.costume) {
    g.beginPath();
    g.moveTo(-bodyW * 0.42, bodyTop + 2);
    g.lineTo(bodyW * 0.42, bodyTop + 2);
    g.lineTo(bodyW * 0.56, -10);
    g.lineTo(-bodyW * 0.56, -10);
    g.closePath();
    g.fill();
  } else {
    rr(
      g,
      -bodyW / 2,
      bodyTop,
      bodyW,
      bodyH + (c.costume === "india" ? 5 : 0),
      c.costume === "pumpkin" ? 12 : 7,
    );
    g.fill();
  }
  g.strokeStyle = c.costume === "india" ? "#ffd24d" : "rgba(0,0,0,0.26)";
  g.lineWidth = c.costume === "india" ? 1.3 : 1;
  g.stroke();

  // shirt shading + belt
  g.fillStyle = "rgba(0,0,0,0.09)";
  rr(g, -bodyW / 2, bodyTop + bodyH * 0.58, bodyW, bodyH * 0.42, 5);
  g.fill();
  if (!c.costume && !look.dress && topKind !== "blouse") {
    g.fillStyle = "#221e1c";
    g.fillRect(-bodyW / 2 + 1, -13.5, bodyW - 2, 2.2);
    g.fillStyle = "#c8b377";
    g.fillRect(-1.8, -13.8, 3.6, 2.6);
  }

  // Layered garment details (front/side visible)
  if (!c.costume && !side && c.facing !== "up") {
    if (topKind === "suit") {
      // Crisp shirt V-front + tailored lapels + pocket square
      g.fillStyle = shirt;
      g.beginPath();
      g.moveTo(-5.5, bodyTop + 1);
      g.lineTo(5.5, bodyTop + 1);
      g.lineTo(0, bodyTop + 16);
      g.closePath();
      g.fill();

      g.fillStyle = shade(jacket.startsWith("#") ? jacket : "#2c3442", 14);
      g.beginPath();
      g.moveTo(-6, bodyTop + 1);
      g.lineTo(-9, bodyTop + 7);
      g.lineTo(-1, bodyTop + 15);
      g.closePath();
      g.fill();
      g.beginPath();
      g.moveTo(6, bodyTop + 1);
      g.lineTo(9, bodyTop + 7);
      g.lineTo(1, bodyTop + 15);
      g.closePath();
      g.fill();

      // Pocket square & buttons
      g.fillStyle = look.tie ?? "#f4f4f0";
      g.fillRect(4.5, bodyTop + 6.5, 4, 2);
      g.fillStyle = "#1d1d22";
      g.beginPath();
      g.arc(0, bodyTop + 17.5, 1.1, 0, Math.PI * 2);
      g.arc(0, bodyTop + 21.5, 1.1, 0, Math.PI * 2);
      g.fill();
    } else if (topKind === "cardigan") {
      g.fillStyle = "#f2f0ec";
      g.beginPath();
      g.moveTo(-4.8, bodyTop + 1);
      g.lineTo(4.8, bodyTop + 1);
      g.lineTo(0, bodyTop + 12);
      g.closePath();
      g.fill();
      g.strokeStyle = "rgba(0,0,0,0.22)";
      g.beginPath();
      g.moveTo(0, bodyTop + 12);
      g.lineTo(0, -13.5);
      g.stroke();
      g.fillStyle = shade(jacket.startsWith("#") ? jacket : "#666666", -38);
      for (const by of [bodyTop + 14, bodyTop + 17.5, bodyTop + 21]) {
        g.beginPath();
        g.arc(1.5, by, 1, 0, Math.PI * 2);
        g.fill();
      }
    } else if (topKind === "vest") {
      // Inner collared shirt neckline + knit V-trim
      g.fillStyle = shirt;
      g.beginPath();
      g.moveTo(-5.2, bodyTop + 1);
      g.lineTo(5.2, bodyTop + 1);
      g.lineTo(0, bodyTop + 10);
      g.closePath();
      g.fill();
      g.strokeStyle = shade(jacket.startsWith("#") ? jacket : "#555555", -28);
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(-5.2, bodyTop + 1);
      g.lineTo(0, bodyTop + 10.5);
      g.lineTo(5.2, bodyTop + 1);
      g.stroke();
    } else if (topKind === "workshirt") {
      // Warehouse dual flap pockets
      g.fillStyle = shade(shirt.startsWith("#") ? shirt : "#445566", -18);
      rr(g, -bodyW * 0.36, bodyTop + 6, 6, 5.5, 1);
      g.fill();
      rr(g, bodyW * 0.36 - 6, bodyTop + 6, 6, 5.5, 1);
      g.fill();
    } else if (topKind === "blouse") {
      g.fillStyle = shade(shirt.startsWith("#") ? shirt : "#888888", 22);
      g.beginPath();
      g.arc(0, bodyTop + 1, 5, 0, Math.PI);
      g.fill();
    }
  }

  // hawaiian flowers / costumes
  if (c.costume === "hawaiian") {
    g.fillStyle = "#ffe17a";
    for (const [fx, fy] of [
      [-6, -30],
      [5, -24],
      [-3, -18],
    ] as const) {
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
  if (c.costume === "india") {
    // Nehru collar + Saffron Kamarband + Gold Placket + Dupatta Sash + Royal Mala Necklace
    g.fillStyle = "#ff7b1c";
    g.fillRect(-bodyW / 2 + 1, -14.5, bodyW - 2, 3.2);
    if (!side && c.facing !== "up") {
      // Gold placket + royal jewel buttons
      g.fillStyle = "#ffd24d";
      g.fillRect(-1.3, bodyTop + 1, 2.6, bodyH + 2);
      // Saffron diagonal Dupatta sash
      g.strokeStyle = "#ff7b1c";
      g.lineWidth = 4.2;
      g.beginPath();
      g.moveTo(-bodyW * 0.38, bodyTop + 2);
      g.lineTo(bodyW * 0.42, -11);
      g.stroke();
      g.strokeStyle = "#ffd24d";
      g.lineWidth = 1;
      g.stroke();
      // Royal Mala Necklace (Gold, Ruby, Emerald)
      for (const [mx, my, col] of [
        [-4.8, bodyTop + 2.5, "#ffd24d"],
        [-2.5, bodyTop + 4.4, "#e11d48"],
        [0, bodyTop + 5.2, "#10b981"],
        [2.5, bodyTop + 4.4, "#e11d48"],
        [4.8, bodyTop + 2.5, "#ffd24d"],
      ] as const) {
        g.fillStyle = col;
        g.beginPath();
        g.arc(mx, my, 1.4, 0, Math.PI * 2);
        g.fill();
      }
      // Nehru gold collar rim
      g.fillStyle = "#ffd24d";
      g.fillRect(-5, bodyTop - 1, 10, 2);
    }
  }

  // Tie or Bow Tie + Collar
  if (!side && c.facing !== "up" && !c.costume) {
    if (look.bowTie) {
      g.fillStyle = "#f4f4f0";
      g.beginPath();
      g.moveTo(-5.5, bodyTop);
      g.lineTo(-1, bodyTop + 3.5);
      g.lineTo(-2, bodyTop);
      g.moveTo(5.5, bodyTop);
      g.lineTo(1, bodyTop + 3.5);
      g.lineTo(2, bodyTop);
      g.fill();

      g.fillStyle = look.bowTie;
      g.beginPath();
      g.moveTo(-5.5, bodyTop + 1);
      g.lineTo(0, bodyTop + 3.2);
      g.lineTo(-5.5, bodyTop + 5.6);
      g.closePath();
      g.moveTo(5.5, bodyTop + 1);
      g.lineTo(0, bodyTop + 3.2);
      g.lineTo(5.5, bodyTop + 5.6);
      g.closePath();
      g.fill();
      g.beginPath();
      g.arc(0, bodyTop + 3.3, 1.5, 0, Math.PI * 2);
      g.fill();
    } else if (look.tie) {
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
  }

  // Signature worn torso accessories
  if (!c.costume && !side && c.facing !== "up") {
    if (look.accessory === "pearls") {
      g.fillStyle = "#f7f4ec";
      for (const px of [-4.5, -2.5, 0, 2.5, 4.5]) {
        g.beginPath();
        g.arc(px, bodyTop + 3 + (1 - Math.abs(px) / 5) * 1.6, 1.2, 0, Math.PI * 2);
        g.fill();
      }
    } else if (look.accessory === "catPin") {
      g.fillStyle = "#d9c278";
      g.beginPath();
      g.arc(-5, bodyTop + 8, 1.8, 0, Math.PI * 2);
      g.fill();
    } else if (look.accessory === "badge") {
      g.fillStyle = "#eef4fa";
      rr(g, 3, bodyTop + 6.5, 4.5, 5.5, 0.8);
      g.fill();
      g.fillStyle = "#2f6ea3";
      g.fillRect(3.5, bodyTop + 7.2, 3.5, 1.5);
    }
  }

  // arms & sleeves
  const sleeveColor =
    topKind === "vest" ? shirt : topKind === "suit" || topKind === "cardigan" ? jacket : shirt;
  const sleeveShade = shade(sleeveColor.startsWith("#") ? sleeveColor : "#888888", -10);
  if (side) {
    if (topKind === "short_sleeve") {
      g.fillStyle = sleeveShade;
      rr(g, -3 + swing * -3, bodyTop + 3, 6, 8, 2.5);
      g.fill();
      g.fillStyle = look.skin;
      rr(g, -2.6 + swing * -3, bodyTop + 10, 5.2, 10, 2.5);
      g.fill();
    } else {
      g.fillStyle = sleeveShade;
      rr(g, -3 + swing * -3, bodyTop + 3, 6, 17, 3);
      g.fill();
    }
  } else {
    for (const sx of [-1, 1] as const) {
      const armX = sx === -1 ? -bodyW / 2 - 4 : bodyW / 2 - 1;
      const armSwing = sx === -1 ? swing * 2 : -swing * 2;
      if (topKind === "short_sleeve") {
        g.fillStyle = sleeveShade;
        rr(g, armX, bodyTop + 3 + armSwing, 5, 8, 2.5);
        g.fill();
        g.fillStyle = look.skin;
        rr(g, armX + 0.4, bodyTop + 10.5 + armSwing, 4.2, 9.5, 2.2);
        g.fill();
        if (sx === -1 && look.accessory === "watch") {
          g.fillStyle = "#222428";
          g.fillRect(armX + 0.3, bodyTop + 17 + armSwing, 4.4, 1.8);
          g.fillStyle = "#cfd6de";
          g.fillRect(armX + 1.4, bodyTop + 16.8 + armSwing, 2, 2);
        }
      } else {
        g.fillStyle = sleeveShade;
        rr(g, armX, bodyTop + 3 + armSwing, 5, 17, 3);
        g.fill();
        if (topKind === "suit" || topKind === "vest") {
          g.fillStyle = "#f4f4f0";
          g.fillRect(armX + 0.5, bodyTop + 18.2 + armSwing, 4, 1.6);
        } else if (c.costume === "india") {
          g.fillStyle = "#ffd24d";
          g.fillRect(armX + 0.3, bodyTop + 17.8 + armSwing, 4.4, 2);
        }
      }
    }
  }

  // hands + held character props
  g.fillStyle = effectiveSkin;
  if (!side) {
    const lhY = bodyTop + 21 + swing * 2;
    const rhY = bodyTop + 21 - swing * 2;
    g.beginPath();
    g.arc(-bodyW / 2 - 1.5, lhY, 2.6, 0, Math.PI * 2);
    g.arc(bodyW / 2 + 1.5, rhY, 2.6, 0, Math.PI * 2);
    g.fill();
    if (!c.costume && !c.moving && look.accessory === "mug") {
      g.fillStyle = "#f7f7f4";
      rr(g, bodyW / 2 - 0.5, rhY - 2.5, 4.5, 5.2, 1);
      g.fill();
      g.strokeStyle = "#333";
      g.lineWidth = 0.8;
      g.stroke();
    } else if (!c.costume && !c.moving && look.accessory === "crossword") {
      g.fillStyle = "#f4f0e4";
      rr(g, -bodyW / 2 - 4.5, lhY - 2.5, 5.5, 6.2, 1);
      g.fill();
      g.strokeStyle = "#7a7262";
      g.lineWidth = 0.7;
      g.stroke();
    }
  }

  // cape
  if (c.costume === "sith" || c.costume === "vampire" || c.costume === "india") {
    g.fillStyle =
      c.costume === "vampire" ? "#7a1420" : c.costume === "india" ? "#ff7b1c" : "#0d0d10";
    if (c.facing === "up") {
      rr(g, -14, bodyTop - 2, 28, 34, 5);
      g.fill();
    } else {
      g.fillRect(-14, bodyTop, 3, 26);
      g.fillRect(11, bodyTop, 3, 26);
    }
    if (c.costume === "india") {
      g.fillStyle = "#ffd24d";
      g.fillRect(-14, bodyTop + 24, 3, 2);
      g.fillRect(11, bodyTop + 24, 3, 2);
    }
  }

  // neck + sculpted oval head
  const hy = -46 + heightShift * 0.7;
  g.fillStyle = shade(effectiveSkin, -12);
  g.fillRect(-3.2, bodyTop - 3, 6.4, 5);

  g.fillStyle = effectiveSkin;
  g.beginPath();
  g.ellipse(0, hy, 10.7, 11.4, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.22)";
  g.lineWidth = 1;
  g.stroke();

  // ears + optional gold hoop earrings
  if (c.facing === "down" || c.facing === "up") {
    g.fillStyle = shade(effectiveSkin, -11);
    g.beginPath();
    g.ellipse(-10.8, hy + 1, 2.3, 3.2, 0, 0, Math.PI * 2);
    g.ellipse(10.8, hy + 1, 2.3, 3.2, 0, 0, Math.PI * 2);
    g.fill();
    if (look.accessory === "earrings" && !c.costume) {
      g.strokeStyle = "#e0b84e";
      g.lineWidth = 1.1;
      g.beginPath();
      g.arc(-11.2, hy + 4.3, 1.3, 0, Math.PI * 2);
      g.arc(11.2, hy + 4.3, 1.3, 0, Math.PI * 2);
      g.stroke();
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
    if (c.costume !== "india") drawHair(g, look, c.facing, hy);
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
  const hi = shade(c.startsWith("#") ? c : "#444444", 18);
  const dark = shade(c.startsWith("#") ? c : "#444444", -18);
  g.fillStyle = c;
  const st = look.hairStyle;
  const part = look.parting ?? "side";

  if (st === "bald") {
    if (part === "receding") {
      // Sparse receding temple tufts & faint top wisps (Toby)
      g.fillStyle = c;
      if (facing !== "down") {
        g.beginPath();
        g.arc(0, hy + 3, 11, 0.12 * Math.PI, 0.88 * Math.PI);
        g.fill();
      } else {
        g.beginPath();
        g.ellipse(-9.8, hy + 0.5, 2.2, 4.2, 0, 0, Math.PI * 2);
        g.ellipse(9.8, hy + 0.5, 2.2, 4.2, 0, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 0.35;
        g.beginPath();
        g.ellipse(0, hy - 8.5, 5.5, 2.1, 0, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
      }
      return;
    }
    if (c !== "#6e6a65") {
      // Classic horseshoe side/back fringe (Stanley)
      if (facing !== "down") {
        g.beginPath();
        g.arc(0, hy + 3, 11, 0.1 * Math.PI, 0.9 * Math.PI);
        g.fill();
      } else {
        g.fillRect(-11, hy - 1, 3, 6.2);
        g.fillRect(8, hy - 1, 3, 6.2);
      }
    }
    return;
  }

  if (facing === "up") {
    g.beginPath();
    g.arc(0, hy - 1, 11.5, 0, Math.PI * 2);
    g.fill();
    if (st === "long" || st === "curly") {
      rr(g, -11.5, hy, 23, 16, 6);
      g.fill();
    }
    if (st === "bun") {
      g.fillStyle = dark;
      g.beginPath();
      g.arc(0, hy - 8, 5.5, 0, Math.PI * 2);
      g.fill();
    }
    return;
  }

  // Back/side curtain first for long & curly styles
  if (st === "long") {
    g.fillStyle = dark;
    rr(g, -13.2, hy - 6, 5.2, 22, 2.5);
    g.fill();
    rr(g, 8, hy - 6, 5.2, 22, 2.5);
    g.fill();
  }

  // Base crown dome raised cleanly above eyebrows
  g.fillStyle = c;
  g.beginPath();
  if (part === "receding") {
    g.arc(0, hy - 5.6, 10.6, Math.PI * 1.08, Math.PI * 1.92);
  } else {
    g.arc(0, hy - 4.4, 11.4, Math.PI * 1.0, Math.PI * 2.0);
  }
  g.closePath();
  g.fill();

  switch (st) {
    case "short":
    case "buzz":
      g.fillRect(-10.4, hy - 6.8, 20.8, part === "receding" ? 1.8 : 2.6);
      break;
    case "side":
      g.beginPath();
      g.moveTo(-11, hy - 4.6);
      g.quadraticCurveTo(-2, hy - 12.2, 11, hy - 5.6);
      g.lineTo(11, hy - 9.5);
      g.lineTo(-11, hy - 9.5);
      g.closePath();
      g.fill();
      if (part === "slick") {
        g.strokeStyle = hi;
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-6, hy - 9.8);
        g.quadraticCurveTo(1, hy - 12.6, 7, hy - 9.4);
        g.stroke();
      }
      break;
    case "wavy":
      g.beginPath();
      g.moveTo(-11.4, hy - 4);
      g.quadraticCurveTo(-6, hy - 8.2, 0, hy - 5.2);
      g.quadraticCurveTo(6, hy - 8.6, 11.4, hy - 4.4);
      g.lineTo(11.4, hy - 9.2);
      g.lineTo(-11.4, hy - 9.2);
      g.closePath();
      g.fill();
      if (part === "floppy") {
        // Tousled Jim-style upper-forehead locks (safely above eyebrows)
        g.beginPath();
        g.moveTo(-7, hy - 7.8);
        g.quadraticCurveTo(-4, hy - 4.2, -1.5, hy - 6.8);
        g.quadraticCurveTo(2, hy - 4.0, 5.5, hy - 7.2);
        g.lineTo(6.5, hy - 10);
        g.lineTo(-7.5, hy - 10);
        g.closePath();
        g.fill();
      }
      break;
    case "spiky":
      for (let i = -9; i <= 9; i += 4.5) {
        g.beginPath();
        g.moveTo(i - 3, hy - 9.5);
        g.lineTo(i, hy - 15.5);
        g.lineTo(i + 3, hy - 9.5);
        g.fill();
      }
      g.fillRect(-10.6, hy - 7.2, 21.2, 2.8);
      break;
    case "bob":
      if (part === "center") {
        // Dwight's symmetrical middle-part curtains framing sides
        g.fillRect(-11.5, hy - 6.8, 3.2, 11);
        g.fillRect(8.3, hy - 6.8, 3.2, 11);
        g.beginPath();
        g.moveTo(-11.5, hy - 5.4);
        g.quadraticCurveTo(-6, hy - 10.6, -0.5, hy - 5.8);
        g.lineTo(-0.5, hy - 10.2);
        g.lineTo(-11.5, hy - 10.2);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(11.5, hy - 5.4);
        g.quadraticCurveTo(6, hy - 10.6, 0.5, hy - 5.8);
        g.lineTo(0.5, hy - 10.2);
        g.lineTo(11.5, hy - 10.2);
        g.closePath();
        g.fill();
      } else {
        g.fillRect(-12, hy - 6.8, 3.8, 13.5);
        g.fillRect(8.2, hy - 6.8, 3.8, 13.5);
        g.fillRect(-10.8, hy - 7.2, 21.6, 3.2);
      }
      break;
    case "bun":
      g.fillRect(-10.8, hy - 7.2, 21.6, 3);
      g.fillStyle = dark;
      g.beginPath();
      g.arc(0, hy - 13.4, 5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = hi;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(0, hy - 13.4, 3.4, Math.PI * 1.1, Math.PI * 1.85);
      g.stroke();
      break;
    case "long":
      g.fillStyle = c;
      g.fillRect(-12.5, hy - 6.8, 4.2, 22.5);
      g.fillRect(8.3, hy - 6.8, 4.2, 22.5);
      g.fillRect(-10.8, hy - 7.2, 21.6, 3.2);
      if (part === "floppy") {
        g.beginPath();
        g.moveTo(-9, hy - 7.2);
        g.quadraticCurveTo(0, hy - 4.2, 9, hy - 7.2);
        g.lineTo(9, hy - 9.8);
        g.lineTo(-9, hy - 9.8);
        g.closePath();
        g.fill();
      }
      break;
    case "curly":
      for (const [x, y] of [
        [-11.6, hy - 3.5],
        [-12, hy + 4.5],
        [-11, hy + 12],
        [11.6, hy - 3.5],
        [12, hy + 4.5],
        [11, hy + 12],
        [-6, hy - 9.5],
        [0, hy - 11.2],
        [6, hy - 9.5],
      ] as const) {
        g.beginPath();
        g.arc(x, y, 4.6, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = hi;
      g.beginPath();
      g.arc(-4, hy - 9, 2, 0, Math.PI * 2);
      g.arc(4, hy - 9, 2, 0, Math.PI * 2);
      g.fill();
      break;
  }
}

function drawFace(g: G, look: Look, facing: Facing, hy: number, costume?: CostumeKind) {
  if (facing === "up") return;
  const eyes = facing === "down" ? [-4.2, 4.2] : facing === "left" ? [-5] : [5];
  const browColor = shade(look.hair.startsWith("#") ? look.hair : "#2b2420", -22);
  const browMood = look.eyebrows ?? "neutral";

  // Subtle rosy cheeks for warm expressions / lipstick
  if ((look.lipColor || browMood === "warm") && facing === "down") {
    g.fillStyle = "rgba(218, 120, 114, 0.25)";
    g.beginPath();
    g.ellipse(-6.5, hy + 3.2, 2.3, 1.3, 0, 0, Math.PI * 2);
    g.ellipse(6.5, hy + 3.2, 2.3, 1.3, 0, 0, Math.PI * 2);
    g.fill();
  }

  // Sclera + Iris + Pupil + Specular Catchlight
  for (const ex of eyes) {
    g.fillStyle = "#f9f8f4";
    g.beginPath();
    g.ellipse(ex, hy + 0.8, 2.3, 1.9, 0, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = look.eyeColor ?? "#3c2e24";
    g.beginPath();
    g.arc(ex, hy + 0.9, 1.35, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = "#161311";
    g.beginPath();
    g.arc(ex, hy + 0.9, 0.72, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(ex + 0.55, hy + 0.35, 0.45, 0, Math.PI * 2);
    g.fill();
  }

  // Expressive eyebrows
  g.strokeStyle = browColor;
  g.lineWidth = 1.25;
  g.lineCap = "round";
  for (let i = 0; i < eyes.length; i++) {
    const ex = eyes[i]!;
    const sign = ex < 0 ? -1 : 1;
    const raiseOffset = browMood === "raised" && sign > 0 ? -1 : 0;
    const tilt =
      browMood === "stern"
        ? -0.8 * sign
        : browMood === "sad"
          ? 0.9 * sign
          : browMood === "warm"
            ? 0.25 * sign
            : 0;
    g.beginPath();
    g.moveTo(ex - 2.3, hy - 2.5 + tilt + raiseOffset);
    g.quadraticCurveTo(ex, hy - 3.3 + raiseOffset, ex + 2.3, hy - 2.5 - tilt + raiseOffset);
    g.stroke();
  }

  // Subtle nose bridge/tip
  if (facing === "down") {
    g.strokeStyle = "rgba(110, 62, 42, 0.38)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, hy + 1.4);
    g.lineTo(-0.5, hy + 3.2);
    g.lineTo(0.8, hy + 3.4);
    g.stroke();
  }

  // Hollow glasses with pale lens tint
  if (look.glasses && costume !== "india") {
    g.fillStyle = "rgba(218, 236, 248, 0.2)";
    g.strokeStyle = look.topKind === "short_sleeve" ? "#9c7e3b" : "#2b2622";
    g.lineWidth = 1.15;
    for (const ex of eyes) {
      rr(g, ex - 3.4, hy - 1.6, 6.8, 4.8, 1.3);
      g.fill();
      g.stroke();
    }
    if (eyes.length === 2) {
      g.beginPath();
      g.moveTo(-0.8, hy + 0.2);
      g.lineTo(0.8, hy + 0.2);
      g.stroke();
    }
  }

  if (costume === "india") {
    // Forehead crimson-gold Tilak
    if (facing === "down") {
      g.fillStyle = "#e11d48";
      g.fillRect(-0.9, hy - 5.5, 1.8, 4);
      g.fillStyle = "#ffd24d";
      g.beginPath();
      g.arc(0, hy - 3.2, 1.1, 0, Math.PI * 2);
      g.fill();
    }
    // Iconic Gold-Framed Dark Reflective Bollywood/MLG Aviators
    for (const ex of eyes) {
      g.fillStyle = "#0f172a";
      g.strokeStyle = "#ffd24d";
      g.lineWidth = 1.25;
      rr(g, ex - 3.9, hy - 1.8, 7.8, 5, 1.8);
      g.fill();
      g.stroke();
      // White specular shine streak
      g.strokeStyle = "rgba(255,255,255,0.85)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(ex - 2.1, hy - 0.6);
      g.lineTo(ex - 0.3, hy + 1.8);
      g.stroke();
    }
    if (eyes.length === 2) {
      g.strokeStyle = "#ffd24d";
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(-1, hy - 1);
      g.lineTo(1, hy - 1);
      g.stroke();
    }
  }

  // Mouth / Lips
  if (facing === "down") {
    g.strokeStyle = look.lipColor ?? "rgba(102,48,38,0.65)";
    g.lineWidth = look.lipColor ? 1.55 : 1.2;
    g.beginPath();
    if (browMood === "stern" || browMood === "sad") {
      g.moveTo(-2.6, hy + 6.2);
      g.quadraticCurveTo(0, hy + (browMood === "sad" ? 5.6 : 6.1), 2.6, hy + 6.2);
    } else {
      g.arc(0, hy + 4.4, 2.8, 0.16 * Math.PI, 0.84 * Math.PI);
    }
    g.stroke();
  }

  // Glorious twirled Handlebar Mustache for India Maharaja Meme skin
  if (costume === "india") {
    const mx = facing === "down" ? 0 : facing === "left" ? -3.5 : 3.5;
    g.fillStyle = "#151314";
    g.strokeStyle = "#151314";
    g.lineWidth = 1.5;
    g.beginPath();
    g.ellipse(mx - 2.3, hy + 4.4, 3, 1.35, -0.22, 0, Math.PI * 2);
    g.ellipse(mx + 2.3, hy + 4.4, 3, 1.35, 0.22, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(mx - 5.4, hy + 3.4, 1.4, Math.PI * 0.2, Math.PI * 1.4);
    g.stroke();
    g.beginPath();
    g.arc(mx + 5.4, hy + 3.4, 1.4, -Math.PI * 0.4, Math.PI * 0.8);
    g.stroke();
  }

  // Mustache vs Goatee/Beard
  const facialHairColor = look.hair === "#cfcfcf" ? "#bdbdbd" : look.hair;
  if (look.mustache && !costume) {
    g.fillStyle = facialHairColor;
    g.beginPath();
    const mx = facing === "down" ? 0 : facing === "left" ? -3.5 : 3.5;
    g.ellipse(mx - 1.5, hy + 4.5, 2.2, 1.1, -0.18, 0, Math.PI * 2);
    g.ellipse(mx + 1.5, hy + 4.5, 2.2, 1.1, 0.18, 0, Math.PI * 2);
    g.fill();
  }
  if (look.beard) {
    g.fillStyle = facialHairColor;
    g.globalAlpha = 0.68;
    g.beginPath();
    if (facing === "down") g.arc(0, hy + 5.2, 7.6, 0.06 * Math.PI, 0.94 * Math.PI);
    else g.arc(facing === "left" ? -3 : 3, hy + 5.2, 6.8, 0.06 * Math.PI, 0.94 * Math.PI);
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
    case "india":
      // Multi-layered Maharaja Pagri (Turban) + 24k Gold Diadem + Emerald Sarpech + Peacock Feather
      g.fillStyle = "#a6123a";
      g.beginPath();
      g.ellipse(0, hy - 9, 13.8, 7.5, 0, 0, Math.PI * 2);
      g.fill();
      // Overlapping Magenta & Saffron turban folds
      g.fillStyle = "#cf1e5a";
      g.beginPath();
      g.ellipse(-3, hy - 11.5, 9.5, 4.2, -0.25, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ff821c";
      g.beginPath();
      g.ellipse(3, hy - 12, 8.8, 3.8, 0.25, 0, Math.PI * 2);
      g.fill();
      // Gold diadem trim band
      g.fillStyle = "#ffd24d";
      rr(g, -12.5, hy - 6.8, 25, 2.5, 1.2);
      g.fill();
      // Iridescent Peacock Feather plume behind Sarpech
      g.strokeStyle = "#ffd24d";
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(1.5, hy - 12);
      g.lineTo(4.2, hy - 26);
      g.stroke();
      g.fillStyle = "#0d9488";
      g.beginPath();
      g.ellipse(4.6, hy - 25.5, 3.8, 5.2, 0.18, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ffd24d";
      g.beginPath();
      g.arc(4.6, hy - 25.5, 2.1, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#2563eb";
      g.beginPath();
      g.arc(4.6, hy - 25.5, 1.2, 0, Math.PI * 2);
      g.fill();
      // Front emerald & gold Sarpech brooch + temple pearl tassel
      g.fillStyle = "#ffd24d";
      g.beginPath();
      g.arc(0, hy - 9.8, 3.2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#10b981";
      g.beginPath();
      g.arc(0, hy - 9.8, 1.9, 0, Math.PI * 2);
      g.fill();
      if (facing === "down") {
        g.fillStyle = "#f8fafc";
        g.beginPath();
        g.arc(11.8, hy - 3, 1.1, 0, Math.PI * 2);
        g.arc(12.2, hy - 0.5, 1.1, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#ffd24d";
        g.beginPath();
        g.arc(12.4, hy + 2.2, 1.5, 0, Math.PI * 2);
        g.fill();
      }
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
      g.fillStyle =
        sprite === "gift" ? "#c8312f" : sprite === "costume" ? "#5b3a7a" : PAL.cardboard;
      g.fillRect(-10, -10, 20, 16);
      g.fillStyle =
        sprite === "gift" ? "#f2c14e" : sprite === "costume" ? "#e8862f" : PAL.cardboardDark;
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
      for (const [fx, fy, col] of [
        [-4, -6, "#e0476b"],
        [4, -7, "#f2c14e"],
        [0, -10, "#d36ad6"],
      ] as const) {
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
      for (const [fx, fy] of [
        [0, -7],
        [-5, -2],
        [5, -2],
      ] as const) {
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
