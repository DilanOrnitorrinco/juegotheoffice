import * as THREE from "three";

import {
  FLOOR_HEIGHT_M,
  WORLD_SCALE,
  floorOfY,
  getActiveFurniture,
  to3DCoords,
  type ConferenceSeat,
  type Furniture,
} from "../../data/map";
import type { CostumeKind, Look, MeetingGesture } from "../../types";
import type { OfficeTextures } from "./textures";

export { WORLD_SCALE };

export type RigCostume = CostumeKind | "prison_mike";

export interface ActionProps {
  phone: THREE.Group;
  cup: THREE.Group;
  paper: THREE.Group;
  box: THREE.Group;
  paddle: THREE.Group;
}

interface Vec3State {
  x: number;
  y: number;
  z: number;
}

export interface RigPoseSnapshot {
  bodyPos: Vec3State;
  bodyRot: Vec3State;
  torsoRot: Vec3State;
  headRot: Vec3State;
  leftArmRot: Vec3State;
  rightArmRot: Vec3State;
  leftElbowRot: Vec3State;
  rightElbowRot: Vec3State;
  leftLegRot: Vec3State;
  rightLegRot: Vec3State;
  leftKneeRot: Vec3State;
  rightKneeRot: Vec3State;
  leftFootRot: Vec3State;
  rightFootRot: Vec3State;
  skirtPos: Vec3State;
  skirtRotX: number;
  skirtScaleY: number;
}

export interface CharacterRig {
  root: THREE.Group;
  body: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftElbow: THREE.Group;
  rightElbow: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftFoot: THREE.Group;
  rightFoot: THREE.Group;
  leftEyelid: THREE.Mesh;
  rightEyelid: THREE.Mesh;
  propMesh?: THREE.Object3D | undefined;
  actionProps: ActionProps;
  skirt?: THREE.Mesh | undefined;
  indiaAura?: THREE.Group | undefined;
  animInitialized: boolean;
  prevPose: RigPoseSnapshot;
  dispose: () => void;
}

function matStd(
  color: THREE.ColorRepresentation,
  roughness = 0.65,
  metalness = 0.04,
  extra?: THREE.MeshStandardMaterialParameters,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

function addPart(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  castShadow = true,
  receiveShadow = true,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = castShadow;
  m.receiveShadow = receiveShadow;
  parent.add(m);
  return m;
}

export function buildCharacterRig(
  look: Look,
  costume: RigCostume | undefined,
  shadowDiscTex: THREE.Texture,
): CharacterRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const build = look.build ?? "regular";
  const heightScale =
    build === "petite" ? 0.94 : build === "tall" ? 1.05 : build === "broad" ? 1.03 : 1.0;
  const widthScale =
    build === "petite"
      ? 0.87
      : build === "slim"
        ? 0.92
        : build === "tall"
          ? 0.98
          : build === "broad"
            ? 1.13
            : build === "heavy"
              ? 1.24
              : 1.0;
  const depthScale =
    build === "petite"
      ? 0.88
      : build === "slim"
        ? 0.92
        : build === "broad"
          ? 1.1
          : build === "heavy"
            ? 1.24
            : 1.0;
  root.scale.setScalar(heightScale);

  const skin =
    costume === "elf"
      ? "#f6d4b6"
      : costume === "ghost"
        ? "#eceff4"
        : costume === "vampire"
          ? "#e8e4ee"
          : costume === "india"
            ? "#b87344"
            : look.skin;
  const shirt =
    costume === "santa"
      ? "#c62828"
      : costume === "elf"
        ? "#2d7a47"
        : costume === "pumpkin"
          ? "#e07a24"
          : costume === "witch"
            ? "#2d2238"
            : costume === "sith"
              ? "#1b1d22"
              : costume === "catEars"
                ? "#22242a"
                : costume === "leprechaun"
                  ? "#2f8f4e"
                  : costume === "threeHole"
                    ? "#f4f6f8"
                    : costume === "heart"
                      ? "#f0b4c8"
                      : costume === "hawaiian"
                        ? "#e67e45"
                        : costume === "vampire"
                          ? "#1f1d28"
                          : costume === "ghost"
                            ? "#f1f5f9"
                            : costume === "india"
                              ? "#921436"
                              : look.shirt;
  const pants =
    costume === "santa"
      ? "#c62828"
      : costume === "catEars"
        ? "#22242a"
        : costume === "sith" || costume === "vampire"
          ? "#1b1d22"
          : costume === "hawaiian"
            ? "#3f5f87"
            : costume === "ghost"
              ? "#f1f5f9"
              : costume === "india"
                ? "#f4ebd9"
                : look.pants;

  const topKind = costume ? "shirt" : (look.topKind ?? "shirt");
  const outerColor = costume === "india" ? shirt : (look.jacketColor ?? shirt);

  const skinMat = matStd(skin, 0.66, 0.02);
  const skinShadowMat = matStd(new THREE.Color(skin).offsetHSL(0, 0.03, -0.08), 0.7, 0.02);
  const cheekMat = matStd(new THREE.Color(skin).lerp(new THREE.Color("#e07a7a"), 0.26), 0.72, 0.01);
  const shirtMat = matStd(shirt, 0.78, 0.02);
  const outerMat = matStd(
    outerColor,
    costume === "india"
      ? 0.52
      : topKind === "cardigan" || topKind === "vest"
        ? 0.92
        : topKind === "suit"
          ? 0.74
          : 0.8,
    costume === "india" ? 0.14 : 0.03,
  );
  const trimMat = matStd(new THREE.Color(outerColor).offsetHSL(0, 0, -0.1), 0.82, 0.04);
  const pantsMat = matStd(pants, 0.84, 0.03);
  const hairMat = matStd(look.hair, 0.74, 0.06);
  const hairDarkMat = matStd(new THREE.Color(look.hair).offsetHSL(0, 0, -0.07), 0.8, 0.04);
  const shoeMat = matStd(costume === "india" ? "#7a142c" : "#1b1e23", 0.3, 0.18);
  const soleMat = matStd("#2e2924", 0.72, 0.05);
  const scleraMat = matStd("#f8fafc", 0.25, 0.02);
  const irisMat = matStd(look.eyeColor ?? "#42332a", 0.18, 0.08);
  const pupilMat = matStd("#111318", 0.08, 0.15);
  const lipMat = matStd(
    look.lipColor ?? new THREE.Color(skin).lerp(new THREE.Color("#a85258"), 0.42),
    0.55,
    0.04,
  );
  const whiteMat = matStd("#f8fafc", 0.48, 0.02);
  const goldMat = matStd("#e0b243", 0.22, 0.86);
  const darkMetalMat = matStd("#232830", 0.26, 0.78);
  const chromeMat = matStd("#d8dee6", 0.2, 0.88);
  const lensMat = new THREE.MeshStandardMaterial({
    color: "#dbeafe",
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.18,
  });

  const mats: THREE.Material[] = [
    skinMat,
    skinShadowMat,
    cheekMat,
    shirtMat,
    outerMat,
    trimMat,
    pantsMat,
    hairMat,
    hairDarkMat,
    shoeMat,
    soleMat,
    scleraMat,
    irisMat,
    pupilMat,
    lipMat,
    whiteMat,
    goldMat,
    darkMetalMat,
    chromeMat,
    lensMat,
  ];
  const geos: THREE.BufferGeometry[] = [];
  const g = <T extends THREE.BufferGeometry>(geo: T): T => {
    geos.push(geo);
    return geo;
  };

  // Contact shadow disc grounded at y = 0.008
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowDiscTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.68,
  });
  mats.push(shadowMat);
  const disc = new THREE.Mesh(
    g(new THREE.PlaneGeometry(0.76 * widthScale, 0.76 * depthScale)),
    shadowMat,
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.008;
  root.add(disc);

  // ---------------- Articulated Tapered Legs & Sculpted Shoes ----------------
  const limbScale = Math.max(0.88, Math.min(1.18, Math.sqrt(widthScale)));
  const legSpread = Math.min(0.145, 0.105 * widthScale);
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-legSpread, 0.76, 0);
  const rightLeg = new THREE.Group();
  rightLeg.position.set(legSpread, 0.76, 0);

  const thighGeo = g(new THREE.CylinderGeometry(0.08 * limbScale, 0.068 * limbScale, 0.36, 12));
  const kneeCapGeo = g(new THREE.SphereGeometry(0.066 * limbScale, 10, 8));
  const shinGeo = g(new THREE.CylinderGeometry(0.066 * limbScale, 0.055 * limbScale, 0.34, 12));
  const shoeHeelGeo = g(new THREE.BoxGeometry(0.125 * limbScale, 0.08, 0.14));
  const shoeToeGeo = g(new THREE.SphereGeometry(0.064 * limbScale, 12, 8));
  const soleGeo = g(new THREE.BoxGeometry(0.13 * limbScale, 0.022, 0.22));

  const buildLeg = (legGrp: THREE.Group) => {
    const knee = new THREE.Group();
    knee.position.set(0, -0.35, 0);
    const foot = new THREE.Group();
    foot.position.set(0, -0.35, 0);
    addPart(legGrp, thighGeo, pantsMat, 0, -0.18, 0);
    addPart(knee, kneeCapGeo, pantsMat, 0, 0, 0);
    addPart(knee, shinGeo, pantsMat, 0, -0.17, 0);
    // Articulated ankle & shoe
    addPart(foot, shoeHeelGeo, shoeMat, 0, 0, 0.015);
    const toe = addPart(foot, shoeToeGeo, shoeMat, 0, -0.005, -0.075);
    toe.scale.set(1.0, 0.68, 1.35);
    if (costume === "india") {
      // Curled upward 24k golden Mojari tips
      const curl = addPart(
        foot,
        g(new THREE.TorusGeometry(0.026 * limbScale, 0.009 * limbScale, 8, 14, Math.PI * 1.15)),
        goldMat,
        0,
        0.016,
        -0.145,
      );
      curl.rotation.y = Math.PI / 2;
      curl.rotation.z = -0.35;
      addPart(foot, g(new THREE.SphereGeometry(0.013 * limbScale, 8, 8)), goldMat, 0, 0.038, -0.15);
    }
    addPart(foot, soleGeo, costume === "india" ? goldMat : soleMat, 0, -0.048, -0.028);
    knee.add(foot);
    legGrp.add(knee);
    return { knee, foot };
  };
  const { knee: leftKnee, foot: leftFoot } = buildLeg(leftLeg);
  const { knee: rightKnee, foot: rightFoot } = buildLeg(rightLeg);
  body.add(leftLeg, rightLeg);

  // Tailored pleated skirt overlay
  let skirt: THREE.Mesh | undefined;
  if (look.dress && costume !== "santa" && costume !== "india") {
    skirt = addPart(
      body,
      g(new THREE.CylinderGeometry(0.185 * widthScale, 0.26 * widthScale, 0.42, 18)),
      pantsMat,
      0,
      0.69,
      0,
    );
    skirt.scale.z = 0.72 * depthScale;
  }

  // ---------------- Sculpted Torso & Layered Garments ----------------
  const TORSO_PIVOT_Y = 0.78;
  const torsoGrp = new THREE.Group();
  torsoGrp.position.set(0, TORSO_PIVOT_Y, 0);
  body.add(torsoGrp);
  const addTorsoPart = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    worldY: number,
    z: number,
    castShadow = true,
    receiveShadow = true,
  ) => addPart(torsoGrp, geo, mat, x, worldY - TORSO_PIVOT_Y, z, castShadow, receiveShadow);

  const torsoHalfW = 0.2 * widthScale;
  const torsoHalfD = 0.125 * depthScale;
  const chestMat = topKind === "suit" || topKind === "cardigan" ? shirtMat : outerMat;
  const torsoGeo = g(new THREE.CylinderGeometry(0.195, 0.17, 0.56, 18));
  const torso = addTorsoPart(torsoGeo, chestMat, 0, 1.04, 0);
  torso.scale.set(widthScale, 1, 0.64 * depthScale);

  // Heavy belly contour for Kevin / Stanley / Phyllis / Tony / Packer
  if (build === "heavy") {
    const belly = addTorsoPart(g(new THREE.SphereGeometry(0.18, 16, 12)), chestMat, 0, 0.96, -0.04);
    belly.scale.set(1.24, 0.92, 0.74);
  }

  // Rounded collar & angled white shirt collar wings
  const collarRing = addTorsoPart(
    g(new THREE.CylinderGeometry(0.088, 0.108, 0.065, 14)),
    shirtMat,
    0,
    1.32,
    0,
  );
  collarRing.scale.set(widthScale * 0.95, 1, 0.88);
  if (costume !== "india") {
    for (const sx of [-1, 1]) {
      const wing = addTorsoPart(
        g(new THREE.BoxGeometry(0.065, 0.048, 0.02)),
        costume ? whiteMat : shirtMat,
        sx * 0.055,
        1.305,
        -torsoHalfD * 0.74,
      );
      wing.rotation.z = sx * -0.45;
      wing.rotation.y = sx * 0.25;
    }
  }

  // Belt + metallic buckle
  const belt = addTorsoPart(
    g(new THREE.CylinderGeometry(0.178, 0.18, 0.052, 18)),
    darkMetalMat,
    0,
    0.78,
    0,
  );
  belt.scale.set(widthScale * 1.01, 1, 0.66 * depthScale);
  addTorsoPart(
    g(new THREE.BoxGeometry(0.065, 0.054, 0.025)),
    goldMat,
    0,
    0.78,
    -torsoHalfD - 0.008,
  );
  if (topKind === "short_sleeve") {
    // Dwight's pager / belt clip
    addTorsoPart(
      g(new THREE.BoxGeometry(0.04, 0.06, 0.035)),
      darkMetalMat,
      torsoHalfW * 0.85,
      0.78,
      -torsoHalfD * 0.45,
    );
  }

  // Suit coat / Cardigan / Sweater vest / Workshirt / Blouse details
  const chestFrontZ = -torsoHalfD - 0.006;
  if (topKind === "suit") {
    // Left & right jacket panels wrapping shoulders & sides, leaving center shirt V open
    const backJacket = addTorsoPart(
      g(
        new THREE.CylinderGeometry(
          0.205,
          0.186,
          0.56,
          18,
          1,
          false,
          -Math.PI * 0.15,
          Math.PI * 1.3,
        ),
      ),
      outerMat,
      0,
      1.035,
      0.005,
    );
    backJacket.scale.set(widthScale * 1.02, 1, 0.66 * depthScale);

    for (const sx of [-1, 1]) {
      const panel = addTorsoPart(
        g(new THREE.BoxGeometry(0.115 * widthScale, 0.54, 0.055)),
        outerMat,
        sx * 0.115 * widthScale,
        1.035,
        -torsoHalfD * 0.74,
      );
      panel.rotation.y = sx * 0.24;

      const lapel = addTorsoPart(
        g(new THREE.BoxGeometry(0.048, 0.28, 0.022)),
        trimMat,
        sx * 0.068 * widthScale,
        1.16,
        -torsoHalfD * 0.94,
      );
      lapel.rotation.z = sx * -0.22;
      lapel.rotation.y = sx * 0.22;
    }
    // Pocket square & buttons
    addTorsoPart(
      g(new THREE.BoxGeometry(0.044, 0.022, 0.015)),
      whiteMat,
      0.115 * widthScale,
      1.165,
      -torsoHalfD * 0.95,
    );
    for (const by of [0.97, 0.89]) {
      const btn = addTorsoPart(
        g(new THREE.CylinderGeometry(0.012, 0.012, 0.014, 8)),
        darkMetalMat,
        0.02,
        by,
        chestFrontZ - 0.004,
      );
      btn.rotation.x = Math.PI / 2;
    }
  } else if (topKind === "cardigan") {
    for (const sx of [-1, 1]) {
      const panel = addTorsoPart(
        g(new THREE.BoxGeometry(0.11 * widthScale, 0.52, 0.048)),
        outerMat,
        sx * 0.11 * widthScale,
        1.03,
        -torsoHalfD * 0.74,
      );
      panel.rotation.y = sx * 0.24;
      const rib = addTorsoPart(
        g(new THREE.BoxGeometry(0.026, 0.46, 0.02)),
        trimMat,
        sx * 0.055 * widthScale,
        1.05,
        -torsoHalfD * 0.93,
      );
      rib.rotation.z = sx * -0.14;
    }
    for (const by of [1.02, 0.94, 0.86]) {
      const btn = addTorsoPart(
        g(new THREE.CylinderGeometry(0.01, 0.01, 0.012, 8)),
        trimMat,
        0,
        by,
        chestFrontZ,
      );
      btn.rotation.x = Math.PI / 2;
    }
  } else if (topKind === "vest") {
    // Knit V-neck sweater vest body over crisp shirt sleeves
    const vestBody = addTorsoPart(
      g(new THREE.CylinderGeometry(0.198, 0.178, 0.51, 18)),
      outerMat,
      0,
      1.025,
      0,
    );
    vestBody.scale.set(widthScale * 1.02, 1, 0.66 * depthScale);
    // White V chest cutout so inner shirt + bowtie/tie stands out
    addTorsoPart(g(new THREE.BoxGeometry(0.1, 0.17, 0.03)), shirtMat, 0, 1.21, -torsoHalfD * 0.93);
    for (const sx of [-1, 1]) {
      const vTrim = addTorsoPart(
        g(new THREE.BoxGeometry(0.022, 0.19, 0.02)),
        trimMat,
        sx * 0.045,
        1.21,
        -torsoHalfD * 0.97,
      );
      vTrim.rotation.z = sx * -0.26;
    }
  } else if (topKind === "workshirt") {
    addTorsoPart(g(new THREE.BoxGeometry(0.032, 0.48, 0.016)), trimMat, 0, 1.04, chestFrontZ);
    for (const sx of [-1, 1]) {
      addTorsoPart(
        g(new THREE.BoxGeometry(0.08, 0.09, 0.022)),
        trimMat,
        sx * 0.105 * widthScale,
        1.13,
        -torsoHalfD * 0.9,
      );
    }
  } else if (topKind === "short_sleeve") {
    addTorsoPart(g(new THREE.BoxGeometry(0.03, 0.48, 0.015)), trimMat, 0, 1.04, chestFrontZ);
    addTorsoPart(
      g(new THREE.BoxGeometry(0.075, 0.085, 0.02)),
      trimMat,
      0.1 * widthScale,
      1.13,
      -torsoHalfD * 0.9,
    );
    // Pen clips in Dwight's shirt pocket
    addTorsoPart(
      g(new THREE.CylinderGeometry(0.005, 0.005, 0.04, 6)),
      darkMetalMat,
      0.088 * widthScale,
      1.18,
      -torsoHalfD * 0.92,
    );
    addTorsoPart(
      g(new THREE.CylinderGeometry(0.005, 0.005, 0.04, 6)),
      goldMat,
      0.108 * widthScale,
      1.18,
      -torsoHalfD * 0.92,
    );
  } else if (topKind === "blouse") {
    // Soft draped blouse pleats (Kelly)
    for (const sx of [-1, 0, 1]) {
      addTorsoPart(
        g(new THREE.CylinderGeometry(0.016, 0.022, 0.22, 8)),
        trimMat,
        sx * 0.032,
        1.14,
        -torsoHalfD * 0.94,
      );
    }
  }

  // Tapered Necktie or Sculpted Bow Tie
  if (look.bowTie && !costume) {
    const bowMat = matStd(look.bowTie, 0.42, 0.1);
    mats.push(bowMat);
    const knot = addTorsoPart(
      g(new THREE.BoxGeometry(0.03, 0.028, 0.024)),
      bowMat,
      0,
      1.28,
      chestFrontZ - 0.01,
    );
    knot.rotation.z = 0;
    for (const sx of [-1, 1]) {
      const wing = addTorsoPart(
        g(new THREE.ConeGeometry(0.03, 0.055, 6)),
        bowMat,
        sx * 0.036,
        1.28,
        chestFrontZ - 0.008,
      );
      wing.rotation.z = (sx * -Math.PI) / 2;
    }
  } else if (look.tie && !costume) {
    const tieMat = matStd(look.tie, 0.4, 0.1);
    mats.push(tieMat);
    // Knot
    addTorsoPart(
      g(new THREE.BoxGeometry(0.042, 0.042, 0.026)),
      tieMat,
      0,
      1.265,
      chestFrontZ - 0.01,
    );
    // Tapered blade + tip
    addTorsoPart(
      g(new THREE.CylinderGeometry(0.02, 0.034, 0.29, 4)),
      tieMat,
      0,
      1.1,
      chestFrontZ - 0.008,
    ).rotation.y = Math.PI / 4;
    addTorsoPart(
      g(new THREE.ConeGeometry(0.034, 0.055, 4)),
      tieMat,
      0,
      0.93,
      chestFrontZ - 0.008,
    ).rotation.set(Math.PI, Math.PI / 4, 0);
  }

  // Accessories: Pearls, Cat Pin, Badge
  if (look.accessory === "pearls" && !costume) {
    for (let i = -4; i <= 4; i++) {
      const ang = i * 0.24;
      addTorsoPart(
        g(new THREE.SphereGeometry(0.014, 8, 8)),
        whiteMat,
        Math.sin(ang) * 0.095,
        1.265 - Math.cos(ang) * 0.032,
        -torsoHalfD * 0.94 - Math.cos(ang) * 0.012,
      );
    }
  } else if (look.accessory === "catPin" && !costume) {
    addTorsoPart(
      g(new THREE.SphereGeometry(0.016, 8, 8)),
      goldMat,
      -0.095 * widthScale,
      1.18,
      -torsoHalfD * 0.96,
    );
    addTorsoPart(
      g(new THREE.ConeGeometry(0.006, 0.014, 4)),
      goldMat,
      -0.104 * widthScale,
      1.196,
      -torsoHalfD * 0.96,
    );
    addTorsoPart(
      g(new THREE.ConeGeometry(0.006, 0.014, 4)),
      goldMat,
      -0.086 * widthScale,
      1.196,
      -torsoHalfD * 0.96,
    );
  } else if (look.accessory === "badge" && !costume) {
    addTorsoPart(
      g(new THREE.BoxGeometry(0.06, 0.03, 0.012)),
      whiteMat,
      0.1 * widthScale,
      1.19,
      -torsoHalfD * 0.95,
    );
  }

  // Costume overlays
  if (costume === "threeHole") {
    const holeMat = matStd("#1b1f26", 0.7, 0.05);
    mats.push(holeMat);
    for (const dy of [0.92, 1.06, 1.2]) {
      addTorsoPart(
        g(new THREE.CylinderGeometry(0.03, 0.03, 0.015, 10)),
        holeMat,
        -0.11,
        dy,
        chestFrontZ - 0.005,
      ).rotation.x = Math.PI / 2;
    }
  }
  if (costume === "santa") {
    addTorsoPart(g(new THREE.BoxGeometry(0.095, 0.54, 0.04)), whiteMat, 0, 1.04, chestFrontZ);
  }
  if (costume === "sith" || costume === "vampire") {
    const capeMat = matStd(costume === "vampire" ? "#5a111a" : "#111318", 0.9, 0.02);
    mats.push(capeMat);
    addTorsoPart(g(new THREE.BoxGeometry(0.46, 0.98, 0.045)), capeMat, 0, 0.82, 0.145);
  }

  let indiaAura: THREE.Group | undefined;
  let gold24kMat: THREE.MeshStandardMaterial | undefined;
  if (costume === "india") {
    gold24kMat = matStd("#ffd24d", 0.18, 0.9, {
      emissive: "#b87a00",
      emissiveIntensity: 0.25,
    });
    const saffronMat = matStd("#ff7b1c", 0.56, 0.08);
    const magentaMat = matStd("#b8174e", 0.52, 0.1);
    const emeraldMat = matStd("#10b981", 0.16, 0.25, {
      emissive: "#059669",
      emissiveIntensity: 0.42,
    });
    const rubyMat = matStd("#e11d48", 0.16, 0.22, {
      emissive: "#9f1239",
      emissiveIntensity: 0.35,
    });
    mats.push(gold24kMat, saffronMat, magentaMat, emeraldMat, rubyMat);

    // Tall Nehru Bandhgala collar with 24k gold rim & center ruby clasp
    const nehruCollar = addTorsoPart(
      g(new THREE.CylinderGeometry(0.095 * widthScale, 0.108 * widthScale, 0.078, 16)),
      shirtMat,
      0,
      1.33,
      0,
    );
    nehruCollar.scale.set(0.95, 1, 0.88 * depthScale);
    const collarRim = addTorsoPart(
      g(new THREE.TorusGeometry(0.092 * widthScale, 0.009, 8, 18)),
      gold24kMat,
      0,
      1.365,
      0,
    );
    collarRim.rotation.x = Math.PI / 2;
    collarRim.scale.set(0.95, 0.88 * depthScale, 1);
    addTorsoPart(g(new THREE.OctahedronGeometry(0.017, 0)), rubyMat, 0, 1.335, -torsoHalfD * 0.72);

    // Flared Sherwani lower coat skirt + gold brocade hem & waist sash
    const sherwaniSkirt = addTorsoPart(
      g(new THREE.CylinderGeometry(0.182, 0.238, 0.24, 18)),
      shirtMat,
      0,
      0.66,
      0,
    );
    sherwaniSkirt.scale.set(widthScale * 1.03, 1, 0.68 * depthScale);
    const hemTrim = addTorsoPart(
      g(new THREE.TorusGeometry(0.234, 0.011, 8, 22)),
      gold24kMat,
      0,
      0.545,
      0,
    );
    hemTrim.rotation.x = Math.PI / 2;
    hemTrim.scale.set(widthScale * 1.03, 0.68 * depthScale, 1);
    const kamarband = addTorsoPart(
      g(new THREE.CylinderGeometry(0.184, 0.188, 0.072, 18)),
      saffronMat,
      0,
      0.785,
      0,
    );
    kamarband.scale.set(widthScale * 1.03, 1, 0.69 * depthScale);

    // Embroidered vertical gold placket + 6 ornate royal buttons
    addTorsoPart(
      g(new THREE.BoxGeometry(0.036, 0.56, 0.016)),
      gold24kMat,
      0,
      1.01,
      chestFrontZ - 0.002,
    );
    for (const by of [1.24, 1.15, 1.06, 0.97, 0.88, 0.79]) {
      const sBtn = addTorsoPart(
        g(new THREE.SphereGeometry(0.012, 8, 8)),
        by === 1.15 || by === 0.97 ? emeraldMat : gold24kMat,
        0,
        by,
        chestFrontZ - 0.011,
      );
      sBtn.scale.z = 0.55;
    }

    // Ornate golden Maharaja Epaulettes on shoulders
    for (const sx of [-1, 1]) {
      const ep = addTorsoPart(
        g(new THREE.BoxGeometry(0.105, 0.022, 0.085)),
        gold24kMat,
        sx * (torsoHalfW * 0.92),
        1.305,
        0,
      );
      ep.rotation.z = sx * -0.18;
      for (let t = -1; t <= 1; t++) {
        addTorsoPart(
          g(new THREE.CylinderGeometry(0.006, 0.004, 0.035, 6)),
          gold24kMat,
          sx * (torsoHalfW + 0.045),
          1.275,
          t * 0.025,
        );
      }
    }

    // Layered Maharaja Mala necklace (Pearls, 24k gold, rubies & emeralds)
    for (let i = -5; i <= 5; i++) {
      const ang = i * 0.22;
      const mx = Math.sin(ang) * 0.112 * widthScale;
      const my = 1.25 - Math.cos(ang) * 0.068;
      const mz = -torsoHalfD * 0.93 - Math.cos(ang) * 0.022;
      const beadMat = i === 0 ? emeraldMat : Math.abs(i) % 2 === 1 ? rubyMat : gold24kMat;
      addTorsoPart(g(new THREE.SphereGeometry(i === 0 ? 0.019 : 0.013, 8, 8)), beadMat, mx, my, mz);
    }

    // Diagonal Saffron & Gold Dupatta Sash + twin golden hip tassels
    const sashFront = addTorsoPart(
      g(new THREE.BoxGeometry(0.082, 0.58, 0.024)),
      saffronMat,
      0.01,
      1.03,
      chestFrontZ - 0.012,
    );
    sashFront.rotation.z = -0.48;
    const sashBorder = addTorsoPart(
      g(new THREE.BoxGeometry(0.092, 0.57, 0.012)),
      gold24kMat,
      0.01,
      1.03,
      chestFrontZ - 0.006,
    );
    sashBorder.rotation.z = -0.48;
    for (const tz of [-0.015, 0.02]) {
      addTorsoPart(
        g(new THREE.ConeGeometry(0.016, 0.055, 8)),
        gold24kMat,
        0.18 * widthScale,
        0.73,
        -torsoHalfD * 0.55 + tz,
      );
    }

    // Flowing Royal Saffron-Crimson Cape with golden hem & tassels
    const cape = addTorsoPart(
      g(new THREE.BoxGeometry(0.49 * widthScale, 0.95, 0.036)),
      saffronMat,
      0,
      0.83,
      0.15,
    );
    cape.rotation.x = 0.06;
    const capeInner = addTorsoPart(
      g(new THREE.BoxGeometry(0.43 * widthScale, 0.9, 0.018)),
      magentaMat,
      0,
      0.83,
      0.132,
    );
    capeInner.rotation.x = 0.06;
    addTorsoPart(
      g(new THREE.BoxGeometry(0.5 * widthScale, 0.042, 0.044)),
      gold24kMat,
      0,
      0.36,
      0.18,
    );

    // Live Animated Golden Mandala Halo behind shoulders
    indiaAura = new THREE.Group();
    indiaAura.position.set(0, 1.48 - TORSO_PIVOT_Y, 0.24);
    torsoGrp.add(indiaAura);

    addPart(
      indiaAura,
      g(new THREE.TorusGeometry(0.36, 0.016, 8, 32)),
      gold24kMat,
      0,
      0,
      0,
      false,
      false,
    );
    addPart(
      indiaAura,
      g(new THREE.TorusGeometry(0.24, 0.011, 8, 24)),
      saffronMat,
      0,
      0,
      0.005,
      false,
      false,
    );
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const spoke = addPart(
        indiaAura,
        g(new THREE.ConeGeometry(0.035, 0.12, 4)),
        gold24kMat,
        Math.cos(a) * 0.42,
        Math.sin(a) * 0.42,
        0,
        false,
        false,
      );
      spoke.rotation.z = a - Math.PI / 2;

      // Floating glowing Diwali orbs on alternating petals
      const orbMat = i % 2 === 0 ? emeraldMat : gold24kMat;
      addPart(
        indiaAura,
        g(new THREE.SphereGeometry(0.028, 8, 8)),
        orbMat,
        Math.cos(a + Math.PI / 8) * 0.31,
        Math.sin(a + Math.PI / 8) * 0.31,
        0.012,
        false,
        false,
      );
    }
  }

  // ---------------- Articulated Tapered Arms + Elbows + Hands ----------------
  const sleeveMat = topKind === "vest" ? shirtMat : outerMat;
  const forearmMat = topKind === "short_sleeve" || topKind === "blouse" ? skinMat : sleeveMat;
  const armX = torsoHalfW + 0.068;

  const leftArm = new THREE.Group();
  leftArm.position.set(-armX, 1.27 - TORSO_PIVOT_Y, 0);
  const rightArm = new THREE.Group();
  rightArm.position.set(armX, 1.27 - TORSO_PIVOT_Y, 0);

  const shoulderCapGeo = g(new THREE.SphereGeometry(0.066 * limbScale, 12, 10));
  const upperArmClothGeo = g(
    new THREE.CylinderGeometry(
      0.064 * limbScale,
      topKind === "short_sleeve" ? 0.072 * limbScale : 0.056 * limbScale,
      topKind === "short_sleeve" ? 0.18 : 0.24,
      12,
    ),
  );
  const upperArmSkinGeo = g(
    new THREE.CylinderGeometry(0.052 * limbScale, 0.048 * limbScale, 0.09, 10),
  );
  const elbowCapGeo = g(new THREE.SphereGeometry(0.054 * limbScale, 10, 8));
  const forearmGeo = g(new THREE.CylinderGeometry(0.052 * limbScale, 0.044 * limbScale, 0.21, 12));
  const cuffGeo = g(new THREE.CylinderGeometry(0.048 * limbScale, 0.048 * limbScale, 0.028, 12));
  const handGeo = g(new THREE.SphereGeometry(0.048 * limbScale, 10, 8));
  const thumbGeo = g(new THREE.CapsuleGeometry(0.014, 0.028, 4, 6));

  const buildArm = (armGrp: THREE.Group, sideSign: -1 | 1) => {
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.24, 0);
    addPart(armGrp, shoulderCapGeo, sleeveMat, 0, 0, 0);
    if (topKind === "short_sleeve") {
      addPart(armGrp, upperArmClothGeo, sleeveMat, 0, -0.09, 0);
      addPart(armGrp, upperArmSkinGeo, skinMat, 0, -0.205, 0);
    } else {
      addPart(armGrp, upperArmClothGeo, sleeveMat, 0, -0.12, 0);
    }
    addPart(elbow, elbowCapGeo, forearmMat, 0, 0, 0);
    addPart(elbow, forearmGeo, forearmMat, 0, -0.105, 0);
    if (topKind === "suit" || topKind === "vest") {
      addPart(elbow, cuffGeo, shirtMat, 0, -0.205, 0);
    } else if (costume === "india" && gold24kMat) {
      // 24k Gold Royal Wrist Kadas & Cuff Trim
      addPart(
        elbow,
        g(new THREE.CylinderGeometry(0.052 * limbScale, 0.05 * limbScale, 0.034, 12)),
        gold24kMat,
        0,
        -0.195,
        0,
      );
    }
    const hand = addPart(elbow, handGeo, skinMat, 0, -0.245, 0);
    hand.scale.set(0.86, 1.15, 0.95);
    const thumb = addPart(elbow, thumbGeo, skinMat, -sideSign * 0.028, -0.235, -0.028);
    thumb.rotation.x = 0.35;
    armGrp.add(elbow);
    return elbow;
  };
  const leftElbow = buildArm(leftArm, -1);
  const rightElbow = buildArm(rightArm, 1);

  // Wristwatch on Dwight
  if (look.accessory === "watch" && !costume) {
    addPart(
      leftElbow,
      g(new THREE.CylinderGeometry(0.05 * limbScale, 0.05 * limbScale, 0.022, 12)),
      darkMetalMat,
      0,
      -0.195,
      0,
    );
    addPart(
      leftElbow,
      g(new THREE.BoxGeometry(0.028, 0.026, 0.018)),
      chromeMat,
      0,
      -0.195,
      -0.048 * limbScale,
    );
  }

  // Held character props (shown neatly at rest/standing, hidden during active claps/facepalm/walk)
  let propMesh: THREE.Object3D | undefined;
  if (look.accessory === "mug" && !costume) {
    const mugGroup = new THREE.Group();
    mugGroup.position.set(0, -0.255, -0.068);
    addPart(mugGroup, g(new THREE.CylinderGeometry(0.042, 0.038, 0.09, 14)), whiteMat, 0, 0, 0);
    addPart(
      mugGroup,
      g(new THREE.CylinderGeometry(0.036, 0.036, 0.008, 12)),
      darkMetalMat,
      0,
      0.042,
      0,
    );
    const handle = addPart(
      mugGroup,
      g(new THREE.TorusGeometry(0.022, 0.006, 6, 10)),
      whiteMat,
      0.04,
      0,
      0,
    );
    handle.rotation.y = Math.PI / 2;
    rightElbow.add(mugGroup);
    propMesh = mugGroup;
  } else if (look.accessory === "crossword" && !costume) {
    const book = addPart(
      leftElbow,
      g(new THREE.BoxGeometry(0.022, 0.14, 0.11)),
      whiteMat,
      -0.028,
      -0.25,
      -0.045,
    );
    book.rotation.x = 0.25;
    propMesh = book;
  }

  // Toggleable realistic action props (phone handset, coffee/water cup, paperwork, shipping box, paddle)
  const phoneMat = matStd("#1b2028", 0.34, 0.22);
  const paperPropMat = matStd("#f6f2e4", 0.88, 0.01);
  const cardboardMat = matStd("#b6895b", 0.86, 0.02);
  const tapeMat = matStd("#d8c29d", 0.65, 0.04);
  const paddleRubberMat = matStd("#b8292f", 0.58, 0.05);
  const paddleWoodMat = matStd("#b88958", 0.68, 0.03);
  mats.push(phoneMat, paperPropMat, cardboardMat, tapeMat, paddleRubberMat, paddleWoodMat);

  const phoneProp = new THREE.Group();
  phoneProp.position.set(-0.015, -0.245, -0.028);
  phoneProp.rotation.set(0.24, 0, 0.12);
  addPart(phoneProp, g(new THREE.BoxGeometry(0.028, 0.155, 0.032)), phoneMat, 0, 0, 0);
  addPart(
    phoneProp,
    g(new THREE.CylinderGeometry(0.026, 0.024, 0.028, 10)),
    phoneMat,
    -0.008,
    0.068,
    -0.014,
  ).rotation.z = Math.PI / 2;
  addPart(
    phoneProp,
    g(new THREE.CylinderGeometry(0.024, 0.022, 0.028, 10)),
    phoneMat,
    -0.008,
    -0.068,
    -0.014,
  ).rotation.z = Math.PI / 2;
  const cordRing = addPart(
    phoneProp,
    g(new THREE.TorusGeometry(0.024, 0.005, 6, 10, Math.PI * 1.2)),
    darkMetalMat,
    0.006,
    -0.095,
    0.008,
  );
  cordRing.rotation.y = Math.PI / 2;
  phoneProp.visible = false;
  rightElbow.add(phoneProp);

  const cupProp = new THREE.Group();
  cupProp.position.set(0, -0.252, -0.062);
  addPart(cupProp, g(new THREE.CylinderGeometry(0.04, 0.035, 0.088, 12)), whiteMat, 0, 0, 0);
  addPart(
    cupProp,
    g(new THREE.CylinderGeometry(0.034, 0.034, 0.008, 10)),
    darkMetalMat,
    0,
    0.04,
    0,
  );
  const cupHandle = addPart(
    cupProp,
    g(new THREE.TorusGeometry(0.02, 0.0055, 6, 10)),
    whiteMat,
    0.038,
    0,
    0,
  );
  cupHandle.rotation.y = Math.PI / 2;
  cupProp.visible = false;
  rightElbow.add(cupProp);

  const paperProp = new THREE.Group();
  paperProp.position.set(0.02, -0.245, -0.068);
  paperProp.rotation.set(0.32, 0.14, 0);
  addPart(paperProp, g(new THREE.BoxGeometry(0.16, 0.012, 0.21)), cardboardMat, 0, 0, 0);
  addPart(paperProp, g(new THREE.BoxGeometry(0.142, 0.014, 0.19)), paperPropMat, 0, 0.005, 0.004);
  addPart(paperProp, g(new THREE.BoxGeometry(0.055, 0.018, 0.024)), chromeMat, 0, 0.012, -0.088);
  paperProp.visible = false;
  leftElbow.add(paperProp);

  const boxProp = new THREE.Group();
  boxProp.position.set(0, 0.22, -0.29);
  addPart(boxProp, g(new THREE.BoxGeometry(0.36, 0.24, 0.28)), cardboardMat, 0, 0, 0);
  addPart(boxProp, g(new THREE.BoxGeometry(0.365, 0.022, 0.05)), tapeMat, 0, 0.115, 0);
  addPart(boxProp, g(new THREE.BoxGeometry(0.14, 0.07, 0.008)), whiteMat, 0, 0.02, -0.142);
  boxProp.visible = false;
  torsoGrp.add(boxProp);

  const paddleProp = new THREE.Group();
  paddleProp.position.set(0, -0.258, -0.088);
  paddleProp.rotation.x = Math.PI / 2;
  addPart(
    paddleProp,
    g(new THREE.CylinderGeometry(0.014, 0.016, 0.11, 8)),
    paddleWoodMat,
    0,
    0.04,
    0,
  );
  const paddleHead = addPart(
    paddleProp,
    g(new THREE.CylinderGeometry(0.078, 0.078, 0.016, 16)),
    paddleRubberMat,
    0,
    -0.065,
    0,
  );
  paddleHead.rotation.x = Math.PI / 2;
  paddleProp.visible = false;
  rightElbow.add(paddleProp);

  const actionProps: ActionProps = {
    phone: phoneProp,
    cup: cupProp,
    paper: paperProp,
    box: boxProp,
    paddle: paddleProp,
  };

  torsoGrp.add(leftArm, rightArm);

  // ---------------- Sculpted Head, Expressive Face, Glasses & Layered Hair ----------------
  const head = new THREE.Group();
  head.position.set(0, 1.34 - TORSO_PIVOT_Y, 0);
  if (build === "heavy") head.scale.setScalar(1.03);
  else if (build === "petite") head.scale.setScalar(0.98);
  torsoGrp.add(head);

  // Neck + rounded organic head facing -Z
  addPart(head, g(new THREE.CylinderGeometry(0.062, 0.072, 0.09, 14)), skinShadowMat, 0, 0.03, 0);
  const cranium = addPart(
    head,
    g(new THREE.SphereGeometry(0.142, 22, 18)),
    skinMat,
    0,
    0.21,
    0.005,
  );
  cranium.scale.set(0.96, 1.08, 0.96);

  // Jaw & chin taper for authentic oval face silhouette
  const jaw = addPart(head, g(new THREE.SphereGeometry(0.11, 16, 12)), skinMat, 0, 0.142, -0.018);
  jaw.scale.set(1.02, 0.85, 0.92);

  // Ears + optional gold earrings
  for (const sx of [-1, 1]) {
    const ear = addPart(
      head,
      g(new THREE.SphereGeometry(0.032, 10, 8)),
      skinShadowMat,
      sx * 0.136,
      0.195,
      0.008,
    );
    ear.scale.set(0.45, 1.15, 0.72);
    if (look.accessory === "earrings" && !costume) {
      const hoop = addPart(
        head,
        g(new THREE.TorusGeometry(0.015, 0.0038, 6, 12)),
        goldMat,
        sx * 0.14,
        0.156,
        -0.002,
      );
      hoop.rotation.y = Math.PI / 2;
    }
  }

  // Subtle rosy cheeks on warm/female characters
  if (look.lipColor || look.eyebrows === "warm") {
    for (const sx of [-1, 1]) {
      const cheek = addPart(
        head,
        g(new THREE.SphereGeometry(0.026, 8, 8)),
        cheekMat,
        sx * 0.078,
        0.17,
        -0.114,
        false,
        false,
      );
      cheek.scale.set(1.2, 0.75, 0.25);
    }
  }

  // Eyes (Sclera + Colored Iris + Pupil + Specular Catchlight + Animated Eyelids)
  const buildEye = (sx: -1 | 1): THREE.Mesh => {
    const ex = sx * 0.052;
    const ey = 0.22;
    const ez = -0.125;

    const sclera = addPart(
      head,
      g(new THREE.SphereGeometry(0.028, 12, 10)),
      scleraMat,
      ex,
      ey,
      ez,
      false,
      false,
    );
    sclera.scale.set(1.05, 0.92, 0.42);

    const iris = addPart(
      head,
      g(new THREE.CylinderGeometry(0.016, 0.016, 0.006, 12)),
      irisMat,
      ex,
      ey,
      ez - 0.011,
      false,
      false,
    );
    iris.rotation.x = Math.PI / 2;

    const pupil = addPart(
      head,
      g(new THREE.CylinderGeometry(0.0085, 0.0085, 0.006, 10)),
      pupilMat,
      ex,
      ey,
      ez - 0.013,
      false,
      false,
    );
    pupil.rotation.x = Math.PI / 2;

    addPart(
      head,
      g(new THREE.SphereGeometry(0.004, 6, 6)),
      whiteMat,
      ex + 0.005,
      ey + 0.006,
      ez - 0.015,
      false,
      false,
    );

    const eyelid = addPart(
      head,
      g(new THREE.BoxGeometry(0.056, 0.048, 0.016)),
      skinShadowMat,
      ex,
      ey + 0.016,
      ez - 0.011,
      false,
      false,
    );
    eyelid.scale.y = 0.08;
    return eyelid;
  };
  const leftEyelid = buildEye(-1);
  const rightEyelid = buildEye(1);

  // Expressive Eyebrows
  const browMood = look.eyebrows ?? "neutral";
  const browGeo = g(new THREE.CapsuleGeometry(0.0085, 0.042, 4, 6));
  for (const sx of [-1, 1]) {
    const by =
      browMood === "raised" ? (sx === 1 ? 0.272 : 0.264) : browMood === "stern" ? 0.256 : 0.262;
    const brow = addPart(head, browGeo, hairDarkMat, sx * 0.054, by, -0.128, false, false);
    brow.rotation.z =
      Math.PI / 2 +
      (browMood === "stern"
        ? sx * -0.18
        : browMood === "sad"
          ? sx * 0.22
          : browMood === "raised"
            ? sx * 0.08
            : sx * 0.05);
  }

  // Sculpted Nose (bridge + rounded tip)
  const noseBridge = addPart(
    head,
    g(new THREE.BoxGeometry(0.022, 0.046, 0.024)),
    skinMat,
    0,
    0.2,
    -0.136,
  );
  noseBridge.rotation.x = -0.18;
  addPart(head, g(new THREE.SphereGeometry(0.018, 10, 8)), skinShadowMat, 0, 0.175, -0.145);

  // Mouth / Lips
  if (browMood === "stern" || browMood === "sad") {
    const mouth = addPart(
      head,
      g(new THREE.CapsuleGeometry(0.0055, 0.036, 4, 6)),
      lipMat,
      0,
      0.128,
      -0.124,
      false,
      false,
    );
    mouth.rotation.z = Math.PI / 2 + (browMood === "sad" ? 0.06 : 0);
  } else {
    const smile = addPart(
      head,
      g(new THREE.TorusGeometry(0.024, 0.006, 6, 12, Math.PI * 0.72)),
      lipMat,
      0,
      0.142,
      -0.121,
      false,
      false,
    );
    smile.rotation.z = Math.PI * 1.14;
  }

  // Hollow Wire-Rim / Frame Glasses with Translucent Lenses (eyes stay crystal clear!)
  if (look.glasses && costume !== "india") {
    const frameMat = topKind === "short_sleeve" ? goldMat : darkMetalMat;
    for (const sx of [-1, 1]) {
      const gx = sx * 0.053;
      const gy = 0.22;
      const gz = -0.142;
      addPart(
        head,
        g(new THREE.TorusGeometry(0.036, 0.0042, 6, 16)),
        frameMat,
        gx,
        gy,
        gz,
        false,
        false,
      );
      const lens = addPart(
        head,
        g(new THREE.CircleGeometry(0.033, 14)),
        lensMat,
        gx,
        gy,
        gz - 0.001,
        false,
        false,
      );
      lens.rotation.y = Math.PI;
      // Side temple arm reaching ear
      addPart(
        head,
        g(new THREE.BoxGeometry(0.006, 0.006, 0.14)),
        frameMat,
        sx * 0.095,
        0.222,
        -0.072,
        false,
        false,
      );
    }
    // Bridge
    addPart(
      head,
      g(new THREE.BoxGeometry(0.036, 0.006, 0.006)),
      frameMat,
      0,
      0.226,
      -0.143,
      false,
      false,
    );
  }

  // Maharaja Meme Face Details: Crimson-Gold Tilak + Dark Gold Aviator Swag Shades + Glorious Handlebar Mustache
  if (costume === "india") {
    const tilakRedMat = matStd("#e11d48", 0.32, 0.1, {
      emissive: "#be123c",
      emissiveIntensity: 0.35,
    });
    const memeDarkLensMat = matStd("#0f172a", 0.06, 0.85, {
      emissive: "#1e293b",
      emissiveIntensity: 0.15,
    });
    const stacheJetMat = matStd("#141214", 0.55, 0.12);
    const frameGoldMat = gold24kMat ?? goldMat;
    mats.push(tilakRedMat, memeDarkLensMat, stacheJetMat);

    // Forehead Tilak streak + golden center jewel
    addPart(
      head,
      g(new THREE.BoxGeometry(0.015, 0.056, 0.01)),
      tilakRedMat,
      0,
      0.278,
      -0.133,
      false,
      false,
    );
    addPart(
      head,
      g(new THREE.SphereGeometry(0.008, 8, 8)),
      frameGoldMat,
      0,
      0.266,
      -0.138,
      false,
      false,
    );

    // Shiny Gold Bollywood/MLG Aviator Sunglasses
    for (const sx of [-1, 1]) {
      const gx = sx * 0.052;
      const gy = 0.22;
      const gz = -0.143;
      const rim = addPart(
        head,
        g(new THREE.TorusGeometry(0.039, 0.0052, 8, 16)),
        frameGoldMat,
        gx,
        gy,
        gz,
        false,
        false,
      );
      rim.scale.set(1.06, 0.88, 1);
      const darkLens = addPart(
        head,
        g(new THREE.CircleGeometry(0.036, 16)),
        memeDarkLensMat,
        gx,
        gy,
        gz - 0.002,
        false,
        false,
      );
      darkLens.rotation.y = Math.PI;
      darkLens.scale.set(1.06, 0.88, 1);
      // Iconic diagonal MLG specular shine streak across dark lens
      const glint = addPart(
        head,
        g(new THREE.BoxGeometry(0.009, 0.04, 0.002)),
        whiteMat,
        gx - 0.01,
        gy + 0.003,
        gz - 0.004,
        false,
        false,
      );
      glint.rotation.z = -0.52;
      addPart(
        head,
        g(new THREE.BoxGeometry(0.007, 0.007, 0.14)),
        frameGoldMat,
        sx * 0.098,
        0.224,
        -0.072,
        false,
        false,
      );
    }
    // Aviator double brow bar + nose bridge
    addPart(
      head,
      g(new THREE.BoxGeometry(0.044, 0.006, 0.006)),
      frameGoldMat,
      0,
      0.246,
      -0.144,
      false,
      false,
    );
    addPart(
      head,
      g(new THREE.BoxGeometry(0.032, 0.006, 0.006)),
      frameGoldMat,
      0,
      0.224,
      -0.144,
      false,
      false,
    );

    // Glorious twirled Maharaja Handlebar Mustache
    for (const sx of [-1, 1]) {
      const bar = addPart(
        head,
        g(new THREE.CapsuleGeometry(0.017, 0.048, 6, 10)),
        stacheJetMat,
        sx * 0.036,
        0.15,
        -0.132,
      );
      bar.rotation.z = Math.PI / 2 - sx * 0.24;
      const tip = addPart(
        head,
        g(new THREE.TorusGeometry(0.018, 0.0085, 6, 12, Math.PI * 1.35)),
        stacheJetMat,
        sx * 0.076,
        0.164,
        -0.122,
      );
      tip.rotation.z = sx === -1 ? 0.65 : Math.PI - 0.65;
    }
  }

  // Mustache vs Goatee/Beard
  if (look.mustache && !costume) {
    for (const sx of [-1, 1]) {
      const stache = addPart(
        head,
        g(new THREE.CapsuleGeometry(0.013, 0.028, 4, 8)),
        hairMat,
        sx * 0.024,
        0.15,
        -0.132,
      );
      stache.rotation.z = Math.PI / 2 + sx * (browMood === "sad" ? 0.28 : 0.14);
    }
  }
  if (look.beard || costume === "santa") {
    const bMat = costume === "santa" ? whiteMat : hairDarkMat;
    if (costume === "santa") {
      const santaBeard = addPart(
        head,
        g(new THREE.SphereGeometry(0.118, 14, 12)),
        bMat,
        0,
        0.09,
        -0.078,
      );
      santaBeard.scale.set(1.02, 1.15, 0.72);
    } else {
      // Sculpted goatee + jawline wrap
      const goatee = addPart(
        head,
        g(new THREE.SphereGeometry(0.068, 12, 10)),
        bMat,
        0,
        0.112,
        -0.088,
      );
      goatee.scale.set(1.05, 0.85, 0.72);
      for (const sx of [-1, 1]) {
        const stache = addPart(
          head,
          g(new THREE.CapsuleGeometry(0.009, 0.024, 4, 6)),
          bMat,
          sx * 0.02,
          0.148,
          -0.128,
        );
        stache.rotation.z = Math.PI / 2 + sx * 0.16;
      }
    }
  }

  // ---------------- Sculpted Multi-Part Hairstyles ----------------
  const hs = look.hairStyle;
  const part = look.parting ?? "side";

  if (costume === "india") {
    // Neat dark temple sideburns peeking cleanly below the royal turban
    const sbMat = matStd("#1b1718", 0.72, 0.05);
    mats.push(sbMat);
    for (const sx of [-1, 1]) {
      addPart(
        head,
        g(new THREE.CapsuleGeometry(0.016, 0.042, 4, 6)),
        sbMat,
        sx * 0.128,
        0.225,
        0.018,
      );
    }
  } else if (hs === "bald") {
    // Horseshoe fringe wrapping left/right temples & back (Stanley / Toby)
    if (part === "receding") {
      // Sparse temple side wisps (Toby)
      for (const sx of [-1, 1]) {
        const tuft = addPart(
          head,
          g(new THREE.SphereGeometry(0.048, 10, 8)),
          hairMat,
          sx * 0.118,
          0.24,
          0.03,
        );
        tuft.scale.set(0.52, 1.2, 1.45);
      }
      const backFringe = addPart(
        head,
        g(new THREE.SphereGeometry(0.12, 14, 10)),
        hairMat,
        0,
        0.22,
        0.055,
      );
      backFringe.scale.set(1.08, 0.85, 0.75);
      // Thin receding crown patch
      const wisp = addPart(head, g(new THREE.SphereGeometry(0.09, 12, 8)), hairMat, 0, 0.34, 0.035);
      wisp.scale.set(0.9, 0.28, 0.8);
    } else if (look.hair !== "#6e6a65") {
      // Classic horseshoe halo fringe centered symmetrically on back (+Z)
      const horseshoe = addPart(
        head,
        g(
          new THREE.CylinderGeometry(
            0.143,
            0.14,
            0.085,
            16,
            1,
            false,
            -Math.PI * 0.62,
            Math.PI * 1.24,
          ),
        ),
        hairMat,
        0,
        0.215,
        0.015,
      );
      horseshoe.scale.set(0.96, 1, 0.96);
    }
  } else {
    // Sculpted base hair dome tilted slightly back so forehead, eyebrows, and eyes remain 100% clear
    const domeGeo = g(new THREE.SphereGeometry(0.148, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.41));
    const dome = addPart(head, domeGeo, hairMat, 0, 0.242, 0.016);
    dome.scale.set(0.98, 1.03, 0.96);
    dome.rotation.x = 0.14;
    if (part === "receding") {
      dome.position.z = 0.04;
      dome.rotation.x = 0.22;
      dome.scale.z = 0.84;
    }

    // Back nape hair (behind head +Z)
    const backLen = hs === "long" ? 0.26 : hs === "bob" || hs === "curly" ? 0.18 : 0.12;
    const backHair = addPart(
      head,
      g(new THREE.SphereGeometry(0.14, 16, 12)),
      hairDarkMat,
      0,
      hs === "long" ? 0.14 : 0.2,
      0.052,
    );
    backHair.scale.set(1.0, backLen / 0.14, 0.72);

    // Sideburns / temple locks (aligned behind cheeks)
    for (const sx of [-1, 1]) {
      const sb = addPart(
        head,
        g(new THREE.CapsuleGeometry(0.02, hs === "long" ? 0.17 : hs === "bob" ? 0.1 : 0.04, 4, 8)),
        hairMat,
        sx * 0.128,
        hs === "long" ? 0.15 : hs === "bob" ? 0.19 : 0.23,
        0.022,
      );
      sb.rotation.z = sx * 0.06;
    }

    if (hs === "side") {
      // Sculpted side-parted volume / slick crest high on crown (Michael / Andy / Creed)
      const crest = addPart(
        head,
        g(new THREE.SphereGeometry(0.092, 14, 10)),
        hairMat,
        -0.018,
        0.354,
        part === "receding" ? 0.025 : -0.008,
      );
      crest.scale.set(1.24, 0.42, 1.05);
      crest.rotation.z = -0.14;
      if (part === "slick") {
        const swoop = addPart(
          head,
          g(new THREE.CapsuleGeometry(0.024, 0.11, 4, 8)),
          hairMat,
          0.02,
          0.348,
          -0.042,
        );
        swoop.rotation.z = Math.PI / 2 - 0.16;
      }
    } else if (hs === "wavy" || part === "floppy") {
      // Tousled floppy locks framing upper forehead safely above eyebrows
      const lockCoords: [number, number, number, number][] = [
        [-0.072, 0.342, -0.052, 0.32],
        [-0.022, 0.352, -0.07, 0.1],
        [0.038, 0.348, -0.065, -0.18],
        [0.08, 0.336, -0.045, -0.36],
      ];
      for (const [lx, ly, lz, rot] of lockCoords) {
        const lock = addPart(
          head,
          g(new THREE.CapsuleGeometry(0.02, 0.045, 4, 8)),
          hairMat,
          lx,
          ly,
          lz,
        );
        lock.rotation.set(0.22, 0, rot);
      }
    } else if (hs === "spiky") {
      for (const [sx, sy, sz, rz] of [
        [-0.07, 0.37, -0.02, 0.22],
        [0, 0.385, -0.035, 0],
        [0.07, 0.37, -0.02, -0.22],
        [-0.035, 0.36, 0.02, 0.12],
        [0.035, 0.36, 0.02, -0.12],
      ] as const) {
        const spike = addPart(head, g(new THREE.ConeGeometry(0.036, 0.09, 6)), hairMat, sx, sy, sz);
        spike.rotation.set(-0.12, 0, rz);
      }
    } else if (hs === "bob") {
      if (part === "center") {
        // Dwight's iconic symmetrical middle-part crown wings (high above brows & glasses)
        for (const sx of [-1, 1]) {
          const wing = addPart(
            head,
            g(new THREE.SphereGeometry(0.076, 12, 10)),
            hairMat,
            sx * 0.064,
            0.336,
            -0.028,
          );
          wing.scale.set(1.02, 0.42, 0.88);
          wing.rotation.z = sx * -0.26;
        }
      } else {
        // Curly/layered bob (Phyllis / Meredith / Hannah) framing ears/sides
        for (const sx of [-1, 1]) {
          for (const cy of [0.22, 0.15]) {
            addPart(head, g(new THREE.SphereGeometry(0.054, 10, 8)), hairMat, sx * 0.13, cy, 0.032);
          }
        }
      }
    } else if (hs === "curly") {
      // Soft shoulder curls + half-up crown clip (Pam)
      for (const [cx, cy, cz] of [
        [-0.13, 0.22, 0.03],
        [-0.132, 0.14, 0.04],
        [0.13, 0.22, 0.03],
        [0.132, 0.14, 0.04],
        [-0.08, 0.11, 0.09],
        [0.08, 0.11, 0.09],
        [0, 0.29, 0.1],
      ] as const) {
        addPart(head, g(new THREE.SphereGeometry(0.054, 10, 8)), hairMat, cx, cy, cz);
      }
    } else if (hs === "bun") {
      // Tight French twist / chignon bun (Angela)
      const chignon = addPart(
        head,
        g(new THREE.SphereGeometry(0.075, 12, 10)),
        hairDarkMat,
        0,
        0.3,
        0.135,
      );
      chignon.scale.set(0.95, 1.25, 0.88);
      addPart(head, g(new THREE.TorusGeometry(0.052, 0.014, 6, 12)), hairMat, 0, 0.31, 0.14);
    } else if (hs === "long") {
      // Full layered long curtain centered symmetrically on back (+Z) behind ears & shoulders
      const curtain = addPart(
        head,
        g(
          new THREE.CylinderGeometry(
            0.142,
            0.165,
            0.28,
            14,
            1,
            false,
            -Math.PI * 0.62,
            Math.PI * 1.24,
          ),
        ),
        hairMat,
        0,
        0.08,
        0.032,
      );
      curtain.scale.set(0.98, 1, 0.82);
    }
  }

  // Costumes headwear
  if (costume === "prison_mike") {
    const bandanaMat = matStd("#5e368c", 0.78, 0.05);
    mats.push(bandanaMat);
    const band = addPart(
      head,
      g(new THREE.CylinderGeometry(0.15, 0.148, 0.09, 16)),
      bandanaMat,
      0,
      0.305,
      0,
    );
    band.scale.set(0.98, 1, 0.98);
    addPart(head, g(new THREE.SphereGeometry(0.04, 8, 8)), bandanaMat, 0.02, 0.285, 0.145);
  } else if (costume === "witch") {
    const wMat = matStd("#231932", 0.8, 0.05);
    mats.push(wMat);
    addPart(head, g(new THREE.CylinderGeometry(0.27, 0.27, 0.025, 16)), wMat, 0, 0.35, 0);
    addPart(head, g(new THREE.ConeGeometry(0.15, 0.32, 14)), wMat, 0, 0.5, 0);
  } else if (costume === "santa" || costume === "elf") {
    const hMat = costume === "santa" ? shirtMat : matStd("#2d7a47", 0.8, 0.02);
    if (costume === "elf") mats.push(hMat);
    addPart(head, g(new THREE.CylinderGeometry(0.16, 0.16, 0.055, 14)), whiteMat, 0, 0.35, 0);
    addPart(head, g(new THREE.ConeGeometry(0.145, 0.28, 14)), hMat, 0, 0.49, 0.02);
    addPart(head, g(new THREE.SphereGeometry(0.045, 8, 8)), whiteMat, 0, 0.63, 0.04);
  } else if (costume === "catEars") {
    const eMat = matStd("#1f2228", 0.7, 0.05);
    mats.push(eMat);
    addPart(head, g(new THREE.ConeGeometry(0.05, 0.11, 6)), eMat, -0.09, 0.39, -0.02);
    addPart(head, g(new THREE.ConeGeometry(0.05, 0.11, 6)), eMat, 0.09, 0.39, -0.02);
  } else if (costume === "crown") {
    addPart(head, g(new THREE.CylinderGeometry(0.15, 0.135, 0.1, 8)), goldMat, 0, 0.41, 0);
  } else if (costume === "partyHat") {
    const pMat = matStd("#3aa7a3", 0.5, 0.1);
    mats.push(pMat);
    addPart(head, g(new THREE.ConeGeometry(0.115, 0.26, 12)), pMat, 0, 0.47, 0);
  } else if (costume === "reindeer") {
    const aMat = matStd("#6b4423", 0.8, 0.02);
    mats.push(aMat);
    addPart(head, g(new THREE.BoxGeometry(0.032, 0.18, 0.032)), aMat, -0.1, 0.45, 0);
    addPart(head, g(new THREE.BoxGeometry(0.032, 0.18, 0.032)), aMat, 0.1, 0.45, 0);
  } else if (costume === "leprechaun") {
    const lMat = matStd("#1b6b3a", 0.8, 0.05);
    mats.push(lMat);
    addPart(head, g(new THREE.CylinderGeometry(0.24, 0.24, 0.028, 14)), lMat, 0, 0.35, 0);
    addPart(head, g(new THREE.CylinderGeometry(0.135, 0.135, 0.2, 14)), lMat, 0, 0.45, 0);
  } else if (costume === "india") {
    // Multi-layered Maharaja Pagri (Turban) + 24k Gold Diadem + Emerald Sarpech + Temple Tassel + Peacock Feather
    const pagriCrimsonMat = matStd("#a6123a", 0.56, 0.08);
    const pagriMagentaMat = matStd("#cf1e5a", 0.52, 0.1);
    const pagriSaffronMat = matStd("#ff821c", 0.5, 0.1);
    const peacockTealMat = matStd("#0d9488", 0.24, 0.32, {
      emissive: "#0f766e",
      emissiveIntensity: 0.25,
    });
    const peacockEyeMat = matStd("#2563eb", 0.16, 0.45, {
      emissive: "#1d4ed8",
      emissiveIntensity: 0.38,
    });
    const gemEmeraldMat = matStd("#10b981", 0.14, 0.3, {
      emissive: "#059669",
      emissiveIntensity: 0.45,
    });
    const gemGoldMat = gold24kMat ?? goldMat;
    mats.push(
      pagriCrimsonMat,
      pagriMagentaMat,
      pagriSaffronMat,
      peacockTealMat,
      peacockEyeMat,
      gemEmeraldMat,
    );

    // Sculpted layered turban crown base + overlapping criss-cross silk folds
    const crownCap = addPart(
      head,
      g(new THREE.SphereGeometry(0.168, 20, 14)),
      pagriCrimsonMat,
      0,
      0.355,
      0.01,
    );
    crownCap.scale.set(1.08, 0.82, 1.06);

    const fold1 = addPart(
      head,
      g(new THREE.TorusGeometry(0.148, 0.044, 10, 22)),
      pagriCrimsonMat,
      -0.015,
      0.34,
      0,
    );
    fold1.rotation.set(Math.PI / 2 + 0.18, 0, 0.26);
    const fold2 = addPart(
      head,
      g(new THREE.TorusGeometry(0.148, 0.044, 10, 22)),
      pagriMagentaMat,
      0.015,
      0.345,
      0,
    );
    fold2.rotation.set(Math.PI / 2 + 0.18, 0, -0.26);
    const fold3 = addPart(
      head,
      g(new THREE.TorusGeometry(0.136, 0.036, 10, 20)),
      pagriSaffronMat,
      0,
      0.395,
      0.008,
    );
    fold3.rotation.set(Math.PI / 2 - 0.12, 0, 0.14);
    const fold4 = addPart(
      head,
      g(new THREE.TorusGeometry(0.112, 0.03, 8, 18)),
      pagriCrimsonMat,
      0,
      0.445,
      0.014,
    );
    fold4.rotation.set(Math.PI / 2, 0, -0.12);

    // Braided 24k gold diadem band around lower turban brim
    const diadem = addPart(
      head,
      g(new THREE.TorusGeometry(0.158, 0.013, 8, 24)),
      gemGoldMat,
      0,
      0.305,
      0,
    );
    diadem.rotation.x = Math.PI / 2;

    // Front Sunburst Sarpech royal brooch with emerald & gold rays
    addPart(head, g(new THREE.OctahedronGeometry(0.032, 0)), gemGoldMat, 0, 0.365, -0.158);
    addPart(head, g(new THREE.OctahedronGeometry(0.02, 0)), gemEmeraldMat, 0, 0.365, -0.172);
    for (const ang of [-0.55, -0.26, 0, 0.26, 0.55]) {
      const ray = addPart(
        head,
        g(new THREE.ConeGeometry(0.011, 0.085, 6)),
        gemGoldMat,
        Math.sin(ang) * 0.045,
        0.41 + Math.cos(ang) * 0.035,
        -0.152,
      );
      ray.rotation.z = -ang;
    }

    // Iridescent Peacock Feather (Mor Pankh) rising proudly from the Sarpech crest
    const quill = addPart(
      head,
      g(new THREE.CylinderGeometry(0.004, 0.006, 0.22, 6)),
      gemGoldMat,
      0.022,
      0.49,
      -0.125,
    );
    quill.rotation.set(-0.22, 0, -0.16);
    const plume = addPart(
      head,
      g(new THREE.SphereGeometry(0.044, 12, 10)),
      peacockTealMat,
      0.045,
      0.585,
      -0.1,
    );
    plume.scale.set(0.75, 1.38, 0.25);
    plume.rotation.set(-0.22, 0, -0.16);
    const eyeRing = addPart(
      head,
      g(new THREE.SphereGeometry(0.026, 10, 8)),
      gemGoldMat,
      0.045,
      0.59,
      -0.108,
    );
    eyeRing.scale.set(0.78, 1.2, 0.22);
    eyeRing.rotation.set(-0.22, 0, -0.16);
    const eyeCore = addPart(
      head,
      g(new THREE.SphereGeometry(0.016, 10, 8)),
      peacockEyeMat,
      0.045,
      0.592,
      -0.114,
    );
    eyeCore.scale.set(0.76, 1.15, 0.22);
    eyeCore.rotation.set(-0.22, 0, -0.16);

    // Dangling pearl & gold temple tassel (Sehra accent) on right side
    for (let p = 0; p < 3; p++) {
      addPart(
        head,
        g(new THREE.SphereGeometry(0.011, 8, 8)),
        p === 2 ? gemGoldMat : whiteMat,
        0.162,
        0.275 - p * 0.032,
        -0.025,
      );
    }
    addPart(head, g(new THREE.ConeGeometry(0.016, 0.036, 8)), gemGoldMat, 0.162, 0.175, -0.025);
  }

  const zeroVec = (): Vec3State => ({ x: 0, y: 0, z: 0 });
  const prevPose: RigPoseSnapshot = {
    bodyPos: zeroVec(),
    bodyRot: zeroVec(),
    torsoRot: zeroVec(),
    headRot: zeroVec(),
    leftArmRot: zeroVec(),
    rightArmRot: zeroVec(),
    leftElbowRot: zeroVec(),
    rightElbowRot: zeroVec(),
    leftLegRot: zeroVec(),
    rightLegRot: zeroVec(),
    leftKneeRot: zeroVec(),
    rightKneeRot: zeroVec(),
    leftFootRot: zeroVec(),
    rightFootRot: zeroVec(),
    skirtPos: { x: 0, y: 0.69, z: 0 },
    skirtRotX: 0,
    skirtScaleY: 1,
  };

  return {
    root,
    body,
    torso: torsoGrp,
    head,
    leftArm,
    rightArm,
    leftElbow,
    rightElbow,
    leftLeg,
    rightLeg,
    leftKnee,
    rightKnee,
    leftFoot,
    rightFoot,
    leftEyelid,
    rightEyelid,
    propMesh,
    actionProps,
    skirt,
    indiaAura,
    animInitialized: false,
    prevPose,
    dispose: () => {
      for (const geo of geos) geo.dispose();
      for (const m of mats) m.dispose();
    },
  };
}

export const ACTION_VARIANT_COUNT = 10;
export const CALL_ANIM_COUNT = 10;

export type ActionAnimCategory =
  "call" | "desk" | "drink_eat" | "paperwork" | "warehouse" | "machine_prep" | "social" | "idle";

export function classifyActionCategory(
  actionText: string,
  opts?: {
    onCall?: boolean | undefined;
    deskSeated?: boolean | undefined;
    seated?: boolean | undefined;
  },
): ActionAnimCategory {
  if (opts?.onCall) return "call";
  const a = actionText.trim().toLowerCase();
  if (!a) return opts?.deskSeated ? "desk" : "idle";
  if (/llamad|atenci[oó]n al cliente|central/.test(a)) return "call";
  if (/caja|almac[eé]n|muelle|patrulla|desembal|recogiendo|descarg|sin rumbo|objeto/.test(a)) {
    return "warehouse";
  }
  if (/caf[eé]|agua|comiendo|bebiendo|expendedora|comida|termos/.test(a)) return "drink_eat";
  if (
    /fotocopia|impresora|copias|comit[eé]|preparando|broma|regalo|tarjetas|tetera|hielo|boquete|pizarra/.test(
      a,
    )
  ) {
    return "machine_prep";
  }
  if (
    /crucigrama|revista|archivo|archivando|informe|demanda|baja|dimitir|durmiendo|b-o-b-o-d-d-y|memorizando|permiso/.test(
      a,
    )
  ) {
    return "paperwork";
  }
  if (
    opts?.deskSeated ||
    /despacho|escritorio|contabilidad|recursos humanos|cifras|cuentas|facturas|calidad|solitario|ordenador|pelota|recepci[oó]n|reuni[oó]n/.test(
      a,
    )
  ) {
    return "desk";
  }
  if (
    /charl|hablar|visita|molest|ping-pong|celebrando|dundie|abraz|besando|esquivando|lanzando|cantando|susurrando|proponiendo|advirtiendo|siesta|respirando|aire|se[nñ]alando|fichas|reprend|asimilando/.test(
      a,
    )
  ) {
    return "social";
  }
  return "idle";
}

export interface RigAnimOpts {
  moving: boolean;
  running?: boolean | undefined;
  walkT: number;
  handRaised: boolean;
  idlePhase: number;
  seated?: boolean | undefined;
  deskSeated?: boolean | undefined;
  gesture?: MeetingGesture | undefined;
  lookYaw?: number | undefined;
  actionText?: string | undefined;
  actionVariant?: number | undefined;
  onCall?: boolean | undefined;
  dt?: number | undefined;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function wrapVariant(v: number | undefined): number {
  const n = Math.floor(v ?? 0);
  return ((n % ACTION_VARIANT_COUNT) + ACTION_VARIANT_COUNT) % ACTION_VARIANT_COUNT;
}

function applyPhoneHandPose(
  rig: CharacterRig,
  t: number,
  lift = 1,
  elbowPitch = 2.02,
  armYaw = 0.56,
) {
  rig.rightArm.rotation.set(1.42 * lift, armYaw * lift, 0.08);
  rig.rightElbow.rotation.set(elbowPitch * lift, 0, 0.1 + Math.sin(t * 3.1) * 0.025);
}

function applyCallVariant(
  rig: CharacterRig,
  variant: number,
  t: number,
  isSeated: boolean,
  isMoving: boolean,
) {
  rig.actionProps.phone.visible = true;
  if (rig.propMesh) rig.propMesh.visible = false;

  switch (variant) {
    case 0: {
      // 0: Classic upright attentive sales listen & calm left-hand resting/pacing
      applyPhoneHandPose(rig, t);
      rig.torso.rotation.x += isSeated ? -0.06 : -0.03;
      rig.head.rotation.x += Math.sin(t * 2.8) * 0.05;
      rig.head.rotation.z = -0.05;
      if (!isMoving) {
        if (isSeated) {
          rig.leftArm.rotation.set(0.74, -0.14, -0.05);
          rig.leftElbow.rotation.set(0.84 + Math.cos(t * 1.8) * 0.06, 0, 0);
        } else {
          rig.leftArm.rotation.set(0.22 + Math.sin(t * 1.4) * 0.06, 0, -0.06);
          rig.leftElbow.rotation.set(0.45 + Math.cos(t * 1.8) * 0.08, 0, 0);
        }
      }
      break;
    }
    case 1: {
      // 1: Leaned-forward persuasive pitch with active free-hand gesture
      applyPhoneHandPose(rig, t, 1, 2.0, 0.54);
      rig.torso.rotation.x += -0.12;
      rig.head.rotation.x += -0.03 + Math.sin(t * 4.5) * 0.06;
      if (!isMoving) {
        rig.leftArm.rotation.set(0.78 + Math.sin(t * 4.2) * 0.18, -0.2, -0.08);
        rig.leftElbow.rotation.set(0.88 + Math.cos(t * 4.2) * 0.22, 0, 0);
      }
      break;
    }
    case 2: {
      // 2: Relaxed upright confident banter
      applyPhoneHandPose(rig, t, 0.98, 1.98, 0.58);
      rig.torso.rotation.x += isSeated ? 0.04 : 0.03;
      rig.torso.rotation.y += Math.sin(t * 0.9) * 0.08;
      rig.head.rotation.z = 0.08;
      rig.head.rotation.y += Math.sin(t * 1.8) * 0.1;
      if (!isMoving) {
        if (isSeated) {
          rig.leftArm.rotation.set(0.68, -0.1, -0.08);
          rig.leftElbow.rotation.set(0.78, 0, 0);
        } else {
          rig.leftArm.rotation.set(-0.14, 0, -0.28);
          rig.leftElbow.rotation.set(0.95, 0, 0.25);
        }
      }
      break;
    }
    case 3: {
      // 3: Shoulder-cradle multitasking while jotting notes on clipboard/desk
      rig.actionProps.paper.visible = true;
      rig.rightArm.rotation.set(1.52, 0.62, 0.14);
      rig.rightElbow.rotation.set(2.08, 0, 0.16);
      rig.head.rotation.z = -0.28;
      rig.head.rotation.x += -0.12;
      rig.torso.rotation.x += -0.1;
      if (!isMoving) {
        rig.leftArm.rotation.set(isSeated ? 0.78 : 0.76, -0.26, -0.05);
        rig.leftElbow.rotation.set((isSeated ? 0.88 : 1.08) + Math.sin(t * 8.5) * 0.08, 0, 0);
      }
      break;
    }
    case 4: {
      // 4: Impatient weight-shifting & forehead rub mid-call
      applyPhoneHandPose(rig, t, 1, 2.02, 0.56);
      if (!isMoving) {
        const sway = Math.sin(t * 2.1);
        rig.body.rotation.z = isSeated ? sway * 0.025 : sway * 0.055;
        rig.torso.rotation.z = -sway * 0.035;
        rig.leftArm.rotation.set(1.15 + Math.sin(t * 1.7) * 0.12, -0.45, 0.1);
        rig.leftElbow.rotation.set(1.65, 0, 0);
      }
      rig.head.rotation.x += -0.06 + Math.sin(t * 3.4) * 0.04;
      break;
    }
    case 5: {
      // 5: Heated / stressed complaint call with sharp head shakes & hand chops
      const flare = Math.max(0, Math.sin(t * 2.3));
      applyPhoneHandPose(rig, t, 1 - flare * 0.14, 1.94, 0.5);
      rig.torso.rotation.x += -0.1;
      rig.head.rotation.y += Math.sin(t * 7.2) * 0.14;
      rig.head.rotation.x += -0.04;
      if (!isMoving) {
        rig.leftArm.rotation.set(0.84 + Math.sin(t * 6.4) * 0.24, -0.18, -0.12);
        rig.leftElbow.rotation.set(0.95 + Math.cos(t * 6.4) * 0.24, 0, 0);
      }
      break;
    }
    case 6: {
      // 6: Whispered confidential gossip call, left hand shielding mouth
      applyPhoneHandPose(rig, t, 1, 2.04, 0.62);
      rig.torso.rotation.x += -0.16;
      rig.torso.rotation.y += -0.14;
      rig.head.rotation.x += -0.08;
      rig.head.rotation.y += Math.sin(t * 1.3) * 0.16;
      if (!isMoving) {
        rig.leftArm.rotation.set(1.26, -0.58, -0.08);
        rig.leftElbow.rotation.set(1.85, 0, -0.12);
      }
      break;
    }
    case 7: {
      // 7: Hold-music wait (phone lowered toward chest, looking around, drumming)
      const holdDip = 0.5 + 0.5 * Math.sin(t * 1.15);
      const lift = 0.92 - holdDip * 0.36;
      applyPhoneHandPose(rig, t, lift, 1.75 - holdDip * 0.45, 0.42);
      rig.torso.rotation.x += -0.06;
      rig.head.rotation.y += Math.sin(t * 1.6) * 0.26;
      rig.head.rotation.z = Math.cos(t * 1.2) * 0.08;
      if (!isMoving) {
        rig.leftArm.rotation.set(isSeated ? 0.74 : 0.55, -0.1, -0.08);
        rig.leftElbow.rotation.set((isSeated ? 0.84 : 0.92) + Math.sin(t * 7.5) * 0.08, 0, 0);
      }
      break;
    }
    case 8: {
      // 8: Checking client specs / price sheet while talking on phone
      rig.actionProps.paper.visible = true;
      applyPhoneHandPose(rig, t, 1, 2.02, 0.56);
      rig.torso.rotation.x += -0.1;
      rig.head.rotation.x += -0.14;
      rig.head.rotation.y += 0.14 + Math.sin(t * 2.2) * 0.08;
      if (!isMoving) {
        rig.leftArm.rotation.set(isSeated ? 0.78 : 0.95, -0.22, -0.05);
        rig.leftElbow.rotation.set(isSeated ? 0.88 : 1.22, 0, 0);
      }
      break;
    }
    default: {
      // 9: Closing the sale celebratory fist pump + emphatic nods
      applyPhoneHandPose(rig, t, 1, 2.0, 0.56);
      rig.torso.rotation.x += 0.03;
      rig.head.rotation.x += Math.sin(t * 6.0) * 0.12;
      if (!isMoving) {
        const pump = Math.max(0, Math.sin(t * 4.4));
        rig.leftArm.rotation.set(0.9 + pump * 0.55, -0.15, -0.14);
        rig.leftElbow.rotation.set(1.05 + pump * 0.3, 0, 0);
      }
      break;
    }
  }
}

function applyDeskVariant(rig: CharacterRig, variant: number, t: number) {
  switch (variant) {
    case 0: {
      // 0: Brisk keyboard typing with forearms resting cleanly over desk surface
      rig.torso.rotation.x = -0.12;
      rig.head.rotation.x = -0.08;
      rig.leftArm.rotation.set(0.76, -0.16, -0.04);
      rig.rightArm.rotation.set(0.76, 0.16, 0.04);
      rig.leftElbow.rotation.set(0.84 + Math.sin(t * 14) * 0.06, 0, 0);
      rig.rightElbow.rotation.set(0.84 + Math.cos(t * 14) * 0.06, 0, 0);
      break;
    }
    case 1: {
      // 1: Mouse hand clicking & reading monitor
      rig.torso.rotation.x = -0.1;
      rig.head.rotation.x = -0.02;
      rig.head.rotation.y = Math.sin(t * 1.4) * 0.1;
      rig.leftArm.rotation.set(0.74, -0.14, -0.05);
      rig.leftElbow.rotation.set(0.84, 0, 0);
      rig.rightArm.rotation.set(0.78, 0.06, 0.05);
      rig.rightElbow.rotation.set(0.82 + Math.sin(t * 5.2) * 0.04, 0, 0);
      break;
    }
    case 2: {
      // 2: Signing / writing paperwork directly on desk
      rig.actionProps.paper.visible = true;
      rig.torso.rotation.x = -0.15;
      rig.head.rotation.x = -0.16;
      rig.leftArm.rotation.set(0.76, -0.24, -0.04);
      rig.leftElbow.rotation.set(0.86, 0, 0);
      rig.rightArm.rotation.set(0.78, 0.24, 0.04);
      rig.rightElbow.rotation.set(0.88 + Math.sin(t * 9.5) * 0.09, 0, 0);
      break;
    }
    case 3: {
      // 3: Elbow on desk / chin on hand thinking at screen
      rig.torso.rotation.x = -0.12;
      rig.head.rotation.x = -0.06;
      rig.head.rotation.z = -0.08;
      rig.leftArm.rotation.set(0.74, -0.12, -0.06);
      rig.leftElbow.rotation.set(0.84, 0, 0);
      rig.rightArm.rotation.set(1.18, 0.44, 0.06);
      rig.rightElbow.rotation.set(1.78, 0, 0);
      break;
    }
    case 4: {
      // 4: Reviewing printed report at desk
      rig.actionProps.paper.visible = true;
      rig.torso.rotation.x = -0.08;
      rig.head.rotation.x = -0.1;
      rig.head.rotation.y = Math.sin(t * 1.9) * 0.12;
      rig.leftArm.rotation.set(0.86, -0.22, -0.05);
      rig.leftElbow.rotation.set(1.02, 0, 0);
      rig.rightArm.rotation.set(0.82, 0.22, 0.05);
      rig.rightElbow.rotation.set(0.96, 0, 0);
      break;
    }
    case 5: {
      // 5: Tired temple rub with left forearm resting on desk
      rig.torso.rotation.x = -0.13;
      rig.head.rotation.x = -0.14;
      rig.leftArm.rotation.set(0.74, -0.1, -0.04);
      rig.leftElbow.rotation.set(0.84, 0, 0);
      rig.rightArm.rotation.set(1.34, 0.4, 0.05);
      rig.rightElbow.rotation.set(1.9 + Math.sin(t * 2.5) * 0.07, 0, 0);
      break;
    }
    case 6: {
      // 6: Desk stretch — hands clasped/raised briefly overhead
      const s = 0.5 + 0.5 * Math.sin(t * 1.6);
      rig.torso.rotation.x = -0.06 + s * 0.08;
      rig.head.rotation.x = s * 0.08;
      rig.leftArm.rotation.set(1.2 + s * 1.15, -0.15, -0.18);
      rig.rightArm.rotation.set(1.2 + s * 1.15, 0.15, 0.18);
      rig.leftElbow.rotation.set(0.9 - s * 0.55, 0, 0);
      rig.rightElbow.rotation.set(0.9 - s * 0.55, 0, 0);
      break;
    }
    case 7: {
      // 7: Flipping calendar/sticky notes on desk & nodding
      rig.actionProps.paper.visible = true;
      rig.torso.rotation.x = -0.11;
      rig.head.rotation.x = -0.08 + Math.sin(t * 3.0) * 0.05;
      rig.leftArm.rotation.set(0.74, -0.18, -0.05);
      rig.leftElbow.rotation.set(0.86, 0, 0);
      rig.rightArm.rotation.set(0.78 + Math.sin(t * 4.2) * 0.08, 0.2, 0.05);
      rig.rightElbow.rotation.set(0.88 + Math.cos(t * 4.2) * 0.14, 0, 0);
      break;
    }
    case 8: {
      // 8: Sipping desk mug while left forearm rests on desk
      rig.actionProps.cup.visible = true;
      if (rig.propMesh) rig.propMesh.visible = false;
      const sip = Math.max(0, Math.sin(t * 1.5));
      rig.torso.rotation.x = -0.08;
      rig.head.rotation.x = -0.04 + sip * 0.08;
      rig.leftArm.rotation.set(0.74, -0.12, -0.04);
      rig.leftElbow.rotation.set(0.84, 0, 0);
      rig.rightArm.rotation.set(0.76 + sip * 0.42, 0.34, 0.04);
      rig.rightElbow.rotation.set(0.88 + sip * 0.9, 0, 0);
      break;
    }
    default: {
      // 9: Relaxed upright glance while mouse hand rests on desk
      rig.torso.rotation.x = -0.06;
      rig.torso.rotation.y = Math.sin(t * 0.8) * 0.07;
      rig.head.rotation.y = Math.sin(t * 1.1) * 0.12;
      rig.leftArm.rotation.set(0.72, -0.12, -0.06);
      rig.leftElbow.rotation.set(0.82, 0, 0);
      rig.rightArm.rotation.set(0.74, 0.1, 0.06);
      rig.rightElbow.rotation.set(0.84 + Math.sin(t * 5.0) * 0.08, 0, 0);
      break;
    }
  }
}

function applyDrinkEatVariant(rig: CharacterRig, variant: number, t: number, actionLower: string) {
  const isVending = /expendedora/.test(actionLower);
  const isFood = /comiendo|comida/.test(actionLower);
  if (!isVending && !isFood) {
    rig.actionProps.cup.visible = true;
    if (rig.propMesh) rig.propMesh.visible = false;
  }

  switch (variant) {
    case 0: {
      // 0: Steady sip from coffee mug / water cup
      const sip = 0.5 + 0.5 * Math.sin(t * 2.0);
      rig.rightArm.rotation.set(0.75 + sip * 0.52, 0.42, 0.06);
      rig.rightElbow.rotation.set(1.0 + sip * 0.9, 0, 0);
      rig.leftArm.rotation.set(0.2 + sip * 0.12, 0, -0.08);
      rig.leftElbow.rotation.set(0.4, 0, 0);
      rig.head.rotation.x = -sip * 0.12;
      break;
    }
    case 1: {
      // 1: Warming hands on hot cup / two-hand cradle
      rig.rightArm.rotation.set(0.84, 0.38, 0.04);
      rig.rightElbow.rotation.set(1.18, 0, 0);
      rig.leftArm.rotation.set(0.84, -0.38, -0.04);
      rig.leftElbow.rotation.set(1.18, 0, 0);
      rig.head.rotation.x = 0.12 + Math.sin(t * 1.8) * 0.05;
      break;
    }
    case 2: {
      // 2: Blowing gently to cool hot drink
      rig.rightArm.rotation.set(1.06, 0.44, 0.04);
      rig.rightElbow.rotation.set(1.48, 0, 0);
      rig.leftArm.rotation.set(0.18, 0, -0.08);
      rig.leftElbow.rotation.set(0.32, 0, 0);
      rig.torso.rotation.x = 0.06;
      rig.head.rotation.x = 0.16 + Math.sin(t * 3.8) * 0.05;
      break;
    }
    case 3: {
      // 3: Quick bite / snack chew with satisfied nod
      const bite = Math.max(0, Math.sin(t * 2.4));
      rig.rightArm.rotation.set(0.72 + bite * 0.55, 0.45, 0.05);
      rig.rightElbow.rotation.set(0.95 + bite * 0.92, 0, 0);
      rig.leftArm.rotation.set(0.45, -0.2, -0.06);
      rig.leftElbow.rotation.set(0.75, 0, 0);
      rig.head.rotation.x = bite > 0.4 ? -0.06 : Math.sin(t * 7.5) * 0.05;
      break;
    }
    case 4: {
      // 4: Pressing vending machine buttons & grabbing snack tray
      const reach = 0.5 + 0.5 * Math.sin(t * 2.6);
      rig.torso.rotation.x = 0.08;
      rig.rightArm.rotation.set(0.95 + reach * 0.35, 0.1, 0.04);
      rig.rightElbow.rotation.set(0.55 - reach * 0.2, 0, 0);
      rig.leftArm.rotation.set(0.35, 0, -0.08);
      rig.leftElbow.rotation.set(0.6, 0, 0);
      rig.head.rotation.x = -0.08 + reach * 0.22;
      break;
    }
    case 5: {
      // 5: Humming & bobbing cheerfully while snacking (Andy)
      rig.torso.rotation.z = Math.sin(t * 3.4) * 0.06;
      rig.head.rotation.z = Math.sin(t * 3.4) * 0.1;
      rig.head.rotation.y = Math.cos(t * 1.7) * 0.12;
      rig.rightArm.rotation.set(0.85, 0.34, 0.08);
      rig.rightElbow.rotation.set(1.25 + Math.sin(t * 3.4) * 0.16, 0, 0);
      rig.leftArm.rotation.set(0.42, 0, -0.14);
      rig.leftElbow.rotation.set(0.72 + Math.cos(t * 3.4) * 0.14, 0, 0);
      break;
    }
    case 6: {
      // 6: Sneaky fridge / snack check glancing left & right
      rig.torso.rotation.x = 0.12;
      rig.head.rotation.y = Math.sin(t * 2.4) * 0.38;
      rig.rightArm.rotation.set(1.05, 0.24, 0.04);
      rig.rightElbow.rotation.set(1.22, 0, 0);
      rig.leftArm.rotation.set(0.55, -0.28, -0.04);
      rig.leftElbow.rotation.set(0.95, 0, 0);
      break;
    }
    case 7: {
      // 7: Holding cup casually while leaning and looking around water cooler
      rig.body.rotation.z = 0.03;
      rig.torso.rotation.z = -0.03;
      rig.rightArm.rotation.set(0.74, 0.26, 0.08);
      rig.rightElbow.rotation.set(1.08, 0, 0);
      rig.leftArm.rotation.set(-0.08, 0, -0.26);
      rig.leftElbow.rotation.set(0.95, 0, 0.3);
      rig.head.rotation.y = Math.sin(t * 1.2) * 0.25;
      break;
    }
    case 8: {
      // 8: Hearty double-cup/gulp finish & mouth wipe
      const wipe = Math.max(0, Math.sin(t * 2.1));
      rig.rightArm.rotation.set(0.88 + wipe * 0.42, 0.38, 0.05);
      rig.rightElbow.rotation.set(1.25 + wipe * 0.55, 0, 0);
      rig.leftArm.rotation.set(0.5 + wipe * 0.72, -0.35, -0.06);
      rig.leftElbow.rotation.set(0.8 + wipe * 0.85, 0, 0);
      rig.head.rotation.x = -0.14 * wipe;
      break;
    }
    default: {
      // 9: Shaking stuck vending coil / stirring coffee spoon
      const stir = t * 8.0;
      rig.torso.rotation.x = 0.08;
      rig.leftArm.rotation.set(0.75, -0.28, -0.05);
      rig.leftElbow.rotation.set(1.02, 0, 0);
      rig.rightArm.rotation.set(0.92 + Math.sin(stir) * 0.06, 0.36, 0.04);
      rig.rightElbow.rotation.set(1.18 + Math.cos(stir) * 0.08, 0, 0);
      rig.head.rotation.x = 0.14;
      break;
    }
  }
}

function applyPaperworkVariant(rig: CharacterRig, variant: number, t: number, actionLower: string) {
  const wideAwakeSleep = /durmiendo con los ojos abiertos/.test(actionLower);
  if (wideAwakeSleep) {
    // Signature Stanley/Creed rigid wide-eyed sleep micro-sway
    rig.leftEyelid.scale.y = 0.06;
    rig.rightEyelid.scale.y = 0.06;
    rig.torso.rotation.x = -0.06 + Math.sin(t * 0.9) * 0.03;
    rig.head.rotation.x = -0.1 + Math.sin(t * 0.9) * 0.05;
    rig.head.rotation.z = Math.cos(t * 0.7) * 0.06;
    rig.leftArm.rotation.set(0.72, -0.15, -0.06);
    rig.rightArm.rotation.set(0.72, 0.15, 0.06);
    rig.leftElbow.rotation.set(0.86, 0, 0);
    rig.rightElbow.rotation.set(0.86, 0, 0);
    return;
  }

  rig.actionProps.paper.visible = true;
  switch (variant) {
    case 0: {
      // 0: Crossword puzzle / paperwork pondering & pen tap on desk
      rig.torso.rotation.x = -0.11;
      rig.head.rotation.x = -0.14;
      rig.leftArm.rotation.set(0.76, -0.22, -0.05);
      rig.leftElbow.rotation.set(0.86, 0, 0);
      rig.rightArm.rotation.set(0.78, 0.24, 0.05);
      rig.rightElbow.rotation.set(0.9 + Math.sin(t * 5.2) * 0.09, 0, 0);
      break;
    }
    case 1: {
      // 1: Flipping pages / reports on desk
      const flip = Math.max(0, Math.sin(t * 2.5));
      rig.torso.rotation.x = -0.09;
      rig.head.rotation.x = -0.12;
      rig.leftArm.rotation.set(0.76, -0.2, -0.05);
      rig.leftElbow.rotation.set(0.88, 0, 0);
      rig.rightArm.rotation.set(0.76 + flip * 0.14, 0.22 - flip * 0.16, 0.05);
      rig.rightElbow.rotation.set(0.88, 0, 0);
      break;
    }
    case 2: {
      // 2: Filing drawer scan (reaching into desk folders)
      const pull = 0.5 + 0.5 * Math.sin(t * 1.9);
      rig.torso.rotation.x = -0.1;
      rig.leftArm.rotation.set(0.74, -0.18, -0.05);
      rig.leftElbow.rotation.set(0.86, 0, 0);
      rig.rightArm.rotation.set(0.88 + pull * 0.26, 0.08, 0.05);
      rig.rightElbow.rotation.set(0.7 - pull * 0.18, 0, 0);
      rig.head.rotation.x = -0.08;
      break;
    }
    case 3: {
      // 3: Stapling / punching stack of documents on desk
      const punch = Math.pow(Math.max(0, Math.sin(t * 3.6)), 3);
      rig.torso.rotation.x = -0.14;
      rig.leftArm.rotation.set(0.76, -0.22, -0.04);
      rig.leftElbow.rotation.set(0.88, 0, 0);
      rig.rightArm.rotation.set(0.82 - punch * 0.16, 0.24, 0.05);
      rig.rightElbow.rotation.set(0.88 + punch * 0.2, 0, 0);
      rig.head.rotation.x = -0.15 - punch * 0.04;
      break;
    }
    case 4: {
      // 4: Clipboard checklist tick & satisfied nod on desk
      rig.torso.rotation.x = -0.09;
      rig.head.rotation.x = -0.1 + Math.sin(t * 3.1) * 0.06;
      rig.leftArm.rotation.set(0.78, -0.2, -0.05);
      rig.leftElbow.rotation.set(0.9, 0, 0);
      rig.rightArm.rotation.set(0.78, 0.24, 0.05);
      rig.rightElbow.rotation.set(0.88 + Math.sin(t * 6.5) * 0.08, 0, 0);
      break;
    }
    case 5: {
      // 5: Squinting closely at fine legal print on desk
      rig.torso.rotation.x = -0.12;
      rig.head.rotation.x = -0.14;
      rig.head.rotation.z = 0.07;
      rig.leftArm.rotation.set(0.84, -0.22, -0.04);
      rig.leftElbow.rotation.set(1.02, 0, 0);
      rig.rightArm.rotation.set(0.78, 0.22, 0.05);
      rig.rightElbow.rotation.set(0.9, 0, 0);
      break;
    }
    case 6: {
      // 6: Existential HR / dread chin-stroke with left forearm on desk
      rig.torso.rotation.x = -0.11;
      rig.head.rotation.x = -0.1;
      rig.head.rotation.y = Math.sin(t * 0.9) * 0.14;
      rig.leftArm.rotation.set(0.74, -0.14, -0.05);
      rig.leftElbow.rotation.set(0.84, 0, 0);
      rig.rightArm.rotation.set(1.2, 0.42, 0.06);
      rig.rightElbow.rotation.set(1.8 + Math.sin(t * 2.2) * 0.04, 0, 0);
      break;
    }
    case 7: {
      // 7: Holding report aloft comparing numbers over desk
      rig.torso.rotation.x = -0.05;
      rig.leftArm.rotation.set(1.05, -0.18, -0.05);
      rig.leftElbow.rotation.set(1.0, 0, 0);
      rig.rightArm.rotation.set(0.78, 0.22, 0.06);
      rig.rightElbow.rotation.set(0.88, 0, 0);
      rig.head.rotation.y = Math.sin(t * 1.8) * 0.16;
      break;
    }
    case 8: {
      // 8: Nervous pen drumming against paperwork on desk
      rig.torso.rotation.x = -0.09;
      rig.leftArm.rotation.set(0.76, -0.2, -0.05);
      rig.leftElbow.rotation.set(0.88, 0, 0);
      rig.rightArm.rotation.set(0.78, 0.24, 0.05);
      rig.rightElbow.rotation.set(0.9 + Math.sin(t * 11) * 0.07, 0, 0);
      rig.head.rotation.x = -0.12;
      break;
    }
    default: {
      // 9: Tapping & squaring paper stack neatly on desk
      const tap = Math.abs(Math.sin(t * 4.5));
      rig.torso.rotation.x = -0.11;
      rig.leftArm.rotation.set(0.76 + tap * 0.06, -0.24, -0.04);
      rig.rightArm.rotation.set(0.76 + tap * 0.06, 0.24, 0.04);
      rig.leftElbow.rotation.set(0.88, 0, 0);
      rig.rightElbow.rotation.set(0.88, 0, 0);
      rig.head.rotation.x = -0.14;
      break;
    }
  }
}

function applyWarehouseVariant(rig: CharacterRig, variant: number, t: number, isMoving: boolean) {
  const carryBox = variant < 5 || variant === 8;
  rig.actionProps.box.visible = carryBox;
  if (!carryBox) rig.actionProps.paper.visible = variant === 5 || variant === 7;
  if (rig.propMesh) rig.propMesh.visible = false;

  if (carryBox) {
    // Arms wrap cleanly around Dunder Mifflin shipping box
    const heft = Math.sin(t * 2.4) * 0.05;
    rig.torso.rotation.x += -0.05;
    rig.leftArm.rotation.set(0.68 + heft, -0.22, -0.14);
    rig.rightArm.rotation.set(0.68 + heft, 0.22, 0.14);
    rig.leftElbow.rotation.set(1.15, 0, 0.08);
    rig.rightElbow.rotation.set(1.15, 0, -0.08);
  }

  switch (variant) {
    case 0: {
      // 0: Carrying paper ream box steadily
      rig.head.rotation.x += 0.06;
      break;
    }
    case 1: {
      // 1: Heavy squat lift & hoist
      if (!isMoving) {
        const lift = 0.5 + 0.5 * Math.sin(t * 1.8);
        rig.body.position.y = -lift * 0.16;
        rig.leftLeg.rotation.x = lift * 0.65;
        rig.rightLeg.rotation.x = lift * 0.65;
        rig.leftKnee.rotation.x = -lift * 0.95;
        rig.rightKnee.rotation.x = -lift * 0.95;
        rig.leftFoot.rotation.x = lift * 0.3;
        rig.rightFoot.rotation.x = lift * 0.3;
        rig.torso.rotation.x += lift * 0.25;
      }
      break;
    }
    case 2: {
      // 2: Adjusting grip & shifting box weight
      const shift = Math.sin(t * 2.1);
      rig.torso.rotation.z += shift * 0.06;
      rig.head.rotation.z = -shift * 0.05;
      break;
    }
    case 3: {
      // 3: Peeking over top of heavy box
      rig.head.rotation.x = -0.14;
      rig.head.rotation.y = Math.sin(t * 1.7) * 0.18;
      rig.torso.rotation.x += -0.08;
      break;
    }
    case 4: {
      // 4: Unboxing / prying cardboard flaps open
      const pry = Math.sin(t * 3.8);
      rig.torso.rotation.x = 0.16;
      rig.head.rotation.x = 0.26;
      rig.leftArm.rotation.set(0.85, -0.24, -0.08);
      rig.rightArm.rotation.set(0.85 + pry * 0.15, 0.24, 0.08);
      rig.leftElbow.rotation.set(1.05, 0, 0);
      rig.rightElbow.rotation.set(1.05 - pry * 0.2, 0, 0);
      break;
    }
    case 5: {
      // 5: Clipboard warehouse pallet count + pointing at racks
      rig.leftArm.rotation.set(0.84, -0.2, -0.05);
      rig.leftElbow.rotation.set(1.08, 0, 0);
      rig.rightArm.rotation.set(1.25 + Math.sin(t * 2.6) * 0.16, 0.1, 0.06);
      rig.rightElbow.rotation.set(0.28, 0, 0);
      rig.head.rotation.y = Math.sin(t * 2.0) * 0.22;
      break;
    }
    case 6: {
      // 6: Security patrol — hands behind back, scanning warehouse
      if (!isMoving) {
        rig.leftArm.rotation.set(-0.34, 0, -0.14);
        rig.rightArm.rotation.set(-0.34, 0, 0.14);
        rig.leftElbow.rotation.set(0.95, 0, -0.28);
        rig.rightElbow.rotation.set(0.95, 0, 0.28);
      }
      rig.torso.rotation.x = -0.04;
      rig.head.rotation.y = Math.sin(t * 1.6) * 0.36;
      break;
    }
    case 7: {
      // 7: Loading dock inventory check & clipboard nod
      rig.leftArm.rotation.set(0.88, -0.22, -0.05);
      rig.leftElbow.rotation.set(1.12, 0, 0);
      rig.rightArm.rotation.set(0.82, 0.3, 0.05);
      rig.rightElbow.rotation.set(1.08 + Math.sin(t * 6.0) * 0.1, 0, 0);
      rig.head.rotation.x = 0.16;
      break;
    }
    case 8: {
      // 8: Careful side-step bracing heavy stack
      if (!isMoving) {
        rig.body.rotation.z = Math.sin(t * 1.8) * 0.04;
      }
      rig.torso.rotation.x += 0.04;
      break;
    }
    default: {
      // 9: Lower-back stretch & wiping forehead sweat after lifting
      const wipe = Math.max(0, Math.sin(t * 2.0));
      rig.torso.rotation.x = -0.1;
      rig.leftArm.rotation.set(-0.2, 0, -0.22);
      rig.leftElbow.rotation.set(0.9, 0, 0.25);
      rig.rightArm.rotation.set(1.15 + wipe * 0.35, 0.44, 0.06);
      rig.rightElbow.rotation.set(1.65 + wipe * 0.28, 0, 0);
      rig.head.rotation.x = -0.08;
      break;
    }
  }
}

function applyMachinePrepVariant(rig: CharacterRig, variant: number, t: number) {
  switch (variant) {
    case 0: {
      // 0: Feeding paper stack into copier & pressing green start
      const press = 0.5 + 0.5 * Math.sin(t * 2.6);
      rig.actionProps.paper.visible = true;
      rig.torso.rotation.x = 0.1;
      rig.leftArm.rotation.set(0.86, -0.18, -0.06);
      rig.leftElbow.rotation.set(1.0, 0, 0);
      rig.rightArm.rotation.set(1.0 + press * 0.24, 0.08, 0.04);
      rig.rightElbow.rotation.set(0.5 - press * 0.22, 0, 0);
      rig.head.rotation.x = 0.14;
      break;
    }
    case 1: {
      // 1: Smacking jammed printer/copier side impatiently
      const slap = Math.pow(Math.max(0, Math.sin(t * 4.5)), 2);
      rig.torso.rotation.x = 0.14;
      rig.leftArm.rotation.set(-0.1, 0, -0.26);
      rig.leftElbow.rotation.set(0.92, 0, 0.28);
      rig.rightArm.rotation.set(0.95 + slap * 0.36, 0.12, 0.12);
      rig.rightElbow.rotation.set(0.65 - slap * 0.3, 0, 0);
      rig.head.rotation.y = Math.sin(t * 3.0) * 0.12;
      break;
    }
    case 2: {
      // 2: Waiting for copies — arms folded, foot-tap impatience
      rig.leftArm.rotation.set(0.62, -0.34, -0.05);
      rig.rightArm.rotation.set(0.62, 0.34, 0.05);
      rig.leftElbow.rotation.set(1.18, 0, 0.12);
      rig.rightElbow.rotation.set(1.18, 0, -0.12);
      rig.rightFoot.rotation.x = Math.max(0, Math.sin(t * 7.5)) * 0.26;
      rig.head.rotation.x = 0.08;
      break;
    }
    case 3: {
      // 3: Hanging party banner / balloons overhead
      const reach = Math.sin(t * 2.8) * 0.14;
      rig.torso.rotation.x = -0.06;
      rig.head.rotation.x = -0.22;
      rig.leftArm.rotation.set(2.1 + reach, -0.12, -0.12);
      rig.rightArm.rotation.set(2.1 - reach, 0.12, 0.12);
      rig.leftElbow.rotation.set(0.45, 0, 0);
      rig.rightElbow.rotation.set(0.45, 0, 0);
      break;
    }
    case 4: {
      // 4: Party committee clipboard inspection & stern pointing (Angela)
      rig.actionProps.paper.visible = true;
      rig.leftArm.rotation.set(0.88, -0.22, -0.05);
      rig.leftElbow.rotation.set(1.12, 0, 0);
      rig.rightArm.rotation.set(1.36 + Math.sin(t * 3.6) * 0.12, 0.08, 0.05);
      rig.rightElbow.rotation.set(0.24, 0, 0);
      rig.head.rotation.z = -0.06;
      break;
    }
    case 5: {
      // 5: Sneaky prank setup crouching & peeking over shoulder (Jim)
      rig.body.position.y = -0.1;
      rig.leftLeg.rotation.x = 0.36;
      rig.rightLeg.rotation.x = 0.36;
      rig.leftKnee.rotation.x = -0.62;
      rig.rightKnee.rotation.x = -0.62;
      rig.leftFoot.rotation.x = 0.26;
      rig.rightFoot.rotation.x = 0.26;
      rig.torso.rotation.x = 0.26;
      rig.leftArm.rotation.set(0.88, -0.22, -0.06);
      rig.rightArm.rotation.set(0.88 + Math.sin(t * 6.0) * 0.1, 0.22, 0.06);
      rig.leftElbow.rotation.set(0.92, 0, 0);
      rig.rightElbow.rotation.set(0.92, 0, 0);
      rig.head.rotation.y = Math.sin(t * 2.2) * 0.42;
      break;
    }
    case 6: {
      // 6: Collating & fanning fresh warm paper sheets
      rig.actionProps.paper.visible = true;
      const fan = Math.sin(t * 5.5) * 0.16;
      rig.leftArm.rotation.set(0.82, -0.24, -0.05);
      rig.leftElbow.rotation.set(1.05 + fan, 0, 0);
      rig.rightArm.rotation.set(0.82, 0.24, 0.05);
      rig.rightElbow.rotation.set(1.05 - fan, 0, 0);
      rig.head.rotation.x = 0.16;
      break;
    }
    case 7: {
      // 7: Arranging gift / teapot / party centerpiece carefully
      rig.torso.rotation.x = 0.14;
      rig.head.rotation.x = 0.2;
      rig.leftArm.rotation.set(0.76, -0.2, -0.08);
      rig.rightArm.rotation.set(0.76, 0.2, 0.08);
      rig.leftElbow.rotation.set(0.88 + Math.sin(t * 3.2) * 0.12, 0, 0);
      rig.rightElbow.rotation.set(0.88 + Math.cos(t * 3.2) * 0.12, 0, 0);
      break;
    }
    case 8: {
      // 8: Writing whiteboard / pizarra markers (Michael/Dwight)
      rig.torso.rotation.x = 0.05;
      rig.leftArm.rotation.set(0.32, 0, -0.08);
      rig.leftElbow.rotation.set(0.45, 0, 0);
      rig.rightArm.rotation.set(1.38 + Math.sin(t * 5.0) * 0.12, 0.14, 0.08);
      rig.rightElbow.rotation.set(0.72 + Math.cos(t * 6.5) * 0.22, 0, 0);
      rig.head.rotation.x = -0.06;
      break;
    }
    default: {
      // 9: Ice pack on knuckles / wrapping tape
      rig.torso.rotation.x = 0.08;
      rig.leftArm.rotation.set(0.82, -0.28, -0.06);
      rig.rightArm.rotation.set(0.92, 0.34, 0.06);
      rig.leftElbow.rotation.set(1.12, 0, 0);
      rig.rightElbow.rotation.set(1.24 + Math.sin(t * 4.0) * 0.12, 0, 0);
      rig.head.rotation.x = 0.22;
      break;
    }
  }
}

function applySocialVariant(rig: CharacterRig, variant: number, t: number, actionLower: string) {
  const isPingPong = /ping-pong/.test(actionLower);
  const isNap = /siesta/.test(actionLower);
  const isBreath = /respirando|aire/.test(actionLower);

  if (isPingPong) {
    rig.actionProps.paddle.visible = true;
    if (rig.propMesh) rig.propMesh.visible = false;
    // Athletic ready crouch + alternating forehand/backhand strokes across variants 0..9
    const swing = Math.sin(t * 4.8 + variant * 0.7);
    const crouch = 0.1 + (variant % 3) * 0.03;
    rig.body.position.y = -crouch;
    rig.leftLeg.rotation.x = 0.28;
    rig.rightLeg.rotation.x = 0.28;
    rig.leftKnee.rotation.x = -0.52;
    rig.rightKnee.rotation.x = -0.52;
    rig.leftFoot.rotation.x = 0.24;
    rig.rightFoot.rotation.x = 0.24;
    rig.torso.rotation.x = 0.22;
    rig.torso.rotation.y = swing * 0.35;
    rig.rightArm.rotation.set(0.85 + swing * 0.45, 0.18 + swing * 0.42, 0.18);
    rig.rightElbow.rotation.set(0.92 + Math.cos(t * 4.8) * 0.25, 0, 0);
    rig.leftArm.rotation.set(0.65, -0.2, -0.18);
    rig.leftElbow.rotation.set(0.95, 0, 0);
    rig.head.rotation.x = -0.06;
    rig.head.rotation.y = -swing * 0.15;
    return;
  }

  if (isNap) {
    rig.body.position.y = -0.22;
    rig.leftLeg.rotation.x = 1.15;
    rig.rightLeg.rotation.x = 1.15;
    rig.leftKnee.rotation.x = -1.1;
    rig.rightKnee.rotation.x = -1.1;
    rig.torso.rotation.x = -0.18;
    rig.head.rotation.x = 0.28 + Math.sin(t * 0.9) * 0.04;
    rig.leftEyelid.scale.y = 0.95;
    rig.rightEyelid.scale.y = 0.95;
    rig.leftArm.rotation.set(0.5, -0.22, -0.06);
    rig.rightArm.rotation.set(0.5, 0.22, 0.06);
    rig.leftElbow.rotation.set(0.95, 0, 0);
    rig.rightElbow.rotation.set(0.95, 0, 0);
    return;
  }

  if (isBreath) {
    const inhale = 0.5 + 0.5 * Math.sin(t * 1.4);
    rig.torso.rotation.x = -0.06 * inhale;
    rig.body.position.y = inhale * 0.014;
    rig.leftArm.rotation.set(0.28 + inhale * 0.36, 0, -0.15 - inhale * 0.12);
    rig.rightArm.rotation.set(0.28 + inhale * 0.36, 0, 0.15 + inhale * 0.12);
    rig.leftElbow.rotation.set(0.55 + inhale * 0.25, 0, 0);
    rig.rightElbow.rotation.set(0.55 + inhale * 0.25, 0, 0);
    rig.head.rotation.x = -0.08 * inhale;
    return;
  }

  switch (variant) {
    case 0: {
      // 0: Animated two-hand office storytelling
      rig.leftArm.rotation.set(0.42 + Math.cos(t * 3.8) * 0.24, -0.14, -0.08);
      rig.leftElbow.rotation.set(0.68 + Math.sin(t * 3.8) * 0.2, 0, 0);
      rig.rightArm.rotation.set(0.68 + Math.sin(t * 4.8) * 0.3, 0.16, 0.08);
      rig.rightElbow.rotation.set(0.75 + Math.cos(t * 4.8) * 0.22, 0, 0);
      rig.head.rotation.x = Math.sin(t * 3.4) * 0.06;
      break;
    }
    case 1: {
      // 1: Finger guns & playful smirk lean (Michael/Jim)
      const aim = 0.5 + 0.5 * Math.sin(t * 3.0);
      rig.torso.rotation.x = -0.05;
      rig.torso.rotation.y = Math.sin(t * 1.5) * 0.1;
      rig.leftArm.rotation.set(0.9 + aim * 0.35, -0.12, -0.1);
      rig.rightArm.rotation.set(0.95 + (1 - aim) * 0.35, 0.12, 0.1);
      rig.leftElbow.rotation.set(0.45, 0, 0);
      rig.rightElbow.rotation.set(0.45, 0, 0);
      rig.head.rotation.z = 0.08;
      break;
    }
    case 2: {
      // 2: Attentive listening with arms loosely crossed & nodding
      rig.leftArm.rotation.set(0.58, -0.36, -0.06);
      rig.rightArm.rotation.set(0.58, 0.36, 0.06);
      rig.leftElbow.rotation.set(1.16, 0, 0.14);
      rig.rightElbow.rotation.set(1.16, 0, -0.14);
      rig.head.rotation.x = 0.06 + Math.sin(t * 3.2) * 0.08;
      break;
    }
    case 3: {
      // 3: Whispered office gossip huddle (leaning in + cupped mouth)
      rig.torso.rotation.x = 0.2;
      rig.head.rotation.y = Math.sin(t * 1.8) * 0.16;
      rig.leftArm.rotation.set(1.22, -0.52, -0.08);
      rig.leftElbow.rotation.set(1.78, 0, 0);
      rig.rightArm.rotation.set(0.32, 0.14, 0.1);
      rig.rightElbow.rotation.set(0.55, 0, 0);
      break;
    }
    case 4: {
      // 4: Triumphant Dundie / big celebration fist pumps
      const cheer = Math.abs(Math.sin(t * 4.5));
      rig.torso.rotation.x = -0.08;
      rig.leftArm.rotation.set(1.5 + cheer * 0.85, -0.12, -0.2);
      rig.rightArm.rotation.set(1.5 + cheer * 0.85, 0.12, 0.2);
      rig.leftElbow.rotation.set(0.65 - cheer * 0.25, 0, 0);
      rig.rightElbow.rotation.set(0.65 - cheer * 0.25, 0, 0);
      rig.head.rotation.x = -0.14;
      break;
    }
    case 5: {
      // 5: Big hearty laugh (head tilted back + hand on belly)
      const laugh = Math.sin(t * 9.0) * 0.06;
      rig.torso.rotation.x = -0.12 + laugh;
      rig.head.rotation.x = -0.2 + laugh;
      rig.leftArm.rotation.set(0.55, -0.3, -0.05);
      rig.leftElbow.rotation.set(1.1, 0, 0);
      rig.rightArm.rotation.set(0.28, 0.1, 0.14);
      rig.rightElbow.rotation.set(0.48, 0, 0);
      break;
    }
    case 6: {
      // 6: Shrugging palms out ("¡Qué le vamos a hacer!")
      const shrug = 0.5 + 0.5 * Math.sin(t * 2.4);
      rig.leftArm.rotation.set(0.45 + shrug * 0.25, -0.1, -0.22 - shrug * 0.14);
      rig.rightArm.rotation.set(0.45 + shrug * 0.25, 0.1, 0.22 + shrug * 0.14);
      rig.leftElbow.rotation.set(0.85, 0, -0.18);
      rig.rightElbow.rotation.set(0.85, 0, 0.18);
      rig.head.rotation.z = 0.12 * shrug;
      break;
    }
    case 7: {
      // 7: Awkward hug / embrace reach
      rig.torso.rotation.x = 0.08;
      rig.leftArm.rotation.set(1.12, -0.24, -0.16);
      rig.rightArm.rotation.set(1.12, 0.24, 0.16);
      rig.leftElbow.rotation.set(0.75 + Math.sin(t * 2.2) * 0.12, 0, 0);
      rig.rightElbow.rotation.set(0.75 + Math.sin(t * 2.2) * 0.12, 0, 0);
      rig.head.rotation.z = -0.1;
      break;
    }
    case 8: {
      // 8: Dodging / throwing paper airplane flick
      const throwCycle = Math.sin(t * 3.4);
      rig.torso.rotation.y = throwCycle * 0.24;
      rig.rightArm.rotation.set(1.35 + throwCycle * 0.65, 0.14, 0.12);
      rig.rightElbow.rotation.set(0.75 - throwCycle * 0.45, 0, 0);
      rig.leftArm.rotation.set(0.42, -0.12, -0.16);
      rig.leftElbow.rotation.set(0.65, 0, 0);
      break;
    }
    default: {
      // 9: Polite applause / a cappella singing rhythm
      const c = Math.abs(Math.sin(t * 7.5));
      rig.leftArm.rotation.set(0.82, -0.25, -0.04);
      rig.rightArm.rotation.set(0.82, 0.25, 0.04);
      rig.leftElbow.rotation.set(0.85, 0, 0.18 + c * 0.22);
      rig.rightElbow.rotation.set(0.85, 0, -0.18 - c * 0.22);
      rig.head.rotation.y = Math.sin(t * 2.2) * 0.1;
      break;
    }
  }
}

function applyIdleVariant(rig: CharacterRig, variant: number, t: number) {
  switch (variant) {
    case 0: {
      // 0: Natural subtle weight shift & breathing
      rig.body.rotation.z = Math.sin(t * 0.8) * 0.02;
      rig.leftArm.rotation.set(0.08 + Math.sin(t) * 0.03, 0, -0.05);
      rig.rightArm.rotation.set(0.08 - Math.sin(t) * 0.03, 0, 0.05);
      rig.leftElbow.rotation.set(0.24, 0, 0);
      rig.rightElbow.rotation.set(rig.propMesh ? 0.82 : 0.24, 0, 0);
      rig.head.rotation.y = Math.sin(t * 0.6) * 0.08;
      break;
    }
    case 1: {
      // 1: Glancing at wristwatch
      const look = 0.5 + 0.5 * Math.sin(t * 1.4);
      rig.leftArm.rotation.set(0.65 + look * 0.25, -0.45, -0.05);
      rig.leftElbow.rotation.set(1.15 + look * 0.2, 0, 0);
      rig.rightArm.rotation.set(0.1, 0, 0.05);
      rig.rightElbow.rotation.set(0.25, 0, 0);
      rig.head.rotation.x = 0.18 * look;
      rig.head.rotation.y = 0.24 * look;
      break;
    }
    case 2: {
      // 2: Arms lightly folded standing confident
      rig.leftArm.rotation.set(0.55, -0.34, -0.06);
      rig.rightArm.rotation.set(0.55, 0.34, 0.06);
      rig.leftElbow.rotation.set(1.15, 0, 0.14);
      rig.rightElbow.rotation.set(1.15, 0, -0.14);
      rig.head.rotation.y = Math.sin(t * 0.7) * 0.12;
      break;
    }
    case 3: {
      // 3: Hands on hips surveying office
      rig.leftArm.rotation.set(-0.14, 0, -0.32);
      rig.rightArm.rotation.set(-0.14, 0, 0.32);
      rig.leftElbow.rotation.set(1.02, 0, 0.34);
      rig.rightElbow.rotation.set(1.02, 0, -0.34);
      rig.head.rotation.y = Math.sin(t * 0.9) * 0.22;
      break;
    }
    case 4: {
      // 4: Adjusting necktie / shirt collar neatly
      const fix = Math.sin(t * 3.0) * 0.08;
      rig.rightArm.rotation.set(0.88, 0.42, 0.05);
      rig.rightElbow.rotation.set(1.28 + fix, 0, 0);
      rig.leftArm.rotation.set(0.2, 0, -0.06);
      rig.leftElbow.rotation.set(0.35, 0, 0);
      rig.head.rotation.x = -0.06;
      break;
    }
    case 5: {
      // 5: Heel bounce & hands behind back
      rig.body.position.y += Math.abs(Math.sin(t * 2.2)) * 0.02;
      rig.leftArm.rotation.set(-0.28, 0, -0.14);
      rig.rightArm.rotation.set(-0.28, 0, 0.14);
      rig.leftElbow.rotation.set(0.85, 0, -0.24);
      rig.rightElbow.rotation.set(0.85, 0, 0.24);
      break;
    }
    case 6: {
      // 6: Thoughtful chin scratch
      rig.leftArm.rotation.set(0.32, -0.15, -0.06);
      rig.leftElbow.rotation.set(0.65, 0, 0);
      rig.rightArm.rotation.set(1.18, 0.44, 0.05);
      rig.rightElbow.rotation.set(1.8 + Math.sin(t * 2.4) * 0.05, 0, 0);
      rig.head.rotation.z = -0.08;
      break;
    }
    case 7: {
      // 7: Rolling neck & relaxing shoulders
      rig.head.rotation.z = Math.sin(t * 1.4) * 0.14;
      rig.head.rotation.x = Math.cos(t * 1.4) * 0.1;
      rig.leftArm.rotation.set(0.08, 0, -0.08);
      rig.rightArm.rotation.set(0.08, 0, 0.08);
      rig.leftElbow.rotation.set(0.28, 0, 0);
      rig.rightElbow.rotation.set(0.28, 0, 0);
      break;
    }
    case 8: {
      // 8: Subtle friendly wave / acknowledgment
      const w = Math.sin(t * 4.5);
      rig.leftArm.rotation.set(0.08, 0, -0.06);
      rig.leftElbow.rotation.set(0.25, 0, 0);
      rig.rightArm.rotation.set(1.55, 0.15, 0.18 + w * 0.1);
      rig.rightElbow.rotation.set(0.95 + w * 0.2, 0, 0);
      break;
    }
    default: {
      // 9: Pocket pat / checking keys or phone
      rig.torso.rotation.z = Math.sin(t * 1.6) * 0.03;
      rig.leftArm.rotation.set(0.18, 0, -0.14);
      rig.rightArm.rotation.set(0.18 + Math.abs(Math.sin(t * 2.6)) * 0.16, 0, 0.14);
      rig.leftElbow.rotation.set(0.42, 0, 0);
      rig.rightElbow.rotation.set(0.55, 0, 0);
      rig.head.rotation.x = 0.12;
      break;
    }
  }
}

function applyLocomotion(
  rig: CharacterRig,
  walkT: number,
  running: boolean,
  handRaised: boolean,
  category: ActionAnimCategory,
  variant: number,
  idlePhase: number,
) {
  const s = Math.sin(walkT);
  const c = Math.cos(walkT);

  if (running) {
    // Athletic sprint biomechanics: strong forward lean, counter-rotating hips/torso, deep knee recovery, ankle push-off
    rig.body.position.y = Math.abs(s) * 0.062;
    rig.body.rotation.y = -s * 0.15;
    rig.body.rotation.z = c * 0.055;

    rig.torso.rotation.x = -0.22;
    rig.torso.rotation.y = s * 0.25;
    rig.torso.rotation.z = -c * 0.04;

    rig.leftLeg.rotation.set(s * 0.9, 0, -0.03);
    rig.rightLeg.rotation.set(-s * 0.9, 0, 0.03);

    const leftSwing = Math.max(0, -c) * 1.18 + Math.max(0, -s) * 0.28;
    const rightSwing = Math.max(0, c) * 1.18 + Math.max(0, s) * 0.28;
    rig.leftKnee.rotation.x = -0.12 - leftSwing;
    rig.rightKnee.rotation.x = -0.12 - rightSwing;

    // Dorsiflex on heel-strike (+), plantarflex push-off (-)
    rig.leftFoot.rotation.x = s > 0 ? s * 0.34 : s * 0.48;
    rig.rightFoot.rotation.x = -s > 0 ? -s * 0.34 : -s * 0.48;

    rig.leftArm.rotation.set(-s * 0.86 + 0.12, -0.14, -0.12);
    rig.leftElbow.rotation.set(1.38 + Math.max(0, -s) * 0.35, 0, 0.08);
    if (handRaised) {
      rig.rightArm.rotation.set(2.35, 0, 0.1);
      rig.rightElbow.rotation.set(0.35, 0, 0);
    } else {
      rig.rightArm.rotation.set(s * 0.86 + 0.12, 0.14, 0.12);
      rig.rightElbow.rotation.set(1.38 + Math.max(0, s) * 0.35, 0, -0.08);
    }

    rig.head.rotation.x = 0.08 + Math.sin(walkT * 2) * 0.03;
    rig.head.rotation.y = -s * 0.08;
  } else {
    // Natural human walk cycle: double-bounce COM, pelvic drop/yaw, spine counter-twist, curved knee flexion, heel-to-toe ankle roll
    rig.body.position.y = (1 - Math.abs(s)) * 0.026;
    rig.body.rotation.y = -s * 0.085;
    rig.body.rotation.z = c * 0.04;

    rig.torso.rotation.x = -0.05;
    rig.torso.rotation.y = s * 0.14;
    rig.torso.rotation.z = -c * 0.028;

    rig.leftLeg.rotation.set(s * 0.54, 0, -0.022);
    rig.rightLeg.rotation.set(-s * 0.54, 0, 0.022);

    const leftFlex = Math.max(0, -c) * 0.68 + Math.max(0, -s) * 0.12;
    const rightFlex = Math.max(0, c) * 0.68 + Math.max(0, s) * 0.12;
    rig.leftKnee.rotation.x = -0.05 - leftFlex;
    rig.rightKnee.rotation.x = -0.05 - rightFlex;

    rig.leftFoot.rotation.x = s > 0.1 ? s * 0.24 : s * 0.34;
    rig.rightFoot.rotation.x = -s > 0.1 ? -s * 0.24 : -s * 0.34;

    rig.leftArm.rotation.set(-s * 0.44, -0.06, -0.07);
    rig.leftElbow.rotation.set(0.22 + Math.max(0, -s) * 0.36, 0, 0.04);
    if (handRaised) {
      rig.rightArm.rotation.set(2.35, 0, 0.1);
      rig.rightElbow.rotation.set(0.35, 0, 0);
    } else {
      rig.rightArm.rotation.set(s * 0.44, 0.06, 0.07);
      rig.rightElbow.rotation.set(0.22 + Math.max(0, s) * 0.36, 0, -0.04);
    }

    rig.head.rotation.x = -0.02 + Math.sin(walkT * 2) * 0.015;
    rig.head.rotation.y = -s * 0.045;
  }

  // Layer carried phone or box cleanly onto upper body while walking/running!
  if (!handRaised && category === "call") {
    applyCallVariant(rig, variant, idlePhase, false, true);
  } else if (!handRaised && category === "warehouse" && (variant < 5 || variant === 8)) {
    applyWarehouseVariant(rig, variant, idlePhase, true);
  }
}

function capturePose(rig: CharacterRig, out: RigPoseSnapshot) {
  out.bodyPos.x = rig.body.position.x;
  out.bodyPos.y = rig.body.position.y;
  out.bodyPos.z = rig.body.position.z;
  out.bodyRot.x = rig.body.rotation.x;
  out.bodyRot.y = rig.body.rotation.y;
  out.bodyRot.z = rig.body.rotation.z;
  out.torsoRot.x = rig.torso.rotation.x;
  out.torsoRot.y = rig.torso.rotation.y;
  out.torsoRot.z = rig.torso.rotation.z;
  out.headRot.x = rig.head.rotation.x;
  out.headRot.y = rig.head.rotation.y;
  out.headRot.z = rig.head.rotation.z;
  out.leftArmRot.x = rig.leftArm.rotation.x;
  out.leftArmRot.y = rig.leftArm.rotation.y;
  out.leftArmRot.z = rig.leftArm.rotation.z;
  out.rightArmRot.x = rig.rightArm.rotation.x;
  out.rightArmRot.y = rig.rightArm.rotation.y;
  out.rightArmRot.z = rig.rightArm.rotation.z;
  out.leftElbowRot.x = rig.leftElbow.rotation.x;
  out.leftElbowRot.y = rig.leftElbow.rotation.y;
  out.leftElbowRot.z = rig.leftElbow.rotation.z;
  out.rightElbowRot.x = rig.rightElbow.rotation.x;
  out.rightElbowRot.y = rig.rightElbow.rotation.y;
  out.rightElbowRot.z = rig.rightElbow.rotation.z;
  out.leftLegRot.x = rig.leftLeg.rotation.x;
  out.leftLegRot.y = rig.leftLeg.rotation.y;
  out.leftLegRot.z = rig.leftLeg.rotation.z;
  out.rightLegRot.x = rig.rightLeg.rotation.x;
  out.rightLegRot.y = rig.rightLeg.rotation.y;
  out.rightLegRot.z = rig.rightLeg.rotation.z;
  out.leftKneeRot.x = rig.leftKnee.rotation.x;
  out.leftKneeRot.y = rig.leftKnee.rotation.y;
  out.leftKneeRot.z = rig.leftKnee.rotation.z;
  out.rightKneeRot.x = rig.rightKnee.rotation.x;
  out.rightKneeRot.y = rig.rightKnee.rotation.y;
  out.rightKneeRot.z = rig.rightKnee.rotation.z;
  out.leftFootRot.x = rig.leftFoot.rotation.x;
  out.leftFootRot.y = rig.leftFoot.rotation.y;
  out.leftFootRot.z = rig.leftFoot.rotation.z;
  out.rightFootRot.x = rig.rightFoot.rotation.x;
  out.rightFootRot.y = rig.rightFoot.rotation.y;
  out.rightFootRot.z = rig.rightFoot.rotation.z;
  if (rig.skirt) {
    out.skirtPos.x = rig.skirt.position.x;
    out.skirtPos.y = rig.skirt.position.y;
    out.skirtPos.z = rig.skirt.position.z;
    out.skirtRotX = rig.skirt.rotation.x;
    out.skirtScaleY = rig.skirt.scale.y;
  }
}

function blendVec3(prev: Vec3State, target: THREE.Vector3 | THREE.Euler, a: number) {
  target.x = prev.x + (target.x - prev.x) * a;
  target.y = prev.y + (target.y - prev.y) * a;
  target.z = prev.z + (target.z - prev.z) * a;
}

function blendRigFromPrev(rig: CharacterRig, alpha: number) {
  const p = rig.prevPose;
  blendVec3(p.bodyPos, rig.body.position, alpha);
  blendVec3(p.bodyRot, rig.body.rotation, alpha);
  blendVec3(p.torsoRot, rig.torso.rotation, alpha);
  blendVec3(p.headRot, rig.head.rotation, alpha);
  blendVec3(p.leftArmRot, rig.leftArm.rotation, alpha);
  blendVec3(p.rightArmRot, rig.rightArm.rotation, alpha);
  blendVec3(p.leftElbowRot, rig.leftElbow.rotation, alpha);
  blendVec3(p.rightElbowRot, rig.rightElbow.rotation, alpha);
  blendVec3(p.leftLegRot, rig.leftLeg.rotation, alpha);
  blendVec3(p.rightLegRot, rig.rightLeg.rotation, alpha);
  blendVec3(p.leftKneeRot, rig.leftKnee.rotation, alpha);
  blendVec3(p.rightKneeRot, rig.rightKnee.rotation, alpha);
  blendVec3(p.leftFootRot, rig.leftFoot.rotation, alpha);
  blendVec3(p.rightFootRot, rig.rightFoot.rotation, alpha);
  if (rig.skirt) {
    blendVec3(p.skirtPos, rig.skirt.position, alpha);
    rig.skirt.rotation.x = p.skirtRotX + (rig.skirt.rotation.x - p.skirtRotX) * alpha;
    rig.skirt.scale.y = p.skirtScaleY + (rig.skirt.scale.y - p.skirtScaleY) * alpha;
  }
}

export function animateCharacterRig(rig: CharacterRig, opts: RigAnimOpts) {
  const {
    moving,
    running,
    walkT,
    handRaised,
    idlePhase,
    seated,
    deskSeated,
    gesture,
    lookYaw,
    actionText,
    actionVariant,
    onCall,
    dt,
  } = opts;

  const canBlend = dt !== undefined && dt > 0 && rig.animInitialized;
  if (canBlend) {
    capturePose(rig, rig.prevPose);
  }

  rig.body.position.set(0, 0, 0);
  rig.body.rotation.set(0, 0, 0);
  rig.torso.rotation.set(0, 0, 0);
  rig.head.rotation.set(0, 0, 0);
  rig.leftArm.rotation.set(0, 0, 0);
  rig.rightArm.rotation.set(0, 0, 0);
  rig.leftElbow.rotation.set(0, 0, 0);
  rig.rightElbow.rotation.set(0, 0, 0);
  rig.leftLeg.rotation.set(0, 0, 0);
  rig.rightLeg.rotation.set(0, 0, 0);
  rig.leftKnee.rotation.set(0, 0, 0);
  rig.rightKnee.rotation.set(0, 0, 0);
  rig.leftFoot.rotation.set(0, 0, 0);
  rig.rightFoot.rotation.set(0, 0, 0);

  // Reset dynamic action props cleanly before selecting active action
  rig.actionProps.phone.visible = false;
  rig.actionProps.cup.visible = false;
  rig.actionProps.paper.visible = false;
  rig.actionProps.box.visible = false;
  rig.actionProps.paddle.visible = false;

  // Subtle natural eye blinking on staggered periodic clock
  const blinkMod = (idlePhase * 0.9) % 4.3;
  const blinkClose = blinkMod > 4.14 ? Math.sin(((blinkMod - 4.14) / 0.16) * Math.PI) : 0;
  const lidScaleY = 0.08 + Math.max(0, blinkClose) * 1.02;
  rig.leftEyelid.scale.y = lidScaleY;
  rig.rightEyelid.scale.y = lidScaleY;

  const g: MeetingGesture = handRaised ? "raise_hand" : (gesture ?? "none");
  const isSeatedPose = Boolean(seated || deskSeated);
  const category = classifyActionCategory(actionText ?? "", {
    onCall,
    deskSeated,
    seated,
  });
  const variant = wrapVariant(actionVariant);
  const actionLower = (actionText ?? "").toLowerCase();

  if (rig.propMesh) {
    rig.propMesh.visible =
      !moving &&
      category !== "call" &&
      category !== "warehouse" &&
      g !== "clap" &&
      g !== "facepalm" &&
      g !== "raise_hand" &&
      g !== "point";
  }

  if (rig.skirt) {
    if (isSeatedPose) {
      rig.skirt.position.set(0, 0.62, -0.15);
      rig.skirt.rotation.x = 1.15;
      rig.skirt.scale.set(1.05, 0.72, 1);
    } else {
      rig.skirt.position.set(0, 0.69, 0);
      rig.skirt.rotation.x = 0;
      rig.skirt.scale.set(1, 1, 1);
    }
  }

  if (moving) {
    applyLocomotion(rig, walkT, Boolean(running), handRaised, category, variant, idlePhase);
    if (lookYaw !== undefined) {
      rig.head.rotation.y = clamp(lookYaw, -0.75, 0.75);
    }
  } else if (isSeatedPose) {
    // Sit flush ON top of the seat cushion (y = 0.45m) and cleanly clear of the backrest (+0.20m)
    rig.body.position.y = -0.21;
    rig.body.position.z = -0.04;
    rig.leftLeg.rotation.x = 1.44;
    rig.rightLeg.rotation.x = 1.44;
    rig.leftKnee.rotation.x = -1.44;
    rig.rightKnee.rotation.x = -1.44;

    if (seated || g !== "none") {
      if (g === "raise_hand") {
        rig.leftArm.rotation.x = 0.62;
        rig.leftElbow.rotation.x = 0.72;
        rig.rightArm.rotation.set(2.42 + Math.sin(idlePhase * 3.2) * 0.08, 0, -0.12);
        rig.rightElbow.rotation.x = 0.45;
        rig.head.rotation.x = 0.05;
      } else if (g === "talk") {
        rig.torso.rotation.x = -0.07;
        rig.leftArm.rotation.x = 0.72 + Math.cos(idlePhase * 4.4) * 0.18;
        rig.leftElbow.rotation.x = 0.78 + Math.sin(idlePhase * 4.0) * 0.16;
        rig.rightArm.rotation.x = 0.84 + Math.sin(idlePhase * 5.2) * 0.24;
        rig.rightElbow.rotation.x = 0.82 + Math.cos(idlePhase * 5.2) * 0.2;
        rig.head.rotation.x = Math.sin(idlePhase * 4.0) * 0.06;
      } else if (g === "point") {
        rig.torso.rotation.x = -0.09;
        rig.leftArm.rotation.x = 0.66;
        rig.leftElbow.rotation.x = 0.72;
        rig.rightArm.rotation.x = 1.42 + Math.sin(idlePhase * 4.0) * 0.12;
        rig.rightElbow.rotation.x = 0.22;
      } else if (g === "clap") {
        const c = Math.abs(Math.sin(idlePhase * 9.0));
        rig.torso.rotation.x = -0.06;
        rig.leftArm.rotation.set(0.85, 0, -0.3 - c * 0.24);
        rig.rightArm.rotation.set(0.85, 0, 0.3 + c * 0.24);
        rig.leftElbow.rotation.x = 0.85;
        rig.rightElbow.rotation.x = 0.85;
      } else if (g === "note") {
        rig.actionProps.paper.visible = true;
        rig.torso.rotation.x = -0.1;
        rig.leftArm.rotation.x = 0.76;
        rig.rightArm.rotation.x = 0.8 + Math.sin(idlePhase * 8.0) * 0.08;
        rig.leftElbow.rotation.x = 0.86;
        rig.rightElbow.rotation.x = 0.9 + Math.cos(idlePhase * 8.0) * 0.1;
        rig.head.rotation.x = -0.14;
      } else if (g === "facepalm") {
        rig.torso.rotation.x = -0.1;
        rig.leftArm.rotation.x = 0.66;
        rig.leftElbow.rotation.x = 0.74;
        rig.rightArm.rotation.set(1.48, 0, 0.22);
        rig.rightElbow.rotation.x = 1.45;
        rig.head.rotation.x = -0.16;
        rig.head.rotation.y = Math.sin(idlePhase * 2.6) * 0.12;
      } else if (g === "nod") {
        rig.leftArm.rotation.x = 0.66;
        rig.rightArm.rotation.x = 0.66;
        rig.leftElbow.rotation.x = 0.76;
        rig.rightElbow.rotation.x = 0.76;
        rig.head.rotation.x = -0.08 + Math.sin(idlePhase * 5.2) * 0.14;
      } else {
        rig.leftArm.rotation.x = 0.66 + Math.sin(idlePhase * 0.9) * 0.02;
        rig.rightArm.rotation.x = 0.66 - Math.sin(idlePhase * 0.9) * 0.02;
        rig.leftElbow.rotation.x = 0.76;
        rig.rightElbow.rotation.x = 0.76;
        rig.head.rotation.y = Math.sin(idlePhase * 0.55) * 0.06;
      }
      if (lookYaw !== undefined && g !== "facepalm") {
        rig.head.rotation.y = clamp(lookYaw, -0.85, 0.85);
      }
    } else {
      // Desk-seated work/call/paperwork/drink animations
      if (category === "call") {
        applyCallVariant(rig, variant, idlePhase, true, false);
      } else if (category === "paperwork") {
        applyPaperworkVariant(rig, variant, idlePhase, actionLower);
      } else if (category === "drink_eat") {
        applyDrinkEatVariant(rig, variant, idlePhase, actionLower);
      } else {
        applyDeskVariant(rig, variant, idlePhase);
      }

      if (lookYaw !== undefined) {
        rig.head.rotation.y = clamp(lookYaw, -0.85, 0.85);
      }
    }
  } else {
    // Standing meeting / narrative gestures override when active
    if (g === "raise_hand") {
      rig.leftArm.rotation.x = Math.sin(idlePhase) * 0.03;
      rig.leftElbow.rotation.x = 0.22;
      rig.rightArm.rotation.x = 2.42 + Math.sin(idlePhase * 3) * 0.08;
      rig.rightElbow.rotation.x = 0.36;
    } else if (g === "point") {
      rig.leftArm.rotation.x = 0.22 + Math.sin(idlePhase * 2) * 0.05;
      rig.leftElbow.rotation.x = 0.32;
      rig.rightArm.rotation.x = 1.46 + Math.sin(idlePhase * 3.6) * 0.12;
      rig.rightElbow.rotation.x = 0.16;
      rig.torso.rotation.x = -0.06;
    } else if (g === "talk" || g === "pace") {
      rig.leftArm.rotation.x = 0.38 + Math.cos(idlePhase * 3.8) * 0.24;
      rig.leftElbow.rotation.x = 0.56 + Math.sin(idlePhase * 3.8) * 0.18;
      rig.rightArm.rotation.x = 0.68 + Math.sin(idlePhase * 4.8) * 0.34;
      rig.rightElbow.rotation.x = 0.65 + Math.cos(idlePhase * 4.8) * 0.2;
      rig.head.rotation.x = Math.sin(idlePhase * 3.8) * 0.06;
    } else if (g === "clap") {
      const c = Math.abs(Math.sin(idlePhase * 9.0));
      rig.leftArm.rotation.set(0.88, 0, -0.3 - c * 0.24);
      rig.rightArm.rotation.set(0.88, 0, 0.3 + c * 0.24);
      rig.leftElbow.rotation.x = 0.88;
      rig.rightElbow.rotation.x = 0.88;
    } else if (g === "facepalm") {
      rig.rightArm.rotation.set(1.48, 0, 0.22);
      rig.rightElbow.rotation.x = 1.45;
      rig.head.rotation.x = -0.18;
    } else {
      // Rich standing action animations across 10 variants per action category
      rig.body.position.y = Math.sin(idlePhase * 1.4) * 0.008;
      if (category === "call") {
        applyCallVariant(rig, variant, idlePhase, false, false);
      } else if (category === "desk") {
        applyDeskVariant(rig, variant, idlePhase);
      } else if (category === "drink_eat") {
        applyDrinkEatVariant(rig, variant, idlePhase, actionLower);
      } else if (category === "paperwork") {
        applyPaperworkVariant(rig, variant, idlePhase, actionLower);
      } else if (category === "warehouse") {
        applyWarehouseVariant(rig, variant, idlePhase, false);
      } else if (category === "machine_prep") {
        applyMachinePrepVariant(rig, variant, idlePhase);
      } else if (category === "social") {
        applySocialVariant(rig, variant, idlePhase, actionLower);
      } else {
        applyIdleVariant(rig, variant, idlePhase);
      }
    }

    if (lookYaw !== undefined && g !== "facepalm") {
      rig.head.rotation.y = clamp(lookYaw, -0.85, 0.85);
    }
  }

  if (rig.indiaAura) {
    rig.indiaAura.rotation.z = idlePhase * 0.9;
    rig.indiaAura.position.y = 0.7 + Math.sin(idlePhase * 2.4) * 0.024;
    const pulse = 1 + Math.sin(idlePhase * 3.1) * 0.045;
    rig.indiaAura.scale.set(pulse, pulse, 1);
  }

  if (canBlend) {
    const speed = moving ? 16 : 7.5;
    const alpha = Math.min(1, 1 - Math.exp(-speed * dt));
    blendRigFromPrev(rig, alpha);
  }
  rig.animInitialized = true;
}

export function getDeskSeatAnchor3D(
  ownerId: string,
): { x: number; y: number; z: number; yaw: number } | null {
  const f = getActiveFurniture().find((item) => item.owner === ownerId);
  if (!f) return null;
  const w = f.w * WORLD_SCALE;
  const d = f.h * WORLD_SCALE;
  const center = to3DCoords(f.x + f.w / 2, f.y + f.h / 2, 0);
  if (f.type === "michaelDesk") {
    return { x: center.x, y: center.y, z: center.z - d / 2 - 0.3, yaw: Math.PI };
  }
  if (f.type === "receptionDesk") {
    return { x: center.x - w / 2 - 0.29, y: center.y, z: center.z, yaw: Math.PI / 2 };
  }
  const seat = f.seat ?? "south";
  if (seat === "south") return { x: center.x, y: center.y, z: center.z + d / 2 + 0.27, yaw: 0 };
  if (seat === "north")
    return { x: center.x, y: center.y, z: center.z - d / 2 - 0.27, yaw: Math.PI };
  if (seat === "west")
    return { x: center.x - w / 2 - 0.27, y: center.y, z: center.z, yaw: Math.PI / 2 };
  return { x: center.x + w / 2 + 0.27, y: center.y, z: center.z, yaw: -Math.PI / 2 };
}

export function buildFurnitureMesh(
  f: Furniture,
  tex: OfficeTextures,
): { group: THREE.Group; dispose: () => void } {
  const group = new THREE.Group();
  const w = f.w * WORLD_SCALE;
  const d = f.h * WORLD_SCALE;
  const pos3 = to3DCoords(f.x + f.w / 2, f.y + f.h / 2, 0);
  group.position.set(pos3.x, pos3.y, pos3.z);

  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const g = <T extends THREE.BufferGeometry>(geo: T): T => {
    geos.push(geo);
    return geo;
  };
  const m = <T extends THREE.Material>(mat: T): T => {
    mats.push(mat);
    return mat;
  };

  const woodMat = m(matStd("#c49a68", 0.58, 0.04, { map: tex.wood }));
  const darkWoodMat = m(matStd("#7b5234", 0.5, 0.06, { map: tex.darkWood }));
  const steelMat = m(matStd("#4a5562", 0.3, 0.8));
  const darkPlasticMat = m(matStd("#252a30", 0.45, 0.12));
  const monitorMat = m(
    new THREE.MeshStandardMaterial({
      map: tex.monitor,
      emissive: "#165031",
      emissiveIntensity: 0.45,
      roughness: 0.2,
    }),
  );
  const paperMat = m(matStd("#f5f3ea", 0.9, 0.0));
  const chairFabricMat = m(matStd("#2f4156", 0.88, 0.02));

  const addDeskChair = (lx: number, lz: number, rotY: number) => {
    const ch = new THREE.Group();
    ch.position.set(lx, 0, lz);
    ch.rotation.y = rotY;
    addPart(ch, g(new THREE.CylinderGeometry(0.03, 0.18, 0.34, 8)), steelMat, 0, 0.17, 0);
    addPart(ch, g(new THREE.BoxGeometry(0.44, 0.06, 0.38)), chairFabricMat, 0, 0.42, 0);
    addPart(ch, g(new THREE.BoxGeometry(0.42, 0.46, 0.06)), chairFabricMat, 0, 0.68, 0.23);
    group.add(ch);
  };

  switch (f.type) {
    case "michaelDesk": {
      const oakDeskMat = m(matStd("#a96738", 0.48, 0.05, { map: tex.wood }));
      const leatherMat = m(matStd("#1c2026", 0.42, 0.14));
      const chromeMat = m(matStd("#c9d2dc", 0.18, 0.92));
      const topY = 0.76;
      addPart(group, g(new THREE.BoxGeometry(w, 0.065, d)), oakDeskMat, 0, topY, 0);
      // Warm wood pedestal drawer banks & modesty panel (instead of cold grey steel)
      addPart(
        group,
        g(new THREE.BoxGeometry(0.46, topY - 0.03, d - 0.12)),
        oakDeskMat,
        -w / 2 + 0.25,
        (topY - 0.03) / 2,
        0,
      );
      addPart(
        group,
        g(new THREE.BoxGeometry(0.46, topY - 0.03, d - 0.12)),
        oakDeskMat,
        w / 2 - 0.25,
        (topY - 0.03) / 2,
        0,
      );
      addPart(
        group,
        g(new THREE.BoxGeometry(w - 0.9, topY - 0.24, 0.05)),
        oakDeskMat,
        0,
        (topY - 0.1) / 2 + 0.1,
        d / 2 - 0.14,
      );

      // High-back ribbed black leather executive chair on north side
      const exec = new THREE.Group();
      exec.position.set(0, 0, -d / 2 - 0.3);
      exec.rotation.y = Math.PI;
      addPart(exec, g(new THREE.CylinderGeometry(0.035, 0.24, 0.36, 10)), chromeMat, 0, 0.18, 0);
      addPart(exec, g(new THREE.BoxGeometry(0.54, 0.07, 0.42)), leatherMat, 0, 0.43, 0);
      addPart(exec, g(new THREE.BoxGeometry(0.5, 0.76, 0.08)), leatherMat, 0, 0.85, 0.255);
      addPart(exec, g(new THREE.BoxGeometry(0.44, 0.18, 0.1)), leatherMat, 0, 1.18, 0.245);
      addPart(exec, g(new THREE.BoxGeometry(0.06, 0.04, 0.36)), darkPlasticMat, -0.27, 0.62, 0.02);
      addPart(exec, g(new THREE.BoxGeometry(0.06, 0.04, 0.36)), darkPlasticMat, 0.27, 0.62, 0.02);
      group.add(exec);

      // Two sleek black metal-tube visitor chairs facing the desk from the south
      for (const [vx, vrot] of [
        [-0.64, 0.22],
        [0.64, -0.22],
      ] as const) {
        const vc = new THREE.Group();
        vc.position.set(vx, 0, d / 2 + 0.36);
        vc.rotation.y = vrot;
        addPart(
          vc,
          g(new THREE.BoxGeometry(0.035, 0.42, 0.035)),
          darkPlasticMat,
          -0.21,
          0.21,
          -0.18,
        );
        addPart(
          vc,
          g(new THREE.BoxGeometry(0.035, 0.42, 0.035)),
          darkPlasticMat,
          0.21,
          0.21,
          -0.18,
        );
        addPart(
          vc,
          g(new THREE.BoxGeometry(0.035, 0.42, 0.035)),
          darkPlasticMat,
          -0.21,
          0.21,
          0.18,
        );
        addPart(vc, g(new THREE.BoxGeometry(0.035, 0.42, 0.035)), darkPlasticMat, 0.21, 0.21, 0.18);
        addPart(vc, g(new THREE.BoxGeometry(0.46, 0.075, 0.44)), leatherMat, 0, 0.44, 0);
        addPart(vc, g(new THREE.BoxGeometry(0.44, 0.38, 0.075)), leatherMat, 0, 0.72, 0.2);
        addPart(
          vc,
          g(new THREE.BoxGeometry(0.035, 0.035, 0.34)),
          darkPlasticMat,
          -0.23,
          0.58,
          0.02,
        );
        addPart(vc, g(new THREE.BoxGeometry(0.035, 0.035, 0.34)), darkPlasticMat, 0.23, 0.58, 0.02);
        group.add(vc);
      }

      // Detailed desktop clutter matching Michael's actual desk setup
      const yTop = topY + 0.032;
      // Angled black LCD monitor on left-north facing Michael
      const mon = new THREE.Group();
      mon.position.set(-0.78, yTop, -0.04);
      mon.rotation.y = Math.PI + 0.48;
      addPart(mon, g(new THREE.BoxGeometry(0.2, 0.03, 0.18)), darkPlasticMat, 0, 0.015, 0);
      addPart(mon, g(new THREE.CylinderGeometry(0.025, 0.03, 0.18, 8)), steelMat, 0, 0.1, -0.02);
      addPart(mon, g(new THREE.BoxGeometry(0.54, 0.36, 0.045)), darkPlasticMat, 0, 0.28, 0);
      addPart(mon, g(new THREE.PlaneGeometry(0.48, 0.3)), monitorMat, 0, 0.28, 0.025, false, false);
      group.add(mon);

      // Keyboard & mousepad center-north
      addPart(
        group,
        g(new THREE.BoxGeometry(0.42, 0.022, 0.15)),
        darkPlasticMat,
        -0.14,
        yTop + 0.011,
        -0.34,
      );
      addPart(
        group,
        g(new THREE.BoxGeometry(0.2, 0.01, 0.22)),
        darkPlasticMat,
        0.2,
        yTop + 0.005,
        -0.34,
      );

      // Paper inbox tray & yellow legal pad
      addPart(
        group,
        g(new THREE.BoxGeometry(0.32, 0.045, 0.24)),
        darkPlasticMat,
        -0.84,
        yTop + 0.022,
        0.32,
      );
      addPart(
        group,
        g(new THREE.BoxGeometry(0.26, 0.03, 0.2)),
        paperMat,
        -0.84,
        yTop + 0.045,
        0.32,
      );
      const yellowPadMat = m(matStd("#f3da6b", 0.85, 0));
      addPart(
        group,
        g(new THREE.BoxGeometry(0.22, 0.016, 0.28)),
        yellowPadMat,
        0.52,
        yTop + 0.008,
        -0.22,
      );

      // "World's Best Boss" white mug
      const mugWrapMat = m(matStd("#ffffff", 0.25, 0.05, { map: tex.bestBossMug }));
      const mug = addPart(
        group,
        g(new THREE.CylinderGeometry(0.052, 0.048, 0.115, 14)),
        mugWrapMat,
        -0.44,
        yTop + 0.058,
        -0.08,
      );
      mug.rotation.y = Math.PI * 0.85;

      // Multi-line black office phone (front-right)
      addPart(
        group,
        g(new THREE.BoxGeometry(0.24, 0.07, 0.22)),
        darkPlasticMat,
        0.82,
        yTop + 0.035,
        0.16,
      );
      addPart(
        group,
        g(new THREE.BoxGeometry(0.075, 0.045, 0.22)),
        darkPlasticMat,
        0.74,
        yTop + 0.082,
        0.16,
      );

      // Silver articulated desk lamp
      const bulbMat = m(
        new THREE.MeshStandardMaterial({
          color: "#fff7db",
          emissive: "#ffe49e",
          emissiveIntensity: 0.7,
          roughness: 0.2,
        }),
      );
      addPart(
        group,
        g(new THREE.CylinderGeometry(0.08, 0.09, 0.025, 12)),
        chromeMat,
        0.14,
        yTop + 0.012,
        0.24,
      );
      const lampArm = addPart(
        group,
        g(new THREE.CylinderGeometry(0.014, 0.014, 0.38, 8)),
        chromeMat,
        0.1,
        yTop + 0.2,
        0.18,
      );
      lampArm.rotation.z = 0.22;
      addPart(
        group,
        g(new THREE.ConeGeometry(0.085, 0.11, 12)),
        chromeMat,
        0.02,
        yTop + 0.38,
        0.12,
      );
      addPart(
        group,
        g(new THREE.SphereGeometry(0.038, 8, 8)),
        bulbMat,
        0.02,
        yTop + 0.33,
        0.12,
        false,
        false,
      );

      // Newton's cradle
      addPart(
        group,
        g(new THREE.BoxGeometry(0.18, 0.02, 0.1)),
        darkPlasticMat,
        0.36,
        yTop + 0.01,
        0.26,
      );
      addPart(
        group,
        g(new THREE.BoxGeometry(0.16, 0.14, 0.015)),
        chromeMat,
        0.36,
        yTop + 0.09,
        0.22,
      );
      addPart(
        group,
        g(new THREE.BoxGeometry(0.16, 0.14, 0.015)),
        chromeMat,
        0.36,
        yTop + 0.09,
        0.3,
      );
      for (const bx of [-0.045, -0.022, 0, 0.022, 0.045]) {
        addPart(
          group,
          g(new THREE.SphereGeometry(0.013, 8, 8)),
          chromeMat,
          0.36 + bx,
          yTop + 0.065,
          0.26,
        );
      }

      // Golden Dundie statuette + tissue box + green apple
      const goldMat = m(matStd("#eab308", 0.25, 0.85));
      const greenMat = m(matStd("#5bb344", 0.35, 0.05));
      const redMat = m(matStd("#c93838", 0.45, 0.05));
      addPart(
        group,
        g(new THREE.BoxGeometry(0.075, 0.04, 0.075)),
        darkWoodMat,
        -1.16,
        yTop + 0.02,
        0.16,
      );
      addPart(
        group,
        g(new THREE.CylinderGeometry(0.022, 0.032, 0.16, 8)),
        goldMat,
        -1.16,
        yTop + 0.12,
        0.16,
      );
      addPart(
        group,
        g(new THREE.BoxGeometry(0.2, 0.075, 0.12)),
        paperMat,
        1.06,
        yTop + 0.038,
        -0.18,
      );
      addPart(group, g(new THREE.SphereGeometry(0.04, 10, 10)), greenMat, 0.2, yTop + 0.04, -0.04);
      addPart(
        group,
        g(new THREE.BoxGeometry(0.12, 0.045, 0.055)),
        redMat,
        -0.18,
        yTop + 0.022,
        0.18,
      );
      break;
    }

    case "desk":
    case "playerDesk": {
      const topY = 0.76;
      addPart(group, g(new THREE.BoxGeometry(w, 0.06, d)), woodMat, 0, topY, 0);
      addPart(
        group,
        g(new THREE.BoxGeometry(0.32, topY - 0.03, d - 0.08)),
        steelMat,
        -w / 2 + 0.19,
        (topY - 0.03) / 2,
        0,
      );
      addPart(
        group,
        g(new THREE.BoxGeometry(0.32, topY - 0.03, d - 0.08)),
        steelMat,
        w / 2 - 0.19,
        (topY - 0.03) / 2,
        0,
      );
      const seat = f.seat ?? "south";
      const monZ = seat === "south" ? -d * 0.14 : seat === "north" ? d * 0.14 : 0;
      const monX = seat === "west" ? w * 0.14 : seat === "east" ? -w * 0.14 : 0;
      const monRot =
        seat === "south"
          ? 0
          : seat === "north"
            ? Math.PI
            : seat === "west"
              ? -Math.PI / 2
              : Math.PI / 2;
      const pc = new THREE.Group();
      pc.position.set(monX, topY + 0.03, monZ);
      pc.rotation.y = monRot;
      addPart(pc, g(new THREE.BoxGeometry(0.18, 0.08, 0.16)), darkPlasticMat, 0, 0.04, 0);
      addPart(pc, g(new THREE.BoxGeometry(0.48, 0.34, 0.06)), darkPlasticMat, 0, 0.25, 0);
      addPart(pc, g(new THREE.PlaneGeometry(0.42, 0.28)), monitorMat, 0, 0.25, 0.032, false, false);
      addPart(pc, g(new THREE.BoxGeometry(0.36, 0.025, 0.14)), darkPlasticMat, 0, 0.015, 0.44);
      addPart(pc, g(new THREE.BoxGeometry(0.22, 0.02, 0.28)), paperMat, 0.44, 0.01, 0.36);
      const mugMat = m(matStd(f.type === "playerDesk" ? "#3b82f6" : "#d97706", 0.3, 0.05));
      addPart(pc, g(new THREE.CylinderGeometry(0.05, 0.045, 0.11, 10)), mugMat, -0.44, 0.055, 0.34);
      group.add(pc);
      if (seat === "south") addDeskChair(0, d / 2 + 0.27, 0);
      else if (seat === "north") addDeskChair(0, -d / 2 - 0.27, Math.PI);
      else if (seat === "west") addDeskChair(-w / 2 - 0.27, 0, -Math.PI / 2);
      else addDeskChair(w / 2 + 0.27, 0, Math.PI / 2);
      break;
    }

    case "receptionDesk": {
      const rx = -w * 0.25;
      const rRad = d * 0.48;
      // Curved semicircular wooden counter base + wraparound top + upper transaction counter
      const arcBase = addPart(
        group,
        g(new THREE.CylinderGeometry(rRad, rRad, 0.96, 20, 1, false, 0, Math.PI)),
        woodMat,
        rx,
        0.48,
        0,
      );
      arcBase.scale.set((w * 0.72) / rRad, 1, 1);
      const arcTop = addPart(
        group,
        g(new THREE.CylinderGeometry(rRad + 0.05, rRad + 0.05, 0.06, 20, 1, false, 0, Math.PI)),
        darkWoodMat,
        rx,
        0.99,
        0,
      );
      arcTop.scale.set((w * 0.76) / (rRad + 0.05), 1, 1);
      const arcLedge = addPart(
        group,
        g(
          new THREE.CylinderGeometry(
            rRad + 0.03,
            rRad + 0.03,
            0.2,
            20,
            1,
            true,
            0.15,
            Math.PI - 0.3,
          ),
        ),
        darkWoodMat,
        rx,
        1.1,
        0,
      );
      arcLedge.scale.set((w * 0.72) / (rRad + 0.03), 1, 1);
      // Monitor & multi-line reception phone behind counter
      addPart(
        group,
        g(new THREE.BoxGeometry(0.18, 0.34, 0.44)),
        darkPlasticMat,
        -0.05,
        1.18,
        -0.35,
      );
      addPart(group, g(new THREE.PlaneGeometry(0.38, 0.26)), monitorMat, -0.15, 1.19, -0.35);
      addPart(group, g(new THREE.BoxGeometry(0.22, 0.07, 0.2)), darkPlasticMat, 0.04, 1.05, 0.34);
      addPart(group, g(new THREE.BoxGeometry(0.24, 0.02, 0.28)), paperMat, -0.04, 1.03, 0.02);
      addDeskChair(-w / 2 - 0.29, 0, -Math.PI / 2);
      break;
    }

    case "confTable":
    case "partyTable": {
      const tMat = f.type === "confTable" ? darkWoodMat : m(matStd("#f3f0e6", 0.85, 0));
      addPart(group, g(new THREE.BoxGeometry(w, 0.07, d)), tMat, 0, 0.76, 0);
      addPart(group, g(new THREE.BoxGeometry(w * 0.72, 0.72, d * 0.55)), steelMat, 0, 0.36, 0);
      if (f.type === "partyTable") {
        const bowlMat = m(matStd("#b5373c", 0.3, 0.1));
        addPart(
          group,
          g(new THREE.CylinderGeometry(0.2, 0.14, 0.16, 12)),
          bowlMat,
          -w * 0.22,
          0.88,
          0,
        );
        addPart(group, g(new THREE.BoxGeometry(0.38, 0.14, 0.32)), paperMat, w * 0.2, 0.86, 0);
      }
      break;
    }

    case "roundTable": {
      const r = Math.min(w, d) / 2;
      addPart(group, g(new THREE.CylinderGeometry(r, r, 0.06, 18)), woodMat, 0, 0.75, 0);
      addPart(group, g(new THREE.CylinderGeometry(0.08, 0.08, 0.72, 10)), steelMat, 0, 0.36, 0);
      addPart(group, g(new THREE.CylinderGeometry(0.32, 0.34, 0.04, 14)), steelMat, 0, 0.02, 0);
      break;
    }

    case "counter": {
      const whiteCabMat = m(matStd("#eceae2", 0.55, 0.04));
      const topMat = m(matStd("#cac8c0", 0.42, 0.08));
      const sinkMat = m(matStd("#aeb8c2", 0.25, 0.78));
      // White base kitchen cabinetry + stone counter + drawer seams
      addPart(group, g(new THREE.BoxGeometry(w, 0.88, d)), whiteCabMat, 0, 0.44, 0);
      addPart(group, g(new THREE.BoxGeometry(w + 0.06, 0.06, d + 0.06)), topMat, 0, 0.91, 0);
      for (let i = 0; i < 4; i++) {
        const dx = -w * 0.36 + i * (w * 0.24);
        addPart(
          group,
          g(new THREE.BoxGeometry(w * 0.21, 0.18, 0.03)),
          whiteCabMat,
          dx,
          0.74,
          d / 2 + 0.01,
        );
        addPart(
          group,
          g(new THREE.BoxGeometry(0.12, 0.025, 0.04)),
          steelMat,
          dx,
          0.74,
          d / 2 + 0.03,
        );
      }
      // Overhead white wall cabinets
      addPart(
        group,
        g(new THREE.BoxGeometry(w * 0.96, 0.72, d * 0.46)),
        whiteCabMat,
        0,
        2.38,
        -d * 0.24,
      );
      // Stainless sink basin & chrome gooseneck faucet (center)
      addPart(group, g(new THREE.BoxGeometry(0.56, 0.03, 0.44)), sinkMat, 0, 0.945, 0.04);
      addPart(group, g(new THREE.CylinderGeometry(0.02, 0.025, 0.24, 8)), steelMat, 0, 1.07, -0.18);
      addPart(group, g(new THREE.BoxGeometry(0.03, 0.03, 0.12)), steelMat, 0, 1.18, -0.12);
      // Coffee maker (left) + microwave (right)
      addPart(group, g(new THREE.BoxGeometry(0.36, 0.42, 0.32)), darkPlasticMat, -w * 0.3, 1.15, 0);
      addPart(group, g(new THREE.BoxGeometry(0.56, 0.34, 0.38)), steelMat, w * 0.28, 1.11, 0);
      break;
    }

    case "fridge": {
      const fridgeMat = m(matStd("#d4dadf", 0.32, 0.35));
      addPart(group, g(new THREE.BoxGeometry(w, 1.92, d)), fridgeMat, 0, 0.96, 0);
      addPart(
        group,
        g(new THREE.BoxGeometry(w + 0.02, 0.03, 0.06)),
        steelMat,
        0,
        1.32,
        d / 2 + 0.01,
      );
      addPart(
        group,
        g(new THREE.BoxGeometry(0.04, 0.38, 0.05)),
        steelMat,
        -w * 0.3,
        1.56,
        d / 2 + 0.03,
      );
      addPart(
        group,
        g(new THREE.BoxGeometry(0.04, 0.5, 0.05)),
        steelMat,
        -w * 0.3,
        0.88,
        d / 2 + 0.03,
      );
      break;
    }

    case "vending": {
      const bodyMat = m(matStd(f.color ?? "#b5373c", 0.35, 0.3));
      const glassMat = m(
        new THREE.MeshStandardMaterial({
          color: "#dbeafe",
          emissive: "#60a5fa",
          emissiveIntensity: 0.3,
          roughness: 0.15,
          metalness: 0.2,
        }),
      );
      addPart(group, g(new THREE.BoxGeometry(w, 2.05, d)), bodyMat, 0, 1.025, 0);
      addPart(
        group,
        g(new THREE.BoxGeometry(w * 0.68, 1.25, 0.05)),
        glassMat,
        -w * 0.08,
        1.22,
        d / 2 + 0.01,
      );
      addPart(
        group,
        g(new THREE.BoxGeometry(w * 0.64, 0.26, 0.06)),
        darkPlasticMat,
        0,
        0.3,
        d / 2 + 0.01,
      );
      break;
    }

    case "couch": {
      const cMat = m(matStd(f.color ?? "#7d5a4a", 0.9, 0.01));
      const legMat = darkWoodMat;
      addPart(group, g(new THREE.BoxGeometry(w, 0.34, d)), cMat, 0, 0.24, 0);
      if (f.vertical) {
        addPart(group, g(new THREE.BoxGeometry(0.24, 0.78, d)), cMat, -w / 2 + 0.12, 0.42, 0);
        addPart(group, g(new THREE.BoxGeometry(w, 0.56, 0.2)), cMat, 0, 0.34, -d / 2 + 0.1);
        addPart(group, g(new THREE.BoxGeometry(w, 0.56, 0.2)), cMat, 0, 0.34, d / 2 - 0.1);
      } else {
        addPart(group, g(new THREE.BoxGeometry(w, 0.78, 0.24)), cMat, 0, 0.42, -d / 2 + 0.12);
        addPart(group, g(new THREE.BoxGeometry(0.2, 0.56, d)), cMat, -w / 2 + 0.1, 0.34, 0);
        addPart(group, g(new THREE.BoxGeometry(0.2, 0.56, d)), cMat, w / 2 - 0.1, 0.34, 0);
      }
      addPart(group, g(new THREE.BoxGeometry(w * 0.85, 0.07, d * 0.85)), legMat, 0, 0.035, 0);
      break;
    }

    case "plant": {
      const potMat = m(matStd("#a8593c", 0.75, 0.05));
      const leafMat = m(matStd("#2e7040", 0.62, 0.02));
      const leafMat2 = m(matStd("#3d8c4f", 0.58, 0.02));
      const r = Math.min(w, d) * 0.34;
      addPart(
        group,
        g(new THREE.CylinderGeometry(r * 1.15, r * 0.8, 0.42, 10)),
        potMat,
        0,
        0.21,
        0,
      );
      addPart(
        group,
        g(new THREE.CylinderGeometry(r * 0.18, r * 0.25, 0.65, 8)),
        darkWoodMat,
        0,
        0.65,
        0,
      );
      addPart(group, g(new THREE.DodecahedronGeometry(r * 1.15, 0)), leafMat, 0, 1.08, 0);
      addPart(
        group,
        g(new THREE.DodecahedronGeometry(r * 0.88, 0)),
        leafMat2,
        r * 0.3,
        0.92,
        -r * 0.2,
      );
      addPart(
        group,
        g(new THREE.DodecahedronGeometry(r * 0.8, 0)),
        leafMat,
        -r * 0.28,
        1.24,
        r * 0.18,
      );
      break;
    }

    case "cabinet": {
      if (f.variant === "michaelFileCab") {
        const oakMat = m(matStd("#c98548", 0.55, 0.04, { map: tex.wood }));
        addPart(group, g(new THREE.BoxGeometry(w, 0.78, d)), oakMat, 0, 0.39, 0);
        for (const dy of [0.22, 0.56]) {
          addPart(
            group,
            g(new THREE.BoxGeometry(w * 0.88, 0.26, 0.03)),
            oakMat,
            0,
            dy,
            d / 2 + 0.008,
          );
          addPart(
            group,
            g(new THREE.BoxGeometry(0.22, 0.03, 0.04)),
            darkPlasticMat,
            0,
            dy + 0.04,
            d / 2 + 0.02,
          );
        }
        // Mini black dumbbells + upright blue/red binders + gold figurine on top
        for (const [dx, dz] of [
          [-w * 0.32, 0.04],
          [-w * 0.32, -0.09],
        ] as const) {
          addPart(
            group,
            g(new THREE.BoxGeometry(0.18, 0.045, 0.045)),
            darkPlasticMat,
            dx,
            0.805,
            dz,
          );
          addPart(
            group,
            g(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 8)),
            darkPlasticMat,
            dx - 0.09,
            0.815,
            dz,
          );
          addPart(
            group,
            g(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 8)),
            darkPlasticMat,
            dx + 0.09,
            0.815,
            dz,
          );
        }
        const bindB = m(matStd("#26538d", 0.6, 0.05));
        const bindR = m(matStd("#b5373c", 0.6, 0.05));
        const goldT = m(matStd("#e2b33b", 0.3, 0.8));
        addPart(group, g(new THREE.BoxGeometry(0.09, 0.26, 0.22)), bindB, 0.02, 0.91, 0);
        addPart(group, g(new THREE.BoxGeometry(0.09, 0.26, 0.22)), bindR, 0.13, 0.91, 0);
        addPart(
          group,
          g(new THREE.CylinderGeometry(0.045, 0.055, 0.22, 8)),
          goldT,
          w * 0.34,
          0.89,
          0,
        );
      } else if (f.variant === "michaelCredenza") {
        const oakMat = m(matStd("#c98548", 0.55, 0.04, { map: tex.wood }));
        addPart(group, g(new THREE.BoxGeometry(w, 0.94, d)), oakMat, 0, 0.47, 0);
        addPart(
          group,
          g(new THREE.BoxGeometry(0.04, 0.78, d * 0.43)),
          oakMat,
          -w / 2 - 0.01,
          0.47,
          -d * 0.23,
        );
        addPart(
          group,
          g(new THREE.BoxGeometry(0.04, 0.78, d * 0.43)),
          oakMat,
          -w / 2 - 0.01,
          0.47,
          d * 0.23,
        );
        const book1 = m(matStd("#2c5b8c", 0.6, 0.05));
        const book2 = m(matStd("#3d7a4c", 0.6, 0.05));
        const orbMat = m(matStd("#2d6e54", 0.2, 0.3));
        addPart(group, g(new THREE.BoxGeometry(0.22, 0.26, 0.08)), book1, 0, 1.07, -0.34);
        addPart(group, g(new THREE.BoxGeometry(0.22, 0.24, 0.08)), book2, 0, 1.06, -0.24);
        addPart(group, g(new THREE.BoxGeometry(0.22, 0.25, 0.08)), paperMat, 0, 1.065, -0.14);
        addPart(group, g(new THREE.SphereGeometry(0.09, 10, 10)), orbMat, 0, 1.03, 0.22);
      } else {
        const cabMat = m(matStd(f.color ?? "#8f9aa1", 0.42, 0.55));
        addPart(group, g(new THREE.BoxGeometry(w, 1.32, d)), cabMat, 0, 0.66, 0);
        for (const dy of [0.28, 0.66, 1.04]) {
          addPart(
            group,
            g(new THREE.BoxGeometry(w * 0.86, 0.04, 0.04)),
            steelMat,
            0,
            dy,
            d / 2 + 0.01,
          );
        }
      }
      break;
    }

    case "copier":
    case "printer": {
      const bodyMat = m(matStd("#dcdad2", 0.5, 0.1));
      const h = f.type === "copier" ? 1.06 : 0.78;
      addPart(group, g(new THREE.BoxGeometry(w, h, d)), bodyMat, 0, h / 2, 0);
      addPart(
        group,
        g(new THREE.BoxGeometry(w * 0.92, 0.08, d * 0.9)),
        darkPlasticMat,
        0,
        h + 0.04,
        0,
      );
      addPart(group, g(new THREE.BoxGeometry(0.32, 0.06, 0.28)), paperMat, w * 0.48, h * 0.7, 0);
      break;
    }

    case "bookshelf":
    case "shelf": {
      if (f.variant === "michaelArmoire") {
        const armMat = m(matStd("#c77d3e", 0.52, 0.04, { map: tex.wood }));
        addPart(group, g(new THREE.BoxGeometry(w, 2.08, d)), armMat, 0, 1.04, 0);
        // Upper twin doors + lower 3 drawers
        addPart(
          group,
          g(new THREE.BoxGeometry(w * 0.45, 1.12, 0.03)),
          armMat,
          -w * 0.24,
          1.44,
          d / 2 + 0.01,
        );
        addPart(
          group,
          g(new THREE.BoxGeometry(w * 0.45, 1.12, 0.03)),
          armMat,
          w * 0.24,
          1.44,
          d / 2 + 0.01,
        );
        addPart(
          group,
          g(new THREE.BoxGeometry(0.03, 0.24, 0.04)),
          darkPlasticMat,
          -0.06,
          1.24,
          d / 2 + 0.03,
        );
        addPart(
          group,
          g(new THREE.BoxGeometry(0.03, 0.24, 0.04)),
          darkPlasticMat,
          0.06,
          1.24,
          d / 2 + 0.03,
        );
        for (const dy of [0.16, 0.41, 0.66]) {
          addPart(
            group,
            g(new THREE.BoxGeometry(w * 0.88, 0.2, 0.03)),
            armMat,
            0,
            dy,
            d / 2 + 0.01,
          );
          addPart(
            group,
            g(new THREE.BoxGeometry(0.2, 0.025, 0.04)),
            darkPlasticMat,
            0,
            dy + 0.02,
            d / 2 + 0.03,
          );
        }
      } else if (f.variant === "michaelLowBookcase") {
        const yOak = m(matStd("#d4a24c", 0.56, 0.03, { map: tex.wood }));
        const h = 1.06;
        // Back wall + sides + shelves (open toward east +X)
        addPart(group, g(new THREE.BoxGeometry(0.05, h, d)), yOak, -w / 2 + 0.025, h / 2, 0);
        addPart(group, g(new THREE.BoxGeometry(w, 0.05, d)), yOak, 0, h - 0.025, 0);
        addPart(group, g(new THREE.BoxGeometry(w, 0.05, d)), yOak, 0, 0.52, 0);
        addPart(group, g(new THREE.BoxGeometry(w, 0.05, d)), yOak, 0, 0.04, 0);
        addPart(group, g(new THREE.BoxGeometry(w, h, 0.05)), yOak, 0, h / 2, -d / 2 + 0.025);
        addPart(group, g(new THREE.BoxGeometry(w, h, 0.05)), yOak, 0, h / 2, d / 2 - 0.025);
        addPart(group, g(new THREE.BoxGeometry(w * 0.94, h - 0.08, 0.04)), yOak, 0, h / 2, 0);
        // Blue & black binders inside shelves
        const bindB = m(matStd("#26538d", 0.6, 0.05));
        for (const bz of [-d * 0.34, -d * 0.26, -d * 0.18, d * 0.16, d * 0.24]) {
          addPart(group, g(new THREE.BoxGeometry(w * 0.65, 0.32, 0.075)), bindB, 0.06, 0.72, bz);
          addPart(
            group,
            g(new THREE.BoxGeometry(w * 0.65, 0.3, 0.075)),
            darkPlasticMat,
            0.06,
            0.22,
            bz,
          );
        }
        // Antique desk globe on north top + silver dome lamp on south top
        const globeSea = m(matStd("#3d708e", 0.35, 0.15));
        const brassMat = m(matStd("#c99b38", 0.3, 0.8));
        const chromeMat = m(matStd("#c9d2dc", 0.2, 0.9));
        addPart(
          group,
          g(new THREE.CylinderGeometry(0.08, 0.11, 0.06, 10)),
          darkWoodMat,
          0.04,
          h + 0.03,
          -d * 0.34,
        );
        addPart(
          group,
          g(new THREE.SphereGeometry(0.15, 14, 12)),
          globeSea,
          0.04,
          h + 0.22,
          -d * 0.34,
        );
        addPart(
          group,
          g(new THREE.TorusGeometry(0.165, 0.015, 6, 16)),
          brassMat,
          0.04,
          h + 0.22,
          -d * 0.34,
        );
        addPart(
          group,
          g(new THREE.CylinderGeometry(0.07, 0.09, 0.03, 12)),
          chromeMat,
          0.04,
          h + 0.015,
          d * 0.34,
        );
        addPart(
          group,
          g(new THREE.CylinderGeometry(0.016, 0.016, 0.26, 8)),
          chromeMat,
          0.04,
          h + 0.15,
          d * 0.34,
        );
        addPart(
          group,
          g(new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)),
          chromeMat,
          0.04,
          h + 0.27,
          d * 0.34,
        );
      } else if (f.variant === "lowSouthShelf") {
        const oakMat = m(matStd(f.color ?? "#c89d66", 0.56, 0.04, { map: tex.wood }));
        const h = 0.86;
        addPart(group, g(new THREE.BoxGeometry(w, h, d)), oakMat, 0, h / 2, 0);
        addPart(group, g(new THREE.BoxGeometry(w + 0.04, 0.05, d + 0.04)), darkWoodMat, 0, h, 0);
        const bind1 = m(matStd("#2c5b8c", 0.7, 0));
        const bind2 = m(matStd("#21262d", 0.7, 0));
        for (let i = 0; i < 6; i++) {
          const bx = -w * 0.38 + i * (w * 0.15);
          addPart(
            group,
            g(new THREE.BoxGeometry(0.11, 0.26, d * 0.65)),
            i % 2 ? bind1 : bind2,
            bx,
            h + 0.14,
            0,
          );
        }
      } else {
        const bMat = f.type === "bookshelf" ? darkWoodMat : steelMat;
        const h = 1.85;
        addPart(group, g(new THREE.BoxGeometry(w, h, d * 0.9)), bMat, 0, h / 2, 0);
        const b1 = m(matStd("#2c5b8c", 0.7, 0));
        const b2 = m(matStd("#b5373c", 0.7, 0));
        const b3 = m(matStd("#d49e38", 0.7, 0));
        for (let i = 0; i < 4; i++) {
          const bx = -w * 0.34 + i * w * 0.22;
          addPart(
            group,
            g(new THREE.BoxGeometry(0.18, 0.28, d * 0.72)),
            [b1, b2, b3, b1][i]!,
            bx,
            0.55 + (i % 2) * 0.48,
            0.06,
          );
        }
      }
      break;
    }

    case "sideTable": {
      const oakMat = m(matStd(f.color ?? "#c88644", 0.55, 0.04, { map: tex.wood }));
      const shadeMat = m(
        new THREE.MeshStandardMaterial({
          color: "#f1e4c6",
          emissive: "#ffe49e",
          emissiveIntensity: 0.38,
          roughness: 0.7,
        }),
      );
      const legH = 0.48;
      addPart(group, g(new THREE.BoxGeometry(w, 0.05, d)), oakMat, 0, legH, 0);
      for (const sx of [-w / 2 + 0.05, w / 2 - 0.05]) {
        for (const sz of [-d / 2 + 0.05, d / 2 - 0.05]) {
          addPart(group, g(new THREE.BoxGeometry(0.055, legH, 0.055)), oakMat, sx, legH / 2, sz);
        }
      }
      // Classic ceramic lamp & cream shade
      addPart(
        group,
        g(new THREE.CylinderGeometry(0.075, 0.095, 0.22, 10)),
        oakMat,
        0,
        legH + 0.13,
        0,
      );
      addPart(
        group,
        g(new THREE.CylinderGeometry(0.12, 0.22, 0.24, 14)),
        shadeMat,
        0,
        legH + 0.34,
        0,
      );
      break;
    }

    case "rack": {
      const orangeMat = m(matStd("#d97724", 0.45, 0.5));
      const boxMat = m(matStd("#b58d58", 0.88, 0.02));
      for (const sx of [-w / 2 + 0.06, w / 2 - 0.06]) {
        for (const sz of [-d / 2 + 0.08, d / 2 - 0.08]) {
          addPart(group, g(new THREE.BoxGeometry(0.1, 2.35, 0.1)), orangeMat, sx, 1.175, sz);
        }
      }
      for (const sy of [0.18, 1.05, 1.9]) {
        addPart(group, g(new THREE.BoxGeometry(w, 0.08, d)), orangeMat, 0, sy, 0);
        addPart(
          group,
          g(new THREE.BoxGeometry(w * 0.82, 0.56, d * 0.32)),
          boxMat,
          0,
          sy + 0.32,
          -d * 0.22,
        );
        addPart(
          group,
          g(new THREE.BoxGeometry(w * 0.82, 0.52, d * 0.32)),
          paperMat,
          0,
          sy + 0.3,
          d * 0.22,
        );
      }
      break;
    }

    case "boxes": {
      if (f.variant === "emojiBoxes") {
        const yBoxMat = m(matStd("#e0b341", 0.85, 0.02, { map: tex.emojiBoxes }));
        const faceMat = m(matStd("#1c2026", 0.8, 0));
        // Bottom frowning box + upper smiling box facing west/south
        addPart(group, g(new THREE.BoxGeometry(0.42, 0.32, 0.42)), yBoxMat, 0, 0.16, 0);
        addPart(group, g(new THREE.BoxGeometry(0.38, 0.3, 0.38)), yBoxMat, -0.02, 0.47, 0.02);
        for (const [fy, isSmile] of [
          [0.18, false],
          [0.49, true],
        ] as const) {
          addPart(
            group,
            g(new THREE.BoxGeometry(0.02, 0.04, 0.04)),
            faceMat,
            -0.22,
            fy + 0.04,
            -0.07,
          );
          addPart(
            group,
            g(new THREE.BoxGeometry(0.02, 0.04, 0.04)),
            faceMat,
            -0.22,
            fy + 0.04,
            0.07,
          );
          addPart(
            group,
            g(new THREE.BoxGeometry(0.02, 0.03, 0.14)),
            faceMat,
            -0.22,
            fy - (isSmile ? 0.05 : 0.03),
            0,
          );
        }
      } else {
        const boxMat = m(matStd("#b9925c", 0.88, 0.02));
        addPart(
          group,
          g(new THREE.BoxGeometry(w * 0.6, 0.62, d * 0.6)),
          boxMat,
          -w * 0.16,
          0.31,
          0,
        );
        addPart(
          group,
          g(new THREE.BoxGeometry(w * 0.45, 0.48, d * 0.5)),
          paperMat,
          w * 0.2,
          0.24,
          d * 0.1,
        );
        addPart(
          group,
          g(new THREE.BoxGeometry(w * 0.4, 0.42, d * 0.4)),
          boxMat,
          -w * 0.12,
          0.82,
          0,
        );
      }
      break;
    }

    case "cooler": {
      const waterMat = m(matStd("#38bdf8", 0.15, 0.1, { transparent: true, opacity: 0.78 }));
      const bodyMat = m(matStd("#eaecf0", 0.45, 0.1));
      addPart(group, g(new THREE.BoxGeometry(w * 0.72, 0.96, d * 0.72)), bodyMat, 0, 0.48, 0);
      addPart(
        group,
        g(new THREE.CylinderGeometry(w * 0.28, w * 0.28, 0.48, 12)),
        waterMat,
        0,
        1.2,
        0,
      );
      break;
    }

    case "tvCart": {
      const tvScreenMat = m(
        new THREE.MeshStandardMaterial({
          map: tex.tvScreen,
          emissive: "#1f4763",
          emissiveIntensity: 0.6,
          roughness: 0.2,
        }),
      );
      addPart(
        group,
        g(new THREE.BoxGeometry(w * 0.88, 0.92, d * 0.88)),
        darkPlasticMat,
        0,
        0.46,
        0,
      );
      addPart(
        group,
        g(new THREE.BoxGeometry(w * 0.96, 0.68, d * 0.82)),
        darkPlasticMat,
        0,
        1.26,
        0,
      );
      addPart(
        group,
        g(new THREE.PlaneGeometry(w * 0.84, 0.54)),
        tvScreenMat,
        0,
        1.26,
        d * 0.42,
        false,
        false,
      );
      break;
    }

    case "partition": {
      const partMat = m(matStd("#a9b0b6", 0.85, 0.05));
      addPart(group, g(new THREE.BoxGeometry(w, 1.25, d)), partMat, 0, 0.625, 0);
      addPart(group, g(new THREE.BoxGeometry(w + 0.02, 0.05, d + 0.02)), steelMat, 0, 1.26, 0);
      break;
    }

    case "forklift": {
      const yMat = m(matStd("#eab308", 0.35, 0.25));
      addPart(group, g(new THREE.BoxGeometry(w * 0.85, 0.72, d * 0.65)), yMat, 0, 0.48, -d * 0.12);
      addPart(
        group,
        g(new THREE.BoxGeometry(w * 0.78, 1.05, d * 0.56)),
        darkPlasticMat,
        0,
        1.34,
        -d * 0.14,
      );
      addPart(
        group,
        g(new THREE.BoxGeometry(w * 0.75, 1.9, 0.14)),
        darkPlasticMat,
        0,
        1.02,
        d * 0.26,
      );
      addPart(
        group,
        g(new THREE.BoxGeometry(0.1, 0.06, d * 0.58)),
        steelMat,
        -w * 0.25,
        0.12,
        d * 0.42,
      );
      addPart(
        group,
        g(new THREE.BoxGeometry(0.1, 0.06, d * 0.58)),
        steelMat,
        w * 0.25,
        0.12,
        d * 0.42,
      );
      break;
    }

    case "pingpong": {
      const tableMat = m(matStd("#1c6d45", 0.5, 0.05));
      addPart(group, g(new THREE.BoxGeometry(w, 0.08, d)), tableMat, 0, 0.76, 0);
      addPart(group, g(new THREE.BoxGeometry(0.04, 0.18, d)), whiteMatOrGray(m), 0, 0.89, 0);
      addPart(group, g(new THREE.BoxGeometry(w * 0.8, 0.72, d * 0.7)), steelMat, 0, 0.36, 0);
      break;
    }

    case "baler": {
      const bMat = m(matStd("#b53b32", 0.42, 0.4));
      addPart(group, g(new THREE.BoxGeometry(w, 2.05, d)), bMat, 0, 1.025, 0);
      addPart(
        group,
        g(new THREE.BoxGeometry(w * 0.84, 0.9, 0.08)),
        steelMat,
        0,
        1.05,
        d / 2 + 0.02,
      );
      break;
    }

    case "stairs": {
      const burgundyCarpetMat = m(matStd("#6e2934", 0.92, 0.01));
      const riserMat = m(matStd("#d8d1c2", 0.78, 0.02));
      const railMat = m(matStd("#c98a52", 0.48, 0.08));
      if (floorOfY(f.y) === 0) {
        // Continuous 16-step staircase descending from Floor 0 east (+w/2, y=0) down to Floor 1 (-FLOOR_HEIGHT_M)
        const steps = 16;
        const sw = w / steps;
        const stepH = FLOOR_HEIGHT_M / steps;
        for (let i = 0; i < steps; i++) {
          const topY = -i * stepH;
          const xPos = w / 2 - sw * (i + 0.5);
          // Tread + riser block
          addPart(
            group,
            g(new THREE.BoxGeometry(sw + 0.04, stepH + 0.08, d * 0.9)),
            riserMat,
            xPos,
            topY - (stepH + 0.08) / 2,
            0,
          );
          // Burgundy carpet runner
          addPart(
            group,
            g(new THREE.BoxGeometry(sw + 0.03, 0.025, d * 0.76)),
            burgundyCarpetMat,
            xPos,
            topY + 0.005,
            0,
          );
        }
        // Angled oak/metal handrails on both sides
        const runLen = w;
        const diagLen = Math.hypot(runLen, FLOOR_HEIGHT_M);
        const slopeAng = Math.atan2(FLOOR_HEIGHT_M, runLen);
        for (const rz of [-d * 0.45, d * 0.45]) {
          const rail = addPart(
            group,
            g(new THREE.BoxGeometry(diagLen, 0.06, 0.06)),
            railMat,
            0,
            -FLOOR_HEIGHT_M / 2 + 0.92,
            rz,
          );
          rail.rotation.z = slopeAng;
          addPart(
            group,
            g(new THREE.BoxGeometry(0.06, 0.92, 0.06)),
            steelMat,
            w / 2 - 0.06,
            0.46,
            rz,
          );
          addPart(
            group,
            g(new THREE.BoxGeometry(0.06, 0.92, 0.06)),
            steelMat,
            -w / 2 + 0.06,
            -FLOOR_HEIGHT_M + 0.46,
            rz,
          );
        }
      } else {
        // Lower stairwell landing trim / safety rail at Floor 1 (y = 0 local == -FLOOR_HEIGHT_M world)
        addPart(group, g(new THREE.BoxGeometry(w, 0.04, d * 0.9)), burgundyCarpetMat, 0, 0.02, 0);
        addPart(group, g(new THREE.BoxGeometry(w, 0.06, 0.06)), railMat, 0, 0.92, -d * 0.45);
      }
      break;
    }
  }

  return {
    group,
    dispose: () => {
      for (const geo of geos) geo.dispose();
      for (const mat of mats) mat.dispose();
    },
  };
}

function whiteMatOrGray(
  trackMat: <T extends THREE.Material>(m: T) => T,
): THREE.MeshStandardMaterial {
  return trackMat(matStd("#f1f5f9", 0.7, 0.05));
}

export function buildBeaconProp(colorHex: number): { group: THREE.Group; dispose: () => void } {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.75,
    roughness: 0.25,
    metalness: 0.5,
  });
  const ringMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  mats.push(mat, ringMat);

  const ringGeo = new THREE.RingGeometry(0.24, 0.34, 24);
  const orbGeo = new THREE.OctahedronGeometry(0.16, 0);
  geos.push(ringGeo, orbGeo);

  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;

  const orb = new THREE.Mesh(orbGeo, mat);
  orb.position.y = 1.05;
  group.add(ring, orb);

  return {
    group,
    dispose: () => {
      for (const geo of geos) geo.dispose();
      for (const m of mats) m.dispose();
    },
  };
}

export function buildChristmasTree(): { group: THREE.Group; dispose: () => void } {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const g = <T extends THREE.BufferGeometry>(geo: T): T => {
    geos.push(geo);
    return geo;
  };
  const m = <T extends THREE.Material>(mat: T): T => {
    mats.push(mat);
    return mat;
  };

  const trunkMat = m(matStd("#6e472b", 0.85, 0));
  const pineMat = m(matStd("#1c5e35", 0.75, 0));
  const goldMat = m(
    new THREE.MeshStandardMaterial({
      color: "#facc15",
      emissive: "#ca8a04",
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.8,
    }),
  );
  const redMat = m(
    new THREE.MeshStandardMaterial({
      color: "#ef4444",
      emissive: "#b91c1c",
      emissiveIntensity: 0.45,
      roughness: 0.25,
    }),
  );

  addPart(group, g(new THREE.CylinderGeometry(0.12, 0.16, 0.45, 8)), trunkMat, 0, 0.22, 0);
  addPart(group, g(new THREE.ConeGeometry(0.72, 1.05, 10)), pineMat, 0, 0.85, 0);
  addPart(group, g(new THREE.ConeGeometry(0.56, 0.9, 10)), pineMat, 0, 1.45, 0);
  addPart(group, g(new THREE.ConeGeometry(0.38, 0.75, 10)), pineMat, 0, 1.98, 0);
  addPart(group, g(new THREE.OctahedronGeometry(0.12, 0)), goldMat, 0, 2.42, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    addPart(
      group,
      g(new THREE.SphereGeometry(0.055, 8, 8)),
      i % 2 ? goldMat : redMat,
      Math.cos(a) * 0.44,
      0.95 + (i % 3) * 0.4,
      Math.sin(a) * 0.44,
    );
  }
  return {
    group,
    dispose: () => {
      for (const geo of geos) geo.dispose();
      for (const mat of mats) mat.dispose();
    },
  };
}

export function buildConferenceChairs(seats: ConferenceSeat[]): {
  group: THREE.Group;
  dispose: () => void;
} {
  const group = new THREE.Group();
  const steelMat = matStd("#4a5562", 0.32, 0.78);
  const guestFabricMat = matStd("#2f4156", 0.88, 0.02);
  const playerFabricMat = matStd("#8a4628", 0.82, 0.04);
  const baseGeo = new THREE.CylinderGeometry(0.03, 0.18, 0.34, 8);
  const seatGeo = new THREE.BoxGeometry(0.44, 0.06, 0.4);
  const backGeo = new THREE.BoxGeometry(0.42, 0.46, 0.06);
  const armGeo = new THREE.BoxGeometry(0.05, 0.04, 0.3);

  for (const s of seats) {
    const ch = new THREE.Group();
    ch.position.set(s.x * WORLD_SCALE, 0, s.y * WORLD_SCALE);
    const yaw =
      s.facing === "right"
        ? Math.PI / 2
        : s.facing === "down"
          ? Math.PI
          : s.facing === "left"
            ? -Math.PI / 2
            : 0;
    ch.rotation.y = -yaw;
    const fMat = s.forPlayer ? playerFabricMat : guestFabricMat;
    addPart(ch, baseGeo, steelMat, 0, 0.17, 0);
    addPart(ch, seatGeo, fMat, 0, 0.42, 0);
    addPart(ch, backGeo, fMat, 0, 0.68, 0.23);
    addPart(ch, armGeo, steelMat, -0.21, 0.56, 0.02);
    addPart(ch, armGeo, steelMat, 0.21, 0.56, 0.02);
    group.add(ch);
  }

  return {
    group,
    dispose: () => {
      baseGeo.dispose();
      seatGeo.dispose();
      backGeo.dispose();
      armGeo.dispose();
      steelMat.dispose();
      guestFabricMat.dispose();
      playerFabricMat.dispose();
    },
  };
}

export function buildSeatHighlightRing(): { group: THREE.Group; dispose: () => void } {
  const group = new THREE.Group();
  const ringGeo = new THREE.RingGeometry(0.32, 0.44, 28);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const orbGeo = new THREE.OctahedronGeometry(0.12, 0);
  const orbMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  const orb = new THREE.Mesh(orbGeo, orbMat);
  orb.position.y = 1.25;
  group.add(ring, orb);

  return {
    group,
    dispose: () => {
      ringGeo.dispose();
      ringMat.dispose();
      orbGeo.dispose();
      orbMat.dispose();
    },
  };
}
