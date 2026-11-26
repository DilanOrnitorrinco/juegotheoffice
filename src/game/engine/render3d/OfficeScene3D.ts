import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

import {
  BASEMENT_DZ_PX,
  CONF_SEATS,
  ELEVATOR,
  FLOOR_HEIGHT_M,
  FLOOR_PORTALS,
  FLOOR_SPLIT_Y,
  ROOMS,
  SOUTH_WINDOWS,
  SPOTS,
  STAIRWELL_HOLE,
  WALLS,
  WALL_DEPTH,
  WINDOWS,
  WORLD,
  floorOfY,
  getActiveFurniture,
  to3DCoords,
  type FloorKind,
} from "../../data/map";
import { DUNDIES, OBJECTS } from "../../data/objects";
import type { EventId, OfficeDecorKind } from "../../types";
import type { Game } from "../game";
import { PAL } from "../palette";
import { rr } from "../sprites";
import {
  WORLD_SCALE,
  animateCharacterRig,
  buildBeaconProp,
  buildChristmasTree,
  buildConferenceChairs,
  buildFurnitureMesh,
  buildCharacterRig,
  buildSeatHighlightRing,
  getDeskSeatAnchor3D,
  type CharacterRig,
} from "./models";
import { createOfficeTextures, type OfficeTextures } from "./textures";

const WALL_HEIGHT = 3.05;
const CEILING_Y = 3.12;
const SOLID_WALLS = WALLS.filter((w) => w.kind !== "glass");

export function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return false;
    const rendererStr = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "");
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
  } catch {
    return false;
  }
}

function yawFromFacing(f: "up" | "down" | "left" | "right"): number {
  if (f === "right") return Math.PI / 2;
  if (f === "down") return Math.PI;
  if (f === "left") return -Math.PI / 2;
  return 0;
}

function shortestAngleDiff(from: number, to: number): number {
  let d = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function scalePlaneUVs(geo: THREE.PlaneGeometry, uRepeat: number, vRepeat: number) {
  const uv = geo.attributes["uv"];
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * uRepeat, uv.getY(i) * vRepeat);
  }
  uv.needsUpdate = true;
}

function scaleBoxUVs(geo: THREE.BoxGeometry, uRepeat: number, vRepeat: number) {
  const uv = geo.attributes["uv"];
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * uRepeat, uv.getY(i) * vRepeat);
  }
  uv.needsUpdate = true;
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

function wrapText(g: CanvasRenderingContext2D, text: string, max: number): string[] {
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

function hudBoxesForOverlay(
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
    { x: 0, y: 0, w: vw, h: vw < 1100 ? 104 : 78 },
    { x: Math.max(0, vw - 310), y: 0, w: 310, h: 332 },
    { x: 0, y: Math.max(0, vh - 188), w: 350, h: 188 },
    { x: Math.max(0, vw - 246), y: Math.max(0, vh - 196), w: 246, h: 196 },
  ];
  if (game.getSnapshot().meetingNotice) {
    boxes.push({
      x: Math.max(0, vw * 0.5 - 300),
      y: 74,
      w: Math.min(600, vw - 24),
      h: 155,
    });
  }
  if (hasInv) boxes.push({ x: vw * 0.22, y: Math.max(0, vh - 68), w: vw * 0.56, h: 68 });
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
    return { bx, by, tailOnBottom, hits: avoid.some((box) => overlapsRect(rect, box)) };
  };

  const c1 = tryPos(clampX(ax - w / 2), ayAbove - h, true);
  if (!c1.hits && c1.by >= safeTop && c1.by + h <= safeBottom) return c1;
  const c2 = tryPos(clampX(ax - w / 2), ayBelow, false);
  if (!c2.hits && c2.by >= safeTop && c2.by + h <= safeBottom) return c2;

  let bx = clampX(ax - w / 2);
  let by = ayAbove - h < safeTop ? ayBelow : clampY(ayAbove - h);
  let tailOnBottom = by < ayAbove;

  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    const cur: ScreenRect = { x: bx, y: by, w, h };
    for (const box of avoid) {
      if (!overlapsRect(cur, box)) continue;
      moved = true;
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
      bx = box.x > vw * 0.5 ? clampX(box.x - w - 10) : clampX(box.x + box.w + 10);
    }
    if (!moved) break;
  }

  return { bx: clampX(bx), by: clampY(by), tailOnBottom };
}

function drawBadge2D(g: CanvasRenderingContext2D, x: number, y: number, text: string, col: string) {
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

/** Check if 2D pixel point (px, py) collides with any opaque office wall on the given floor. */
function hitsSolidWall2D(px: number, py: number, floor: 0 | 1, marginPx = 7): boolean {
  for (const w of SOLID_WALLS) {
    if (floorOfY(w.y) !== floor) continue;
    if (
      px >= w.x - marginPx &&
      px <= w.x + w.w + marginPx &&
      py >= w.y - marginPx &&
      py <= w.y + w.h + marginPx
    ) {
      return true;
    }
  }
  return false;
}

/** Spring-arm raymarch in 2D pixels so the OTS camera never clips behind drywall. */
function clampCameraToWalls(
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
  floor: 0 | 1,
): { x: number; z: number } {
  const dzOff = floor === 1 ? BASEMENT_DZ_PX : 0;
  const sx = startX / WORLD_SCALE;
  const sy = startZ / WORLD_SCALE - dzOff;
  const ex = endX / WORLD_SCALE;
  const ey = endZ / WORLD_SCALE - dzOff;
  const steps = 16;
  let lastSafeT = 0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = sx + (ex - sx) * t;
    const y = sy + (ey - sy) * t;
    if (hitsSolidWall2D(x, y, floor, 6)) {
      const safeT = Math.max(0.18, lastSafeT * 0.92);
      return {
        x: startX + (endX - startX) * safeT,
        z: startZ + (endZ - startZ) * safeT,
      };
    }
    lastSafeT = t;
  }
  return { x: endX, z: endZ };
}

export class OfficeScene3D {
  readonly softwareGl: boolean;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;

  private container: HTMLElement;
  private tex: OfficeTextures;
  private pmremGenerator: THREE.PMREMGenerator;
  private envRenderTarget: THREE.WebGLRenderTarget;

  private hemiLight: THREE.HemisphereLight;
  private sunLight: THREE.DirectionalLight;
  private skyBgColor = new THREE.Color("#cfd9e3");
  private scratchColor = new THREE.Color();
  private fog: THREE.Fog;

  private staticGroup = new THREE.Group();
  private furnitureGroup = new THREE.Group();
  private decorGroup = new THREE.Group();
  private actorsGroup = new THREE.Group();
  private propsGroup = new THREE.Group();

  private staticDisposables: { dispose: () => void }[] = [];
  private furnitureDisposables: { dispose: () => void }[] = [];
  private decorDisposables: { dispose: () => void }[] = [];

  private furnitureSig = "";
  private decorSig = "";

  private playerEntry: { rig: CharacterRig; sig: string } | null = null;
  private npcEntries = new Map<
    string,
    { rig: CharacterRig; sig: string; yaw: number; lastX: number; lastY: number }
  >();
  private beaconEntries = new Map<string, { group: THREE.Group; dispose: () => void }>();
  private dundieEntries = new Map<string, { group: THREE.Group; dispose: () => void }>();
  private seatHighlight: { group: THREE.Group; dispose: () => void };

  // Camera rig state
  private camYaw = 0;
  private camPitch = 0.16;
  private camDistance = 2.35;
  private camInitialized = false;
  private lastCameraFloor: 0 | 1 = 0;
  private lastCinemaCutKey = "";
  private curCamPos = new THREE.Vector3();
  private curLookAt = new THREE.Vector3();
  private desiredCamPos = new THREE.Vector3();
  private desiredLookAt = new THREE.Vector3();
  private scratchProj = new THREE.Vector3();
  private scratchPlayerPos = new THREE.Vector3();
  private scratchTargetPos = new THREE.Vector3();

  private disposed = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.softwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.softwareGl,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(this.softwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = !this.softwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = this.skyBgColor;
    this.fog = new THREE.Fog(0xdbe3eb, 26, 58);
    this.scene.fog = this.fog;

    const aspect =
      (container.clientWidth || window.innerWidth) /
      Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.12, 85);

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRenderTarget = this.pmremGenerator.fromScene(roomEnv, 0.04);
    roomEnv.dispose();
    this.scene.environment = this.envRenderTarget.texture;
    this.scene.environmentIntensity = 0.52;

    const maxAniso = this.softwareGl
      ? 1
      : Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.tex = createOfficeTextures(maxAniso);

    // Lighting
    this.hemiLight = new THREE.HemisphereLight(0xf6f9ff, 0x8f8372, 0.92);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4df, 1.45);
    this.sunLight.position.set(16, 24, -10);
    this.sunLight.target.position.set(22, 0, 16);
    if (!this.softwareGl) {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(2048, 2048);
      this.sunLight.shadow.camera.near = 2;
      this.sunLight.shadow.camera.far = 65;
      this.sunLight.shadow.camera.left = -30;
      this.sunLight.shadow.camera.right = 30;
      this.sunLight.shadow.camera.top = 26;
      this.sunLight.shadow.camera.bottom = -26;
      this.sunLight.shadow.bias = -0.0006;
    }
    this.scene.add(this.sunLight, this.sunLight.target);

    // Interior ceiling fill lights across both Floor 0 (Main Office) and Floor 1 (Archive & Warehouse)
    const interiorLights: [number, number, number, number][] = [
      [250, 420, 0xfff8eb, 1.8], // Reception
      [510, 160, 0xfff4e0, 1.9], // Michael's office
      [880, 160, 0xf2f7ff, 2.0], // Conference room
      [780, 620, 0xf6f9ff, 2.2], // Bullpen center
      [1210, 390, 0xfff6e5, 1.6], // Kitchen
      [1830, 160, 0xf4f8ff, 1.6], // Break room
      [1960, 600, 0xf7f5ec, 1.7], // Annex
      [1210, 140, 0xfff4e2, 1.4], // Stairwell
      [480, 1180, 0xebeff4, 1.9], // Archive (Floor 1)
      [1180, 1120, 0xf5efe2, 2.1], // Basement Stairs Landing (Floor 1)
      [1480, 1240, 0xf5efe0, 2.2], // Warehouse West (Floor 1)
      [1860, 1280, 0xf5efe0, 2.2], // Warehouse East (Floor 1)
      [165, 1260, 0xebeff4, 1.6], // Basement Elevator Lobby (Floor 1)
    ];
    for (const [lx, lz, col, intensity] of interiorLights) {
      const pt = new THREE.PointLight(col, intensity, 20, 1.35);
      const p3 = to3DCoords(lx, lz, 2.75);
      pt.position.set(p3.x, p3.y, p3.z);
      this.scene.add(pt);
    }

    this.scene.add(
      this.staticGroup,
      this.furnitureGroup,
      this.decorGroup,
      this.actorsGroup,
      this.propsGroup,
    );
    this.buildStaticArchitecture();
    this.seatHighlight = buildSeatHighlightRing();
    const playerSeat = CONF_SEATS[0]!;
    this.seatHighlight.group.position.set(
      playerSeat.x * WORLD_SCALE,
      0.02,
      playerSeat.y * WORLD_SCALE,
    );
    this.seatHighlight.group.visible = false;
    this.propsGroup.add(this.seatHighlight.group);
  }

  private buildStaticArchitecture() {
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      this.staticDisposables.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      this.staticDisposables.push(m);
      return m;
    };

    const floorMats = {} as Record<FloorKind, THREE.MeshStandardMaterial>;
    (Object.keys(this.tex.floors) as FloorKind[]).forEach((k) => {
      floorMats[k] = trackMat(
        new THREE.MeshStandardMaterial({
          map: this.tex.floors[k],
          roughness: k === "tile" || k === "checker" ? 0.42 : 0.88,
          metalness: 0.02,
        }),
      );
    });

    // Helper to split a horizontal plane rectangle cleanly around the stairwell opening (in 3D X/Z pixel units)
    const addPlaneRect3D = (
      xPx: number,
      zPx: number,
      wPx: number,
      dPx: number,
      worldY: number,
      mat: THREE.Material,
      rotX: number,
      tileScale = 2.2,
      receiveShadow = false,
    ) => {
      if (wPx <= 1 || dPx <= 1) return;
      const rw = wPx * WORLD_SCALE;
      const rd = dPx * WORLD_SCALE;
      const geo = trackGeo(new THREE.PlaneGeometry(rw, rd));
      scalePlaneUVs(geo, Math.max(1, rw / tileScale), Math.max(1, rd / tileScale));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = rotX;
      mesh.position.set((xPx + wPx / 2) * WORLD_SCALE, worldY, (zPx + dPx / 2) * WORLD_SCALE);
      mesh.receiveShadow = receiveShadow;
      this.staticGroup.add(mesh);
    };

    const addPlaneAroundHole3D = (
      rx: number,
      rz: number,
      rw: number,
      rd: number,
      hx: number,
      hz: number,
      hw: number,
      hd: number,
      worldY: number,
      mat: THREE.Material,
      rotX: number,
      tileScale = 2.2,
      receiveShadow = false,
    ) => {
      const ix1 = Math.max(rx, hx);
      const iz1 = Math.max(rz, hz);
      const ix2 = Math.min(rx + rw, hx + hw);
      const iz2 = Math.min(rz + rd, hz + hd);
      if (ix1 >= ix2 || iz1 >= iz2) {
        addPlaneRect3D(rx, rz, rw, rd, worldY, mat, rotX, tileScale, receiveShadow);
        return;
      }
      // North band
      addPlaneRect3D(rx, rz, rw, iz1 - rz, worldY, mat, rotX, tileScale, receiveShadow);
      // South band
      addPlaneRect3D(rx, iz2, rw, rz + rd - iz2, worldY, mat, rotX, tileScale, receiveShadow);
      // West band
      addPlaneRect3D(rx, iz1, ix1 - rx, iz2 - iz1, worldY, mat, rotX, tileScale, receiveShadow);
      // East band
      addPlaneRect3D(
        ix2,
        iz1,
        rx + rw - ix2,
        iz2 - iz1,
        worldY,
        mat,
        rotX,
        tileScale,
        receiveShadow,
      );
    };

    const baseMat = trackMat(new THREE.MeshStandardMaterial({ color: "#202830", roughness: 0.95 }));
    // Floor 0 dark subfloor (split around stairwell opening)
    addPlaneAroundHole3D(
      0,
      0,
      WORLD.w,
      FLOOR_SPLIT_Y,
      STAIRWELL_HOLE.x,
      STAIRWELL_HOLE.y,
      STAIRWELL_HOLE.w,
      STAIRWELL_HOLE.h,
      -0.01,
      baseMat,
      -Math.PI / 2,
      4,
    );
    // Floor 1 dark subfloor
    addPlaneRect3D(
      0,
      FLOOR_SPLIT_Y + BASEMENT_DZ_PX,
      WORLD.w,
      WORLD.h - FLOOR_SPLIT_Y,
      -FLOOR_HEIGHT_M - 0.01,
      baseMat,
      -Math.PI / 2,
      4,
    );

    // Room floors (Floor 0 at Y = 0 split around stairwell opening; Floor 1 at Y = -FLOOR_HEIGHT_M)
    for (const r of ROOMS) {
      const isBasement = floorOfY(r.y) === 1;
      const worldY = isBasement ? -FLOOR_HEIGHT_M : 0;
      const rz = isBasement ? r.y + BASEMENT_DZ_PX : r.y;
      if (isBasement) {
        addPlaneRect3D(r.x, rz, r.w, r.h, worldY, floorMats[r.floor], -Math.PI / 2, 2.2, true);
      } else {
        addPlaneAroundHole3D(
          r.x,
          rz,
          r.w,
          r.h,
          STAIRWELL_HOLE.x,
          STAIRWELL_HOLE.y,
          STAIRWELL_HOLE.w,
          STAIRWELL_HOLE.h,
          worldY,
          floorMats[r.floor],
          -Math.PI / 2,
          2.2,
          true,
        );
      }
    }

    // Office rugs & Kitchen burgundy mats
    const addRug = (x: number, y: number, w: number, h: number, col: string, trim?: string) => {
      const rw = w * WORLD_SCALE;
      const rd = h * WORLD_SCALE;
      const p3 = to3DCoords(x + w / 2, y + h / 2, 0.006);
      const rug = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(rw, 0.012, rd)),
        trackMat(new THREE.MeshStandardMaterial({ color: col, roughness: 0.92 })),
      );
      rug.position.set(p3.x, p3.y, p3.z);
      rug.receiveShadow = true;
      this.staticGroup.add(rug);
      if (trim) {
        const inner = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(rw - 0.35, 0.014, rd - 0.35)),
          trackMat(new THREE.MeshStandardMaterial({ color: trim, roughness: 0.9 })),
        );
        inner.position.set(p3.x, p3.y + 0.001, p3.z);
        inner.receiveShadow = true;
        this.staticGroup.add(inner);
      }
    };
    addRug(418, 96, 208, 148, "#747068", "#aba79f"); // Michael's office
    addRug(52, 312, 118, 146, "#4f6880"); // Reception waiting
    addRug(1108, 355, 72, 34, "#7a2c38"); // Kitchen coffee mat
    addRug(1204, 355, 68, 34, "#7a2c38"); // Kitchen sink mat

    // Ceilings with fluorescent acoustic tiles (Floor 0 + Floor 1 Basement with open Stairwell cutout)
    const ceilMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: this.tex.ceiling,
        emissive: "#f4f7fb",
        emissiveIntensity: 0.18,
        roughness: 0.85,
      }),
    );
    addPlaneRect3D(0, 0, WORLD.w, FLOOR_SPLIT_Y, CEILING_Y, ceilMat, Math.PI / 2, 3.2);
    addPlaneAroundHole3D(
      0,
      FLOOR_SPLIT_Y + BASEMENT_DZ_PX,
      WORLD.w,
      WORLD.h - FLOOR_SPLIT_Y,
      STAIRWELL_HOLE.x,
      STAIRWELL_HOLE.y,
      STAIRWELL_HOLE.w,
      STAIRWELL_HOLE.h,
      -FLOOR_HEIGHT_M + CEILING_Y,
      ceilMat,
      Math.PI / 2,
      3.2,
    );

    // Wall materials
    const wallMat = trackMat(
      new THREE.MeshStandardMaterial({ map: this.tex.wall, roughness: 0.86 }),
    );
    const sageWallMat = trackMat(
      new THREE.MeshStandardMaterial({ map: this.tex.sageWall, roughness: 0.86 }),
    );
    const frameMat = trackMat(
      new THREE.MeshStandardMaterial({ color: "#4e5c68", roughness: 0.35, metalness: 0.65 }),
    );
    const darkMetalMat = trackMat(
      new THREE.MeshStandardMaterial({ color: "#1d2228", roughness: 0.3, metalness: 0.78 }),
    );
    const glassMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: "#b7dcf0",
        transparent: true,
        opacity: 0.26,
        roughness: 0.08,
        metalness: 0.15,
        depthWrite: false,
      }),
    );
    const blindMat = trackMat(
      new THREE.MeshStandardMaterial({ color: "#edeade", roughness: 0.65 }),
    );
    const windowGlowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: "#dff1fc",
        emissive: "#cbe8fb",
        emissiveIntensity: 0.85,
        roughness: 0.15,
      }),
    );

    const addWallBox = (
      px: number,
      py: number,
      pw: number,
      ph: number,
      yBottom: number,
      yTop: number,
      mat: THREE.Material,
    ) => {
      const h = yTop - yBottom;
      if (h <= 0.01 || pw <= 1 || ph <= 1) return;
      const bw = pw * WORLD_SCALE;
      const bd = ph * WORLD_SCALE;
      const geo = trackGeo(new THREE.BoxGeometry(bw, h, bd));
      scaleBoxUVs(geo, Math.max(1, Math.max(bw, bd) / 3), Math.max(1, h / WALL_HEIGHT));
      const m = new THREE.Mesh(geo, mat);
      const p3 = to3DCoords(px + pw / 2, py + ph / 2, yBottom + h / 2);
      m.position.set(p3.x, p3.y, p3.z);
      m.castShadow = mat === wallMat && floorOfY(py) === 0;
      m.receiveShadow = true;
      this.staticGroup.add(m);
    };

    for (const w of WALLS) {
      if (w.kind === "glass") {
        // Kickplate + top header + glass pane + horizontal blinds strip + mullions
        addWallBox(w.x, w.y, w.w, w.h, 0, 0.28, wallMat);
        addWallBox(w.x, w.y, w.w, w.h, 2.55, WALL_HEIGHT, wallMat);
        const bw = w.w * WORLD_SCALE;
        const bd = w.h * WORLD_SCALE * 0.28;
        const pane = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(bw, 2.27, bd)), glassMat);
        pane.position.set(
          (w.x + w.w / 2) * WORLD_SCALE,
          0.28 + 2.27 / 2,
          (w.y + w.h / 2) * WORLD_SCALE,
        );
        this.staticGroup.add(pane);

        // Aluminum mullions
        for (let mx = w.x; mx <= w.x + w.w; mx += 72) {
          const post = new THREE.Mesh(
            trackGeo(new THREE.BoxGeometry(0.08, 2.3, bd * 1.4)),
            frameMat,
          );
          post.position.set(mx * WORLD_SCALE, 1.42, (w.y + w.h / 2) * WORLD_SCALE);
          this.staticGroup.add(post);
        }
        // Subtle open horizontal blinds slats across middle band (y = 1.2..2.2)
        for (let by = 1.22; by <= 2.15; by += 0.16) {
          const slat = new THREE.Mesh(
            trackGeo(new THREE.BoxGeometry(bw * 0.98, 0.018, 0.04)),
            blindMat,
          );
          slat.position.set((w.x + w.w / 2) * WORLD_SCALE, by, (w.y + w.h / 2) * WORLD_SCALE);
          this.staticGroup.add(slat);
        }
        continue;
      }

      // North exterior wall (y === 0) & South exterior wall (y === 906) with window cutouts
      if (w.kind === "outer" && w.horizontal && (w.y === 0 || w.y === 906)) {
        const isSouth = w.y === 906;
        let cur = w.x;
        const end = w.x + w.w;
        const wins = [...(isSouth ? SOUTH_WINDOWS : WINDOWS)].sort((a, b) => a.x - b.x);
        for (const win of wins) {
          if (win.x > cur) {
            addWallBox(cur, w.y, win.x - cur, w.h, 0, WALL_HEIGHT, wallMat);
          }
          // Below sill + above lintel
          addWallBox(win.x, w.y, win.w, w.h, 0, 0.92, wallMat);
          addWallBox(win.x, w.y, win.w, w.h, 2.48, WALL_HEIGHT, wallMat);
          // Window frame & glowing pane
          const ww = win.w * WORLD_SCALE;
          const wz = (isSouth ? w.y + w.h * 0.35 : w.y + w.h * 0.65) * WORLD_SCALE;
          const pane = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(ww, 1.54)), windowGlowMat);
          pane.position.set((win.x + win.w / 2) * WORLD_SCALE, 1.7, wz);
          if (isSouth) pane.rotation.y = Math.PI;
          this.staticGroup.add(pane);
          // Dark window valance pelmet on top
          const valance = new THREE.Mesh(
            trackGeo(new THREE.BoxGeometry(ww + 0.08, 0.08, 0.1)),
            darkMetalMat,
          );
          valance.position.set(
            (win.x + win.w / 2) * WORLD_SCALE,
            2.48,
            wz + (isSouth ? -0.05 : 0.05),
          );
          this.staticGroup.add(valance);
          for (let by = 1.02; by <= 2.4; by += 0.13) {
            const slat = new THREE.Mesh(
              trackGeo(new THREE.BoxGeometry(ww * 0.95, 0.02, 0.04)),
              blindMat,
            );
            slat.position.set((win.x + win.w / 2) * WORLD_SCALE, by, wz + (isSouth ? -0.04 : 0.04));
            this.staticGroup.add(slat);
          }
          cur = Math.max(cur, win.x + win.w);
        }
        if (cur < end) addWallBox(cur, w.y, end - cur, w.h, 0, WALL_HEIGHT, wallMat);
        continue;
      }

      addWallBox(w.x, w.y, w.w, w.h, 0, WALL_HEIGHT, wallMat);
    }

    // ---- Michael's Office ultra-detailed interior architecture, artwork & fixtures ----
    const addLiner = (x: number, z: number, w: number, h: number, rotY: number) => {
      const geo = trackGeo(new THREE.PlaneGeometry(w, h));
      scalePlaneUVs(geo, Math.max(1, w / 2.8), Math.max(1, h / WALL_HEIGHT));
      const mesh = new THREE.Mesh(geo, sageWallMat);
      mesh.position.set(x, h / 2, z);
      mesh.rotation.y = rotY;
      mesh.receiveShadow = true;
      this.staticGroup.add(mesh);
    };
    // North interior sage panels (flanking window 470..570)
    addLiner(
      408 * WORLD_SCALE,
      (WALL_DEPTH + 1.5) * WORLD_SCALE,
      124 * WORLD_SCALE,
      WALL_HEIGHT,
      0,
    );
    addLiner(
      622 * WORLD_SCALE,
      (WALL_DEPTH + 1.5) * WORLD_SCALE,
      102 * WORLD_SCALE,
      WALL_HEIGHT,
      0,
    );
    addLiner(520 * WORLD_SCALE, (WALL_DEPTH + 1.5) * WORLD_SCALE, 100 * WORLD_SCALE, 0.92, 0);
    // West & East interior sage walls (x=347.5 .. 672.5, y=40..260)
    addLiner(348 * WORLD_SCALE, 150 * WORLD_SCALE, 220 * WORLD_SCALE, WALL_HEIGHT, Math.PI / 2);
    addLiner(672 * WORLD_SCALE, 150 * WORLD_SCALE, 220 * WORLD_SCALE, WALL_HEIGHT, -Math.PI / 2);

    // West wall interior Venetian blind panel (y = 160..216)
    const wBlindW = 54 * WORLD_SCALE;
    const wBlindZ = 188 * WORLD_SCALE;
    const wGlow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(wBlindW, 1.48)), windowGlowMat);
    wGlow.position.set(348.8 * WORLD_SCALE, 1.68, wBlindZ);
    wGlow.rotation.y = Math.PI / 2;
    this.staticGroup.add(wGlow);
    const wValance = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.08, 0.08, wBlindW + 0.08)),
      darkMetalMat,
    );
    wValance.position.set(349.5 * WORLD_SCALE, 2.43, wBlindZ);
    this.staticGroup.add(wValance);
    for (let by = 1.02; by <= 2.34; by += 0.13) {
      const slat = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.035, 0.018, wBlindW * 0.95)),
        blindMat,
      );
      slat.position.set(350 * WORLD_SCALE, by, wBlindZ);
      this.staticGroup.add(slat);
    }

    // Matte-black coat rack (between window & armoire: x=578, y=56)
    const coatX = 578 * WORLD_SCALE;
    const coatZ = 56 * WORLD_SCALE;
    const coatBase = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 12)),
      darkMetalMat,
    );
    coatBase.position.set(coatX, 0.015, coatZ);
    const coatPole = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.024, 0.032, 1.92, 10)),
      darkMetalMat,
    );
    coatPole.position.set(coatX, 0.96, coatZ);
    coatPole.castShadow = true;
    this.staticGroup.add(coatBase, coatPole);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const hook = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.16, 0.025, 0.025)),
        darkMetalMat,
      );
      hook.position.set(
        coatX + Math.cos(a) * 0.07,
        1.72 + (i % 2) * 0.08,
        coatZ + Math.sin(a) * 0.07,
      );
      hook.rotation.y = -a;
      hook.rotation.z = 0.45;
      this.staticGroup.add(hook);
    }

    // Tall NE corner torchiere uplight floor lamp (x=660, y=56)
    const lampX = 660 * WORLD_SCALE;
    const lampZ = 56 * WORLD_SCALE;
    const fBase = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.18, 0.2, 0.035, 12)),
      darkMetalMat,
    );
    fBase.position.set(lampX, 0.018, lampZ);
    const fPole = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.022, 0.026, 2.02, 10)),
      darkMetalMat,
    );
    fPole.position.set(lampX, 1.01, lampZ);
    const bowlMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: "#fdf4dc",
        emissive: "#ffe4a0",
        emissiveIntensity: 0.65,
        roughness: 0.3,
      }),
    );
    const fBowl = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.22, 0.18, 14)), bowlMat);
    fBowl.rotation.x = Math.PI;
    fBowl.position.set(lampX, 2.06, lampZ);
    this.staticGroup.add(fBase, fPole, fBowl);

    // Framed wall art inside Michael's office
    const addWallArt = (
      texMap: THREE.Texture,
      wM: number,
      hM: number,
      x: number,
      yM: number,
      z: number,
      rotY: number,
    ) => {
      const mArt = trackMat(new THREE.MeshStandardMaterial({ map: texMap, roughness: 0.42 }));
      const panel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(wM, hM, 0.035)), mArt);
      panel.position.set(x * WORLD_SCALE, yM, z * WORLD_SCALE);
      panel.rotation.y = rotY;
      this.staticGroup.add(panel);
    };
    // West wall: Scranton Map above low bookcase + black-framed photo south of blind
    addWallArt(this.tex.scrantonMap, 1.85, 0.92, 349.2, 1.82, 124, Math.PI / 2);
    addWallArt(this.tex.seykoCert, 0.46, 0.42, 349.2, 1.72, 236, Math.PI / 2);
    // North wall above 2-drawer filing cabinet: red-framed photo
    const redArtMat = trackMat(
      new THREE.MeshStandardMaterial({ color: "#9c2f2d", roughness: 0.5 }),
    );
    const redPic = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.36, 0.035)), redArtMat);
    redPic.position.set(428 * WORLD_SCALE, 1.76, (WALL_DEPTH + 2.5) * WORLD_SCALE);
    this.staticGroup.add(redPic);
    // East wall: Seyko Certificate + large landscape painting + tall red poster + small photo
    addWallArt(this.tex.seykoCert, 0.62, 0.72, 670.8, 1.86, 102, -Math.PI / 2);
    addWallArt(this.tex.landscapeArt, 1.62, 0.9, 670.8, 1.78, 158, -Math.PI / 2);
    const poster = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.035, 0.82, 0.52)), redArtMat);
    poster.position.set(670.8 * WORLD_SCALE, 1.72, 218 * WORLD_SCALE);
    this.staticGroup.add(poster);

    // Lobby Dunder Mifflin sign
    const signMat = trackMat(
      new THREE.MeshStandardMaterial({ map: this.tex.signDunder, roughness: 0.4 }),
    );
    const signMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.65, 1.0, 0.06)), signMat);
    signMesh.position.set(202 * WORLD_SCALE, 1.78, (WALL_DEPTH + 4) * WORLD_SCALE);
    this.staticGroup.add(signMesh);

    // Conference Room whiteboard
    const wbMat = trackMat(
      new THREE.MeshStandardMaterial({ map: this.tex.whiteboard, roughness: 0.3 }),
    );
    const wbMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.8, 1.35, 0.05)), wbMat);
    wbMesh.position.set(880 * WORLD_SCALE, 1.68, (WALL_DEPTH + 4) * WORLD_SCALE);
    this.staticGroup.add(wbMesh);

    // Elevator double doors on Floor 0 Lobby/Reception AND Floor 1 Basement Archive
    const elMat = trackMat(
      new THREE.MeshStandardMaterial({ color: "#9da8b0", roughness: 0.28, metalness: 0.72 }),
    );
    const elMesh = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(ELEVATOR.w * WORLD_SCALE, 2.25, 0.14)),
      elMat,
    );
    elMesh.position.set(
      (ELEVATOR.x + ELEVATOR.w / 2) * WORLD_SCALE,
      1.125,
      (ELEVATOR.y + WALL_DEPTH + 3) * WORLD_SCALE,
    );
    const elDownMesh = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(88 * WORLD_SCALE, 2.25, 0.14)),
      elMat,
    );
    const elDownPos = to3DCoords(162, 1132, 1.125);
    elDownMesh.position.set(elDownPos.x, elDownPos.y, elDownPos.z);
    this.staticGroup.add(elMesh, elDownMesh);

    // Stairwell protective guardrail along south side of Floor 0 opening + vertical posts
    const railWoodMat = trackMat(
      new THREE.MeshStandardMaterial({ color: "#c98a52", roughness: 0.5, metalness: 0.08 }),
    );
    const holeRim = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(STAIRWELL_HOLE.w * WORLD_SCALE, 0.08, 0.08)),
      railWoodMat,
    );
    holeRim.position.set(
      (STAIRWELL_HOLE.x + STAIRWELL_HOLE.w / 2) * WORLD_SCALE,
      0.92,
      (STAIRWELL_HOLE.y + STAIRWELL_HOLE.h) * WORLD_SCALE,
    );
    this.staticGroup.add(holeRim);
    for (const pxOffset of [
      0.06,
      STAIRWELL_HOLE.w * WORLD_SCALE * 0.5,
      STAIRWELL_HOLE.w * WORLD_SCALE - 0.06,
    ]) {
      const post = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.92, 0.06)), railWoodMat);
      post.position.set(
        STAIRWELL_HOLE.x * WORLD_SCALE + pxOffset,
        0.46,
        (STAIRWELL_HOLE.y + STAIRWELL_HOLE.h) * WORLD_SCALE,
      );
      this.staticGroup.add(post);
    }

    // Subtle yellow floor safety strips marking the Floor 0 & Floor 1 stair thresholds
    const stepStripMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: "#e3b93a",
        emissive: "#544010",
        emissiveIntensity: 0.25,
        roughness: 0.5,
      }),
    );
    const upThreshold = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(0.14, (STAIRWELL_HOLE.h - 14) * WORLD_SCALE)),
      stepStripMat,
    );
    upThreshold.rotation.x = -Math.PI / 2;
    upThreshold.position.set(
      (STAIRWELL_HOLE.x + STAIRWELL_HOLE.w + 4) * WORLD_SCALE,
      0.008,
      (STAIRWELL_HOLE.y + STAIRWELL_HOLE.h / 2) * WORLD_SCALE,
    );
    const downThreshold = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(STAIRWELL_HOLE.w * WORLD_SCALE * 0.84, 0.14)),
      stepStripMat,
    );
    downThreshold.rotation.x = -Math.PI / 2;
    const dtPos = to3DCoords(1176, 1076, 0.008);
    downThreshold.position.set(dtPos.x, dtPos.y, dtPos.z);
    this.staticGroup.add(upThreshold, downThreshold);

    // Bathroom door signs & vanity mirrors
    for (const [bx, by, col] of [
      [1450, 625, "#d57b97"],
      [1450, 815, "#4c7189"],
    ] as const) {
      const badge = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.06, 0.36, 0.36)),
        trackMat(new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 })),
      );
      badge.position.set(bx * WORLD_SCALE, 1.65, by * WORLD_SCALE);
      this.staticGroup.add(badge);
    }

    // Warehouse safety stripes & industrial steel structural columns (Floor 1)
    const yellowMat = trackMat(
      new THREE.MeshStandardMaterial({ color: "#e3b93a", roughness: 0.6 }),
    );
    const lineGeo = trackGeo(new THREE.PlaneGeometry((2150 - 1045) * WORLD_SCALE, 0.12));
    const lineMesh = new THREE.Mesh(lineGeo, yellowMat);
    lineMesh.rotation.x = -Math.PI / 2;
    const stripePos = to3DCoords((1045 + 2150) / 2, 1345, 0.005);
    lineMesh.position.set(stripePos.x, stripePos.y, stripePos.z);
    this.staticGroup.add(lineMesh);

    const colMat = trackMat(
      new THREE.MeshStandardMaterial({ color: "#3d4652", roughness: 0.38, metalness: 0.68 }),
    );
    for (const [cx, cy] of [
      [1290, 1180],
      [1520, 1180],
      [1290, 1390],
      [1780, 1390],
    ] as const) {
      const col = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, WALL_HEIGHT, 0.28)), colMat);
      const cp = to3DCoords(cx, cy, WALL_HEIGHT / 2);
      col.position.set(cp.x, cp.y, cp.z);
      this.staticGroup.add(col);
    }

    // All 22 Conference Room seats (player + every active cast member)
    const confChairs = buildConferenceChairs(CONF_SEATS);
    this.staticGroup.add(confChairs.group);
    this.staticDisposables.push(confChairs);
  }

  private clearGroup(group: THREE.Group, disposables: { dispose: () => void }[]) {
    while (group.children.length > 0) group.remove(group.children[0]!);
    for (const d of disposables) d.dispose();
    disposables.length = 0;
  }

  private syncFurniture(game: Game) {
    const active = getActiveFurniture();
    const sig = `${game.episode?.id ?? ""}|${active.length}`;
    if (sig === this.furnitureSig) return;
    this.furnitureSig = sig;
    this.clearGroup(this.furnitureGroup, this.furnitureDisposables);
    for (const f of active) {
      const built = buildFurnitureMesh(f, this.tex);
      this.furnitureGroup.add(built.group);
      this.furnitureDisposables.push(built);
    }
  }

  private syncDecor(
    eventId: EventId | null,
    decor: OfficeDecorKind | null,
    epId: string | null,
    activeEffect: string | null,
  ) {
    const sig = `${eventId ?? ""}|${decor ?? ""}|${epId ?? ""}|${activeEffect ?? ""}`;
    if (sig === this.decorSig) return;
    this.decorSig = sig;
    this.clearGroup(this.decorGroup, this.decorDisposables);

    const gAdd = <T extends THREE.BufferGeometry>(g: T): T => {
      this.decorDisposables.push(g);
      return g;
    };
    const mAdd = <T extends THREE.Material>(m: T): T => {
      this.decorDisposables.push(m);
      return m;
    };

    if (eventId === "navidad") {
      const tree = buildChristmasTree();
      tree.group.position.set(295 * WORLD_SCALE, 0, 350 * WORLD_SCALE);
      this.decorGroup.add(tree.group);
      this.decorDisposables.push(tree);
    }
    if (eventId === "halloween") {
      const pMat = mAdd(
        new THREE.MeshStandardMaterial({
          color: "#e87e24",
          emissive: "#ff6f00",
          emissiveIntensity: 0.25,
          roughness: 0.6,
        }),
      );
      const stemMat = mAdd(new THREE.MeshStandardMaterial({ color: "#3d7a34", roughness: 0.8 }));
      const geo = gAdd(new THREE.SphereGeometry(0.28, 10, 8));
      const stemGeo = gAdd(new THREE.CylinderGeometry(0.04, 0.05, 0.14, 6));
      for (const [px, py] of [
        [270, 320],
        [450, 560],
        [1340, 560],
        [2130, 895],
        [70, 890],
      ] as const) {
        const mesh = new THREE.Mesh(geo, pMat);
        mesh.scale.set(1, 0.78, 1);
        mesh.position.set(px * WORLD_SCALE, 0.22, py * WORLD_SCALE);
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(px * WORLD_SCALE, 0.45, py * WORLD_SCALE);
        this.decorGroup.add(mesh, stem);
      }
    }
    if (epId === "s1e1" || activeEffect === "gelatin_stapler") {
      const jello = new THREE.Mesh(
        gAdd(new THREE.BoxGeometry(0.32, 0.22, 0.28)),
        mAdd(
          new THREE.MeshStandardMaterial({
            color: "#facc15",
            transparent: true,
            opacity: 0.72,
            roughness: 0.15,
          }),
        ),
      );
      jello.position.set(598 * WORLD_SCALE, 0.9, 500 * WORLD_SCALE);
      const redStapler = new THREE.Mesh(
        gAdd(new THREE.BoxGeometry(0.18, 0.08, 0.08)),
        mAdd(new THREE.MeshStandardMaterial({ color: "#dc2626", roughness: 0.4 })),
      );
      redStapler.position.copy(jello.position);
      this.decorGroup.add(jello, redStapler);
    }
    if (epId === "s2e10" || activeEffect === "yankee_swap") {
      const boxG = gAdd(new THREE.BoxGeometry(0.34, 0.26, 0.34));
      const g1 = new THREE.Mesh(
        boxG,
        mAdd(new THREE.MeshStandardMaterial({ color: "#c8312f", roughness: 0.5 })),
      );
      g1.position.set(830 * WORLD_SCALE, 0.92, 168 * WORLD_SCALE);
      const g2 = new THREE.Mesh(
        boxG,
        mAdd(new THREE.MeshStandardMaterial({ color: "#2f6ea3", roughness: 0.5 })),
      );
      g2.position.set(905 * WORLD_SCALE, 0.92, 170 * WORLD_SCALE);
      const ipod = new THREE.Mesh(
        gAdd(new THREE.BoxGeometry(0.24, 0.12, 0.3)),
        mAdd(
          new THREE.MeshStandardMaterial({
            color: "#ffffff",
            emissive: "#e2e8f0",
            emissiveIntensity: 0.2,
            roughness: 0.3,
          }),
        ),
      );
      ipod.position.set(868 * WORLD_SCALE, 0.86, 166 * WORLD_SCALE);
      this.decorGroup.add(g1, g2, ipod);
    }
    if (decor === "casino" || epId === "s2e22") {
      const casino = new THREE.Mesh(
        gAdd(new THREE.BoxGeometry(3.6, 0.76, 1.9)),
        mAdd(new THREE.MeshStandardMaterial({ color: "#1d5c3a", roughness: 0.75 })),
      );
      const cp = to3DCoords(1300, 1185, 0.38);
      casino.position.set(cp.x, cp.y, cp.z);
      this.decorGroup.add(casino);
    }
    if (epId === "s4e1" || decor === "funrun") {
      const line = new THREE.Mesh(
        gAdd(new THREE.PlaneGeometry(2.5, 0.28)),
        mAdd(new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.6 })),
      );
      line.rotation.x = -Math.PI / 2;
      const fp = to3DCoords(295, 520, 0.008);
      line.position.set(fp.x, fp.y, fp.z);
      this.decorGroup.add(line);
    }
  }

  private syncActors(game: Game, dt: number) {
    // Player rig
    const pCostume = game.playerSkin ?? game.event?.playerCostume;
    const pSig = `${JSON.stringify(game.playerLook)}|${pCostume ?? ""}`;
    if (!this.playerEntry || this.playerEntry.sig !== pSig) {
      if (this.playerEntry) {
        this.actorsGroup.remove(this.playerEntry.rig.root);
        this.playerEntry.rig.dispose();
      }
      const rig = buildCharacterRig(game.playerLook, pCostume, this.tex.shadowDisc);
      this.actorsGroup.add(rig.root);
      this.playerEntry = { rig, sig: pSig };
    }

    const snap = game.getSnapshot();
    const mc = snap.meetingCinema;
    const speakerNpc = mc ? game.npcs.find((n) => n.def.id === mc.speakerId) : undefined;
    const speakerPos = speakerNpc ? { x: speakerNpc.x, y: speakerNpc.y } : null;

    const pRig = this.playerEntry.rig;
    pRig.root.visible =
      game.isCinematic || game.isMeetingCinema || game.cameraMode !== "first_person";
    const p3 = to3DCoords(game.player.x, game.player.y, 0);
    pRig.root.position.set(p3.x, p3.y, p3.z);
    const pYaw =
      game.isCinematic || game.isMeetingCinema || game.player.seated
        ? yawFromFacing(game.player.facing)
        : game.playerYaw;
    pRig.root.rotation.y = -pYaw;
    const pLookYaw =
      game.isMeetingCinema && speakerPos
        ? shortestAngleDiff(
            pYaw,
            Math.atan2(speakerPos.x - game.player.x, -(speakerPos.y - game.player.y)),
          )
        : undefined;
    const pVariant = game.playerActionSeed + Math.floor(game.time / 5.5);
    const playerOnCall = snap.pc?.screen === "call";
    animateCharacterRig(pRig, {
      moving: game.player.moving,
      running: game.player.running,
      walkT: game.player.walkT,
      handRaised: game.meetingOpen,
      idlePhase: game.time * 1.4,
      seated: game.player.seated,
      gesture: game.player.gesture,
      lookYaw: pLookYaw,
      actionText: game.player.action,
      actionVariant: pVariant,
      onCall: playerOnCall,
      dt,
    });

    // NPC rigs
    const seen = new Set<string>();
    const activeEv = snap.activeOfficeEvent;
    for (const n of game.npcs) {
      seen.add(n.def.id);
      const costume =
        (n.def.id === "michael" ? game.cinematicCostume : undefined) ??
        game.event?.costumes[n.def.id] ??
        (n.def.id === "michael" &&
        (activeEv?.effect === "prison_mike" || (game.episode?.id === "s3e9" && game.mins < 630))
          ? "prison_mike"
          : undefined);
      const sig = `${n.def.id}|${costume ?? ""}`;
      const existing = this.npcEntries.get(n.def.id);
      const isFreshEntry = !existing || existing.sig !== sig;
      let entry = existing;
      if (!entry || entry.sig !== sig) {
        if (entry) {
          this.actorsGroup.remove(entry.rig.root);
          entry.rig.dispose();
        }
        const rig = buildCharacterRig(n.def.look, costume, this.tex.shadowDisc);
        this.actorsGroup.add(rig.root);
        entry = { rig, sig, yaw: yawFromFacing(n.facing), lastX: n.x, lastY: n.y };
        this.npcEntries.set(n.def.id, entry);
      }

      const deskSeated =
        !n.moving &&
        !n.seated &&
        (n.targetKey.startsWith("seat_") || n.targetKey.startsWith("override:seat_"));

      const n3 = to3DCoords(n.x, n.y, 0);
      let goalX = n3.x;
      let goalY = n3.y;
      let goalZ = n3.z;
      let seatYawOverride: number | null = null;

      if (deskSeated) {
        const cleanKey = n.targetKey.split("@")[0] ?? n.targetKey;
        const seatKey = cleanKey.startsWith("override:")
          ? cleanKey.slice("override:".length)
          : cleanKey;
        const seatOwner = seatKey.startsWith("seat_") ? seatKey.slice("seat_".length) : n.def.id;
        const seatAnchor = getDeskSeatAnchor3D(seatOwner);
        if (
          seatAnchor &&
          Math.abs(seatAnchor.y - n3.y) < 0.5 &&
          Math.hypot(seatAnchor.x - n3.x, seatAnchor.z - n3.z) < 0.85
        ) {
          goalX = seatAnchor.x;
          goalY = seatAnchor.y;
          goalZ = seatAnchor.z;
          seatYawOverride = seatAnchor.yaw;
        }
      }

      const dx = n.x - entry.lastX;
      const dy = n.y - entry.lastY;
      entry.lastX = n.x;
      entry.lastY = n.y;
      const targetYaw =
        seatYawOverride !== null
          ? seatYawOverride
          : n.moving && Math.hypot(dx, dy) > 0.15
            ? Math.atan2(dx, -dy)
            : yawFromFacing(n.facing);
      if (isFreshEntry) {
        entry.yaw = targetYaw;
        entry.rig.root.position.set(goalX, goalY, goalZ);
      } else {
        entry.yaw +=
          shortestAngleDiff(entry.yaw, targetYaw) *
          Math.min(1, dt * (n.seated || deskSeated ? 14 : 8.5));
        const posDelta = Math.hypot(
          goalX - entry.rig.root.position.x,
          goalY - entry.rig.root.position.y,
          goalZ - entry.rig.root.position.z,
        );
        if (posDelta > 2.5) {
          entry.rig.root.position.set(goalX, goalY, goalZ);
        } else {
          const posAlpha = 1 - Math.exp(-(deskSeated ? 10 : 14) * dt);
          entry.rig.root.position.x += (goalX - entry.rig.root.position.x) * posAlpha;
          entry.rig.root.position.y += (goalY - entry.rig.root.position.y) * posAlpha;
          entry.rig.root.position.z += (goalZ - entry.rig.root.position.z) * posAlpha;
        }
      }
      entry.rig.root.rotation.y = -entry.yaw;

      const lookYaw =
        n.seated && speakerPos && mc && n.def.id !== mc.speakerId
          ? shortestAngleDiff(entry.yaw, Math.atan2(speakerPos.x - n.x, -(speakerPos.y - n.y)))
          : undefined;
      let actionHash = 0;
      const hashSrc = `${n.def.id}:${n.action}`;
      for (let hi = 0; hi < hashSrc.length; hi++) {
        actionHash = (actionHash * 31 + hashSrc.charCodeAt(hi)) | 0;
      }
      const npcVariant = Math.abs(actionHash) + Math.floor(game.time / 6.0);

      animateCharacterRig(entry.rig, {
        moving: n.moving,
        running: n.running,
        walkT: n.walkT,
        handRaised: n.gesture === "raise_hand",
        idlePhase: game.time * 1.3 + n.def.id.charCodeAt(0) * 0.7,
        seated: n.seated,
        deskSeated,
        gesture: n.gesture,
        lookYaw,
        actionText: n.action,
        actionVariant: npcVariant,
        dt,
      });
    }

    for (const [id, entry] of this.npcEntries) {
      if (!seen.has(id)) {
        this.actorsGroup.remove(entry.rig.root);
        entry.rig.dispose();
        this.npcEntries.delete(id);
      }
    }
  }

  private syncProps(game: Game) {
    const notice = game.getSnapshot().meetingNotice;
    this.seatHighlight.group.visible = Boolean(notice && !notice.playerSeated);
    if (this.seatHighlight.group.visible) {
      const seat = CONF_SEATS[0]!;
      this.seatHighlight.group.position.set(
        seat.x * WORLD_SCALE,
        0.02 + Math.sin(game.time * 3.6) * 0.05,
        seat.y * WORLD_SCALE,
      );
      this.seatHighlight.group.rotation.y = game.time * 2.2;
    }

    const targeted = game.targetedObjects();
    for (const o of OBJECTS) {
      const want = targeted.has(o.id);
      const existing = this.beaconEntries.get(o.id);
      if (want && !existing) {
        const b = buildBeaconProp(0xf2c14e);
        const op = to3DCoords(o.x, o.y, 0.02);
        b.group.position.set(op.x, op.y, op.z);
        this.propsGroup.add(b.group);
        this.beaconEntries.set(o.id, b);
      } else if (!want && existing) {
        this.propsGroup.remove(existing.group);
        existing.dispose();
        this.beaconEntries.delete(o.id);
      } else if (want && existing) {
        existing.group.rotation.y = game.time * 1.6;
        existing.group.position.y = to3DCoords(o.x, o.y, 0.02).y + Math.sin(game.time * 3.5) * 0.08;
      }
    }

    for (const d of DUNDIES) {
      const want = !game.dundiesFound.includes(d.id);
      const existing = this.dundieEntries.get(d.id);
      if (want && !existing) {
        const b = buildBeaconProp(0xfbbf24);
        b.group.scale.setScalar(0.8);
        const dp = to3DCoords(d.x, d.y, 0.02);
        b.group.position.set(dp.x, dp.y, dp.z);
        this.propsGroup.add(b.group);
        this.dundieEntries.set(d.id, b);
      } else if (!want && existing) {
        this.propsGroup.remove(existing.group);
        existing.dispose();
        this.dundieEntries.delete(d.id);
      } else if (want && existing) {
        existing.group.rotation.y = game.time * 1.8 + d.x;
        existing.group.position.y =
          to3DCoords(d.x, d.y, 0.02).y + Math.sin(game.time * 3 + d.x) * 0.06;
      }
    }
  }

  private updateAtmosphere(game: Game) {
    const m = game.mins;
    const ev = game.event?.id;
    if (ev === "halloween") {
      this.skyBgColor.set("#2f2345");
      this.fog.color.set("#382b52");
      this.sunLight.color.set("#ffba7a");
      this.sunLight.intensity = 1.1;
      this.hemiLight.intensity = 0.72;
    } else if (m > 15 * 60) {
      const k = Math.min(1, (m - 900) / 120);
      this.scratchColor.set("#f0caa3");
      this.skyBgColor.set("#cfd9e3").lerp(this.scratchColor, k * 0.45);
      this.fog.color.copy(this.skyBgColor);
      this.scratchColor.set("#ffb56b");
      this.sunLight.color.set("#fff4df").lerp(this.scratchColor, k * 0.6);
      this.sunLight.intensity = 1.45 - k * 0.2;
      this.hemiLight.intensity = 0.92;
    } else {
      this.skyBgColor.set("#d8e3ed");
      this.fog.color.set("#dbe4ec");
      this.sunLight.color.set("#fff5e3");
      this.sunLight.intensity = 1.45;
      this.hemiLight.intensity = 0.92;
    }
  }

  setLookAngles(yaw: number, pitch: number) {
    this.camYaw = yaw;
    this.camPitch = Math.max(-0.38, Math.min(0.62, pitch));
  }

  adjustZoom(delta: number) {
    this.camDistance = Math.max(1.35, Math.min(3.75, this.camDistance + delta));
  }

  getLookAngles() {
    return { yaw: this.camYaw, pitch: this.camPitch, distance: this.camDistance };
  }

  resetCamera(yaw = 0) {
    this.camYaw = yaw;
    this.camPitch = 0.16;
    this.camInitialized = false;
  }

  private updateCamera(game: Game, dt: number) {
    const playerFloor = floorOfY(game.player.y);
    if (playerFloor !== this.lastCameraFloor) {
      this.lastCameraFloor = playerFloor;
      this.camInitialized = false;
      this.camYaw = game.cameraYaw;
    }
    const p3 = to3DCoords(game.player.x, game.player.y, 0);
    const px = p3.x;
    const pyBase = p3.y;
    const pz = p3.z;

    if (game.isCinematic) {
      this.lastCinemaCutKey = "";
      const michael = game.npcs.find((n) => n.def.id === "michael");
      const m3 = michael ? to3DCoords(michael.x, michael.y, 0) : { x: px + 2, y: pyBase, z: pz };
      const mx = m3.x;
      const mz = m3.z;
      const midX = (px + mx) / 2;
      const midZ = (pz + mz) / 2;
      const sway = Math.sin(game.time * 0.5) * 0.25;
      const rawCamX = midX - 0.8 + sway;
      const rawCamZ = midZ + 2.75;
      const clamped = clampCameraToWalls(midX, midZ, rawCamX, rawCamZ, playerFloor);
      this.desiredCamPos.set(clamped.x, pyBase + 1.62, clamped.z);
      this.desiredLookAt.set(midX, pyBase + 1.38, midZ);
    } else if (game.isMeetingCinema) {
      const mc = game.getSnapshot().meetingCinema;
      const shot = mc?.cameraShot ?? "wide";
      const cutKey = mc ? `${mc.eventId}|${shot}|${mc.focusNpcId}|${mc.speakerId}` : "wide";
      if (cutKey !== this.lastCinemaCutKey) {
        this.lastCinemaCutKey = cutKey;
        this.camInitialized = false;
      }

      const drift = Math.sin(game.time * 0.45) * 0.14;
      const clampConfX = (x: number) => Math.max(17.35, Math.min(26.55, x));
      const clampConfZ = (z: number) => Math.max(1.32, Math.min(6.22, z));

      let rawCamX = 26.15;
      let rawCamY = 2.02;
      let rawCamZ = 6.12;
      let lookX = 21.6;
      let lookY = 1.15;
      let lookZ = 3.65;

      if (shot === "wide") {
        rawCamX = clampConfX(26.1 + drift * 0.35);
        rawCamY = 2.04;
        rawCamZ = clampConfZ(6.14);
        lookX = 21.65;
        lookY = 1.15;
        lookZ = 3.6;
      } else if (shot === "player" && mc?.speakerId === mc?.hostId) {
        rawCamX = clampConfX(20.65 + drift * 0.25);
        rawCamY = 1.44;
        rawCamZ = clampConfZ(3.75);
        lookX = px;
        lookY = 1.12;
        lookZ = pz;
      } else {
        const targetId = mc?.speakerId ?? mc?.focusNpcId ?? mc?.hostId;
        const targetNpc =
          (targetId ? game.npcs.find((n) => n.def.id === targetId) : undefined) ??
          game.npcs.find((n) => n.def.id === mc?.hostId);
        if (targetNpc) {
          const tx = targetNpc.x * WORLD_SCALE;
          const tz = targetNpc.y * WORLD_SCALE;
          const tYaw = yawFromFacing(targetNpc.facing);
          const angle = tYaw + 0.36;
          const dist = shot === "host" ? 1.98 : 1.65;
          rawCamX = clampConfX(tx + Math.sin(angle) * dist + drift * 0.18);
          rawCamZ = clampConfZ(tz - Math.cos(angle) * dist);
          rawCamY = targetNpc.seated ? 1.38 : 1.56;
          lookX = tx;
          lookY = targetNpc.seated ? 1.15 : 1.44;
          lookZ = tz;
        }
      }

      const clamped = clampCameraToWalls(22.0, 3.7, rawCamX, rawCamZ, 0);
      this.desiredCamPos.set(clamped.x, rawCamY, clamped.z);
      this.desiredLookAt.set(lookX, lookY, lookZ);
    } else if (game.cameraMode === "first_person") {
      this.lastCinemaCutKey = "";
      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      const cosP = Math.cos(this.camPitch);
      const sinP = Math.sin(this.camPitch);
      this.desiredCamPos.set(px, pyBase + 1.62, pz);
      this.desiredLookAt.set(px + sinY * cosP * 4, pyBase + 1.62 - sinP * 4, pz - cosY * cosP * 4);
    } else {
      this.lastCinemaCutKey = "";
      const side = game.cameraMode === "shoulder_left" ? -1 : 1;
      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      const cosP = Math.cos(this.camPitch);
      const sinP = Math.sin(this.camPitch);

      const shoulderOffsetX = cosY * side * 0.44;
      const shoulderOffsetZ = sinY * side * 0.44;
      const pivotX = px + shoulderOffsetX;
      const pivotZ = pz + shoulderOffsetZ;

      const backDist = this.camDistance * cosP;
      const rawCamX = pivotX - sinY * backDist;
      const rawCamZ = pivotZ + cosY * backDist;
      const rawCamY = Math.max(
        pyBase + 0.48,
        Math.min(
          pyBase + CEILING_Y - 0.24,
          pyBase + 1.56 + Math.sin(this.camPitch) * this.camDistance,
        ),
      );

      const clamped = clampCameraToWalls(px, pz, rawCamX, rawCamZ, playerFloor);
      this.desiredCamPos.set(clamped.x, rawCamY, clamped.z);
      this.desiredLookAt.set(
        pivotX + sinY * 2.2,
        Math.max(pyBase + 0.4, Math.min(pyBase + 2.8, pyBase + 1.44 - sinP * 1.4)),
        pivotZ - cosY * 2.2,
      );
    }

    if (!this.camInitialized) {
      this.curCamPos.copy(this.desiredCamPos);
      this.curLookAt.copy(this.desiredLookAt);
      this.camInitialized = true;
    } else {
      const rate = game.isMeetingCinema ? 4.5 : 15;
      const alpha = Math.min(1, 1 - Math.exp(-rate * dt));
      this.curCamPos.lerp(this.desiredCamPos, alpha);
      this.curLookAt.lerp(this.desiredLookAt, alpha);
    }

    this.camera.position.copy(this.curCamPos);
    this.camera.lookAt(this.curLookAt);
    this.camera.updateMatrixWorld();
  }

  renderFrame(game: Game, dt: number) {
    if (this.disposed) return;
    this.syncFurniture(game);
    this.syncDecor(
      game.event?.id ?? null,
      game.episode?.decor ?? null,
      game.episode?.id ?? null,
      game.activeOfficeEventEffect(),
    );
    this.syncActors(game, dt);
    this.syncProps(game);
    this.updateAtmosphere(game);
    this.updateCamera(game, dt);
    this.renderer.render(this.scene, this.camera);
  }

  private projectWorld(
    wxPx: number,
    yMeters: number,
    wzPx: number,
    vw: number,
    vh: number,
  ): { sx: number; sy: number; inFront: boolean; dist: number } {
    const wp = to3DCoords(wxPx, wzPx, yMeters);
    this.scratchTargetPos.set(wp.x, wp.y, wp.z);
    const dist = this.scratchTargetPos.distanceTo(this.camera.position);
    this.scratchProj.copy(this.scratchTargetPos).project(this.camera);
    return {
      sx: (this.scratchProj.x * 0.5 + 0.5) * vw,
      sy: (-this.scratchProj.y * 0.5 + 0.5) * vh,
      inFront: this.scratchProj.z >= -1 && this.scratchProj.z <= 1,
      dist,
    };
  }

  drawScreenOverlay(g: CanvasRenderingContext2D, game: Game, vw: number, vh: number, dpr: number) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, vw, vh);
    if (game.phase !== "playing") return;

    // Subtle cinematic / OTS edge vignette
    const vg = g.createRadialGradient(
      vw / 2,
      vh / 2,
      Math.min(vw, vh) * 0.4,
      vw / 2,
      vh / 2,
      Math.max(vw, vh) * 0.8,
    );
    vg.addColorStop(0, "rgba(10,14,20,0)");
    vg.addColorStop(
      1,
      game.event?.id === "halloween" ? "rgba(14,6,26,0.42)" : "rgba(10,14,20,0.22)",
    );
    g.fillStyle = vg;
    g.fillRect(0, 0, vw, vh);

    if (game.isCinematic || game.isMeetingCinema) return;

    // Crosshair dot in 1st-person or shoulder camera
    g.fillStyle = "rgba(255,255,255,0.45)";
    g.beginPath();
    g.arc(vw / 2, vh / 2, 2.2, 0, Math.PI * 2);
    g.fill();

    const playerFloor = floorOfY(game.player.y);
    const pp3 = to3DCoords(game.player.x, game.player.y, 1.3);
    this.scratchPlayerPos.set(pp3.x, pp3.y, pp3.z);
    const targetedNPCs = game.targetedNPCs();
    const offers = game.npcsWithOffers();
    const approachingId = game.approachingNpcId();

    // NPC nameplates + quest badges projected in 3D space (filtered to active floor)
    g.textAlign = "center";
    for (const n of game.npcs) {
      if (floorOfY(n.y) !== playerFloor) continue;
      const dist2d = Math.hypot(n.x - game.player.x, n.y - game.player.y);
      const bob = Math.sin(game.time * 4 + n.x) * 0.06;
      const headProj = this.projectWorld(n.x, 2.08 + bob, n.y, vw, vh);
      if (
        !headProj.inFront ||
        headProj.sx < -80 ||
        headProj.sx > vw + 80 ||
        headProj.sy < -60 ||
        headProj.sy > vh + 60
      ) {
        continue;
      }

      if (dist2d < 420 && headProj.dist < 13) {
        const alpha = Math.min(1, Math.max(0.25, (420 - dist2d) / 140));
        g.globalAlpha = alpha;
        g.font = "700 11px Archivo, sans-serif";
        const name = n.def.name.split(" ")[0] ?? n.def.name;
        const w = g.measureText(name).width + 12;
        const ny = headProj.sy - 6;
        g.fillStyle = "rgba(24,32,40,0.82)";
        rr(g, headProj.sx - w / 2, ny - 14, w, 16, 7);
        g.fill();
        g.fillStyle = "#fff";
        g.fillText(name, headProj.sx, ny - 2);
        if (dist2d < 185 && n.action && n.action !== "Charlando") {
          g.font = "italic 600 10px Archivo, sans-serif";
          g.fillStyle = "rgba(255,253,246,0.92)";
          g.strokeStyle = "rgba(18,24,30,0.85)";
          g.lineWidth = 2.5;
          g.strokeText(n.action, headProj.sx, ny + 13);
          g.fillText(n.action, headProj.sx, ny + 13);
        }
        g.globalAlpha = 1;
      }

      if (headProj.dist < 22) {
        const badgeY = headProj.sy - 30;
        if (approachingId === n.def.id) drawBadge2D(g, headProj.sx, badgeY, "💬", "#38bdf8");
        else if (targetedNPCs.has(n.def.id)) drawBadge2D(g, headProj.sx, badgeY, "?", PAL.teal);
        else if (offers.has(n.def.id)) drawBadge2D(g, headProj.sx, badgeY, "!", PAL.marker);
      }
    }

    // Off-screen directional indicators for active mission targets (redirect cross-floor targets to nearest portal)
    const portalGuide = (col: string) => {
      const samePortals = FLOOR_PORTALS.filter((pt) => pt.fromFloor === playerFloor);
      let best = samePortals[0];
      let bestD = Infinity;
      for (const pt of samePortals) {
        const d = Math.hypot(pt.x - game.player.x, pt.y - game.player.y);
        if (d < bestD) {
          bestD = d;
          best = pt;
        }
      }
      return best ? { x: best.x, y: best.y, col } : null;
    };
    const targets: { x: number; y: number; col: string }[] = [];
    const tObj = game.targetedObjects();
    for (const o of OBJECTS) {
      if (!tObj.has(o.id)) continue;
      if (floorOfY(o.y) === playerFloor) targets.push({ x: o.x, y: o.y, col: PAL.marker });
      else {
        const pg = portalGuide(PAL.marker);
        if (pg) targets.push(pg);
      }
    }
    for (const n of game.npcs) {
      if (!targetedNPCs.has(n.def.id)) continue;
      if (floorOfY(n.y) === playerFloor) targets.push({ x: n.x, y: n.y, col: PAL.teal });
      else {
        const pg = portalGuide(PAL.teal);
        if (pg) targets.push(pg);
      }
    }
    const cx = vw / 2;
    const cy = vh / 2;
    for (const tg of targets) {
      const p = this.projectWorld(tg.x, 1.3, tg.y, vw, vh);
      let sx = p.sx;
      let sy = p.sy;
      if (!p.inFront) {
        sx = vw - sx;
        sy = vh - sy;
      }
      if (p.inFront && sx > 44 && sx < vw - 44 && sy > 70 && sy < vh - 44) continue;
      const ang = Math.atan2(sy - cy, sx - cx);
      const margin = 48;
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

    // Speech bubbles projected into 3D space with HUD avoidance (filtered to active floor)
    const { safeTop, safeBottom, boxes } = hudBoxesForOverlay(game, vw, vh);
    const placed: ScreenRect[] = [...boxes];
    for (const b of game.bubbles()) {
      if (floorOfY(b.y + 66) !== playerFloor) continue;
      const proj = this.projectWorld(b.x, 2.02, b.y + 66, vw, vh);
      if (!proj.inFront || proj.dist > 18) continue;
      if (proj.sx < -90 || proj.sx > vw + 90 || proj.sy < -90 || proj.sy > vh + 90) continue;

      g.font = b.muted ? "900 16px Archivo, sans-serif" : "600 12px Archivo, sans-serif";
      const lines = b.muted ? [b.text] : wrapText(g, b.text, 210);
      const lh = 15;
      const w = Math.max(...lines.map((l) => g.measureText(l).width)) + 20;
      const h = lines.length * lh + 12;

      const { bx, by, tailOnBottom } = resolveScreenPlacement(
        proj.sx,
        proj.sy - 26,
        proj.sy + 48,
        w,
        h,
        vw,
        vh,
        safeTop,
        safeBottom,
        placed,
      );
      placed.push({ x: bx - 4, y: by - 4, w: w + 8, h: h + 8 });

      const tailX = Math.max(bx + 14, Math.min(bx + w - 14, proj.sx));
      g.fillStyle = "rgba(15,20,25,0.24)";
      rr(g, bx + 3, by + 3, w, h, 10);
      g.fill();
      g.fillStyle = b.muted ? "rgba(255,253,246,0.9)" : PAL.bubble;
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

    // Hover / Interaction prompt
    const h = game.hover;
    if (h && !game.frozen) {
      const hyMeters = h.kind === "npc" ? 1.85 : 1.05;
      const hyOffset = h.kind === "npc" ? 74 : h.kind === "service" ? 34 : 26;
      const proj = this.projectWorld(h.x, hyMeters, h.y + hyOffset, vw, vh);
      g.font = "800 12px Archivo, sans-serif";
      const pw = g.measureText(h.label).width + 20;
      const ph = 24;
      let bx = vw / 2 - pw / 2;
      let by = vh * 0.62;
      if (proj.inFront && proj.sx > 30 && proj.sx < vw - 30 && proj.sy > 70 && proj.sy < vh - 70) {
        const res = resolveScreenPlacement(
          proj.sx,
          proj.sy - 8,
          proj.sy + 30,
          pw,
          ph,
          vw,
          vh,
          safeTop,
          safeBottom,
          placed,
        );
        bx = res.bx;
        by = res.by;
      }
      g.fillStyle = "rgba(24,32,40,0.92)";
      rr(g, bx, by, pw, ph, 7);
      g.fill();
      g.strokeStyle = "rgba(242,193,78,0.65)";
      g.lineWidth = 1.5;
      rr(g, bx, by, pw, ph, 7);
      g.stroke();
      g.fillStyle = PAL.marker;
      g.textAlign = "center";
      g.fillText(h.label, bx + pw / 2, by + 16);
    }
  }

  resize(vw: number, vh: number) {
    if (this.disposed) return;
    this.camera.aspect = vw / Math.max(1, vh);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(vw, vh);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.clearGroup(this.staticGroup, this.staticDisposables);
    this.clearGroup(this.furnitureGroup, this.furnitureDisposables);
    this.clearGroup(this.decorGroup, this.decorDisposables);

    if (this.playerEntry) {
      this.actorsGroup.remove(this.playerEntry.rig.root);
      this.playerEntry.rig.dispose();
      this.playerEntry = null;
    }
    for (const entry of this.npcEntries.values()) {
      this.actorsGroup.remove(entry.rig.root);
      entry.rig.dispose();
    }
    this.npcEntries.clear();
    for (const b of this.beaconEntries.values()) {
      this.propsGroup.remove(b.group);
      b.dispose();
    }
    this.beaconEntries.clear();
    for (const d of this.dundieEntries.values()) {
      this.propsGroup.remove(d.group);
      d.dispose();
    }
    this.dundieEntries.clear();
    this.propsGroup.remove(this.seatHighlight.group);
    this.seatHighlight.dispose();

    this.tex.dispose();
    this.envRenderTarget.dispose();
    this.pmremGenerator.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
