import * as THREE from "three";

import type { FloorKind } from "../../data/map";

export interface OfficeTextures {
  floors: Record<FloorKind, THREE.CanvasTexture>;
  wall: THREE.CanvasTexture;
  ceiling: THREE.CanvasTexture;
  wood: THREE.CanvasTexture;
  darkWood: THREE.CanvasTexture;
  signDunder: THREE.CanvasTexture;
  whiteboard: THREE.CanvasTexture;
  monitor: THREE.CanvasTexture;
  tvScreen: THREE.CanvasTexture;
  shadowDisc: THREE.CanvasTexture;
  sageWall: THREE.CanvasTexture;
  scrantonMap: THREE.CanvasTexture;
  seykoCert: THREE.CanvasTexture;
  landscapeArt: THREE.CanvasTexture;
  bestBossMug: THREE.CanvasTexture;
  emojiBoxes: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D) => void,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  return c;
}

function toTex(
  c: HTMLCanvasElement,
  aniso: number,
  repeatX = 1,
  repeatY = 1,
  srgb = true,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
  return tex;
}

function noiseFill(
  g: CanvasRenderingContext2D,
  size: number,
  base: string,
  dots: string[],
  count: number,
  seed: number,
) {
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  let s = seed;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < count; i++) {
    g.fillStyle = dots[i % dots.length]!;
    g.fillRect(rnd() * size, rnd() * size, 2, 2);
  }
}

export function createOfficeTextures(maxAniso: number): OfficeTextures {
  const all: THREE.Texture[] = [];
  const track = <T extends THREE.Texture>(t: T): T => {
    all.push(t);
    return t;
  };

  const carpetTex = (base: string, dots: string[], seed: number, grid = true) =>
    track(
      toTex(
        makeCanvas(128, 128, (g) => {
          noiseFill(g, 128, base, dots, 900, seed);
          if (grid) {
            g.strokeStyle = "rgba(35,45,55,0.14)";
            g.lineWidth = 2;
            g.strokeRect(1, 1, 62, 62);
            g.strokeRect(65, 1, 62, 62);
            g.strokeRect(1, 65, 62, 62);
            g.strokeRect(65, 65, 62, 62);
          }
        }),
        maxAniso,
        1,
        1,
      ),
    );

  const floors: Record<FloorKind, THREE.CanvasTexture> = {
    carpet: carpetTex("#858f97", ["#7a848c", "#929ca4", "#707980"], 7),
    carpetDark: carpetTex("#686570", ["#5d5a65", "#73707b"], 3),
    carpetBlue: carpetTex("#5d7b94", ["#537089", "#6987a0"], 5),
    carpetGreen: carpetTex("#7f9180", ["#748675", "#8b9d8c"], 11),
    carpetWarm: carpetTex("#948475", ["#89796a", "#9f8f80"], 13),
    wood: track(
      toTex(
        makeCanvas(128, 128, (g) => {
          g.fillStyle = "#b8905c";
          g.fillRect(0, 0, 128, 128);
          for (let i = 0; i < 6; i++) {
            g.fillStyle = i % 2 ? "#af8753" : "#c09965";
            g.fillRect(0, i * 21.3, 128, 21.3);
            g.fillStyle = "rgba(65,38,15,0.28)";
            g.fillRect(0, i * 21.3 + 20, 128, 1.5);
            g.fillRect((i * 41) % 128, i * 21.3, 1.5, 21.3);
          }
        }),
        maxAniso,
      ),
    ),
    checker: track(
      toTex(
        makeCanvas(128, 128, (g) => {
          g.fillStyle = "#eae4d3";
          g.fillRect(0, 0, 128, 128);
          g.fillStyle = "#c4bba5";
          g.fillRect(0, 0, 64, 64);
          g.fillRect(64, 64, 64, 64);
          g.strokeStyle = "rgba(80,75,65,0.16)";
          g.strokeRect(0, 0, 64, 64);
          g.strokeRect(64, 64, 64, 64);
        }),
        maxAniso,
      ),
    ),
    tile: track(
      toTex(
        makeCanvas(128, 128, (g) => {
          g.fillStyle = "#d5d3ca";
          g.fillRect(0, 0, 128, 128);
          g.strokeStyle = "rgba(90,88,78,0.28)";
          g.lineWidth = 2;
          for (let x = 0; x < 128; x += 64) {
            for (let y = 0; y < 128; y += 64) g.strokeRect(x, y, 64, 64);
          }
        }),
        maxAniso,
      ),
    ),
    concrete: track(
      toTex(
        makeCanvas(128, 128, (g) => {
          noiseFill(g, 128, "#9d9e96", ["#91928a", "#a9aaa2", "#878880"], 1000, 17);
          g.strokeStyle = "rgba(55,55,50,0.2)";
          g.lineWidth = 2;
          g.strokeRect(0, 0, 128, 128);
        }),
        maxAniso,
      ),
    ),
  };

  const wall = track(
    toTex(
      makeCanvas(128, 128, (g) => {
        noiseFill(g, 128, "#ebe4d4", ["#e4dccb", "#f0eadc"], 420, 29);
        // Subtle baseboard strip at bottom
        g.fillStyle = "#c9bfa9";
        g.fillRect(0, 118, 128, 10);
      }),
      maxAniso,
      4,
      1,
    ),
  );

  const ceiling = track(
    toTex(
      makeCanvas(256, 256, (g) => {
        g.fillStyle = "#e4e0d5";
        g.fillRect(0, 0, 256, 256);
        g.strokeStyle = "#cbc6ba";
        g.lineWidth = 2;
        for (let x = 0; x < 256; x += 64) {
          for (let y = 0; y < 256; y += 64) g.strokeRect(x, y, 64, 64);
        }
        // Bright fluorescent office light panel
        g.fillStyle = "#f9fcff";
        g.fillRect(68, 68, 120, 56);
        g.strokeStyle = "#b5bac0";
        g.strokeRect(68, 68, 120, 56);
      }),
      maxAniso,
      10,
      8,
    ),
  );

  const wood = track(
    toTex(
      makeCanvas(128, 128, (g) => {
        g.fillStyle = "#b38754";
        g.fillRect(0, 0, 128, 128);
        g.strokeStyle = "rgba(70,40,15,0.22)";
        g.lineWidth = 2;
        for (let y = 4; y < 128; y += 10) {
          g.beginPath();
          g.moveTo(0, y);
          g.bezierCurveTo(40, y + 3, 88, y - 3, 128, y + 1);
          g.stroke();
        }
      }),
      maxAniso,
    ),
  );

  const darkWood = track(
    toTex(
      makeCanvas(128, 128, (g) => {
        g.fillStyle = "#6e472b";
        g.fillRect(0, 0, 128, 128);
        g.strokeStyle = "rgba(30,15,5,0.32)";
        g.lineWidth = 2;
        for (let y = 5; y < 128; y += 11) {
          g.beginPath();
          g.moveTo(0, y);
          g.bezierCurveTo(36, y - 2, 92, y + 2, 128, y);
          g.stroke();
        }
      }),
      maxAniso,
    ),
  );

  const signDunder = track(
    toTex(
      makeCanvas(512, 192, (g) => {
        g.fillStyle = "#19222b";
        g.fillRect(0, 0, 512, 192);
        g.strokeStyle = "#d9d4c7";
        g.lineWidth = 6;
        g.strokeRect(8, 8, 496, 176);
        g.fillStyle = "#ffffff";
        g.font = "900 50px Archivo, sans-serif";
        g.textAlign = "center";
        g.fillText("DUNDER MIFFLIN", 256, 86);
        g.fillStyle = "#f2c14e";
        g.font = "700 24px Archivo, sans-serif";
        g.fillText("PAPER COMPANY · SCRANTON", 256, 134);
      }),
      maxAniso,
    ),
  );
  signDunder.wrapS = THREE.ClampToEdgeWrapping;
  signDunder.wrapT = THREE.ClampToEdgeWrapping;

  const whiteboard = track(
    toTex(
      makeCanvas(512, 256, (g) => {
        g.fillStyle = "#f7f9fa";
        g.fillRect(0, 0, 512, 256);
        g.strokeStyle = "#8a929a";
        g.lineWidth = 10;
        g.strokeRect(5, 5, 502, 246);
        g.fillStyle = "#1e3a5f";
        g.font = "bold 24px sans-serif";
        g.fillText("CUOTA DE VENTAS · SCRANTON", 32, 46);
        g.strokeStyle = "#b83b36";
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(40, 188);
        g.lineTo(130, 145);
        g.lineTo(220, 162);
        g.lineTo(310, 95);
        g.lineTo(445, 72);
        g.stroke();
        g.fillStyle = "#2b6c5a";
        g.font = "bold 18px sans-serif";
        g.fillText("¡Límite cero excusas! - M. Scott", 40, 224);
      }),
      maxAniso,
    ),
  );
  whiteboard.wrapS = THREE.ClampToEdgeWrapping;
  whiteboard.wrapT = THREE.ClampToEdgeWrapping;

  const monitor = track(
    toTex(
      makeCanvas(128, 96, (g) => {
        g.fillStyle = "#10281b";
        g.fillRect(0, 0, 128, 96);
        g.fillStyle = "#39e681";
        g.font = "bold 10px monospace";
        g.fillText("DM-SALES v2.1", 8, 16);
        g.fillStyle = "rgba(57,230,129,0.55)";
        for (let y = 26; y < 86; y += 11) {
          g.fillRect(8, y, 42 + ((y * 17) % 62), 5);
        }
      }),
      maxAniso,
    ),
  );
  monitor.wrapS = THREE.ClampToEdgeWrapping;
  monitor.wrapT = THREE.ClampToEdgeWrapping;

  const tvScreen = track(
    toTex(
      makeCanvas(256, 192, (g) => {
        g.fillStyle = "#17202b";
        g.fillRect(0, 0, 256, 192);
        g.fillStyle = "#f2c14e";
        g.font = "bold 24px sans-serif";
        g.textAlign = "center";
        g.fillText("DUNDER MIFFLIN", 128, 86);
        g.fillStyle = "#7dd3fc";
        g.font = "bold 16px sans-serif";
        g.fillText("LIMITLESS PAPER", 128, 118);
      }),
      maxAniso,
    ),
  );
  tvScreen.wrapS = THREE.ClampToEdgeWrapping;
  tvScreen.wrapT = THREE.ClampToEdgeWrapping;

  const shadowDisc = track(
    toTex(
      makeCanvas(128, 128, (g) => {
        const grad = g.createRadialGradient(64, 64, 8, 64, 64, 60);
        grad.addColorStop(0, "rgba(10,14,18,0.58)");
        grad.addColorStop(0.55, "rgba(10,14,18,0.26)");
        grad.addColorStop(1, "rgba(10,14,18,0)");
        g.fillStyle = grad;
        g.fillRect(0, 0, 128, 128);
      }),
      maxAniso,
    ),
  );
  shadowDisc.wrapS = THREE.ClampToEdgeWrapping;
  shadowDisc.wrapT = THREE.ClampToEdgeWrapping;

  const sageWall = track(
    toTex(
      makeCanvas(256, 256, (g) => {
        noiseFill(g, 256, "#b2c3b4", ["#a7b9a9", "#bcccbc"], 520, 41);
        g.fillStyle = "#1f2429";
        g.fillRect(0, 0, 5, 256);
        g.fillRect(128, 0, 4, 256);
        g.fillStyle = "#4d5650";
        g.fillRect(0, 240, 256, 16);
      }),
      maxAniso,
      2,
      1,
    ),
  );

  const scrantonMap = track(
    toTex(
      makeCanvas(512, 256, (g) => {
        g.fillStyle = "#4b3828";
        g.fillRect(0, 0, 512, 256);
        g.fillStyle = "#f2ecdd";
        g.fillRect(12, 12, 488, 232);
        // Subtle river curve (Lackawanna)
        g.strokeStyle = "#8ab4c9";
        g.lineWidth = 10;
        g.beginPath();
        g.moveTo(40, 225);
        g.bezierCurveTo(175, 160, 290, 120, 465, 38);
        g.stroke();
        // Grid streets
        g.strokeStyle = "rgba(95,90,82,0.35)";
        g.lineWidth = 1.5;
        for (let x = 38; x < 475; x += 32) {
          g.beginPath();
          g.moveTo(x, 28);
          g.lineTo(x + 14, 228);
          g.stroke();
        }
        for (let y = 36; y < 228; y += 26) {
          g.beginPath();
          g.moveTo(28, y);
          g.lineTo(480, y - 8);
          g.stroke();
        }
        // Highway loop
        g.strokeStyle = "#c96846";
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(24, 78);
        g.bezierCurveTo(190, 92, 310, 175, 482, 152);
        g.stroke();
        g.fillStyle = "#b5373c";
        g.beginPath();
        g.arc(256, 128, 7, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#2b3238";
        g.font = "bold 16px sans-serif";
        g.fillText("SCRANTON, PA", 28, 36);
      }),
      maxAniso,
    ),
  );
  scrantonMap.wrapS = THREE.ClampToEdgeWrapping;
  scrantonMap.wrapT = THREE.ClampToEdgeWrapping;

  const seykoCert = track(
    toTex(
      makeCanvas(256, 256, (g) => {
        g.fillStyle = "#1c1917";
        g.fillRect(0, 0, 256, 256);
        g.fillStyle = "#f4efe4";
        g.fillRect(20, 20, 216, 216);
        g.strokeStyle = "#8a7042";
        g.lineWidth = 4;
        g.strokeRect(32, 32, 192, 192);
        g.fillStyle = "#1e2328";
        g.font = "bold 17px serif";
        g.textAlign = "center";
        g.fillText("CERTIFICATE", 128, 72);
        g.font = "bold 12px serif";
        g.fillText("OF AUTHENTICITY", 128, 92);
        g.fillStyle = "#525860";
        for (let y = 114; y <= 154; y += 14) {
          g.fillRect(58, y, 140, 3);
        }
        g.fillStyle = "#c89b32";
        g.beginPath();
        g.arc(128, 192, 18, 0, Math.PI * 2);
        g.fill();
      }),
      maxAniso,
    ),
  );
  seykoCert.wrapS = THREE.ClampToEdgeWrapping;
  seykoCert.wrapT = THREE.ClampToEdgeWrapping;

  const landscapeArt = track(
    toTex(
      makeCanvas(512, 256, (g) => {
        g.fillStyle = "#5b3a24";
        g.fillRect(0, 0, 512, 256);
        g.fillStyle = "#f5f1e6";
        g.fillRect(14, 14, 484, 228);
        // Watercolor sky
        const sky = g.createLinearGradient(0, 26, 0, 145);
        sky.addColorStop(0, "#cfdce6");
        sky.addColorStop(1, "#f2e5d5");
        g.fillStyle = sky;
        g.fillRect(28, 26, 456, 120);
        // Distant mountains
        g.fillStyle = "#899cad";
        g.beginPath();
        g.moveTo(28, 146);
        g.lineTo(135, 92);
        g.lineTo(255, 134);
        g.lineTo(375, 76);
        g.lineTo(484, 138);
        g.lineTo(484, 146);
        g.closePath();
        g.fill();
        // Lake
        g.fillStyle = "#a5bfcf";
        g.fillRect(28, 146, 456, 84);
        // Foreground pines/bank
        g.fillStyle = "#485942";
        g.beginPath();
        g.moveTo(28, 146);
        g.lineTo(160, 166);
        g.lineTo(120, 230);
        g.lineTo(28, 230);
        g.closePath();
        g.fill();
      }),
      maxAniso,
    ),
  );
  landscapeArt.wrapS = THREE.ClampToEdgeWrapping;
  landscapeArt.wrapT = THREE.ClampToEdgeWrapping;

  const bestBossMug = track(
    toTex(
      makeCanvas(256, 128, (g) => {
        g.fillStyle = "#f8fafc";
        g.fillRect(0, 0, 256, 128);
        g.fillStyle = "#181d24";
        g.font = "900 18px serif";
        g.textAlign = "center";
        g.fillText("WORLD'S", 128, 52);
        g.fillText("BEST BOSS", 128, 76);
        g.fillStyle = "#cbd5e1";
        g.fillRect(0, 0, 256, 8);
      }),
      maxAniso,
    ),
  );
  bestBossMug.wrapS = THREE.ClampToEdgeWrapping;
  bestBossMug.wrapT = THREE.ClampToEdgeWrapping;

  const emojiBoxes = track(
    toTex(
      makeCanvas(128, 128, (g) => {
        g.fillStyle = "#e0b341";
        g.fillRect(0, 0, 128, 128);
        g.strokeStyle = "#967220";
        g.lineWidth = 4;
        g.strokeRect(2, 2, 124, 124);
      }),
      maxAniso,
    ),
  );

  return {
    floors,
    wall,
    ceiling,
    wood,
    darkWood,
    signDunder,
    whiteboard,
    monitor,
    tvScreen,
    shadowDisc,
    sageWall,
    scrantonMap,
    seykoCert,
    landscapeArt,
    bestBossMug,
    emojiBoxes,
    dispose: () => {
      for (const t of all) t.dispose();
    },
  };
}
