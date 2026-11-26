import { CHARACTERS, CLASSIC_CAST_IDS, charById } from "../data/characters";
import { CONVERSATIONS } from "../data/conversations";
import {
  RECENT_EVENT_MAX,
  buildDailyGoal,
  buildDynamicDayMissions,
  type DailyGoalSpec,
} from "../data/dailyDirector";
import { EPISODE_EVENTS, FREE_MODE_EVENTS } from "../data/episodeEvents";
import { EPISODE_CONVERSATIONS, EPISODE_MISSIONS, episodeById } from "../data/episodes";
import { eventForDate, formatLongDate, parseLocalDate } from "../data/events";
import { BASE_MAILS, EVENT_MAILS } from "../data/mails";
import {
  CONF_HOST_SPOTS,
  CONF_SEATS,
  FLOOR_PORTALS,
  ROOMS,
  floorOfY,
  getActiveFurniture,
  setActiveFurniture,
  spotAt,
  type ConferenceSeat,
  type FloorPortal,
} from "../data/map";
import { ITEMS, MISSIONS } from "../data/missions";
import { WELCOME_SCENES, type WelcomeScene } from "../data/welcome";
import { pick } from "../random";
import {
  homeSpotFor,
  humanizeRecentTopic,
  normalizeMeetingIntervene,
  normalizeNpcApproach,
  type ChatMessage,
  type GameAi,
  type MeetingInterveneResult,
  type NpcApproachReply,
  type NpcApproachResult,
  type NpcMemory,
} from "../ai";
import { DUNDIES, OBJECTS, OBJ_BY_ID, SERVICES, SHOP } from "../data/objects";
import {
  CLIENTS,
  HANGUPS,
  MAX_INTEREST,
  OPENING,
  PROMPTS,
  REACTIONS,
  START_INTEREST,
  bucketFor,
  optionsFor,
  outcomeFor,
  scoreOption,
  type SaleOption,
} from "../data/sales";
import { DAY_END, DAY_START, formatClock } from "../time";
import type {
  BodyBuild,
  CameraShot,
  CharacterAccessory,
  ConversationDef,
  CostumeKind,
  EpisodeDef,
  EpisodeEventDef,
  EpisodeEventEffect,
  EventDef,
  ExclusiveSkinId,
  EyebrowMood,
  Facing,
  HairParting,
  HairStyle,
  Look,
  MeetingGesture,
  MissionDef,
  MissionStatus,
  ObjectDef,
  ServiceDef,
  TopKind,
} from "../types";
import { blockedAt } from "./collision";
import { findPath, resetNavGrid, walkableTarget } from "./pathfinding";
import type {
  CallSnapshot,
  CallState,
  CameraMode,
  ChatLogEntry,
  CinematicUI,
  ConvoRuntime,
  DialogOption,
  EndSummary,
  Mail,
  MeetingCinemaUI,
  MeetingEntry,
  MeetingNoticeUI,
  MeetingUI,
  MissionUI,
  NPC,
  OfficeEventUI,
  PcUI,
  Player,
  Toast,
  UIState,
} from "./state";

type OfficeEventPhase = "pending" | "trigger" | "calling" | "gathering" | "playing" | "done";

interface OfficeEventAiBeat {
  who: string;
  name: string;
  text: string;
  gesture: MeetingGesture;
}

interface OfficeEventRuntime {
  def: EpisodeEventDef;
  activeParticipants: string[];
  seatAssignments: Record<string, ConferenceSeat>;
  hostId: string;
  phase: OfficeEventPhase;
  phaseT: number;
  preludeIdx: number;
  preludeElapsed: number;
  preludeAnnouncedIdx: number;
  gatherElapsed: number;
  playerSeatedSince: number;
  playingEndsAt: number;
  announced: boolean;
  triggerAnnounced: boolean;
  callAnnounced: boolean;
  lineIdx: number;
  lineT: number;
  recordedLineIdx: number;
  heardLines: number;
  rewarded: boolean;
  aiBeat: OfficeEventAiBeat | null;
  aiBeatT: number;
  aiQueue: OfficeEventAiBeat[];
  extraEndWait: number;
}

interface NpcApproachRuntime {
  npcId: string;
  walkCallout: string;
  reason: string;
  openingLine: string;
  replies: NpcApproachReply[];
  startedAtMins: number;
  elapsedSec: number;
}

interface CareerState {
  dayNumber: number;
  careerRep: number;
  careerSales: number;
  recentEvents: string[];
}

const LOOK_STORAGE_KEY = "dm_player_look";
const WELCOME_STORAGE_KEY = "dm_welcome_seen";
const CAREER_STORAGE_KEY = "dm_career_state";
const UNLOCKED_SKINS_KEY = "dm_unlocked_skins";
const PLAYER_SKIN_KEY = "dm_player_skin";
const TOBY_INDIA_SKIN_PHRASE = "hola toby, dame la skin india";

export const DEFAULT_PLAYER_LOOK: Look = {
  skin: "#e6b48e",
  shirt: "#3f78a8",
  pants: "#2c3540",
  hair: "#3b2a20",
  hairStyle: "short",
  tie: "#f2c14e",
  glasses: false,
  beard: false,
  dress: false,
};

const HAIR_STYLES: HairStyle[] = [
  "short",
  "side",
  "wavy",
  "spiky",
  "buzz",
  "curly",
  "bob",
  "bun",
  "long",
  "bald",
];
const SKIN_TONES = ["#f2ccb0", "#e6b48e", "#d4986a", "#a86d42", "#6b4228"];
const HAIR_COLORS = ["#1e1b18", "#3b2a20", "#6e472b", "#b87a3d", "#d8b45c", "#a33c26", "#9a9ea4"];
const SHIRT_COLORS = [
  "#3f78a8",
  "#e8eef2",
  "#b8453d",
  "#3d7a5a",
  "#6e528f",
  "#c97b36",
  "#2c3540",
  "#c46c92",
];
const PANTS_COLORS = ["#2c3540", "#1f242b", "#4a433d", "#33475c", "#5c4d3c"];
const TIE_COLORS = ["#f2c14e", "#b83b36", "#2f6b8e", "#3d7a5a", "#6e528f", "#242830", ""];
const TOP_KINDS: TopKind[] = [
  "shirt",
  "suit",
  "cardigan",
  "vest",
  "short_sleeve",
  "workshirt",
  "blouse",
];
const JACKET_COLORS = ["#2c3442", "#3a3532", "#47525e", "#7c3b46", "#3d6b56", "#6b543c"];
const BODY_BUILDS: BodyBuild[] = ["slim", "regular", "tall", "petite", "broad", "heavy"];
const PARTINGS: HairParting[] = ["center", "side", "receding", "slick", "floppy"];
const BROW_MOODS: EyebrowMood[] = ["neutral", "stern", "warm", "raised", "sad"];
const ACCESSORIES: CharacterAccessory[] = [
  "mug",
  "crossword",
  "catPin",
  "pearls",
  "earrings",
  "watch",
  "badge",
];

function loadPlayerLook(): Look {
  try {
    if (typeof window === "undefined" || !window.localStorage) return { ...DEFAULT_PLAYER_LOOK };
    const raw = window.localStorage.getItem(LOOK_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PLAYER_LOOK };
    const parsed = JSON.parse(raw) as Partial<Look>;
    const style = HAIR_STYLES.includes(parsed.hairStyle as HairStyle)
      ? (parsed.hairStyle as HairStyle)
      : DEFAULT_PLAYER_LOOK.hairStyle;
    const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
    const resolvedTie =
      parsed.tie === "" || parsed.tie === undefined
        ? undefined
        : isHex(parsed.tie)
          ? parsed.tie
          : DEFAULT_PLAYER_LOOK.tie;
    const resolvedTopKind = TOP_KINDS.includes(parsed.topKind as TopKind)
      ? (parsed.topKind as TopKind)
      : undefined;
    const resolvedBuild = BODY_BUILDS.includes(parsed.build as BodyBuild)
      ? (parsed.build as BodyBuild)
      : undefined;
    const resolvedParting = PARTINGS.includes(parsed.parting as HairParting)
      ? (parsed.parting as HairParting)
      : undefined;
    const resolvedBrows = BROW_MOODS.includes(parsed.eyebrows as EyebrowMood)
      ? (parsed.eyebrows as EyebrowMood)
      : undefined;
    const resolvedAcc = ACCESSORIES.includes(parsed.accessory as CharacterAccessory)
      ? (parsed.accessory as CharacterAccessory)
      : undefined;

    return {
      skin: isHex(parsed.skin) ? parsed.skin : DEFAULT_PLAYER_LOOK.skin,
      shirt: isHex(parsed.shirt) ? parsed.shirt : DEFAULT_PLAYER_LOOK.shirt,
      pants: isHex(parsed.pants) ? parsed.pants : DEFAULT_PLAYER_LOOK.pants,
      hair: isHex(parsed.hair) ? parsed.hair : DEFAULT_PLAYER_LOOK.hair,
      hairStyle: style,
      ...(resolvedTie ? { tie: resolvedTie } : {}),
      ...(isHex(parsed.bowTie) ? { bowTie: parsed.bowTie } : {}),
      glasses: !!parsed.glasses,
      beard: !!parsed.beard,
      ...(parsed.mustache ? { mustache: true } : {}),
      dress: !!parsed.dress,
      ...(resolvedTopKind ? { topKind: resolvedTopKind } : {}),
      ...(isHex(parsed.jacketColor) ? { jacketColor: parsed.jacketColor } : {}),
      ...(resolvedBuild ? { build: resolvedBuild } : {}),
      ...(resolvedParting ? { parting: resolvedParting } : {}),
      ...(resolvedBrows ? { eyebrows: resolvedBrows } : {}),
      ...(resolvedAcc ? { accessory: resolvedAcc } : {}),
      ...(isHex(parsed.eyeColor) ? { eyeColor: parsed.eyeColor } : {}),
      ...(isHex(parsed.lipColor) ? { lipColor: parsed.lipColor } : {}),
    };
  } catch {
    return { ...DEFAULT_PLAYER_LOOK };
  }
}

function savePlayerLook(look: Look) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(LOOK_STORAGE_KEY, JSON.stringify(look));
    }
  } catch {
    // ignore storage errors
  }
}

function loadUnlockedSkins(): ExclusiveSkinId[] {
  try {
    if (typeof window === "undefined" || !window.localStorage) return [];
    const raw = window.localStorage.getItem(UNLOCKED_SKINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is ExclusiveSkinId => id === "india");
  } catch {
    return [];
  }
}

function saveUnlockedSkins(skins: ExclusiveSkinId[]) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(UNLOCKED_SKINS_KEY, JSON.stringify(skins));
    }
  } catch {
    // ignore
  }
}

function loadPlayerSkin(unlocked: ExclusiveSkinId[]): ExclusiveSkinId | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(PLAYER_SKIN_KEY);
    return raw === "india" && unlocked.includes("india") ? "india" : null;
  } catch {
    return null;
  }
}

function savePlayerSkin(skin: ExclusiveSkinId | null) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      if (skin) window.localStorage.setItem(PLAYER_SKIN_KEY, skin);
      else window.localStorage.removeItem(PLAYER_SKIN_KEY);
    }
  } catch {
    // ignore
  }
}

function hasSeenWelcome(): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return true;
    return window.localStorage.getItem(WELCOME_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function markWelcomeSeen() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(WELCOME_STORAGE_KEY, "1");
    }
  } catch {
    // ignore storage errors
  }
}

function loadCareerState(): CareerState {
  const empty: CareerState = { dayNumber: 1, careerRep: 0, careerSales: 0, recentEvents: [] };
  try {
    if (typeof window === "undefined" || !window.localStorage) return empty;
    const raw = window.localStorage.getItem(CAREER_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<CareerState>;
    const dayNumber =
      typeof parsed.dayNumber === "number" &&
      Number.isFinite(parsed.dayNumber) &&
      parsed.dayNumber >= 1
        ? Math.floor(parsed.dayNumber)
        : 1;
    const careerRep =
      typeof parsed.careerRep === "number" &&
      Number.isFinite(parsed.careerRep) &&
      parsed.careerRep >= 0
        ? Math.floor(parsed.careerRep)
        : 0;
    const careerSales =
      typeof parsed.careerSales === "number" &&
      Number.isFinite(parsed.careerSales) &&
      parsed.careerSales >= 0
        ? Math.floor(parsed.careerSales)
        : 0;
    const recentEvents = Array.isArray(parsed.recentEvents)
      ? parsed.recentEvents
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .slice(0, RECENT_EVENT_MAX)
      : [];
    return { dayNumber, careerRep, careerSales, recentEvents };
  } catch {
    return empty;
  }
}

function saveCareerState(state: CareerState) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // ignore storage errors
  }
}

export const PLAYER_RADIUS = 12;
const TALK_RADIUS = 62;
const OBJECT_RADIUS = 56;
const HEAR_RADIUS = 210;
const NPC_SPEED = 92;
const URGENT_NPC_SPEED = 138;
const WALK_SPEED = 165;
const RUN_SPEED = 265;
const MINUTES_PER_SECOND = 1;

export type Hover =
  | { kind: "npc"; id: string; x: number; y: number; label: string }
  | { kind: "object"; id: string; x: number; y: number; label: string }
  | { kind: "dundie"; id: string; x: number; y: number; label: string }
  | { kind: "service"; id: string; x: number; y: number; label: string }
  | { kind: "portal"; id: string; x: number; y: number; label: string }
  | { kind: "meeting"; id: string; x: number; y: number; label: string };

type Listener = () => void;

const HAPPENINGS: { at: number; text: string }[] = [
  { at: 10 * 60, text: "📢 Michael grita desde su despacho: «¡Que nadie toque mi taza!»" },
  { at: 12 * 60, text: "🍽️ Hora de comer: la sala de descanso se llena." },
  {
    at: 13 * 60 + 30,
    text: "📠 Dwight ha activado el «protocolo de seguridad». Nadie sabe qué significa.",
  },
  { at: 15 * 60, text: "☕ Bajón de las tres: hasta Michael bosteza." },
  { at: 16 * 60 + 30, text: "⏰ Queda media hora. Stanley ya tiene el abrigo puesto." },
];

export class Game {
  // world
  player: Player = { x: 685, y: 582, facing: "up", moving: false, walkT: 0 };
  npcs: NPC[] = [];
  convos: ConvoRuntime[] = [];
  officeEvents: OfficeEventRuntime[] = [];
  episode: EpisodeDef | null = null;
  activeCharIds: string[] = [...CLASSIC_CAST_IDS];
  seatOverrides: Record<string, string> = {};
  roleOverrides: Record<string, string> = {};
  introOverrides: Record<string, string> = {};
  event: EventDef | null = null;
  date: Date = new Date();
  mins = DAY_START;
  keys: Record<string, boolean> = {};
  hover: Hover | null = null;
  time = 0; // real seconds since start (for animations)

  // progress & career
  private initialCareer = loadCareerState();
  dayNumber = this.initialCareer.dayNumber;
  careerRep = this.initialCareer.careerRep;
  careerSales = this.initialCareer.careerSales;
  recentEvents: string[] = [...this.initialCareer.recentEvents];
  private dailyGoalSpec: DailyGoalSpec = buildDailyGoal({
    dayNumber: this.dayNumber,
    episode: null,
    eventId: null,
    eventName: null,
    recentEvents: this.recentEvents,
    careerRep: this.careerRep,
    careerSales: this.careerSales,
  });
  private goalToastShown = false;
  private lastStartDateISO = "2026-11-11";

  money = 10;
  rep = 0;
  energy = 100;
  sales = 0;
  calls = 0;
  coffeeReadyAt = 0;
  pingpongReadyAt = 0;
  inventory: Record<string, number> = {};
  missions: MissionDef[] = [...MISSIONS];
  missionStatus: Record<string, MissionStatus> = {};
  missionStep: Record<string, number> = {};
  missionBase: Record<string, { sales: number; gossip: number }> = {};
  heard: string[] = [];
  dundiesFound: string[] = [];
  readMails = new Set<string>();
  happeningsShown = new Set<number>();
  lowEnergyWarned = false;
  private portalCooldown = 0;
  private playerActionUntil = 0;
  private playerActionText = "";
  playerActionSeed = 0;

  // ui
  phase: UIState["phase"] = "start";
  paused = false;
  journal = false;
  cameraMode: CameraMode = "shoulder_right";
  cameraYaw = 0;
  playerYaw = 0;
  meetingOpen = false;
  private meetingEventId: string | null = null;
  private meetingEntries: Record<string, MeetingEntry[]> = {};
  private meetingSpontaneousHost = "michael";
  private meetingSpontaneousAttendees: string[] = [];
  private npcApproach: NpcApproachRuntime | null = null;
  private nextApproachAt = DAY_START + 22;
  private recentApproachIds: string[] = [];
  playerLook: Look = loadPlayerLook();
  unlockedSkins: ExclusiveSkinId[] = loadUnlockedSkins();
  playerSkin: ExclusiveSkinId | null = loadPlayerSkin(this.unlockedSkins);
  private cinematicState: {
    scene: WelcomeScene;
    sceneNumber: number;
    step: 0 | 1 | 2;
    reactionText: string;
  } | null = null;
  dialog: {
    speaker: string;
    role: string;
    portrait: string | null;
    line: string;
    options: DialogOption[];
  } | null = null;
  dialogHistory: { line: string; options: DialogOption[] }[] = [];
  pc: PcUI | null = null;
  call: CallState | null = null;
  /** NPC id of the free (AI) chat currently open. */
  chatWith: string | null = null;
  chatLogs: Record<string, ChatLogEntry[]> = {};
  memories: Record<string, NpcMemory[]> = {};
  private sessionChatMessages: ChatMessage[] = [];
  private sessionBaseLen = 0;
  /** Client reactions of the current AI call, by step (fed back as context). */
  private aiReactions: (string | null)[] = [];
  /** AI provider plugged in by the UI; null = classic content only. */
  ai: GameAi | null = null;
  toasts: Toast[] = [];
  private toastId = 1;
  private listeners = new Set<Listener>();
  private snapshot: UIState;
  private lastEmitMinute = -1;
  private talkingTo: string | null = null;
  private startRunId = 0;

  constructor() {
    this.snapshot = this.buildSnapshot();
  }

  // ---------- store ----------
  subscribe = (fn: Listener) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.snapshot;
  emit() {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((l) => l());
  }

  // ---------- camera & player look & welcome cinematic ----------
  toggleCameraMode = () => {
    const order: CameraMode[] = ["shoulder_right", "shoulder_left", "first_person"];
    const next = order[(order.indexOf(this.cameraMode) + 1) % order.length]!;
    this.cameraMode = next;
    this.emit();
  };

  setCameraYaw(yaw: number) {
    this.cameraYaw = yaw;
  }

  get isCinematic(): boolean {
    return !!this.cinematicState;
  }

  get cinematicCostume(): CostumeKind | undefined {
    return this.cinematicState?.scene.costume;
  }

  setPlayerLook = (
    patch: Partial<Look> & {
      tie?: string | undefined;
      bowTie?: string | undefined;
      jacketColor?: string | undefined;
    },
  ) => {
    const { tie, bowTie, jacketColor, ...rest } = patch;
    const next: Look = { ...this.playerLook, ...rest };
    if ("tie" in patch) {
      if (tie) next.tie = tie;
      else delete next.tie;
    }
    if ("bowTie" in patch) {
      if (bowTie) next.bowTie = bowTie;
      else delete next.bowTie;
    }
    if ("jacketColor" in patch) {
      if (jacketColor) next.jacketColor = jacketColor;
      else delete next.jacketColor;
    }
    this.playerLook = next;
    savePlayerLook(this.playerLook);
    this.emit();
  };

  resetPlayerLook = () => {
    this.playerLook = { ...DEFAULT_PLAYER_LOOK };
    this.playerSkin = null;
    savePlayerLook(this.playerLook);
    savePlayerSkin(null);
    this.emit();
  };

  setPlayerSkin = (skin: ExclusiveSkinId | null) => {
    if (skin !== null && !this.unlockedSkins.includes(skin)) return;
    this.playerSkin = skin;
    savePlayerSkin(skin);
    this.toast(
      skin === "india"
        ? "🕉️✨ Skin exclusiva equipada: El Maharajah del Meme"
        : "👔 Has vuelto a tu aspecto de oficina.",
      "event",
    );
    this.emit();
  };

  isSecretChatTrigger(characterId: string, content: string): boolean {
    return characterId === "toby" && content.trim() === TOBY_INDIA_SKIN_PHRASE;
  }

  randomizePlayerLook = () => {
    const tieChoice = pick(TIE_COLORS);
    const useBow = Math.random() < 0.16;
    const topKind = pick(["shirt", "suit", "cardigan", "vest", "short_sleeve"] as TopKind[]);
    this.setPlayerLook({
      skin: pick(SKIN_TONES),
      hair: pick(HAIR_COLORS),
      hairStyle: pick(HAIR_STYLES),
      shirt: pick(SHIRT_COLORS),
      pants: pick(PANTS_COLORS),
      topKind,
      jacketColor:
        topKind === "suit" || topKind === "cardigan" || topKind === "vest"
          ? pick(JACKET_COLORS)
          : "",
      tie: useBow ? "" : tieChoice,
      bowTie: useBow ? "#7e2538" : "",
      glasses: Math.random() < 0.3,
      beard: Math.random() < 0.2,
      mustache: Math.random() < 0.15,
      dress: Math.random() < 0.25,
    });
  };

  private beginWelcomeCinematic(avoidId?: string) {
    const michael = this.npcById("michael");
    if (!michael || WELCOME_SCENES.length === 0) return;
    let idx = Math.floor(Math.random() * WELCOME_SCENES.length);
    if (avoidId && WELCOME_SCENES.length > 1 && WELCOME_SCENES[idx]!.id === avoidId) {
      idx =
        (idx + 1 + Math.floor(Math.random() * (WELCOME_SCENES.length - 1))) % WELCOME_SCENES.length;
    }
    const scene = WELCOME_SCENES[idx]!;
    this.player = { x: 285, y: 425, facing: "right", moving: false, running: false, walkT: 0 };
    const mStart = walkableTarget(425, 315);
    michael.x = mStart.x;
    michael.y = mStart.y;
    michael.facing = "down";
    michael.moving = true;
    michael.path = [];
    michael.target = { x: 365, y: 425 };
    michael.targetKey = "welcome_cinematic";
    michael.action = "Dándote la bienvenida";
    this.cinematicState = { scene, sceneNumber: idx + 1, step: 0, reactionText: "" };
  }

  private finishCinematic(showIntroToast = true) {
    if (!this.cinematicState) return;
    this.cinematicState = null;
    markWelcomeSeen();
    const michael = this.npcById("michael");
    if (michael) {
      michael.moving = false;
      michael.path = [];
      michael.targetKey = "";
      michael.facing = "down";
    }
    if (showIntroToast && this.missionStatus["intro"] === "active") {
      this.toast(`Pam: «${this.missionById("intro").offer}»`, "mission");
    }
    this.emit();
  }

  cinematicNext = () => {
    const c = this.cinematicState;
    if (!c) return;
    if (c.step === 0) {
      c.step = 1;
      this.emit();
      return;
    }
    if (c.step === 2) {
      this.finishCinematic(true);
    }
  };

  cinematicChoose = (index: number) => {
    const c = this.cinematicState;
    if (!c || c.step !== 1) return;
    const reply = c.scene.replies[index];
    if (!reply) return;
    c.reactionText = `${reply.reaction} ${c.scene.closing}`;
    c.step = 2;
    this.emit();
  };

  skipCinematic = () => {
    this.finishCinematic(true);
  };

  replayWelcome = () => {
    if (this.phase !== "playing") return;
    this.paused = false;
    this.journal = false;
    this.dialog = null;
    this.dialogHistory = [];
    this.pc = null;
    this.chatWith = null;
    this.beginWelcomeCinematic(this.cinematicState?.scene.id);
    this.emit();
  };

  // ---------- setup ----------
  private homeSpotForNpc(id: string): string {
    return this.seatOverrides[id] ?? homeSpotFor(id);
  }

  roleOf(id: string): string {
    return this.roleOverrides[id] ?? charById(id).role;
  }

  private introOf(id: string): string {
    return this.introOverrides[id] ?? charById(id).intro;
  }

  private episodeContextText(): string | null {
    if (!this.episode) return null;
    return `${this.episode.epLabel} «${this.episode.title}» (${this.episode.dateLabel}): ${this.episode.officeState}. ${this.episode.summary}`.slice(
      0,
      750,
    );
  }

  private isMissionCompatible(m: MissionDef, activeSet: Set<string>): boolean {
    if (!activeSet.has(m.giver)) return false;
    for (const s of m.steps) {
      if (s.kind === "talk" && !activeSet.has(s.target)) return false;
    }
    return true;
  }

  private persistCareer() {
    saveCareerState({
      dayNumber: this.dayNumber,
      careerRep: this.careerRep,
      careerSales: this.careerSales,
      recentEvents: this.recentEvents,
    });
  }

  recordRecentEvent(text: string) {
    const clean = text.replace(/\s+/g, " ").trim().slice(0, 140);
    if (!clean) return;
    if (this.recentEvents[0] === clean) return;
    this.recentEvents = [clean, ...this.recentEvents.filter((e) => e !== clean)].slice(
      0,
      RECENT_EVENT_MAX,
    );
    this.persistCareer();
  }

  private dailyGoalProgress() {
    const missionsDone = this.missionsDoneCount();
    const repOk = this.rep >= this.dailyGoalSpec.targetRep;
    const salesOk = this.sales >= this.dailyGoalSpec.targetSales;
    const missionsOk = missionsDone >= this.dailyGoalSpec.targetMissions;
    const completedCount = Number(repOk) + Number(salesOk) + Number(missionsOk);
    return {
      ...this.dailyGoalSpec,
      rep: this.rep,
      sales: this.sales,
      missionsDone,
      completedCount,
      allCompleted: completedCount === 3,
    };
  }

  private checkGoalToast() {
    if (this.goalToastShown) return;
    if (this.dailyGoalProgress().allCompleted) {
      this.goalToastShown = true;
      this.toast(
        `🏆 ¡Objetivo del Día ${this.dayNumber} cumplido! Sigue sumando puntos antes de las 17:00.`,
        "event",
      );
    }
  }

  resetCareer = () => {
    this.dayNumber = 1;
    this.careerRep = 0;
    this.careerSales = 0;
    this.recentEvents = [];
    this.dailyGoalSpec = buildDailyGoal({
      dayNumber: 1,
      episode: null,
      eventId: null,
      eventName: null,
      recentEvents: [],
      careerRep: 0,
      careerSales: 0,
    });
    this.persistCareer();
    this.emit();
  };

  nextDay = () => {
    const nextDate = new Date(
      this.date.getFullYear(),
      this.date.getMonth(),
      this.date.getDate() + 1,
    );
    if (nextDate.getDay() === 6) nextDate.setDate(nextDate.getDate() + 2);
    else if (nextDate.getDay() === 0) nextDate.setDate(nextDate.getDate() + 1);
    const iso = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;
    this.dayNumber += 1;
    this.persistCareer();
    this.start(iso, null, { skipWelcome: true });
  };

  start(
    dateISO: string,
    episodeId?: string | null,
    opts?: { forceWelcome?: boolean; skipWelcome?: boolean },
  ) {
    const runId = ++this.startRunId;
    const ep = episodeById(episodeId ?? null);
    this.episode = ep;
    this.lastStartDateISO = ep ? ep.dateISO : dateISO;
    this.date = parseLocalDate(this.lastStartDateISO);
    this.event = eventForDate(this.date);
    this.activeCharIds = ep ? [...ep.castIds] : [...CLASSIC_CAST_IDS];
    this.dailyGoalSpec = buildDailyGoal({
      dayNumber: this.dayNumber,
      episode: ep,
      eventId: this.event?.id ?? null,
      eventName: this.event?.name ?? null,
      recentEvents: this.recentEvents,
      careerRep: this.careerRep,
      careerSales: this.careerSales,
    });
    this.goalToastShown = false;
    const activeSet = new Set(this.activeCharIds);
    this.seatOverrides = { ...(ep?.seatOverrides ?? {}) };
    this.roleOverrides = { ...(ep?.roleOverrides ?? {}) };
    this.introOverrides = { ...(ep?.introOverrides ?? {}) };

    setActiveFurniture(ep?.extraDesks ?? []);
    resetNavGrid();

    this.player = {
      x: 685,
      y: 582,
      facing: "up",
      moving: false,
      running: false,
      walkT: 0,
      action: "",
    };
    this.playerActionUntil = 0;
    this.playerActionText = "";
    this.playerActionSeed = 0;
    this.cameraYaw = 0;
    this.playerYaw = 0;
    this.portalCooldown = 0;
    this.mins = DAY_START;
    this.money = 10;
    this.rep = 0;
    this.energy = 100;
    this.sales = 0;
    this.calls = 0;
    this.coffeeReadyAt = 0;
    this.pingpongReadyAt = 0;
    this.inventory = {};
    this.heard = [];
    this.dundiesFound = [];
    this.readMails = new Set<string>();
    this.happeningsShown = new Set<number>();
    this.lowEnergyWarned = false;
    this.paused = false;
    this.journal = false;
    this.cinematicState = null;
    this.dialog = null;
    this.dialogHistory = [];
    this.pc = null;
    this.call = null;

    this.npcs = CHARACTERS.filter((def) => activeSet.has(def.id)).map((rawDef) => {
      const ownSeat = `seat_${rawDef.id}`;
      const assignedSeat = this.seatOverrides[rawDef.id];
      const def =
        assignedSeat || this.roleOverrides[rawDef.id] || this.introOverrides[rawDef.id]
          ? {
              ...rawDef,
              role: this.roleOverrides[rawDef.id] ?? rawDef.role,
              intro: this.introOverrides[rawDef.id] ?? rawDef.intro,
              routine: rawDef.routine.map((r) =>
                assignedSeat && r.spot === ownSeat ? { ...r, spot: assignedSeat } : r,
              ),
            }
          : rawDef;
      const first = def.routine[0]!;
      const pos = walkableTarget(spotAt(first.spot).x, spotAt(first.spot).y);
      return {
        def,
        x: pos.x,
        y: pos.y,
        facing: "down" as Facing,
        moving: false,
        walkT: 0,
        path: [],
        targetKey: first.spot,
        target: pos,
        action: first.action,
      };
    });

    const epConvos = ep ? (EPISODE_CONVERSATIONS[ep.id] ?? []) : [];
    const baseConvos = [...epConvos, ...CONVERSATIONS].filter((c) =>
      c.who.every((w) => activeSet.has(w)),
    );
    this.convos = this.scheduleConvos(baseConvos).map((def) => ({
      def,
      state: "pending",
      line: 0,
      lineT: 0,
      arrived: false,
    }));

    const rawOfficeEvents = ep ? (EPISODE_EVENTS[ep.id] ?? []) : FREE_MODE_EVENTS;
    const guestSeats = CONF_SEATS.slice(1);
    this.officeEvents = rawOfficeEvents
      .map((def): OfficeEventRuntime | null => {
        const hostId = activeSet.has(def.host)
          ? def.host
          : (def.participants.find((id) => activeSet.has(id)) ?? "");
        if (!hostId) return null;
        const prioritizedGuests = def.participants.filter(
          (id) => id !== hostId && activeSet.has(id),
        );
        const extraGuests = def.isMeeting
          ? this.activeCharIds.filter((id) => id !== hostId && !prioritizedGuests.includes(id))
          : [];
        const activeParticipants = [hostId, ...prioritizedGuests, ...extraGuests];
        if (activeParticipants.length < 2) return null;
        const seatAssignments: Record<string, ConferenceSeat> = {};
        if (def.isMeeting && def.room === "conf") {
          const allGuests = [...prioritizedGuests, ...extraGuests];
          allGuests.forEach((id, idx) => {
            seatAssignments[id] = guestSeats[idx % guestSeats.length]!;
          });
        }
        return {
          def,
          activeParticipants,
          seatAssignments,
          hostId,
          phase: "pending",
          phaseT: 0,
          preludeIdx: 0,
          preludeElapsed: 0,
          preludeAnnouncedIdx: -1,
          gatherElapsed: 0,
          playerSeatedSince: -1,
          playingEndsAt: def.at + def.duration,
          announced: false,
          triggerAnnounced: false,
          callAnnounced: false,
          lineIdx: 0,
          lineT: 0,
          recordedLineIdx: -1,
          heardLines: 0,
          rewarded: false,
          aiBeat: null,
          aiBeatT: 0,
          aiQueue: [],
          extraEndWait: 0,
        };
      })
      .filter((x): x is OfficeEventRuntime => x !== null);

    this.meetingOpen = false;
    this.meetingEventId = null;
    this.meetingEntries = {};
    this.meetingSpontaneousHost = activeSet.has("michael")
      ? "michael"
      : (this.activeCharIds[0] ?? "michael");
    this.meetingSpontaneousAttendees = [];
    this.npcApproach = null;
    this.nextApproachAt = DAY_START + 22;
    this.recentApproachIds = [];

    const epMissions = ep ? (EPISODE_MISSIONS[ep.id] ?? []) : [];
    this.missions = buildDynamicDayMissions({
      dayNumber: this.dayNumber,
      dateISO: this.lastStartDateISO,
      activeCharIds: this.activeCharIds,
      episode: ep,
      eventId: this.event?.id ?? null,
      recentEvents: this.recentEvents,
      baseMissions: MISSIONS,
      epMissions,
    });

    this.missionStatus = {};
    this.missionStep = {};
    this.missionBase = {};
    for (const m of this.missions) this.missionStatus[m.id] = "locked";
    this.chatWith = null;
    this.chatLogs = {};
    this.memories = {};
    this.sessionChatMessages = [];
    this.sessionBaseLen = 0;
    this.phase = "playing";
    this.activateMission("intro", true);
    const shouldWelcome =
      !opts?.skipWelcome && (opts?.forceWelcome || !hasSeenWelcome()) && !!this.npcById("michael");
    if (shouldWelcome) {
      this.beginWelcomeCinematic();
    } else {
      const introM = this.missionById("intro");
      const giverFirst = charById(introM.giver).name.split(" ")[0];
      this.toast(`${giverFirst}: «${introM.offer}»`, "mission");
      this.toast(`🎯 ${this.dailyGoalSpec.headline}`, "info");
    }
    if (ep) this.toast(ep.openingToast, "event");
    if (this.event)
      this.toast(
        `${this.event.emoji} Hoy es ${this.event.name}: ${this.event.description}`,
        "event",
      );
    this.emit();
    if (this.ai) void this.loadAiDayContent(runId);
  }

  private async loadAiDayContent(runId: number) {
    if (!this.ai) return;
    const activeSet = new Set(this.activeCharIds);
    const cleanRecent = this.recentEvents.map(humanizeRecentTopic).filter(Boolean).slice(0, 8);
    const input = {
      dateLabel: formatLongDate(this.date),
      dayNumber: this.dayNumber,
      recentEvents: cleanRecent,
      dailyGoal: this.dailyGoalSpec.headline,
      eventId: this.event?.id ?? null,
      eventName: this.event?.name ?? null,
      eventDesc: this.event?.description ?? null,
      activeCharIds: this.activeCharIds,
      episodeContext: this.episodeContextText(),
    };
    const [convosRes, missionsRes] = await Promise.allSettled([
      this.ai.dailyConvos(input),
      this.ai.dailyMissions(input),
    ]);
    if (this.startRunId !== runId || this.phase !== "playing") return;

    if (convosRes.status === "fulfilled" && convosRes.value.length >= 3) {
      const kept = this.convos.filter((c) => c.dynamic || c.state !== "pending");
      const validAiConvos = convosRes.value.filter((c) => c.who.every((w) => activeSet.has(w)));
      const scheduledAi = this.scheduleConvos(
        validAiConvos,
        kept.map((k) => k.def),
      ).filter((c) => c.at + c.duration > this.mins + 2);
      if (scheduledAi.length > 0) {
        this.convos = [
          ...kept,
          ...scheduledAi.map((def) => ({
            def,
            state: "pending" as const,
            line: 0,
            lineT: 0,
            arrived: false,
          })),
        ];
      }
    }

    if (missionsRes.status === "fulfilled" && missionsRes.value.length >= 4) {
      const kept = this.missions.filter(
        (m) =>
          m.id === "intro" ||
          m.id === "final" ||
          m.id.startsWith("ep_") ||
          m.id.startsWith("dyn_ev_") ||
          !!m.event ||
          this.missionStatus[m.id] === "active" ||
          this.missionStatus[m.id] === "done",
      );
      const activeRegularGivers = new Set(
        kept.filter((m) => m.id !== "intro" && m.id !== "final" && !m.event).map((m) => m.giver),
      );
      const fresh = missionsRes.value.filter(
        (m) => !activeRegularGivers.has(m.giver) && this.isMissionCompatible(m, activeSet),
      );
      const finalM = kept.find((m) => m.id === "final");
      if (finalM && this.missionStatus["final"] === "locked") {
        finalM.requiresCount = Math.min(
          6,
          Math.max(2, Math.floor((fresh.length + activeRegularGivers.size) * 0.5)),
        );
      }
      for (const m of fresh) this.missionStatus[m.id] = "locked";
      this.missions = [...kept, ...fresh];
    }

    this.emit();
  }

  /** Episode and event conversations first, then regular ones that don't clash with anybody's schedule. */
  private scheduleConvos(
    source: ConversationDef[],
    existing: ConversationDef[] = [],
  ): ConversationDef[] {
    const activeSet = new Set(this.activeCharIds);
    const eligible = source.filter((c) => c.who.every((w) => activeSet.has(w)));
    const pool = [
      ...eligible.filter((c) => c.id.startsWith("ep_")),
      ...eligible.filter((c) => !c.id.startsWith("ep_") && c.event && c.event === this.event?.id),
      ...eligible.filter((c) => !c.id.startsWith("ep_") && !c.event),
    ];
    const chosen: ConversationDef[] = [...existing];
    const added: ConversationDef[] = [];
    for (const c of pool) {
      const clash = chosen.some(
        (o) =>
          o.who.some((w) => c.who.includes(w)) &&
          c.at < o.at + o.duration &&
          o.at < c.at + c.duration,
      );
      if (!clash) {
        chosen.push(c);
        added.push(c);
      }
    }
    return added.sort((a, b) => a.at - b.at);
  }

  get isMeetingCinema(): boolean {
    const ev = this.activeOfficeEventRuntime();
    return Boolean(ev && ev.def.isMeeting && ev.phase === "playing");
  }

  get frozen() {
    return (
      this.phase !== "playing" ||
      this.paused ||
      !!this.cinematicState ||
      this.journal ||
      !!this.dialog ||
      !!this.pc ||
      !!this.chatWith ||
      this.meetingOpen
    );
  }

  private triggerPlayerAction(text: string, duration = 3.2) {
    this.playerActionText = text;
    this.playerActionUntil = this.time + duration;
    this.playerActionSeed = (this.playerActionSeed + 1) % 10;
    this.player.action = text;
  }

  private syncPlayerAction() {
    if (this.pc?.screen === "call") {
      this.player.action = "Llamada de ventas";
      return;
    }
    if (this.pc?.screen === "result") {
      this.player.action = this.pc.hungUp ? "Llamada de ventas" : "Celebrando Dundie";
      return;
    }
    if (this.pc) {
      this.player.action =
        this.pc.screen === "mail" || this.pc.screen === "mailRead"
          ? "Revisando archivos"
          : "Escritorio";
      return;
    }
    if (this.dialog || this.chatWith) {
      this.player.action = this.talkingTo ? "Charlando" : this.playerActionText || "Charlando";
      return;
    }
    if (this.time < this.playerActionUntil) {
      this.player.action = this.playerActionText;
      return;
    }
    this.player.action = "";
  }

  // ---------- loop ----------
  update(dt: number) {
    this.time += dt;
    if (this.portalCooldown > 0) this.portalCooldown = Math.max(0, this.portalCooldown - dt);
    if (this.cinematicState && !this.paused && this.phase === "playing") {
      this.player.moving = false;
      this.player.running = false;
      this.syncPlayerAction();
      this.updateCinematicActors(dt);
      return;
    }
    if (this.isMeetingCinema && !this.paused && this.phase === "playing") {
      this.player.moving = false;
      this.player.running = false;
      this.player.seated = true;
      this.player.gesture = this.meetingOpen ? "raise_hand" : "none";
      this.syncPlayerAction();
      this.updateOfficeEvents(dt);
      this.updateNPCs(dt);
      return;
    }
    if (this.frozen) {
      this.player.moving = false;
      this.player.running = false;
      this.syncPlayerAction();
      return;
    }
    const wasInConf = this.isPlayerInConferenceRoom();
    this.updatePlayer(dt);
    this.syncPlayerAction();
    const nowInConf = this.isPlayerInConferenceRoom();
    const prevMin = Math.floor(this.mins);
    const activeMeeting = this.activeOfficeEventRuntime();
    const pauseClockForGather =
      activeMeeting?.def.isMeeting &&
      (activeMeeting.phase === "trigger" ||
        activeMeeting.phase === "calling" ||
        activeMeeting.phase === "gathering");
    if (!pauseClockForGather) {
      this.mins += dt * MINUTES_PER_SECOND;
    }
    this.energy = Math.max(
      0,
      this.energy -
        dt * MINUTES_PER_SECOND * (this.player.moving && this.isRunning() ? 0.22 : 0.07),
    );
    if (this.energy < 20 && !this.lowEnergyWarned) {
      this.lowEnergyWarned = true;
      this.toast(
        "😴 Estás agotado: caminas más lento. Tómate un café o algo de la máquina.",
        "warn",
      );
    }
    if (this.energy > 30) this.lowEnergyWarned = false;
    for (const h of HAPPENINGS) {
      if (this.mins >= h.at && !this.happeningsShown.has(h.at)) {
        this.happeningsShown.add(h.at);
        this.toast(h.text, "info");
      }
    }
    this.updateOfficeEvents(dt);
    this.updateNpcApproach(dt);
    this.updateNPCs(dt);
    this.updateConvos(dt);
    this.checkAutoSteps();
    this.updateHover();
    if (wasInConf !== nowInConf || this.snapshot.inConferenceRoom !== nowInConf) this.emit();
    if (this.mins >= DAY_END) {
      this.mins = DAY_END;
      this.endDay();
      return;
    }
    if (Math.floor(this.mins) !== prevMin && Math.floor(this.mins) !== this.lastEmitMinute) {
      this.lastEmitMinute = Math.floor(this.mins);
      this.emit();
    }
  }

  private updateCinematicActors(dt: number) {
    const michael = this.npcById("michael");
    if (!michael) return;
    const tx = 365;
    const ty = 425;
    const dx = tx - michael.x;
    const dy = ty - michael.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 3) {
      michael.x = tx;
      michael.y = ty;
      michael.moving = false;
      michael.facing = "left";
      return;
    }
    const step = Math.min(dist, 120 * dt);
    michael.x += (dx / dist) * step;
    michael.y += (dy / dist) * step;
    michael.moving = true;
    michael.walkT += dt * 9;
    michael.facing =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
  }

  private isRunning() {
    return !!this.keys["Shift"];
  }

  private updatePlayer(dt: number) {
    let fwd = 0;
    let strafe = 0;
    if (this.keys["w"] || this.keys["ArrowUp"]) fwd++;
    if (this.keys["s"] || this.keys["ArrowDown"]) fwd--;
    if (this.keys["a"] || this.keys["ArrowLeft"]) strafe--;
    if (this.keys["d"] || this.keys["ArrowRight"]) strafe++;
    const p = this.player;
    if (!fwd && !strafe) {
      p.moving = false;
      p.running = false;
      return;
    }
    this.playerActionUntil = 0;
    const len = Math.hypot(fwd, strafe);
    fwd /= len;
    strafe /= len;
    const sinY = Math.sin(this.cameraYaw);
    const cosY = Math.cos(this.cameraYaw);
    const dx = sinY * fwd + cosY * strafe;
    const dy = -cosY * fwd + sinY * strafe;

    const run = this.isRunning() && this.energy >= 20;
    let speed = this.isRunning() ? RUN_SPEED : WALK_SPEED;
    if (this.energy < 20) speed *= 0.65;
    const step = speed * dt;
    const nx = p.x + dx * step;
    const ny = p.y + dy * step;
    if (!this.playerBlocked(nx, p.y, p.x, p.y)) p.x = nx;
    if (!this.playerBlocked(p.x, ny, p.x, p.y)) p.y = ny;
    p.moving = true;
    p.running = run;
    p.walkT += dt * (run ? 15.5 : 9.8);

    // Smoothly orient 3D character toward walk vector (or forward if backpedaling slightly)
    const targetYaw = fwd < -0.25 && Math.abs(strafe) < 0.25 ? this.cameraYaw : Math.atan2(dx, -dy);
    let diff = ((targetYaw - this.playerYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    this.playerYaw += diff * Math.min(1, dt * 12);

    if (Math.abs(dx) > Math.abs(dy)) p.facing = dx > 0 ? "right" : "left";
    else p.facing = dy > 0 ? "down" : "up";

    // Auto-traverse Stairwell when walking onto the staircase steps or active landing
    if (this.portalCooldown <= 0 && !p.seated) {
      const myFloor = floorOfY(p.y);
      const onUpstairsSteps =
        myFloor === 0 && p.x >= 1100 && p.x <= 1256 && p.y >= 48 && p.y <= 168;
      const onBasementSteps =
        myFloor === 1 && p.x >= 1100 && p.x <= 1254 && p.y >= 964 && p.y <= 1076;
      const hitPortal = FLOOR_PORTALS.find(
        (pt) =>
          pt.kind === "stairs" &&
          pt.fromFloor === myFloor &&
          (onUpstairsSteps ||
            onBasementSteps ||
            Math.hypot(p.x - pt.x, p.y - pt.y) < (myFloor === 0 ? 30 : 28)),
      );
      if (hitPortal) this.usePortal(hitPortal);
    }
  }

  private usePortal(p: FloorPortal) {
    this.player.x = p.destX;
    this.player.y = p.destY;
    this.player.facing = p.destFacing;
    this.player.moving = false;
    this.playerYaw = this.yawFromFacingDir(p.destFacing);
    this.cameraYaw = this.playerYaw;
    this.portalCooldown = 1.6;
    this.toast(
      p.toFloor === 1 ? "⬇️ Planta Baja · Almacén y Archivo" : "⬆️ Planta 2 · Oficina de Scranton",
      "info",
    );
    this.emit();
  }

  private playerBlocked(x: number, y: number, ox: number, oy: number) {
    if (blockedAt(x, y, PLAYER_RADIUS)) return true;
    for (const n of this.npcs) {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < 22 && d < Math.hypot(n.x - ox, n.y - oy)) return true;
    }
    return false;
  }

  private isPlayerInRoom(roomId: string): boolean {
    const r = ROOMS.find((rm) => rm.id === roomId);
    if (!r) return false;
    return (
      this.player.x >= r.x &&
      this.player.x <= r.x + r.w &&
      this.player.y >= r.y &&
      this.player.y <= r.y + r.h
    );
  }

  isPlayerInConferenceRoom(): boolean {
    return this.isPlayerInRoom("conf");
  }

  private yawFromFacingDir(f: Facing): number {
    if (f === "right") return Math.PI / 2;
    if (f === "down") return Math.PI;
    if (f === "left") return -Math.PI / 2;
    return 0;
  }

  private activeOfficeEventRuntime(): OfficeEventRuntime | null {
    for (const ev of this.officeEvents) {
      if (
        ev.phase !== "done" &&
        this.mins >= ev.def.at &&
        (ev.phase !== "pending" || this.mins < ev.def.at + ev.def.duration)
      ) {
        return ev;
      }
    }
    return null;
  }

  activeOfficeEventEffect(): EpisodeEventEffect | null {
    return this.activeOfficeEventRuntime()?.def.effect ?? null;
  }

  private officeEventRoomName(roomId: string): string {
    return ROOMS.find((r) => r.id === roomId)?.name ?? "OFICINA";
  }

  private cameraShotLabel(shot: CameraShot, speakerName: string, hostName = "Michael"): string {
    const first = speakerName.split(" ")[0] ?? speakerName;
    if (shot === "wide") return `CAM 1 · Plano general (${first})`;
    if (shot === "host") return `CAM 2 · Primer plano (${hostName.split(" ")[0] ?? hostName})`;
    if (shot === "reaction") return `CAM 3 · ${first}`;
    if (shot === "player") return "CAM 4 · Tu asiento";
    return `CAM 5 · ${first}`;
  }

  private gestureActionLabel(gesture: MeetingGesture | undefined): string {
    if (gesture === "point") return "Señalando la pizarra";
    if (gesture === "pace") return "Paseando por el frente";
    if (gesture === "clap") return "Aplaudiendo";
    if (gesture === "note") return "Tomando notas";
    if (gesture === "facepalm") return "Llevándose la mano a la cara";
    if (gesture === "nod") return "Asintiendo";
    if (gesture === "raise_hand") return "Levantando la mano";
    if (gesture === "talk") return "Hablando";
    return "Escuchando en la sala";
  }

  private activeEpisodeEventUI(): OfficeEventUI | null {
    const ev = this.activeOfficeEventRuntime();
    if (!ev) return null;
    const rawLine =
      ev.phase === "playing" && ev.lineIdx < ev.def.lines.length
        ? ev.def.lines[ev.lineIdx]
        : undefined;
    return {
      id: ev.def.id,
      title: ev.def.title,
      room: ev.def.room,
      roomName: this.officeEventRoomName(ev.def.room),
      spot: ev.def.spot,
      isMeeting: !!ev.def.isMeeting,
      clockEnd: formatClock(ev.playingEndsAt),
      effect: ev.def.effect,
      lineText: rawLine?.text,
      speakerName: rawLine ? charById(rawLine.who).name.split(" ")[0] : undefined,
    };
  }

  private recordEventLine(ev: OfficeEventRuntime, idx: number) {
    if (idx <= ev.recordedLineIdx || idx >= ev.def.lines.length) return;
    ev.recordedLineIdx = idx;
    const ln = ev.def.lines[idx]!;
    const ch = charById(ln.who);
    const list = (this.meetingEntries[ev.def.id] ??= []);
    list.push({
      kind: "canon",
      who: ln.who,
      name: ch.name,
      text: ln.text,
      clock: formatClock(this.mins),
    });
  }

  private seatedCountForMeeting(ev: OfficeEventRuntime): { seated: number; total: number } {
    const guests = ev.activeParticipants.filter((id) => id !== ev.hostId);
    let seated = 0;
    for (const id of guests) {
      if (this.npcById(id)?.seated) seated++;
    }
    return { seated, total: guests.length };
  }

  sitInMeetingSeat = () => {
    const ev = this.activeOfficeEventRuntime();
    if (!ev || !ev.def.isMeeting || ev.phase === "done") return;
    const seat = CONF_SEATS[0]!;
    this.player.x = seat.x;
    this.player.y = seat.y;
    this.player.facing = seat.facing;
    this.player.moving = false;
    this.player.seated = true;
    this.player.gesture = "none";
    this.playerYaw = this.yawFromFacingDir(seat.facing);
    if (ev.phase === "trigger" || ev.phase === "calling") {
      ev.phase = "gathering";
      ev.phaseT = 0;
    }
    if (ev.playerSeatedSince < 0) ev.playerSeatedSince = ev.gatherElapsed;
    this.emit();
  };

  leaveMeetingCinema = () => {
    const ev = this.activeOfficeEventRuntime();
    if (!ev || !ev.def.isMeeting) return;
    this.finishMeetingRuntime(ev, false);
  };

  private finishMeetingRuntime(ev: OfficeEventRuntime, completed: boolean) {
    ev.phase = "done";
    this.meetingOpen = false;
    this.player.seated = false;
    this.player.gesture = "none";
    if (this.isPlayerInConferenceRoom()) {
      const exitSpot = walkableTarget(745, 232);
      this.player.x = exitSpot.x;
      this.player.y = exitSpot.y;
    }
    for (const n of this.npcs) {
      n.seated = false;
      n.gesture = "none";
      n.targetKey = "";
    }
    if (completed && !ev.rewarded) {
      ev.rewarded = true;
      this.rep += 2;
      const am = ev.def.trigger?.aftermath;
      this.recordRecentEvent(am ? am.summaryLine : `Asististe a la reunión: ${ev.def.title}`);
      this.toast(`🎬 Reunión finalizada: ${ev.def.title} (+2 ★)`, "event");
      if (am) {
        this.toast(am.toastText, "info");
        if (am.overrides) {
          for (const ov of am.overrides) {
            const npc = this.npcById(ov.who);
            if (!npc) continue;
            npc.override = {
              action: ov.action,
              spot: ov.spot,
              until: this.mins + (ov.mins ?? 25),
              reactionLine: ov.reactionLine,
            };
          }
        }
      }
      this.checkGoalToast();
    } else if (!completed) {
      this.toast(`Saliste de la reunión «${ev.def.title}».`, "info");
    }
    this.emit();
  }

  private enterMeetingCinemaMode(ev: OfficeEventRuntime) {
    ev.phase = "playing";
    ev.phaseT = 0;
    ev.lineIdx = 0;
    ev.lineT = 0;
    ev.playingEndsAt = this.mins + ev.def.duration;
    // Clear any lingering office popups / distractions so the cinema frame is spotless
    this.dialog = null;
    this.dialogHistory = [];
    this.pc = null;
    this.chatWith = null;
    this.journal = false;
    this.npcApproach = null;
    const seat = CONF_SEATS[0]!;
    this.player.x = seat.x;
    this.player.y = seat.y;
    this.player.facing = seat.facing;
    this.player.moving = false;
    this.player.seated = true;
    this.player.gesture = this.meetingOpen ? "raise_hand" : "none";
    this.playerYaw = this.yawFromFacingDir(seat.facing);
    this.emit();
  }

  private updateOfficeEvents(dt: number) {
    for (const ev of this.officeEvents) {
      if (ev.phase === "done") continue;
      if (this.mins < ev.def.at) continue;

      if (!ev.def.isMeeting) {
        if (this.mins >= ev.def.at + ev.def.duration) {
          ev.phase = "done";
          this.emit();
          continue;
        }
        if (ev.phase === "pending") {
          ev.phase = "playing";
          if (!ev.announced) {
            ev.announced = true;
            this.toast(ev.def.announcement, "event");
          }
          this.emit();
        }
        const base = spotAt(ev.def.spot);
        let gathered = 0;
        for (const id of ev.activeParticipants) {
          const npc = this.npcById(id);
          if (npc && Math.hypot(npc.x - base.x, npc.y - base.y) < 250) gathered++;
        }
        if (gathered < Math.min(2, ev.activeParticipants.length)) continue;
        if (ev.lineIdx < ev.def.lines.length) {
          this.recordEventLine(ev, ev.lineIdx);
          const near =
            this.isPlayerInRoom(ev.def.room) ||
            Math.hypot(this.player.x - base.x, this.player.y - base.y) < HEAR_RADIUS + 40;
          const ln = ev.def.lines[ev.lineIdx]!;
          ev.lineT += dt;
          const dur = 4.2 + ln.text.length * 0.055;
          if (ev.lineT >= dur) {
            ev.lineT = 0;
            if (near) ev.heardLines++;
            ev.lineIdx++;
            if (near && !ev.rewarded && (ev.heardLines >= 2 || ev.lineIdx >= ev.def.lines.length)) {
              ev.rewarded = true;
              this.rep += 1;
              this.recordRecentEvent(`Viviste en directo: ${ev.def.title}`);
              this.toast(`🎬 Evento del episodio presenciado: ${ev.def.title} (+1 ★)`, "event");
              this.checkGoalToast();
            }
            this.emit();
          }
        }
        continue;
      }

      // ---- 4-stage Conference Room Cinema Meeting (with multi-step canon prelude) ----
      if (ev.phase === "pending") {
        ev.phase = ev.def.trigger ? "trigger" : "calling";
        ev.phaseT = 0;
        ev.preludeIdx = 0;
        ev.preludeElapsed = 0;
        ev.preludeAnnouncedIdx = -1;
        if (ev.phase === "trigger" && ev.def.trigger) {
          ev.triggerAnnounced = true;
          if (ev.def.trigger.preludeSteps?.[0]) {
            ev.preludeAnnouncedIdx = 0;
          }
        }
        this.emit();
      }

      if (ev.phase === "trigger") {
        const steps = ev.def.trigger?.preludeSteps;
        if (steps && steps.length > 0) {
          const step = steps[ev.preludeIdx];
          if (step) {
            if (ev.preludeAnnouncedIdx !== ev.preludeIdx) {
              ev.preludeAnnouncedIdx = ev.preludeIdx;
              this.emit();
            }
            ev.preludeElapsed += dt;
            if (ev.preludeElapsed >= (step.duration ?? 3.6)) {
              ev.preludeIdx += 1;
              ev.preludeElapsed = 0;
              if (ev.preludeIdx >= steps.length) {
                ev.phase = "calling";
                ev.phaseT = 0;
                ev.callAnnounced = true;
              } else {
                ev.preludeAnnouncedIdx = ev.preludeIdx;
              }
              this.emit();
            }
          }
          continue;
        }
        ev.phaseT += dt;
        // Player can walk into seat early if they want, otherwise wait 3.2s for incident to play out
        if (ev.phaseT >= 3.2) {
          ev.phase = "calling";
          ev.phaseT = 0;
          ev.callAnnounced = true;
          this.emit();
        }
        continue;
      }

      if (ev.phase === "calling") {
        ev.phaseT += dt;
        if (ev.phaseT >= 2.5) {
          ev.phase = "gathering";
          ev.phaseT = 0;
          this.emit();
        }
        continue;
      }

      if (ev.phase === "gathering") {
        ev.gatherElapsed += dt;
        const playerSeat = CONF_SEATS[0]!;
        if (!this.player.seated) {
          const distToSeat = Math.hypot(this.player.x - playerSeat.x, this.player.y - playerSeat.y);
          if (this.isPlayerInConferenceRoom() && distToSeat <= 34) {
            this.sitInMeetingSeat();
          }
        } else if (ev.playerSeatedSince < 0) {
          ev.playerSeatedSince = ev.gatherElapsed;
        }

        // Catch-up helper for distant stragglers (e.g. Warehouse/Annex) once player is seated
        if (this.player.seated && ev.gatherElapsed - ev.playerSeatedSince >= 5.0) {
          for (const id of ev.activeParticipants) {
            if (id === ev.hostId) continue;
            const npc = this.npcById(id);
            const seat = ev.seatAssignments[id];
            if (npc && seat && !npc.seated) {
              npc.x = seat.x;
              npc.y = seat.y;
              npc.path = [];
              npc.moving = false;
              npc.seated = true;
              npc.facing = seat.facing;
              npc.action = "Sentado en reunión";
            }
          }
        }

        const { seated, total } = this.seatedCountForMeeting(ev);
        const host = this.npcById(ev.hostId);
        const hostReady = !host || Math.hypot(host.x - 880, host.y - 102) < 95;
        if (this.player.seated && seated >= total && hostReady) {
          this.enterMeetingCinemaMode(ev);
        }
        continue;
      }

      // ev.phase === "playing" (Movie Cinema Mode)
      if (ev.aiBeat) {
        ev.aiBeatT += dt;
        if (ev.aiBeatT >= 3.8) {
          ev.aiBeat = ev.aiQueue.shift() ?? null;
          ev.aiBeatT = 0;
          this.emit();
        }
        continue;
      }
      if (ev.aiQueue.length > 0) {
        ev.aiBeat = ev.aiQueue.shift() ?? null;
        ev.aiBeatT = 0;
        this.emit();
        continue;
      }
      if (this.meetingOpen) {
        // Keep waiting gracefully while player is composing their hand-raise intervention
        continue;
      }

      if (ev.lineIdx < ev.def.lines.length) {
        this.recordEventLine(ev, ev.lineIdx);
        const ln = ev.def.lines[ev.lineIdx]!;
        ev.lineT += dt;
        const dur = 4.0 + ln.text.length * 0.05;
        if (ev.lineT >= dur) {
          ev.lineT = 0;
          ev.heardLines++;
          ev.lineIdx++;
          this.emit();
        }
      } else {
        ev.extraEndWait += dt;
        if (ev.extraEndWait >= 1.6) {
          this.finishMeetingRuntime(ev, true);
        }
      }
    }
  }

  approachingNpcId(): string | null {
    return this.npcApproach?.npcId ?? null;
  }

  async triggerNpcApproach(preferredId?: string): Promise<boolean> {
    if (this.phase !== "playing" || this.npcApproach) return false;
    const activeEv = this.activeOfficeEventRuntime();
    const candidates = this.npcs.filter((n) => {
      if (preferredId && n.def.id !== preferredId) return false;
      if (this.activeConvoFor(n.def.id)) return false;
      if (n.override) return false;
      if (activeEv && activeEv.activeParticipants.includes(n.def.id)) return false;
      return true;
    });
    const pool = candidates.filter((n) => !this.recentApproachIds.includes(n.def.id));
    const chosen = preferredId
      ? (candidates[0] ?? this.npcById(preferredId))
      : pick(pool.length ? pool : candidates);
    if (!chosen) return false;

    const id = chosen.def.id;
    this.recentApproachIds = [id, ...this.recentApproachIds.filter((x) => x !== id)].slice(0, 5);
    const cleanRecent = this.recentEvents.map(humanizeRecentTopic).filter(Boolean).slice(0, 8);
    const fallback = normalizeNpcApproach(null, id, this.dayNumber, cleanRecent);
    const runtime: NpcApproachRuntime = {
      npcId: id,
      walkCallout: fallback.walkCallout,
      reason: fallback.reason,
      openingLine: fallback.openingLine,
      replies: fallback.replies,
      startedAtMins: this.mins,
      elapsedSec: 0,
    };
    this.npcApproach = runtime;
    const first = chosen.def.name.split(" ")[0] ?? chosen.def.name;
    this.toast(`💬 ${first} se levanta para venir a hablar contigo…`, "info");
    this.emit();

    if (this.ai?.npcApproach) {
      const mems = (this.memories[id] ?? []).slice(-6).map((m) => m.summary.slice(0, 140));
      try {
        const res: NpcApproachResult = await this.ai.npcApproach({
          characterId: id,
          speakerRole: this.roleOf(id),
          dayNumber: this.dayNumber,
          clock: formatClock(this.mins),
          eventName: this.event?.name ?? null,
          episodeContext: this.episodeContextText(),
          recentEvents: cleanRecent,
          memories: mems,
          activeCharIds: this.activeCharIds,
          dailyGoal: this.dailyGoalSpec.headline,
          stats: {
            money: this.money,
            rep: this.rep,
            sales: this.sales,
            missionsDone: this.missionsDoneCount(),
          },
        });
        if (this.npcApproach === runtime && this.phase === "playing") {
          runtime.walkCallout = res.walkCallout;
          runtime.reason = res.reason;
          runtime.openingLine = res.openingLine;
          runtime.replies = res.replies;
          this.emit();
        }
      } catch {
        // Fallback already populated
      }
    }
    return true;
  }

  private updateNpcApproach(dt: number) {
    const ap = this.npcApproach;
    if (!ap) {
      if (
        this.mins >= this.nextApproachAt &&
        this.mins < DAY_END - 18 &&
        !this.activeOfficeEventRuntime()
      ) {
        const busyDynamic = this.convos.some((c) => c.dynamic && c.state !== "done");
        const busyListening = this.convos.some((c) => {
          if (c.state !== "playing") return false;
          const a = this.npcById(c.def.who[0]);
          const b = this.npcById(c.def.who[1]);
          if (!a || !b) return false;
          return (
            Math.hypot(this.player.x - (a.x + b.x) / 2, this.player.y - (a.y + b.y) / 2) <
            HEAR_RADIUS
          );
        });
        if (busyDynamic || busyListening) {
          this.nextApproachAt = this.mins + 12;
          return;
        }
        this.nextApproachAt = this.mins + 75;
        void this.triggerNpcApproach();
      }
      return;
    }

    const npc = this.npcById(ap.npcId);
    if (!npc || this.mins - ap.startedAtMins > 25 || ap.elapsedSec > 24) {
      this.npcApproach = null;
      this.nextApproachAt = this.mins + 45;
      this.emit();
      return;
    }
    ap.elapsedSec += dt;

    const dist = Math.hypot(npc.x - this.player.x, npc.y - this.player.y);
    if (dist <= 62 && !this.frozen) {
      this.openApproachDialog(npc, ap);
    }
  }

  private openApproachDialog(npc: NPC, ap: NpcApproachRuntime) {
    this.npcApproach = null;
    this.nextApproachAt = this.mins + 78;
    npc.path = [];
    npc.moving = false;
    npc.facing = this.faceTowards(npc, this.player.x, this.player.y);
    this.talkingTo = npc.def.id;

    const first = npc.def.name.split(" ")[0] ?? npc.def.name;
    const log = (this.chatLogs[npc.def.id] ??= []);
    log.push({ role: "assistant", content: ap.openingLine, clock: formatClock(this.mins) });

    const opts: DialogOption[] = ap.replies.map((rep) => ({
      label: rep.label,
      tag: "topic" as const,
      act: () => {
        if (rep.repDelta !== 0) {
          this.rep = Math.max(0, this.rep + rep.repDelta);
          this.checkGoalToast();
        }
        const memList = (this.memories[npc.def.id] ??= []);
        memList.push({
          id: `mem_app_${Date.now()}`,
          atClock: formatClock(this.mins),
          summary: `${ap.reason}: «${rep.label}»`,
          kind: "task",
          status: "recordada",
          reactionLine: rep.reaction,
        });
        this.appendChatNote(
          npc.def.id,
          `💬 ${first} se acercó (${ap.reason}) → Respondiste: «${rep.label}»`,
        );
        this.recordRecentEvent(`${first} se acercó a hablar contigo (${ap.reason})`);
        this.setDialog(
          `${rep.reaction}${rep.repDelta > 0 ? ` (+${rep.repDelta} ★)` : rep.repDelta < 0 ? ` (${rep.repDelta} ★)` : ""}`,
          [
            ...(this.ai
              ? [
                  {
                    label: "💬 Seguir charlando libremente",
                    tag: "chat" as const,
                    act: () => this.openChat(npc.def.id),
                  },
                ]
              : []),
            { label: "Seguir trabajando", tag: "leave" as const, act: this.closeDialog },
          ],
          false,
        );
      },
    }));

    if (this.ai) {
      opts.push({
        label: "💬 Responder tú (chat libre con IA)",
        tag: "chat",
        act: () => this.openChat(npc.def.id),
      });
    }
    opts.push({
      label: "Ahora voy justo de tiempo",
      tag: "leave",
      act: () => {
        this.recordRecentEvent(`${first} pasó a saludarte (${ap.reason})`);
        this.closeDialog();
      },
    });

    this.openDialog(
      npc.def.name,
      `${this.roleOf(npc.def.id)} · 💬 ${ap.reason}`,
      npc.def.id,
      ap.openingLine,
      opts,
    );
  }

  private officeEventSlotFor(
    ev: OfficeEventRuntime,
    npcId: string,
  ): {
    x: number;
    y: number;
    faceTo: Facing;
    jog: boolean;
    sit?: boolean;
    gesture?: MeetingGesture;
    actionLabel?: string;
  } {
    if (ev.def.isMeeting && ev.def.room === "conf") {
      if (ev.phase === "trigger" && ev.def.trigger) {
        const step = ev.def.trigger.preludeSteps?.[ev.preludeIdx];
        if (step) {
          const baseSpot = spotAt(step.spot);
          const pSpot = step.partnerSpot
            ? spotAt(step.partnerSpot)
            : { x: baseSpot.x + 38, y: baseSpot.y };
          if (npcId === step.who) {
            const pPos = walkableTarget(baseSpot.x, baseSpot.y);
            const partnerPos = walkableTarget(pSpot.x, pSpot.y);
            const dx = partnerPos.x - pPos.x;
            const dy = partnerPos.y - pPos.y;
            const faceTo: Facing =
              Math.abs(dx) > Math.abs(dy) ? (dx >= 0 ? "right" : "left") : dy >= 0 ? "down" : "up";
            return {
              ...pPos,
              faceTo: step.partner ? faceTo : "down",
              jog: false,
              sit: false,
              gesture: step.gesture ?? "talk",
              actionLabel: step.action,
            };
          }
          if (step.partner && npcId === step.partner) {
            const aPos = walkableTarget(baseSpot.x, baseSpot.y);
            const pPos = walkableTarget(pSpot.x, pSpot.y);
            const dx = aPos.x - pPos.x;
            const dy = aPos.y - pPos.y;
            const faceTo: Facing =
              Math.abs(dx) > Math.abs(dy) ? (dx >= 0 ? "right" : "left") : dy >= 0 ? "down" : "up";
            return {
              ...pPos,
              faceTo,
              jog: false,
              sit: false,
              gesture: "talk",
              actionLabel: step.action,
            };
          }
        }
        if (npcId === ev.def.trigger.who) {
          return {
            ...walkableTarget(spotAt(ev.def.trigger.spot).x, spotAt(ev.def.trigger.spot).y),
            faceTo: "down",
            jog: false,
            sit: false,
            gesture: "talk",
            actionLabel: ev.def.trigger.action,
          };
        }
      }
      if (ev.phase === "calling") {
        if (npcId === ev.hostId) {
          return {
            ...walkableTarget(688, 312),
            faceTo: "down",
            jog: false,
            sit: false,
            gesture: "point",
            actionLabel: "Llamando a reunión",
          };
        }
      }
      if (ev.def.id === "ev_s3e1_witch_hunt" && ev.phase === "playing" && ev.lineIdx >= 1) {
        if (npcId === "oscar" && ev.lineIdx <= 4) {
          return {
            x: 822,
            y: 92,
            faceTo: "right",
            jog: false,
            sit: false,
            gesture: ev.lineIdx === 1 || ev.lineIdx === 4 ? "facepalm" : "talk",
            actionLabel: ev.lineIdx === 4 ? "Recibiendo el beso incómodo" : "Al frente de la sala",
          };
        }
        if (npcId === ev.hostId && ev.lineIdx === 4) {
          return {
            x: 856,
            y: 92,
            faceTo: "left",
            jog: false,
            sit: false,
            gesture: "talk",
            actionLabel: "Besando a Oscar",
          };
        }
        if (npcId === "jan" && ev.lineIdx >= 5) {
          return {
            x: 880,
            y: 112,
            faceTo: "down",
            jog: false,
            sit: false,
            gesture: "note",
            actionLabel: "Evaluando demanda legal",
          };
        }
      }
      if (npcId === ev.hostId) {
        const spot = CONF_HOST_SPOTS[Math.max(0, ev.lineIdx) % CONF_HOST_SPOTS.length]!;
        const activeLine =
          ev.phase === "playing" && ev.lineIdx < ev.def.lines.length
            ? ev.def.lines[ev.lineIdx]
            : undefined;
        let hostGesture: MeetingGesture = "pace";
        if (ev.aiBeat?.who === ev.hostId) hostGesture = ev.aiBeat.gesture;
        else if (activeLine?.who === ev.hostId) hostGesture = activeLine.action ?? "talk";
        else if (activeLine?.react) {
          const r = activeLine.react.find((x) => x.who === ev.hostId);
          if (r) hostGesture = r.gesture;
        }
        return {
          ...walkableTarget(spot.x, spot.y),
          faceTo: spot.facing,
          jog: false,
          sit: false,
          gesture: ev.phase === "playing" ? hostGesture : "none",
          actionLabel: "En reunión",
        };
      }
      const seat = ev.seatAssignments[npcId] ?? CONF_SEATS[1]!;
      let gesture: MeetingGesture = "none";
      let sit = true;
      if (ev.phase === "playing") {
        const activeLine = ev.lineIdx < ev.def.lines.length ? ev.def.lines[ev.lineIdx] : undefined;
        if (ev.aiBeat?.who === npcId) {
          gesture = ev.aiBeat.gesture;
        } else if (activeLine?.who === npcId) {
          gesture = activeLine.action ?? "talk";
          if (ev.lineIdx >= 1 && (activeLine.action === "pace" || activeLine.action === "point")) {
            sit = false;
          }
        } else if (activeLine?.react) {
          const r = activeLine.react.find((x) => x.who === npcId);
          if (r) gesture = r.gesture;
        } else {
          // Subtle natural seated reactions among the rest of the staff
          const h = (npcId.charCodeAt(0) + ev.lineIdx) % 7;
          gesture = h === 0 ? "note" : h === 3 ? "nod" : "none";
        }
      }
      return {
        x: seat.x,
        y: seat.y,
        faceTo: seat.facing,
        jog: false,
        sit,
        gesture,
        actionLabel: "En reunión",
      };
    }

    if (ev.def.room === "conf") {
      if (npcId === ev.hostId) {
        return { ...walkableTarget(880, 102), faceTo: "down", jog: false };
      }
      const seat = ev.seatAssignments[npcId] ?? CONF_SEATS[1]!;
      return { x: seat.x, y: seat.y, faceTo: seat.facing, jog: false, sit: true };
    }

    const base = spotAt(ev.def.spot);
    if (ev.def.effect === "fun_run_jog") {
      if (npcId === ev.hostId) {
        return { ...walkableTarget(base.x, base.y), faceTo: "right", jog: false };
      }
      const gi = Math.max(0, ev.activeParticipants.filter((id) => id !== ev.hostId).indexOf(npcId));
      const loopPhase = Math.floor(this.time / 2.6 + gi) % 2;
      const laneOffsets: [number, number][] = [
        [46, -24],
        [46, 22],
        [92, -18],
        [92, 26],
        [136, -12],
        [136, 32],
        [-38, 22],
        [176, 8],
      ];
      const [ox, oy] = laneOffsets[gi % laneOffsets.length]!;
      const p = walkableTarget(base.x + ox + loopPhase * 42, base.y + oy);
      return { ...p, faceTo: loopPhase === 0 ? "right" : "left", jog: true };
    }

    if (npcId === ev.hostId) {
      return { ...walkableTarget(base.x, base.y), faceTo: "down", jog: false };
    }
    const guests = ev.activeParticipants.filter((id) => id !== ev.hostId);
    const gi = Math.max(0, guests.indexOf(npcId));
    const offsets: [number, number][] = [
      [42, 4],
      [-42, 4],
      [0, 42],
      [0, -40],
      [38, 36],
      [-38, 36],
      [38, -36],
      [-38, -36],
      [72, 10],
      [-72, 10],
    ];
    const [ox, oy] = offsets[gi % offsets.length]!;
    const pos = walkableTarget(base.x + ox, base.y + oy);
    const dx = base.x - pos.x;
    const dy = base.y - pos.y;
    const faceTo: Facing =
      Math.abs(dx) > Math.abs(dy) ? (dx >= 0 ? "right" : "left") : dy >= 0 ? "down" : "up";
    return { ...pos, faceTo, jog: false };
  }

  private npcById(id: string): NPC | undefined {
    return this.npcs.find((n) => n.def.id === id);
  }

  private activeConvoFor(id: string): ConvoRuntime | null {
    for (const c of this.convos) {
      if (!c.dynamic || c.state === "done") continue;
      if (!c.def.who.includes(id)) continue;
      if (
        this.mins >= c.def.at &&
        this.mins < c.def.at + c.def.duration + 15 &&
        (c.state === "playing" || this.mins < c.def.at + c.def.duration)
      ) {
        return c;
      }
    }
    const activeEv = this.activeOfficeEventRuntime();
    if (activeEv && activeEv.activeParticipants.includes(id)) return null;
    for (const c of this.convos) {
      if (c.dynamic || c.state === "done") continue;
      if (!c.def.who.includes(id)) continue;
      if (
        this.mins >= c.def.at &&
        this.mins < c.def.at + c.def.duration + 15 &&
        (c.state === "playing" || this.mins < c.def.at + c.def.duration)
      ) {
        return c;
      }
    }
    return null;
  }

  private convoPos(c: ConvoRuntime, id: string) {
    const base = spotAt(c.def.spot);
    const side = c.def.who[0] === id ? -1 : 1;
    return walkableTarget(base.x + side * 24, base.y);
  }

  private seekPosNextTo(seeker: NPC, targetNpc: NPC): { x: number; y: number } {
    const offsets = [
      [-38, 0],
      [38, 0],
      [0, 38],
      [0, -38],
      [-52, 0],
      [52, 0],
      [0, 52],
      [0, -52],
    ] as const;
    let best: { x: number; y: number } | null = null;
    let bestD = Infinity;
    for (const [ox, oy] of offsets) {
      const cx = targetNpc.x + ox;
      const cy = targetNpc.y + oy;
      if (blockedAt(cx, cy, 11)) continue;
      const d = Math.hypot(cx - seeker.x, cy - seeker.y);
      if (d < bestD) {
        bestD = d;
        best = { x: cx, y: cy };
      }
    }
    return best ?? walkableTarget(targetNpc.x + 38, targetNpc.y);
  }

  private faceTowards(a: NPC, bx: number, by: number): Facing {
    const dx = bx - a.x;
    const dy = by - a.y;
    return Math.abs(dx) > Math.abs(dy) ? (dx >= 0 ? "right" : "left") : dy >= 0 ? "down" : "up";
  }

  private spreadNonOverlappingTarget(
    npcId: string,
    raw: { x: number; y: number },
    claimed: { x: number; y: number }[],
  ): { x: number; y: number; spread: boolean } {
    const tooClose = (x: number, y: number) =>
      claimed.some((c) => Math.hypot(c.x - x, c.y - y) < 26);
    if (!tooClose(raw.x, raw.y)) {
      claimed.push(raw);
      return { x: raw.x, y: raw.y, spread: false };
    }
    const seed = npcId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const radii = [32, 46, 62];
    for (const r of radii) {
      for (let i = 0; i < 8; i++) {
        const ang = (((i + seed) % 8) * Math.PI) / 4;
        const cx = Math.round(raw.x + Math.cos(ang) * r);
        const cy = Math.round(raw.y + Math.sin(ang) * r);
        if (blockedAt(cx, cy, 11)) continue;
        if (!tooClose(cx, cy)) {
          const p = { x: cx, y: cy };
          claimed.push(p);
          return { ...p, spread: true };
        }
      }
    }
    claimed.push(raw);
    return { x: raw.x, y: raw.y, spread: false };
  }

  private updateNPCs(dt: number) {
    const activeEv = this.activeOfficeEventRuntime();
    const activePreludeStep =
      activeEv?.phase === "trigger"
        ? activeEv.def.trigger?.preludeSteps?.[activeEv.preludeIdx]
        : undefined;
    const claimedTargets: { x: number; y: number }[] = [];
    for (const n of this.npcs) {
      if (n.override && this.mins >= n.override.until) n.override = undefined;
      let key: string;
      let target: { x: number; y: number };
      let action: string;
      let wantSeated = false;
      let wantGesture: MeetingGesture = "none";
      n.faceTo = undefined;
      const convo = this.activeConvoFor(n.def.id);
      const isApproaching = this.npcApproach?.npcId === n.def.id;
      const meetingControlsNpc =
        activeEv &&
        activeEv.phase !== "pending" &&
        activeEv.activeParticipants.includes(n.def.id) &&
        (!activeEv.def.isMeeting ||
          activeEv.phase !== "trigger" ||
          n.def.id === activePreludeStep?.who ||
          n.def.id === activePreludeStep?.partner ||
          n.def.id === activeEv.def.trigger?.who ||
          n.def.id === activeEv.hostId);

      if (isApproaching && !(activeEv && activeEv.activeParticipants.includes(n.def.id))) {
        const cellKey = `${Math.round(this.player.x / 28)},${Math.round(this.player.y / 28)}`;
        key = `approach:${n.def.id}:${cellKey}`;
        target = walkableTarget(this.player.x, this.player.y);
        action = "Viene a hablarte";
        n.faceTo = this.faceTowards(n, this.player.x, this.player.y);
      } else if (convo?.dynamic && convo.seekBy && convo.seekTarget) {
        const seeker = this.npcById(convo.seekBy);
        const targetNpc = this.npcById(convo.seekTarget);
        if (seeker && targetNpc && n.def.id === convo.seekBy) {
          if (convo.state === "playing") {
            key = "dynplay:" + convo.def.id;
            target = { x: n.x, y: n.y };
            n.path = [];
            action = convo.kind === "prank" ? "Ejecutando broma" : "Charlando";
            n.faceTo = this.faceTowards(n, targetNpc.x, targetNpc.y);
          } else if (convo.prepSpot && !convo.prepDone) {
            key = `dynprep:${convo.def.id}:${convo.prepSpot}`;
            const s = spotAt(convo.prepSpot);
            target = walkableTarget(s.x, s.y);
            action =
              convo.kind === "prank" ? "Preparando broma" : (n.override?.action ?? "Preparando");
          } else {
            const cellKey = `${Math.round(targetNpc.x / 40)},${Math.round(targetNpc.y / 40)}`;
            key = `seek:${convo.def.id}:${cellKey}`;
            target = this.seekPosNextTo(seeker, targetNpc);
            action =
              convo.kind === "prank"
                ? `Broma a ${targetNpc.def.name.split(" ")[0]}`
                : `Buscando a ${targetNpc.def.name.split(" ")[0]}`;
            n.faceTo = this.faceTowards(n, targetNpc.x, targetNpc.y);
          }
        } else if (
          seeker &&
          targetNpc &&
          n.def.id === convo.seekTarget &&
          (convo.state === "playing" ||
            ((!convo.prepSpot || convo.prepDone) &&
              Math.hypot(seeker.x - targetNpc.x, seeker.y - targetNpc.y) < 120))
        ) {
          key = "dynwait:" + convo.def.id;
          target = { x: n.x, y: n.y };
          n.path = [];
          action = convo.state === "playing" ? "Charlando" : n.action;
          n.faceTo = this.faceTowards(n, seeker.x, seeker.y);
        } else {
          let r = n.def.routine[0]!;
          for (const e of n.def.routine) if (this.mins >= e.at) r = e;
          key = r.spot;
          const s = spotAt(r.spot);
          target = walkableTarget(s.x, s.y);
          action = r.action;
        }
      } else if (
        meetingControlsNpc &&
        !(
          n.override &&
          !n.override.spot.startsWith("conf") &&
          n.override.action.length > 0 &&
          activeEv.def.room === "conf"
        )
      ) {
        const slot = this.officeEventSlotFor(activeEv, n.def.id);
        key = slot.jog
          ? `evjog:${activeEv.def.id}:${Math.round(slot.x)},${Math.round(slot.y)}`
          : `ev:${activeEv.def.id}:${activeEv.phase}:${activeEv.preludeIdx}:${Math.round(slot.x)},${Math.round(slot.y)}`;
        target = { x: slot.x, y: slot.y };
        n.faceTo = slot.faceTo;
        wantSeated = !!slot.sit;
        wantGesture = slot.gesture ?? "none";
        action =
          slot.actionLabel ??
          (activeEv.def.isMeeting ? "En reunión" : activeEv.def.title.slice(0, 26));
      } else if (convo) {
        key = "convo:" + convo.def.id;
        target = this.convoPos(convo, n.def.id);
        action = "Charlando";
        n.faceTo = convo.def.who[0] === n.def.id ? "right" : "left";
      } else if (n.override) {
        key = `override:${n.override.spot}:${n.override.action}`;
        const s = spotAt(n.override.spot);
        target = walkableTarget(s.x, s.y);
        action = n.override.action;
      } else {
        let r = n.def.routine[0]!;
        for (const e of n.def.routine) if (this.mins >= e.at) r = e;
        key = r.spot;
        const s = spotAt(r.spot);
        target = walkableTarget(s.x, s.y);
        action = r.action;
      }

      if (
        !wantSeated &&
        !key.startsWith("dynplay:") &&
        !key.startsWith("dynwait:") &&
        !key.startsWith("evjog:") &&
        !key.startsWith("approach:")
      ) {
        const resolved = this.spreadNonOverlappingTarget(n.def.id, target, claimedTargets);
        target = { x: resolved.x, y: resolved.y };
        if (resolved.spread) key = `${key}@${resolved.x},${resolved.y}`;
      }

      if (key !== n.targetKey) {
        n.targetKey = key;
        n.target = target;
        if (!key.startsWith("dynplay:") && !key.startsWith("dynwait:")) {
          const seedStr = `${n.def.id}:${key}:${Math.floor(this.mins / 20)}`;
          let pathSeed = 0;
          for (let si = 0; si < seedStr.length; si++) {
            pathSeed = (pathSeed * 31 + seedStr.charCodeAt(si)) | 0;
          }
          n.path = findPath(n.x, n.y, target.x, target.y, pathSeed || 1);
        }
      }
      n.action = action;
      const finalDist = Math.hypot(n.x - target.x, n.y - target.y);
      if (n.path.length && finalDist <= 3.5) {
        if (!blockedAt(target.x, target.y, 10)) {
          n.x = target.x;
          n.y = target.y;
        }
        n.path = [];
      }
      if (n.path.length) {
        n.seated = false;
        n.gesture = "none";
        const wp = n.path[0]!;
        if (wp.portalJump || floorOfY(wp.y) !== floorOfY(n.y)) {
          n.x = wp.x;
          n.y = wp.y;
          n.path.shift();
          n.moving = true;
          n.walkT += dt * 10;
          continue;
        }
        let aimX = wp.x;
        let aimY = wp.y;
        let dx = aimX - n.x;
        let dy = aimY - n.y;
        let d = Math.hypot(dx, dy);

        // Smooth look-ahead corner blending toward the upcoming waypoint
        const nextWp = n.path[1];
        if (nextWp && !nextWp.portalJump && floorOfY(nextWp.y) === floorOfY(n.y) && d < 16) {
          const blend = 1 - d / 16;
          aimX = wp.x + (nextWp.x - wp.x) * blend * 0.6;
          aimY = wp.y + (nextWp.y - wp.y) * blend * 0.6;
          dx = aimX - n.x;
          dy = aimY - n.y;
          d = Math.hypot(dx, dy);
        }

        const preludeMeeting = !!(
          meetingControlsNpc &&
          activeEv?.def.isMeeting &&
          activeEv.phase === "trigger"
        );
        const urgentMeeting = !!(
          meetingControlsNpc &&
          activeEv?.def.isMeeting &&
          (activeEv.phase === "calling" || activeEv.phase === "gathering")
        );
        const urgent =
          isApproaching ||
          urgentMeeting ||
          preludeMeeting ||
          !!(convo?.dynamic && convo.seekBy === n.def.id && convo.state !== "playing");
        const spd = preludeMeeting
          ? 250
          : urgentMeeting && this.player.seated
            ? 230
            : urgent
              ? URGENT_NPC_SPEED
              : NPC_SPEED;
        const step = spd * dt;
        const wpDist = Math.hypot(wp.x - n.x, wp.y - n.y);
        if (wpDist <= Math.max(step, n.path.length > 1 ? 6 : 2.5)) {
          n.x = wp.x;
          n.y = wp.y;
          n.path.shift();
        } else if (d > 0.001) {
          let vx = dx / d;
          let vy = dy / d;
          // Gentle personal-space lateral sidestepping around nearby colleagues
          let avoidX = 0;
          let avoidY = 0;
          const myFloor = floorOfY(n.y);
          for (const other of this.npcs) {
            if (other.def.id === n.def.id || floorOfY(other.y) !== myFloor) continue;
            const ox = n.x - other.x;
            const oy = n.y - other.y;
            const od = Math.hypot(ox, oy);
            if (od > 1 && od < 24) {
              const push = ((24 - od) / 24) * 0.48;
              avoidX += (ox / od) * push;
              avoidY += (oy / od) * push;
            }
          }
          if (avoidX !== 0 || avoidY !== 0) {
            const mx = vx + avoidX;
            const my = vy + avoidY;
            const md = Math.hypot(mx, my) || 1;
            const candX = n.x + (mx / md) * step;
            const candY = n.y + (my / md) * step;
            if (!blockedAt(candX, candY, 10)) {
              n.x = candX;
              n.y = candY;
              vx = mx / md;
              vy = my / md;
            } else {
              n.x += vx * step;
              n.y += vy * step;
            }
          } else {
            n.x += vx * step;
            n.y += vy * step;
          }
          if (Math.abs(vx) > Math.abs(vy)) n.facing = vx > 0 ? "right" : "left";
          else n.facing = vy > 0 ? "down" : "up";
        }
        n.moving = true;
        n.running = urgent;
        n.walkT += dt * (urgent ? 14.5 : 9.5);
      } else {
        n.moving = false;
        n.running = false;
        n.seated = wantSeated && Math.hypot(n.x - target.x, n.y - target.y) <= 18;
        n.gesture =
          n.seated || (meetingControlsNpc && activeEv?.phase === "playing") ? wantGesture : "none";
        if (n.faceTo) n.facing = n.faceTo;
        else if (n.targetKey.startsWith("seat_") || n.targetKey.startsWith("override:seat_")) {
          const seatKey = n.targetKey.startsWith("override:")
            ? n.targetKey.slice("override:".length)
            : n.targetKey;
          const seatOwner = seatKey.startsWith("seat_") ? seatKey.slice("seat_".length) : n.def.id;
          const seat = getActiveFurniture().find((f) => f.owner === seatOwner)?.seat;
          n.facing =
            seat === "north" ? "down" : seat === "west" ? "right" : seat === "east" ? "left" : "up";
        }
      }
    }
  }

  private finishDynamicConvo(c: ConvoRuntime, completed: boolean) {
    if (!c.dynamic) return;
    if (c.seekBy) {
      const seeker = this.npcById(c.seekBy);
      if (seeker?.override && (!c.memoryId || seeker.override.memoryId === c.memoryId)) {
        seeker.override = undefined;
      }
      const mem = (this.memories[c.seekBy] ?? []).find((m) => m.id === c.memoryId);
      if (mem) mem.status = completed ? "completada" : "recordada";
      if (completed) {
        this.appendChatNote(
          c.seekBy,
          c.kind === "prank"
            ? `🎭 Broma ejecutada: ${c.def.title}`
            : `✅ Acción completada: ${c.def.title}`,
        );
        if (c.kind === "prank") {
          this.rep += 1;
          this.recordRecentEvent(`Broma ejecutada: ${c.def.title}`);
          this.toast(`🎭 ¡Broma completada! ${c.def.title} (+1 ★)`, "event");
          this.checkGoalToast();
        } else {
          this.recordRecentEvent(`Acción en la oficina: ${c.def.title}`);
        }
        if (c.seekTarget) {
          const victim = this.npcById(c.seekTarget);
          const lastLine = c.def.lines[c.def.lines.length - 1]?.text ?? c.def.title;
          if (victim) {
            victim.override = {
              action: c.targetAction ?? (c.kind === "prank" ? "Víctima de broma" : "Pensativo"),
              spot: this.homeSpotForNpc(c.seekTarget),
              until: this.mins + 18,
              reactionLine: lastLine,
            };
          }
          if (c.kind === "prank") {
            const vList = (this.memories[c.seekTarget] ??= []);
            vList.push({
              id: `mem_v_${c.def.id}`,
              atClock: formatClock(this.mins),
              summary: `Broma sufrida: ${c.def.title}`,
              kind: "prank",
              status: "completada",
              targetId: c.seekBy,
              reactionLine: lastLine,
            });
            this.appendChatNote(c.seekTarget, `🎭 Broma recibida: ${c.def.title}`);
          }
        }
      } else {
        this.appendChatNote(c.seekBy, `⏳ Quedó pendiente en memoria: ${c.def.title}`);
      }
    }
    this.emit();
  }

  private updateConvos(dt: number) {
    for (const c of this.convos) {
      if (c.state === "done") continue;
      const pastWindow = this.mins >= c.def.at + c.def.duration;
      const hardExpired = this.mins >= c.def.at + c.def.duration + 15;
      const inWindow =
        this.mins >= c.def.at && !hardExpired && (c.state === "playing" || !pastWindow);
      if (!inWindow) {
        if ((c.state === "pending" && pastWindow) || hardExpired) {
          c.state = "done";
          this.finishDynamicConvo(c, false);
        }
        continue;
      }
      const a = this.npcById(c.def.who[0]);
      const b = this.npcById(c.def.who[1]);
      if (!a || !b) continue;
      if (!c.arrived) {
        if (c.dynamic && c.seekBy && c.seekTarget) {
          if (c.prepSpot && !c.prepDone) {
            c.prepTimer = (c.prepTimer ?? 0) + dt;
            const seeker = c.seekBy === a.def.id ? a : b;
            const p = walkableTarget(spotAt(c.prepSpot).x, spotAt(c.prepSpot).y);
            if (Math.hypot(seeker.x - p.x, seeker.y - p.y) <= 28 || c.prepTimer >= 6) {
              c.prepDone = true;
            }
            continue;
          }
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist <= 68 && ((!a.moving && !b.moving) || dist <= 52)) {
            a.path = [];
            b.path = [];
            a.moving = false;
            b.moving = false;
            a.facing = this.faceTowards(a, b.x, b.y);
            b.facing = this.faceTowards(b, a.x, a.y);
            c.arrived = true;
            c.state = "playing";
          } else continue;
        } else if (
          !a.moving &&
          !b.moving &&
          a.targetKey.startsWith("convo:") &&
          b.targetKey.startsWith("convo:")
        ) {
          c.arrived = true;
          c.state = "playing";
        } else continue;
      }
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const near = Math.hypot(this.player.x - mx, this.player.y - my) < HEAR_RADIUS;
      if (!near && pastWindow && !c.dynamic) {
        c.state = "done";
        continue;
      }
      if (near) c.heardLines = Math.max(c.heardLines ?? 0, 1);
      c.lineT += dt * (near ? 1 : 0.85);
      const line = c.def.lines[c.line]!;
      const dur = 2.4 + line.text.length * 0.045;
      if (c.lineT >= dur) {
        c.lineT = 0;
        if (near) c.heardLines = (c.heardLines ?? 0) + 1;
        c.line++;
        if (c.line >= c.def.lines.length) {
          c.state = "done";
          const listened = near || (c.heardLines ?? 0) >= Math.ceil(c.def.lines.length / 2);
          if (listened && !this.heard.includes(c.def.id)) {
            this.heard.push(c.def.id);
            this.rep += 1;
            this.recordRecentEvent(`Cotilleo oído: ${c.def.title}`);
            this.toast(`🗣️ Cotilleo escuchado: ${c.def.title} (+1 ★)`, "gossip");
            this.checkGoalToast();
            this.emit();
          }
          if (c.dynamic) this.finishDynamicConvo(c, true);
        }
      }
    }
  }

  /** Bubble data for the renderer. */
  bubbles(): { x: number; y: number; text: string; muted: boolean }[] {
    const out: { x: number; y: number; text: string; muted: boolean }[] = [];
    if (this.npcApproach) {
      const sp = this.npcById(this.npcApproach.npcId);
      if (sp) {
        out.push({ x: sp.x, y: sp.y - 66, text: this.npcApproach.walkCallout, muted: false });
      }
    }
    const activeEv = this.activeOfficeEventRuntime();
    if (activeEv) {
      if (activeEv.def.isMeeting && activeEv.phase === "trigger" && activeEv.def.trigger) {
        const step = activeEv.def.trigger.preludeSteps?.[activeEv.preludeIdx];
        if (step) {
          const showReply = Boolean(
            step.replyWho &&
            step.replyLine &&
            activeEv.preludeElapsed >= (step.duration ?? 3.6) * 0.45,
          );
          if (showReply && step.replyWho && step.replyLine) {
            const replier = this.npcById(step.replyWho);
            if (replier)
              out.push({ x: replier.x, y: replier.y - 66, text: step.replyLine, muted: false });
          } else {
            const speaker = this.npcById(step.speaker);
            if (speaker)
              out.push({ x: speaker.x, y: speaker.y - 66, text: step.line, muted: false });
          }
        } else {
          const actor = this.npcById(activeEv.def.trigger.who);
          if (actor)
            out.push({
              x: actor.x,
              y: actor.y - 66,
              text: activeEv.def.trigger.line,
              muted: false,
            });
        }
      } else if (activeEv.def.isMeeting && activeEv.phase === "calling") {
        const host = this.npcById(activeEv.hostId);
        const callTxt = activeEv.def.trigger?.callLine ?? "¡A la Sala de Conferencias, YA!";
        if (host) out.push({ x: host.x, y: host.y - 66, text: callTxt, muted: false });
      } else if (
        activeEv.phase === "playing" &&
        !activeEv.def.isMeeting &&
        activeEv.lineIdx < activeEv.def.lines.length
      ) {
        const base = spotAt(activeEv.def.spot);
        const ln = activeEv.def.lines[activeEv.lineIdx]!;
        const sp = this.npcById(ln.who);
        const gathered = sp && Math.hypot(sp.x - base.x, sp.y - base.y) < 250;
        if (sp && gathered) {
          const near =
            this.isPlayerInRoom(activeEv.def.room) ||
            Math.hypot(this.player.x - base.x, this.player.y - base.y) < HEAR_RADIUS + 40;
          if (near) {
            out.push({ x: sp.x, y: sp.y - 66, text: ln.text, muted: false });
          } else {
            out.push({ x: base.x, y: base.y - 66, text: "···", muted: true });
          }
        }
      } else if (
        activeEv.phase === "playing" &&
        activeEv.def.isMeeting &&
        activeEv.lineIdx < activeEv.def.lines.length
      ) {
        const ln = activeEv.def.lines[activeEv.lineIdx]!;
        const sp = this.npcById(ln.who);
        if (sp) out.push({ x: sp.x, y: sp.y - 66, text: ln.text, muted: false });
      }
    }
    const suppressAmbientForMeeting = Boolean(
      activeEv?.def.isMeeting && (activeEv.phase === "trigger" || activeEv.phase === "calling"),
    );
    if (!suppressAmbientForMeeting) {
      for (const c of this.convos) {
        if (c.state !== "playing") continue;
        const a = this.npcById(c.def.who[0]);
        const b = this.npcById(c.def.who[1]);
        if (!a || !b) continue;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const near = Math.hypot(this.player.x - mx, this.player.y - my) < HEAR_RADIUS;
        if (near) {
          const line = c.def.lines[Math.min(c.line, c.def.lines.length - 1)]!;
          const sp = line.who === a.def.id ? a : b;
          out.push({ x: sp.x, y: sp.y - 66, text: line.text, muted: false });
        } else {
          out.push({ x: mx, y: Math.min(a.y, b.y) - 66, text: "···", muted: true });
        }
      }
    }
    return out;
  }

  // ---------- missions ----------
  private missionById(id: string): MissionDef {
    const m = this.missions.find((x) => x.id === id) ?? MISSIONS.find((x) => x.id === id);
    if (!m) throw new Error(`Unknown mission ${id}`);
    return m;
  }

  missionsDoneCount(excludeFinal = true) {
    return this.missions.filter(
      (m) => this.missionStatus[m.id] === "done" && (!excludeFinal || m.id !== "final"),
    ).length;
  }

  private dayMissions(): MissionDef[] {
    return this.missions.filter((m) => !m.event || m.event === this.event?.id);
  }

  isAvailable(m: MissionDef): boolean {
    if (this.missionStatus[m.id] !== "locked") return false;
    if (m.event && m.event !== this.event?.id) return false;
    if (m.requires && !m.requires.every((r) => this.missionStatus[r] === "done")) return false;
    if (m.requiresCount && this.missionsDoneCount() < m.requiresCount) return false;
    if (m.minTime && this.mins < m.minTime) return false;
    return true;
  }

  offerFor(npcId: string): MissionDef | null {
    return this.dayMissions().find((m) => m.giver === npcId && this.isAvailable(m)) ?? null;
  }

  currentStep(id: string) {
    const m = this.missionById(id);
    if (this.missionStatus[id] !== "active") return null;
    return m.steps[this.missionStep[id] ?? 0] ?? null;
  }

  private activateMission(id: string, silent = false) {
    this.missionStatus[id] = "active";
    this.missionStep[id] = 0;
    this.missionBase[id] = { sales: this.sales, gossip: this.heard.length };
    if (!silent) this.toast(`📋 Nueva misión: ${this.missionById(id).title}`, "mission");
  }

  private advanceMission(id: string) {
    const m = this.missionById(id);
    const next = (this.missionStep[id] ?? 0) + 1;
    this.missionStep[id] = next;
    if (next >= m.steps.length) {
      this.missionStatus[id] = "done";
      this.rep += m.reward.rep;
      if (m.reward.money) this.money += m.reward.money;
      if (m.id !== "intro")
        this.recordRecentEvent(
          `Completaste el encargo «${m.title}» para ${charById(m.giver).name.split(" ")[0]}`,
        );
      this.toast(
        `✅ Misión completada: ${m.title} · +${m.reward.rep} ★${m.reward.money ? ` · +$${m.reward.money}` : ""}`,
        "mission",
      );
      this.checkGoalToast();
      const unlocked = this.dayMissions().filter(
        (x) => this.isAvailable(x) && x.requires?.includes(id),
      );
      if (unlocked.length) {
        const names = [...new Set(unlocked.map((u) => charById(u.giver).name.split(" ")[0]))].join(
          ", ",
        );
        this.toast(`💬 ${names} podría necesitar algo de ti ahora.`, "info");
      }
    } else {
      this.missionBase[id] = { sales: this.sales, gossip: this.heard.length };
    }
  }

  private checkAutoSteps() {
    for (const m of this.missions) {
      const s = this.currentStep(m.id);
      if (!s) continue;
      const base = this.missionBase[m.id] ?? { sales: 0, gossip: 0 };
      if (s.kind === "sales" && this.sales - base.sales >= s.count) this.advanceMission(m.id);
      else if (s.kind === "money" && this.money >= s.amount) this.advanceMission(m.id);
      else if (s.kind === "gossip" && this.heard.length - base.gossip >= s.count)
        this.advanceMission(m.id);
    }
  }

  /** Object ids that some active mission currently points to. */
  targetedObjects(): Set<string> {
    const out = new Set<string>();
    for (const m of this.missions) {
      const s = this.currentStep(m.id);
      if (s?.kind === "object") out.add(s.target);
    }
    return out;
  }

  targetedNPCs(): Set<string> {
    const out = new Set<string>();
    for (const m of this.missions) {
      const s = this.currentStep(m.id);
      if (s?.kind === "talk") out.add(s.target);
    }
    return out;
  }

  npcsWithOffers(): Set<string> {
    const out = new Set<string>();
    for (const m of this.dayMissions()) if (this.isAvailable(m)) out.add(m.giver);
    return out;
  }

  // ---------- interaction ----------
  private nearestNPC(): NPC | null {
    const myFloor = floorOfY(this.player.y);
    let best: NPC | null = null;
    let bd = TALK_RADIUS;
    for (const n of this.npcs) {
      if (floorOfY(n.y) !== myFloor) continue;
      let d = Math.hypot(n.x - this.player.x, n.y - this.player.y);
      // People sitting behind a counter/desk (Pam, Michael) can be reached across it.
      if (!n.moving && (n.targetKey === "seat_pam" || n.targetKey === "seat_michael")) d *= 0.6;
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best;
  }

  private nearestObject(): ObjectDef | null {
    const myFloor = floorOfY(this.player.y);
    const targeted = this.targetedObjects();
    let best: ObjectDef | null = null;
    let bd = OBJECT_RADIUS;
    for (const o of OBJECTS) {
      if (!targeted.has(o.id) || floorOfY(o.y) !== myFloor) continue;
      const d = Math.hypot(o.x - this.player.x, o.y - this.player.y);
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  }

  private nearestDundie() {
    const myFloor = floorOfY(this.player.y);
    for (const d of DUNDIES) {
      if (this.dundiesFound.includes(d.id) || floorOfY(d.y) !== myFloor) continue;
      if (Math.hypot(d.x - this.player.x, d.y - this.player.y) < 44) return d;
    }
    return null;
  }

  private nearestService(): ServiceDef | null {
    const myFloor = floorOfY(this.player.y);
    for (const s of SERVICES) {
      if (floorOfY(s.y) !== myFloor) continue;
      if (Math.hypot(s.x - this.player.x, s.y - this.player.y) < s.radius) return s;
    }
    return null;
  }

  private nearestPortal(): FloorPortal | null {
    const myFloor = floorOfY(this.player.y);
    for (const p of FLOOR_PORTALS) {
      if (p.fromFloor !== myFloor) continue;
      if (Math.hypot(p.x - this.player.x, p.y - this.player.y) < p.radius) return p;
    }
    return null;
  }

  private updateHover() {
    const n = this.nearestNPC();
    if (n) {
      this.hover = { kind: "npc", id: n.def.id, x: n.x, y: n.y - 74, label: "E · HABLAR" };
      return;
    }
    const o = this.nearestObject();
    if (o) {
      this.hover = {
        kind: "object",
        id: o.id,
        x: o.x,
        y: o.y - 30,
        label: "E · " + o.name.toUpperCase(),
      };
      return;
    }
    const d = this.nearestDundie();
    if (d) {
      this.hover = { kind: "dundie", id: d.id, x: d.x, y: d.y - 26, label: "E · ¡UN DUNDIE!" };
      return;
    }
    const portal = this.nearestPortal();
    if (portal) {
      this.hover = {
        kind: "portal",
        id: portal.id,
        x: portal.x,
        y: portal.y - 30,
        label: portal.label,
      };
      return;
    }
    const s = this.nearestService();
    if (s) {
      const label =
        s.id === "pc"
          ? "E · USAR ORDENADOR"
          : s.id === "coffee"
            ? "E · TOMAR CAFÉ"
            : s.id === "vending"
              ? "E · COMPRAR"
              : s.id === "couch"
                ? "E · DESCANSAR"
                : s.id === "cooler"
                  ? "E · BEBER AGUA"
                  : "E · PING-PONG";
      this.hover = { kind: "service", id: s.id, x: s.x, y: s.y - 34, label };
      return;
    }
    const activeEv = this.activeOfficeEventRuntime();
    if (
      activeEv?.def.isMeeting &&
      !this.player.seated &&
      (activeEv.phase === "calling" || activeEv.phase === "gathering")
    ) {
      const seat = CONF_SEATS[0]!;
      if (
        this.isPlayerInConferenceRoom() ||
        Math.hypot(this.player.x - seat.x, this.player.y - seat.y) < 90
      ) {
        this.hover = {
          kind: "meeting",
          id: "sit_meeting",
          x: seat.x,
          y: seat.y - 26,
          label: "E · 🪑 SENTARSE EN REUNIÓN",
        };
        return;
      }
    }
    if (this.isPlayerInConferenceRoom()) {
      this.hover = {
        kind: "meeting",
        id: "raise_hand",
        x: this.player.x,
        y: this.player.y - 66,
        label: "H · ✋ LEVANTAR LA MANO",
      };
      return;
    }
    this.hover = null;
  }

  interact() {
    if (this.frozen) return;
    this.updateHover();
    const h = this.hover;
    if (!h) {
      this.toast("No hay nada ni nadie con quien interactuar aquí.", "info");
      return;
    }
    if (h.kind === "npc") this.openTalk(h.id);
    else if (h.kind === "object") this.useObject(h.id);
    else if (h.kind === "dundie") this.collectDundie(h.id);
    else if (h.kind === "portal") {
      const p = FLOOR_PORTALS.find((pt) => pt.id === h.id);
      if (p) this.usePortal(p);
    } else if (h.kind === "meeting") {
      if (h.id === "sit_meeting") this.sitInMeetingSeat();
      else this.openMeeting();
    } else this.useService(h.id as ServiceDef["id"]);
  }

  private useObject(id: string) {
    for (const m of this.missions) {
      const s = this.currentStep(m.id);
      if (s?.kind === "object" && s.target === id) {
        if (s.gives) this.addItem(s.gives);
        this.triggerPlayerAction(
          id === "copier" || id === "printer"
            ? "Fotocopias"
            : id === "coffee"
              ? "Café"
              : "Revisando archivos",
          2.8,
        );
        this.toast(`🔎 ${s.found}`, "info");
        this.advanceMission(m.id);
        this.emit();
        return;
      }
    }
  }

  private collectDundie(id: string) {
    const d = DUNDIES.find((x) => x.id === id);
    if (!d) return;
    this.dundiesFound.push(id);
    this.rep += 2;
    this.triggerPlayerAction("Celebrando Dundie", 3.4);
    this.recordRecentEvent(`Encontraste el Dundie «${d.title}»`);
    this.toast(
      `🏆 Has encontrado un Dundie: ${d.title} (+2 ★) · ${this.dundiesFound.length}/${DUNDIES.length}`,
      "event",
    );
    this.checkGoalToast();
    this.emit();
  }

  private addItem(id: string) {
    this.inventory[id] = (this.inventory[id] ?? 0) + 1;
  }
  private takeItem(id: string) {
    if (!this.inventory[id]) return false;
    this.inventory[id]--;
    if (!this.inventory[id]) delete this.inventory[id];
    return true;
  }

  eat(id: string) {
    const item = SHOP.find((s) => s.id === id);
    if (!item || !this.inventory[id]) return;
    this.takeItem(id);
    this.energy = Math.min(100, this.energy + item.energy);
    this.triggerPlayerAction("Comiendo", 3.4);
    this.toast(`${item.emoji} Te comes: ${item.name} (+${item.energy} energía)`, "info");
    this.emit();
  }

  private skipTime(min: number) {
    this.mins = Math.min(DAY_END - 1, this.mins + min);
  }

  private useService(id: ServiceDef["id"]) {
    if (id === "pc") return this.openPC();
    if (id === "coffee") {
      for (const m of this.missions) {
        const s = this.currentStep(m.id);
        if (s?.kind === "object" && s.target === "coffee") return this.useObject("coffee");
      }
      if (this.mins < this.coffeeReadyAt) {
        this.toast(
          `☕ La cafetera se está recargando. Vuelve a las ${formatClock(this.coffeeReadyAt)}.`,
          "warn",
        );
        return;
      }
      this.coffeeReadyAt = this.mins + 45;
      this.energy = Math.min(100, this.energy + 35);
      this.skipTime(5);
      this.triggerPlayerAction("Café", 3.6);
      this.toast("☕ Café de oficina: sabe a cartón, pero funciona. +35 energía", "info");
      this.emit();
      return;
    }
    if (id === "vending") return this.openShop();
    if (id === "couch") {
      this.energy = Math.min(100, this.energy + 40);
      this.skipTime(20);
      this.triggerPlayerAction("Siesta digestiva", 4.2);
      this.toast("🛋️ Te echas una siesta de 20 minutos. Stanley aprueba. +40 energía", "info");
      this.emit();
      return;
    }
    if (id === "cooler") {
      const lines = [
        "Junto a la fuente oyes que Kevin una vez se comió 30 tortitas.",
        "Alguien ha escrito «Dwight huele a remolacha» en un vaso de plástico.",
        "Dicen que Creed no tiene número de la Seguridad Social.",
        "Por lo visto Michael tiene un guion para su propia película: «Amenaza Letal».",
        "Phyllis y Bob Vance se conocieron en una feria de refrigeración. Romántico.",
      ];
      this.energy = Math.min(100, this.energy + 5);
      this.triggerPlayerAction("Agua", 3.2);
      this.toast("💧 " + pick(lines), "info");
      this.emit();
      return;
    }
    if (id === "pingpong") return this.openPingPong();
  }

  // ---------- dialog ----------
  private setDialog(line: string, options: DialogOption[], push = true) {
    if (!this.dialog) return;
    if (push) this.dialogHistory.push({ line: this.dialog.line, options: this.dialog.options });
    this.dialog = { ...this.dialog, line, options };
    this.emit();
  }

  private openDialog(
    speaker: string,
    role: string,
    portrait: string | null,
    line: string,
    options: DialogOption[],
  ) {
    this.dialog = { speaker, role, portrait, line, options };
    this.dialogHistory = [];
    this.syncPlayerAction();
    this.emit();
  }

  closeDialog = () => {
    this.dialog = null;
    this.dialogHistory = [];
    this.talkingTo = null;
    this.syncPlayerAction();
    this.emit();
  };

  dialogBack = () => {
    const prev = this.dialogHistory.pop();
    if (!prev || !this.dialog) return;
    this.dialog = {
      ...this.dialog,
      line: prev.line,
      options: this.talkingTo ? this.npcOptions(this.talkingTo) : prev.options,
    };
    this.emit();
  };

  choose = (i: number) => {
    if (this.dialog) {
      const o = this.dialog.options[i];
      if (o) o.act();
      return;
    }
    if (this.pc) this.pcChoose(i);
  };

  private openTalk(id: string) {
    const n = this.npcs.find((x) => x.def.id === id);
    if (!n) return;
    this.talkingTo = id;
    // Face the player
    const dx = this.player.x - n.x;
    const dy = this.player.y - n.y;
    n.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    const convo = this.activeConvoFor(id);
    const mems = this.memories[id] ?? [];
    const lastMem = mems[mems.length - 1];
    let line = this.introOf(id);
    if (convo && convo.state === "playing") {
      const other = charById(convo.def.who.find((w) => w !== id)!);
      line = `Estoy hablando con ${other.name.split(" ")[0]}, pero dime.`;
    } else if (n.override && this.mins < n.override.until && n.override.reactionLine) {
      line = n.override.reactionLine;
    } else if (lastMem) {
      line =
        lastMem.status === "completada"
          ? `Me acuerdo de lo de hoy (${lastMem.atClock}): ${lastMem.reactionLine ?? lastMem.summary}`
          : `Sigo teniendo presente lo nuestro (${lastMem.atClock}): ${lastMem.summary}`;
    } else if (this.event && n.def.eventLines?.[this.event.id] && Math.random() < 0.5) {
      line = n.def.eventLines[this.event.id]!;
    }
    this.openDialog(n.def.name, this.roleOf(id), id, line, this.npcOptions(id));
  }

  private npcOptions(id: string): DialogOption[] {
    const n = charById(id);
    const opts: DialogOption[] = [];
    // Deliveries first
    for (const m of this.missions) {
      const s = this.currentStep(m.id);
      if (s?.kind !== "talk" || s.target !== id) continue;
      if (s.needs && !this.inventory[s.needs]) {
        opts.push({
          label: `📦 ${s.text} (te falta: ${ITEMS[s.needs]?.name ?? s.needs})`,
          tag: "missing",
          act: () => this.setDialog("Vuelve cuando lo tengas.", this.npcOptions(id)),
        });
      } else {
        opts.push({
          label: `📦 ${s.text}`,
          tag: "deliver",
          act: () => {
            if (s.needs) this.takeItem(s.needs);
            this.advanceMission(m.id);
            this.setDialog(s.line, this.npcOptions(id));
          },
        });
      }
    }
    const offer = this.offerFor(id);
    if (offer) {
      opts.push({
        label: "❗ ¿Necesitas ayuda con algo?",
        tag: "mission",
        act: () =>
          this.setDialog(offer.offer, [
            {
              label: `✔ Acepto: «${offer.title}»`,
              tag: "accept",
              act: () => {
                this.activateMission(offer.id);
                this.setDialog("¡Genial! Cuento contigo.", this.npcOptions(id));
              },
            },
            {
              label: "Ahora no puedo",
              tag: "back",
              act: () => this.setDialog("Vale, cuando puedas.", this.npcOptions(id)),
            },
          ]),
      });
    } else {
      opts.push({
        label: "¿Tienes alguna tarea para mí?",
        tag: "topic",
        act: () => this.setDialog(this.noTaskLine(id), this.npcOptions(id)),
      });
    }
    if (this.event && n.eventLines?.[this.event.id]) {
      const ev = this.event;
      opts.push({
        label: `${ev.emoji} ¿Qué tal el ${ev.name}?`,
        tag: "event",
        act: () => this.setDialog(n.eventLines![ev.id]!, this.npcOptions(id)),
      });
    }
    n.topics.forEach((tp) =>
      opts.push({
        label: tp.q,
        tag: "topic",
        act: () => this.setDialog(tp.a, this.npcOptions(id)),
      }),
    );
    const pp = spotAt("pingpong");
    if (
      (id === "darryl" || id === "roy") &&
      Math.hypot(this.player.x - pp.x, this.player.y - pp.y) < 200
    ) {
      opts.push({
        label: "🏓 ¿Una partida de ping-pong?",
        tag: "game",
        act: () => this.startPingPong(id),
      });
    }
    if (this.ai)
      opts.push({
        label: "💬 Charlar libremente (escribe tú)",
        tag: "chat",
        act: () => this.openChat(id),
      });
    opts.push({ label: "Despedirme", tag: "leave", act: this.closeDialog });
    return opts;
  }

  openChat(id: string) {
    this.dialog = null;
    this.dialogHistory = [];
    this.sessionBaseLen = (this.chatLogs[id] ?? []).length;
    this.sessionChatMessages = [];
    this.chatWith = id;
    this.emit();
  }

  appendChatMessage = (id: string, msg: ChatMessage) => {
    const log = (this.chatLogs[id] ??= []);
    log.push({ role: msg.role, content: msg.content, clock: formatClock(this.mins) });
    if (this.chatWith === id) this.sessionChatMessages.push(msg);

    if (msg.role === "user" && this.isSecretChatTrigger(id, msg.content)) {
      const already = this.unlockedSkins.includes("india");
      if (!already) {
        this.unlockedSkins = [...this.unlockedSkins, "india"];
        saveUnlockedSkins(this.unlockedSkins);
      }
      this.playerSkin = "india";
      savePlayerSkin("india");

      const tobyReply = already
        ? "Ya te la di antes… te la he vuelto a poner. Puedes cambiar entre tu ropa normal y esta skin cuando quieras en Pausa [Esc]."
        : "…¿Eh? Bueno, vale. El año pasado Michael encargó con el presupuesto de Recursos Humanos un disfraz absurdo de «Maharajah VIP de Bollywood» para Diwali y lo escondió en mi cajón. Toma, quédatelo. Es la skin más recargada y épica de toda la oficina… y puedes cambiártela cuando quieras desde Pausa [Esc]. Por favor, no le digas a Michael que te la di.";
      log.push({ role: "assistant", content: tobyReply, clock: formatClock(this.mins) });
      if (this.chatWith === id) {
        this.sessionChatMessages.push({ role: "assistant", content: tobyReply });
      }
      if (!already) {
        this.appendChatNote(
          id,
          "🕉️✨ Skin exclusiva desbloqueada y equipada: El Maharajah del Meme",
        );
        const memList = (this.memories[id] ??= []);
        memList.push({
          id: `mem_skin_india_${Date.now()}`,
          atClock: formatClock(this.mins),
          summary: "Te entregó la skin exclusiva del Maharajah del Meme",
          kind: "alert",
          status: "completada",
          targetId: null,
          reactionLine: "Por favor, no le digas a Michael que guardo esto en RRHH.",
        });
      }
      this.toast(
        already
          ? "🕉️✨ Skin equipada: El Maharajah del Meme (cámbiala en Pausa [Esc])."
          : "🕉️✨ ¡Skin exclusiva desbloqueada y equipada: El Maharajah del Meme! Cámbiala en Pausa [Esc].",
        "event",
      );
    }

    this.emit();
  };

  private appendChatNote(id: string, content: string) {
    const log = (this.chatLogs[id] ??= []);
    log.push({ role: "note", content, clock: formatClock(this.mins) });
  }

  recordChatMessages = (messages: ChatMessage[]) => {
    this.sessionChatMessages = messages;
    if (this.chatWith) {
      const base = (this.chatLogs[this.chatWith] ?? []).slice(0, this.sessionBaseLen);
      const clock = formatClock(this.mins);
      this.chatLogs[this.chatWith] = [
        ...base,
        ...messages.map((m) => ({ role: m.role, content: m.content, clock })),
      ];
      this.emit();
    }
  };

  closeChat = () => {
    const id = this.chatWith;
    const msgs = this.sessionChatMessages;
    this.chatWith = null;
    this.talkingTo = null;
    this.sessionChatMessages = [];
    this.sessionBaseLen = 0;
    this.emit();
    if (
      id &&
      this.ai &&
      msgs.some((m) => m.role === "user" && !this.isSecretChatTrigger(id, m.content))
    ) {
      void this.analyzeChatImpact(id, msgs);
    }
  };

  private async analyzeChatImpact(id: string, messages: ChatMessage[]) {
    if (!this.ai) return;
    try {
      const memList = this.memories[id] ?? [];
      const impact = await this.ai.chatImpact({
        characterId: id,
        messages: messages
          .slice(-18)
          .map((m) => ({ role: m.role, content: m.content.slice(0, 750) })),
        eventName: this.event?.name ?? null,
        clock: formatClock(this.mins),
        memories: memList.slice(-20).map((m) => `[${m.status}] ${m.summary}`.slice(0, 280)),
        activeCharIds: this.activeCharIds,
        episodeContext: this.episodeContextText(),
        speakerRole: this.roleOf(id),
      });
      if (!impact.important || this.phase !== "playing") return;
      const npc = this.npcById(id);
      if (!npc) return;

      const kind = impact.kind ?? "alert";
      const hasTarget = !!(
        impact.seekTargetId &&
        impact.convoLines.length >= 2 &&
        this.npcById(impact.seekTargetId)
      );
      const memId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      memList.push({
        id: memId,
        atClock: formatClock(this.mins),
        summary: impact.summary,
        kind,
        status: hasTarget ? "en_marcha" : "recordada",
        targetId: hasTarget ? impact.seekTargetId : null,
        reactionLine: impact.reactionLine,
      });
      this.memories[id] = memList;
      this.appendChatNote(id, `⚡ ${impact.summary}`);

      npc.override = {
        action: impact.newAction,
        spot: impact.behaviorSpot,
        until: this.mins + (hasTarget ? 35 : 40),
        reactionLine: impact.reactionLine,
        memoryId: memId,
      };
      this.toast(`⚡ ${impact.summary}`, "event");
      if (hasTarget && impact.seekTargetId) {
        this.convos.push({
          def: {
            id: `dyn_${Date.now()}_${id}_${impact.seekTargetId}`,
            title: impact.convoTitle,
            who: [id, impact.seekTargetId],
            spot: impact.behaviorSpot,
            at: this.mins + 0.5,
            duration: 38,
            lines: impact.convoLines,
          },
          state: "pending",
          line: 0,
          lineT: 0,
          arrived: false,
          dynamic: true,
          seekBy: id,
          seekTarget: impact.seekTargetId,
          kind,
          prepSpot: impact.prepSpot ?? undefined,
          prepDone: !impact.prepSpot,
          prepTimer: 0,
          memoryId: memId,
          targetAction: impact.targetAction ?? undefined,
        });
      }
      this.emit();
    } catch {
      // Silently ignore AI failure on background impact check.
    }
  }

  private noTaskLine(id: string): string {
    const pending = this.dayMissions().find(
      (m) => m.giver === id && this.missionStatus[m.id] === "locked",
    );
    const active = this.missions.find(
      (m) => m.giver === id && this.missionStatus[m.id] === "active",
    );
    if (active) return `Aún estás con «${active.title}». Termina eso primero.`;
    if (pending) {
      if (pending.minTime && this.mins < pending.minTime)
        return `Ahora mismo no. Pásate a partir de las ${formatClock(pending.minTime)}.`;
      if (pending.requiresCount)
        return `Primero demuestra lo que vales: ayuda a la gente de la oficina (${this.missionsDoneCount()}/${pending.requiresCount}).`;
      return "Ahora mismo no. Quizá más tarde, cuando hayas ayudado a otros.";
    }
    return "No, nada. Gracias por preguntar.";
  }

  private openShop() {
    const opts: DialogOption[] = SHOP.map((it) => ({
      label: `${it.emoji} ${it.name} — $${it.price} (+${it.energy} energía)`,
      tag: "shop" as const,
      act: () => {
        if (this.money < it.price) {
          this.setDialog(
            `No tienes suficiente dinero. Tienes $${this.money}. Cierra alguna venta.`,
            this.dialog!.options,
            false,
          );
          return;
        }
        this.money -= it.price;
        this.addItem(it.id);
        this.setDialog(
          `*clonc* Has comprado: ${it.name}. Lo tienes en el inventario (pulsa sobre él para comerlo).`,
          this.dialog!.options,
          false,
        );
      },
    }));
    opts.push({ label: "Salir", tag: "leave", act: this.closeDialog });
    this.triggerPlayerAction("Máquina expendedora", 3.2);
    this.openDialog(
      "Máquinas expendedoras",
      `Tienes $${this.money}`,
      null,
      "Bzzzz… La máquina zumba esperando monedas.",
      opts,
    );
  }

  // ---------- ping-pong mini game ----------
  private openPingPong() {
    const pp = spotAt("pingpong");
    const opp = this.npcs.find(
      (n) =>
        (n.def.id === "darryl" || n.def.id === "roy") && Math.hypot(n.x - pp.x, n.y - pp.y) < 160,
    );
    if (!opp) {
      this.toast(
        "🏓 No hay nadie para jugar. Darryl y Roy juegan a la hora de comer (12:00).",
        "info",
      );
      return;
    }
    this.talkingTo = null;
    this.triggerPlayerAction("Ping-pong", 3.6);
    this.openDialog(
      opp.def.name,
      "Ping-pong",
      opp.def.id,
      "¿Una partida rápida? Al mejor de tres puntos.",
      [
        { label: "🏓 ¡Vamos!", tag: "game", act: () => this.startPingPong(opp.def.id) },
        { label: "Mejor no", tag: "leave", act: this.closeDialog },
      ],
    );
  }

  private startPingPong(oppId: string) {
    if (this.mins < this.pingpongReadyAt) {
      this.setDialog(
        `Ya hemos jugado. Revancha a las ${formatClock(this.pingpongReadyAt)}.`,
        this.dialog!.options,
      );
      return;
    }
    const state = { me: 0, them: 0 };
    const shots = ["Remate fuerte", "Con efecto", "Dejada suave"] as const;
    const beats: Record<string, string> = {
      "Remate fuerte": "Dejada suave",
      "Dejada suave": "Con efecto",
      "Con efecto": "Remate fuerte",
    };
    const round = (msg: string) => {
      if (state.me === 2 || state.them === 2) {
        const won = state.me === 2;
        this.pingpongReadyAt = this.mins + 60;
        this.skipTime(10);
        if (won) {
          this.rep += 2;
          this.money += 5;
          this.recordRecentEvent(
            `Ganaste al ping-pong contra ${charById(oppId).name.split(" ")[0]}`,
          );
          this.checkGoalToast();
        }
        this.setDialog(
          `${msg} ${won ? `¡Ganas ${state.me}-${state.them}! +2 ★ y $5 de apuesta.` : `Pierdes ${state.me}-${state.them}. «Buen intento, novato.»`}`,
          [{ label: "Seguir", tag: "leave", act: this.closeDialog }],
        );
        return;
      }
      this.setDialog(
        `${msg} Marcador: ${state.me}-${state.them}. ¿Qué golpe haces?`,
        shots.map((s) => ({
          label: s,
          tag: "game" as const,
          act: () => {
            const opp = pick(shots);
            let res: string;
            if (opp === s) res = `Los dos hacéis «${s}». Punto repetido.`;
            else if (beats[s] === opp) {
              state.me++;
              res = `Tu «${s}» supera su «${opp}». ¡Punto!`;
            } else {
              state.them++;
              res = `Su «${opp}» supera tu «${s}». Punto para ${charById(oppId).name.split(" ")[0]}.`;
            }
            round(res);
          },
        })),
        false,
      );
    };
    round("¡Saca!");
  }

  // ---------- PC & sales ----------
  openPC = () => {
    if (this.phase !== "playing") return;
    this.dialog = null;
    this.pc = { screen: "menu" };
    this.syncPlayerAction();
    this.emit();
  };
  closePC = () => {
    this.pc = null;
    this.call = null;
    this.playerActionUntil = 0;
    this.syncPlayerAction();
    this.emit();
  };

  pcMenu = () => {
    this.call = null;
    this.pc = { screen: "menu" };
    this.emit();
  };

  pcSummary = () => {
    this.pc = { screen: "summary" };
    this.emit();
  };

  private mails(): Mail[] {
    const ev = this.event ? EVENT_MAILS[this.event.id] : undefined;
    return ev ? [ev, ...BASE_MAILS] : BASE_MAILS;
  }

  pcMail = () => {
    this.pc = {
      screen: "mail",
      mails: this.mails().map((m) => ({
        id: m.id,
        from: m.from,
        subject: m.subject,
        read: this.readMails.has(m.id),
      })),
    };
    this.emit();
  };

  pcReadMail = (id: string) => {
    const m = this.mails().find((x) => x.id === id);
    if (!m) return;
    this.readMails.add(id);
    this.pc = { screen: "mailRead", mail: m };
    this.emit();
  };

  pcStartCall = () => {
    const client = pick(CLIENTS);
    this.call = {
      client,
      stage: 0,
      interest: START_INTEREST,
      history: [],
      options: optionsFor(0, null),
      clientLine: client.greeting,
      youLine: null,
      reaction: null,
      lastDelta: null,
      ai: false,
      loading: false,
    };
    this.calls++;
    this.pc = { screen: "call", call: this.callSnapshot() };
    this.triggerPlayerAction("Llamada de ventas", 999);
    this.emit();
  };

  /** Same tree rules, but the client and every line are invented by the AI. */
  pcStartAiCall = async () => {
    if (!this.ai) return this.pcStartCall();
    const call: CallState = {
      client: {
        company: "Marcando…",
        contact: "…",
        personality: "amable",
        need: "…",
        budget: 0,
        greeting: "",
      },
      stage: 0,
      interest: START_INTEREST,
      history: [],
      options: [],
      clientLine: "",
      youLine: null,
      reaction: null,
      lastDelta: null,
      ai: true,
      loading: true,
    };
    this.call = call;
    this.aiReactions = [];
    this.calls++;
    this.pc = { screen: "call", call: this.callSnapshot() };
    this.triggerPlayerAction("Llamada de ventas", 999);
    this.emit();
    try {
      const r = await this.ai.salesStart();
      if (this.call !== call) return;
      call.client = r.client;
      call.clientLine = r.client.greeting;
      call.options = r.options;
    } catch {
      if (this.call !== call) return;
      const client = pick(CLIENTS);
      call.client = client;
      call.clientLine = client.greeting;
      call.options = OPENING;
      call.ai = false;
      this.toast("🤖 La IA no responde: te paso una llamada normal.", "warn");
    }
    call.loading = false;
    if (this.pc?.screen === "call") this.pc = { screen: "call", call: this.callSnapshot() };
    this.emit();
  };

  private callSnapshot(): CallSnapshot {
    const c = this.call!;
    return {
      company: c.client.company,
      contact: c.client.contact,
      need: c.client.need,
      budget: c.client.budget,
      stage: c.stage,
      interest: c.interest,
      path: c.history.map((h) => ({
        approach: h.option.approach,
        delta: h.delta,
        text: h.option.text,
      })),
      options: c.options.map((o) => ({ text: o.text, approach: o.approach })),
      clientLine: c.clientLine,
      youLine: c.youLine,
      reaction: c.reaction,
      lastDelta: c.lastDelta,
      ai: c.ai,
      loading: c.loading,
    };
  }

  pcChooseOption = (i: number) => {
    const c = this.call;
    if (!c || c.loading || this.pc?.screen !== "call") return;
    const opt: SaleOption | undefined = c.options[i];
    if (!opt) return;
    const p = c.client.personality;
    const delta = scoreOption(
      p,
      opt,
      c.history.map((h) => h.option.approach),
    );
    c.history.push({ stage: c.stage, option: opt, delta });
    c.interest = Math.max(0, Math.min(MAX_INTEREST, c.interest + delta));
    const pool = REACTIONS[p][bucketFor(delta)];
    c.reaction = pick(pool);
    c.youLine = opt.text;
    c.lastDelta = delta;
    this.playerActionSeed = (this.playerActionSeed + 1) % 10;
    this.skipTime(3);
    if (c.interest <= 0) {
      c.clientLine = HANGUPS[p];
      this.pc = {
        screen: "result",
        call: this.callSnapshot(),
        outcome: { kind: "none", amount: 0 },
        hungUp: true,
      };
      this.syncPlayerAction();
      this.emit();
      return;
    }
    if (c.stage >= 4) {
      const outcome = outcomeFor(c.interest, c.client.budget, this.event?.salesBonus ?? 1);
      if (outcome.amount > 0) {
        this.money += outcome.amount;
        this.sales++;
        this.rep += outcome.kind === "big" ? 2 : outcome.kind === "sale" ? 1 : 0;
        this.recordRecentEvent(`Venta cerrada con ${c.client.company} ($${outcome.amount})`);
        this.toast(`💰 Venta cerrada con ${c.client.company}: +$${outcome.amount}`, "money");
        this.checkGoalToast();
      }
      this.checkAutoSteps();
      this.pc = { screen: "result", call: this.callSnapshot(), outcome, hungUp: false };
      this.syncPlayerAction();
      this.emit();
      return;
    }
    c.stage++;
    if (c.ai && this.ai) {
      void this.aiNextTurn(c, opt, delta);
      return;
    }
    c.options = optionsFor(c.stage, opt.approach);
    c.clientLine = PROMPTS[p][c.stage] ?? "";
    this.pc = { screen: "call", call: this.callSnapshot() };
    this.emit();
  };

  private async aiNextTurn(c: CallState, opt: SaleOption, delta: number) {
    const fallbackReaction = c.reaction;
    c.loading = true;
    c.reaction = null;
    c.options = [];
    c.clientLine = "";
    this.pc = { screen: "call", call: this.callSnapshot() };
    this.emit();
    const history = c.history.map((h, i) => ({
      approach: h.option.approach,
      text: h.option.text,
      reaction: i === c.history.length - 1 ? null : (this.aiReactions[i] ?? null),
    }));
    try {
      const r = await this.ai!.salesTurn({
        client: c.client,
        stage: c.stage,
        interest: c.interest,
        delta,
        history,
      });
      if (this.call !== c) return;
      c.reaction = r.reaction;
      c.clientLine = r.clientLine;
      c.options = r.options;
    } catch {
      if (this.call !== c) return;
      c.reaction = fallbackReaction;
      c.clientLine = PROMPTS[c.client.personality][c.stage] ?? "";
      c.options = optionsFor(c.stage, opt.approach);
    }
    this.aiReactions[c.history.length - 1] = c.reaction;
    c.loading = false;
    if (this.pc?.screen === "call") this.pc = { screen: "call", call: this.callSnapshot() };
    this.emit();
  }

  pcHangUp = () => {
    this.call = null;
    this.pc = { screen: "menu" };
    this.syncPlayerAction();
    this.toast("📞 Has colgado. El cliente no volverá a llamar hoy.", "warn");
    this.emit();
  };

  private pcChoose(i: number) {
    const pc = this.pc;
    if (!pc) return;
    if (pc.screen === "call") return this.pcChooseOption(i);
    if (pc.screen === "menu") {
      [this.pcStartCall, this.pcStartAiCall, this.pcMail, this.pcSummary, this.closePC][i]?.();
      return;
    }
    if (pc.screen === "result") {
      [this.pcStartCall, this.pcMenu, this.closePC][i]?.();
      return;
    }
    if (pc.screen === "mail") {
      const m = pc.mails[i];
      if (m) this.pcReadMail(m.id);
      return;
    }
    if (pc.screen === "mailRead" || pc.screen === "summary") this.pcMenu();
  }

  // ---------- conference room meeting intervention ----------
  private currentMeetingSpec(): {
    eventId: string;
    title: string;
    roomName: string;
    hostId: string;
    attendees: string[];
    topicPrompt: string;
    suggestedLines: string[];
    isSpontaneous: boolean;
  } {
    const activeEv = this.activeOfficeEventRuntime();
    if (activeEv && activeEv.def.room === "conf") {
      return {
        eventId: activeEv.def.id,
        title: activeEv.def.title,
        roomName: this.officeEventRoomName(activeEv.def.room),
        hostId: activeEv.hostId,
        attendees: [...activeEv.activeParticipants],
        topicPrompt: activeEv.def.topicPrompt,
        suggestedLines: activeEv.def.suggestedLines ?? [
          "¿Puedo proponer una idea rápida para mejorar esto?",
          "¿Cómo afecta exactamente esta reunión a nuestras ventas de hoy?",
          "Creo que deberíamos escuchar lo que opina todo el equipo.",
        ],
        isSpontaneous: false,
      };
    }

    const activeSet = new Set(this.activeCharIds);
    const inConf = this.npcs
      .filter((n) => {
        const r = ROOMS.find((rm) => rm.id === "conf")!;
        return n.x >= r.x && n.x <= r.x + r.w && n.y >= r.y && n.y <= r.y + r.h;
      })
      .map((n) => n.def.id);
    const defaults = [
      "michael",
      "dwight",
      "jim",
      "pam",
      "stanley",
      "andy",
      "karen",
      "oscar",
      "angela",
    ].filter((id) => activeSet.has(id));
    const combined = [
      ...new Set([...inConf, ...this.meetingSpontaneousAttendees, ...defaults]),
    ].slice(0, 7);
    const hostId = combined.includes("michael")
      ? "michael"
      : (combined[0] ?? this.meetingSpontaneousHost);
    return {
      eventId: "spontaneous_conf",
      title: this.episode
        ? `Reunión en Sala de Conferencias (${this.episode.epLabel})`
        : "Reunión en la Sala de Conferencias",
      roomName: "SALA DE REUNIONES",
      hostId,
      attendees: combined.length > 0 ? combined : [hostId],
      topicPrompt: this.episode
        ? `Reunión improvisada en la Sala de Conferencias durante ${this.episode.epLabel} «${this.episode.title}» (${this.episode.officeState}).`
        : "Reunión improvisada en la Sala de Conferencias de Dunder Mifflin Scranton sobre el trabajo diario y el ambiente de la oficina.",
      suggestedLines: [
        "Michael, propongo una idea nueva para conseguir más clientes hoy.",
        "¿Podemos hablar del presupuesto de café y aperitivos de la sala de descanso?",
        "Quiero felicitar al departamento de ventas por aguantar el lunes.",
      ],
      isSpontaneous: true,
    };
  }

  openMeeting = () => {
    if (this.phase !== "playing" || this.cinematicState || this.paused) return;
    this.dialog = null;
    this.pc = null;
    this.chatWith = null;
    this.journal = false;

    const activeEv = this.activeOfficeEventRuntime();
    if (activeEv && activeEv.def.room === "conf") {
      const upTo = Math.min(activeEv.lineIdx, activeEv.def.lines.length - 1);
      for (let i = 0; i <= upTo; i++) this.recordEventLine(activeEv, i);
    }

    const spec = this.currentMeetingSpec();
    this.meetingEventId = spec.eventId;
    if (spec.isSpontaneous) {
      this.meetingSpontaneousHost = spec.hostId;
      this.meetingSpontaneousAttendees = spec.attendees;
    }
    this.meetingEntries[spec.eventId] ??= [];
    this.meetingOpen = true;
    this.emit();
  };

  closeMeeting = () => {
    if (!this.meetingOpen) return;
    this.meetingOpen = false;
    this.emit();
  };

  interveneInMeeting = async (rawText: string): Promise<MeetingInterveneResult | null> => {
    const text = rawText.trim();
    if (!text || this.phase !== "playing") return null;
    const spec = this.currentMeetingSpec();
    const list = (this.meetingEntries[spec.eventId] ??= []);
    const clock = formatClock(this.mins);

    list.push({
      kind: "player",
      who: "player",
      name: "Tú (Empleado nuevo)",
      text,
      clock,
    });
    this.emit();

    const recentLines = list
      .filter((e) => e.kind === "canon" || e.kind === "player" || e.kind === "ai")
      .slice(-8)
      .map((e) => ({ who: e.who ?? spec.hostId, text: e.text }));

    let result: MeetingInterveneResult;
    try {
      if (this.ai?.meetingIntervene) {
        result = await this.ai.meetingIntervene({
          meetingTitle: spec.title,
          topicPrompt: spec.topicPrompt,
          roomName: spec.roomName,
          hostId: spec.hostId,
          attendeeIds: spec.attendees,
          recentLines,
          playerLine: text,
          clock,
          eventName: this.event?.name ?? null,
          episodeContext: this.episodeContextText(),
        });
      } else {
        result = normalizeMeetingIntervene(null, spec.attendees, spec.hostId);
      }
    } catch {
      result = normalizeMeetingIntervene(null, spec.attendees, spec.hostId);
    }

    if (this.phase !== "playing") return result;

    for (const r of result.reactions) {
      list.push({
        kind: "ai",
        who: r.who,
        name: r.name,
        text: r.text,
        clock: formatClock(this.mins),
      });
    }

    const activeEv = this.activeOfficeEventRuntime();
    if (activeEv && activeEv.def.isMeeting && activeEv.phase === "playing") {
      this.meetingOpen = false;
      this.player.gesture = "none";
      const aiGesture: MeetingGesture =
        result.mood === "aplausos"
          ? "clap"
          : result.mood === "risa"
            ? "nod"
            : result.mood === "caos"
              ? "point"
              : "facepalm";
      activeEv.aiQueue.push(
        ...result.reactions.map((r) => ({
          who: r.who,
          name: r.name,
          text: r.text,
          gesture: r.who === spec.hostId ? ("point" as const) : aiGesture,
        })),
      );
      if (activeEv.aiQueue.length > 0 && !activeEv.aiBeat) {
        activeEv.aiBeat = activeEv.aiQueue.shift() ?? null;
        activeEv.aiBeatT = 0;
      }
    }

    const moodIcon =
      result.mood === "aplausos"
        ? "👏"
        : result.mood === "risa"
          ? "😂"
          : result.mood === "caos"
            ? "🔥"
            : "😬";
    list.push({
      kind: "note",
      name: `${moodIcon} Ambiente: ${result.mood}`,
      text: `${result.summary}${result.repDelta !== 0 ? ` (${result.repDelta > 0 ? "+" : ""}${result.repDelta} ★)` : ""}`,
      clock: formatClock(this.mins),
    });

    this.rep = Math.max(0, this.rep + result.repDelta);
    this.recordRecentEvent(`Interveniste en reunión («${spec.title}»): ${result.summary}`);
    if (!this.isMeetingCinema) {
      this.toast(
        `✋ ${result.summary}${result.repDelta !== 0 ? ` (${result.repDelta > 0 ? "+" : ""}${result.repDelta} ★)` : ""}`,
        "event",
      );
    }
    this.checkGoalToast();

    // Persist host memory so they recall what you said in the meeting
    const hostMemList = (this.memories[spec.hostId] ??= []);
    hostMemList.push({
      id: `mem_meet_${Date.now()}`,
      atClock: clock,
      summary: `Interveniste en «${spec.title}»: «${text.slice(0, 70)}»`,
      kind: "task",
      status: "completada",
      reactionLine: result.reactions[0]?.text ?? result.summary,
    });

    if (result.followUpAction) {
      const targetNpc = this.npcById(result.followUpAction.who);
      if (targetNpc) {
        const line =
          result.reactions.find((r) => r.who === targetNpc.def.id)?.text ?? result.summary;
        targetNpc.override = {
          action: result.followUpAction.action,
          spot: result.followUpAction.spot,
          until: this.mins + 25,
          reactionLine: line,
        };
      }
    } else if (spec.isSpontaneous) {
      // Pull a few attendees briefly into the conference room if it was spontaneous
      const confSpots = ["conf_s1", "conf_s2", "conf_n1", "conf_n2"];
      spec.attendees.slice(0, 4).forEach((id, idx) => {
        const npc = this.npcById(id);
        if (!npc) return;
        const r = result.reactions.find((x) => x.who === id);
        npc.override = {
          action: "Reunión contigo",
          spot: confSpots[idx % confSpots.length]!,
          until: this.mins + 18,
          reactionLine: r?.text ?? result.summary,
        };
      });
    }

    this.emit();
    return result;
  };

  // ---------- misc UI ----------
  toast(text: string, kind: Toast["kind"] = "info") {
    const id = this.toastId++;
    const deduped = this.toasts.filter((t) => t.text !== text);
    this.toasts = [...deduped, { id, text, kind }].slice(-2);
    setTimeout(
      () => {
        this.toasts = this.toasts.filter((t) => t.id !== id);
        this.emit();
      },
      kind === "event" || kind === "mission" ? 5200 : 3800,
    );
    this.emit();
  }

  togglePause = () => {
    if (this.phase !== "playing") return;
    this.paused = !this.paused;
    this.emit();
  };
  returnToMenu = () => {
    this.startRunId++;
    this.phase = "start";
    this.paused = false;
    this.journal = false;
    this.meetingOpen = false;
    this.player.seated = false;
    this.player.gesture = "none";
    this.officeEvents = [];
    this.cinematicState = null;
    this.dialog = null;
    this.pc = null;
    this.chatWith = null;
    this.emit();
  };
  toggleJournal = () => {
    if (
      this.phase !== "playing" ||
      this.cinematicState ||
      this.isMeetingCinema ||
      this.dialog ||
      this.pc ||
      this.chatWith ||
      this.meetingOpen
    )
      return;
    this.journal = !this.journal;
    this.emit();
  };

  handleKey(key: string, down: boolean) {
    const k = key.length === 1 ? key.toLowerCase() : key;
    this.keys[k] = down;
    if (!down) return;
    if (this.phase !== "playing") return;
    if (this.cinematicState && !this.paused) {
      if (k === "Escape") {
        this.skipCinematic();
        return;
      }
      if (/^[1-3]$/.test(k) && this.cinematicState.step === 1) {
        this.cinematicChoose(Number(k) - 1);
        return;
      }
      if (k === " " || k === "Enter" || k === "e") {
        if (this.cinematicState.step === 1) this.cinematicChoose(0);
        else this.cinematicNext();
        return;
      }
      return;
    }
    if (/^[1-9]$/.test(k) && (this.dialog || this.pc)) {
      this.choose(Number(k) - 1);
      return;
    }
    if (k === "Escape") {
      if (this.meetingOpen) return this.closeMeeting();
      if (this.isMeetingCinema) return this.leaveMeetingCinema();
      if (this.dialog) return this.closeDialog();
      if (this.chatWith) return this.closeChat();
      if (this.pc) return this.closePC();
      if (this.journal) return this.toggleJournal();
      return this.togglePause();
    }
    if (k === "h" && (!this.frozen || this.isMeetingCinema) && this.isPlayerInConferenceRoom()) {
      this.openMeeting();
      return;
    }
    if (k === "g" && !this.frozen && !this.isMeetingCinema) {
      const ev = this.activeOfficeEventRuntime();
      if (
        ev?.def.isMeeting &&
        (ev.phase === "trigger" || ev.phase === "calling" || ev.phase === "gathering")
      ) {
        this.sitInMeetingSeat();
        return;
      }
    }
    if (k === "e" && !this.frozen) this.interact();
    if (k === "v" && !this.frozen) this.toggleCameraMode();
    if (k === "j") this.toggleJournal();
  }

  private endDay() {
    if (this.phase === "ended") return;
    this.phase = "ended";
    this.dialog = null;
    this.chatWith = null;
    this.pc = null;
    this.meetingOpen = false;
    this.npcApproach = null;
    const goal = this.dailyGoalProgress();
    this.careerRep += this.rep;
    this.careerSales += this.sales;
    this.recordRecentEvent(
      `Día ${this.dayNumber}: ${goal.allCompleted ? "Cuota superada" : "Cuota parcial"} (${this.sales} ventas, ${this.rep} ★)`,
    );
    this.persistCareer();
    this.emit();
  }

  private endSummary(): EndSummary {
    const done = this.dayMissions().filter((m) => this.missionStatus[m.id] === "done").length;
    const total = this.dayMissions().length;
    const goal = this.dailyGoalProgress();
    let award = "Dundie al «Empleado nuevo más prometedor»";
    let awardLine = "Michael: «Buen trabajo, empleado nuevo. Mañana más.»";
    if (goal.allCompleted && this.sales >= this.dailyGoalSpec.targetSales) {
      award = `Dundie al «MVP del Día ${this.dayNumber}»`;
      awardLine = "Michael: «¡Objetivo cumplido! Ya eres parte oficial de Scranton.»";
    } else if (this.money >= 4000) {
      award = "Dundie al «Vendedor del año»";
      awardLine = "Michael: «Has vendido más que Dwight. No se lo digas. Bueno, sí, díselo.»";
    } else if (this.heard.length >= 8) {
      award = "Dundie al «Oído más fino de Scranton»";
      awardLine = "Kelly: «Eres oficialmente mi persona favorita. Cuéntamelo TODO.»";
    } else if (done >= Math.round(total * 0.7)) {
      award = "Dundie al «Héroe de la oficina»";
      awardLine = "Michael: «Has ayudado a todos. Eres como yo, pero eficiente.»";
    } else if (this.dundiesFound.length === DUNDIES.length) {
      award = "Dundie al «Coleccionista de Dundies»";
      awardLine = "Michael: «¡Los has encontrado todos! Ni yo sabía dónde los había puesto.»";
    } else if (this.rep < 5) {
      award = "Dundie a «¿Quién eres tú?»";
      awardLine = "Stanley: «¿Has venido hoy? No me había dado cuenta.»";
    }
    return {
      dayNumber: this.dayNumber,
      rankTitle: goal.rankTitle,
      goalMet: goal.allCompleted,
      goalSummary: goal.allCompleted
        ? `Objetivo del Día ${this.dayNumber} completado (${goal.completedCount}/3 metas).`
        : `Objetivo parcial (${goal.completedCount}/3 metas cumplidas).`,
      money: this.money,
      sales: this.sales,
      calls: this.calls,
      missionsDone: done,
      missionsTotal: total,
      rep: this.rep,
      careerRep: this.careerRep,
      careerSales: this.careerSales,
      gossip: this.heard.length,
      gossipTotal: this.convos.length,
      dundies: this.dundiesFound.length,
      award,
      awardLine,
      recentEvents: [...this.recentEvents],
    };
  }

  // ---------- snapshot ----------
  private buildSnapshot(): UIState {
    const missions: MissionUI[] = this.dayMissions().map((m) => {
      const st = this.missionStatus[m.id] ?? "locked";
      const step = st === "active" ? (m.steps[this.missionStep[m.id] ?? 0] ?? null) : null;
      let stepText = step?.text ?? null;
      if (step?.kind === "sales")
        stepText = `${step.text} (${this.sales - (this.missionBase[m.id]?.sales ?? 0)}/${step.count})`;
      if (step?.kind === "money") stepText = `${step.text} ($${this.money}/$${step.amount})`;
      if (step?.kind === "gossip")
        stepText = `${step.text} (${this.heard.length - (this.missionBase[m.id]?.gossip ?? 0)}/${step.count})`;
      return {
        id: m.id,
        title: m.title,
        desc: m.desc,
        status: st,
        giver: charById(m.giver).name,
        step: stepText,
        stepIndex: this.missionStep[m.id] ?? 0,
        steps: m.steps.length,
        event: !!m.event,
        available: this.phase === "playing" && this.isAvailable(m),
      };
    });
    const cin = this.cinematicState;
    const cinematic: CinematicUI | null = cin
      ? {
          sceneId: cin.scene.id,
          sceneNumber: cin.sceneNumber,
          totalScenes: WELCOME_SCENES.length,
          title: cin.scene.title,
          category: cin.scene.category,
          costume: cin.scene.costume,
          speaker: "Michael Scott",
          line:
            cin.step === 0
              ? cin.scene.opening
              : cin.step === 1
                ? cin.scene.prompt
                : cin.reactionText,
          step: cin.step,
          choices: cin.step === 1 ? cin.scene.replies.map((r) => ({ label: r.label })) : [],
        }
      : null;
    const activeEv = this.activeOfficeEventRuntime();
    let meetingNotice: MeetingNoticeUI | null = null;
    let meetingCinema: MeetingCinemaUI | null = null;
    if (activeEv && activeEv.def.isMeeting) {
      const counts = this.seatedCountForMeeting(activeEv);
      if (
        activeEv.phase === "trigger" ||
        activeEv.phase === "calling" ||
        activeEv.phase === "gathering"
      ) {
        const steps = activeEv.def.trigger?.preludeSteps;
        const step = activeEv.phase === "trigger" ? steps?.[activeEv.preludeIdx] : undefined;
        const headline =
          activeEv.phase === "trigger"
            ? (step?.toastText ?? activeEv.def.trigger?.toastText ?? "Algo ocurre en la oficina…")
            : activeEv.phase === "calling"
              ? `📢 ${charById(activeEv.hostId).name.split(" ")[0]} llama a toda la oficina`
              : this.player.seated
                ? "🪑 Ya estás sentado · esperando a tus compañeros…"
                : "🪑 ¡Ve a la Sala de Conferencias y siéntate en tu silla!";
        const callText =
          activeEv.phase === "trigger"
            ? step
              ? `${charById(step.speaker).name.split(" ")[0]}: «${step.line}»`
              : (activeEv.def.trigger?.line ?? "…")
            : (activeEv.def.trigger?.callLine ?? "¡A la Sala de Conferencias, YA!");
        const replyText =
          activeEv.phase === "trigger" && step?.replyWho && step?.replyLine
            ? `${charById(step.replyWho).name.split(" ")[0]}: «${step.replyLine}»`
            : undefined;
        const stepLabel =
          activeEv.phase === "trigger" && step && steps
            ? `Escena ${activeEv.preludeIdx + 1}/${steps.length}`
            : undefined;
        meetingNotice = {
          phase: activeEv.phase,
          eventId: activeEv.def.id,
          title: activeEv.def.title,
          headline,
          callText,
          ...(replyText ? { replyText } : {}),
          ...(stepLabel ? { stepLabel } : {}),
          seatedCount: counts.seated,
          totalCount: counts.total,
          playerSeated: !!this.player.seated,
          inRoom: this.isPlayerInConferenceRoom(),
        };
      } else if (activeEv.phase === "playing") {
        const curLine =
          activeEv.def.lines[
            Math.min(activeEv.lineIdx, Math.max(0, activeEv.def.lines.length - 1))
          ];
        const aiBeat = activeEv.aiBeat;
        const speakerId = aiBeat ? aiBeat.who : (curLine?.who ?? activeEv.hostId);
        const speakerName = aiBeat ? aiBeat.name : charById(speakerId).name;
        const speakerNpc = this.npcById(speakerId);
        const speakerGesture = aiBeat
          ? aiBeat.gesture
          : (curLine?.action ?? speakerNpc?.gesture ?? "talk");
        const line = aiBeat ? aiBeat.text : (curLine?.text ?? "…");
        const shotOrder: CameraShot[] = ["wide", "host", "speaker", "speaker", "speaker"];
        const rawShot: CameraShot = aiBeat
          ? "speaker"
          : (curLine?.cameraShot ?? shotOrder[activeEv.lineIdx % shotOrder.length]!);
        const cameraShot: CameraShot =
          speakerId !== activeEv.hostId &&
          (rawShot === "reaction" || rawShot === "host" || rawShot === "player")
            ? "speaker"
            : rawShot;
        const focusNpcId = speakerId;
        const hostName = charById(activeEv.hostId).name;
        meetingCinema = {
          eventId: activeEv.def.id,
          title: activeEv.def.title,
          hostId: activeEv.hostId,
          hostName,
          speakerId,
          speakerName,
          speakerAction: this.gestureActionLabel(speakerGesture),
          line,
          cameraShot,
          cameraLabel: this.cameraShotLabel(cameraShot, speakerName, hostName),
          focusNpcId,
          seatedCount: counts.seated,
          totalCount: counts.total,
          handRaised: this.meetingOpen,
          suggestedLines: activeEv.def.suggestedLines ?? [
            "¿Puedo proponer una idea rápida para mejorar esto?",
            "¿Cómo afecta exactamente esta reunión a nuestras ventas de hoy?",
            "Creo que deberíamos escuchar lo que opina todo el equipo.",
          ],
          entries: [...(this.meetingEntries[activeEv.def.id] ?? [])],
          aiEnabled: !!this.ai,
        };
      }
    }
    const meetingSpec = this.meetingOpen ? this.currentMeetingSpec() : null;
    const meeting: MeetingUI | null = meetingSpec
      ? {
          eventId: meetingSpec.eventId,
          title: meetingSpec.title,
          roomName: meetingSpec.roomName,
          hostId: meetingSpec.hostId,
          attendees: meetingSpec.attendees,
          suggestedLines: meetingSpec.suggestedLines,
          entries: [...(this.meetingEntries[meetingSpec.eventId] ?? [])],
          isSpontaneous: meetingSpec.isSpontaneous,
          handRaised: true,
        }
      : null;
    return {
      phase: this.phase,
      paused: this.paused,
      journal: this.journal,
      cameraMode: this.cameraMode,
      floor: floorOfY(this.player.y),
      playerLook: { ...this.playerLook },
      unlockedSkins: [...this.unlockedSkins],
      playerSkin: this.playerSkin,
      dayNumber: this.dayNumber,
      dailyGoal: this.dailyGoalProgress(),
      recentEvents: [...this.recentEvents],
      approachingNpc: this.npcApproach
        ? {
            id: this.npcApproach.npcId,
            name: charById(this.npcApproach.npcId).name.split(" ")[0] ?? this.npcApproach.npcId,
            reason: this.npcApproach.reason,
          }
        : null,
      cinematic,
      activeOfficeEvent: this.activeEpisodeEventUI(),
      meetingNotice,
      meetingCinema,
      inConferenceRoom: this.phase === "playing" && this.isPlayerInConferenceRoom(),
      meeting,
      clock: formatClock(this.mins),
      mins: this.mins,
      money: this.money,
      rep: this.rep,
      energy: Math.round(this.energy),
      sales: this.sales,
      dateLabel: formatLongDate(this.date),
      event: this.event
        ? {
            id: this.event.id,
            name: this.event.name,
            emoji: this.event.emoji,
            description: this.event.description,
          }
        : null,
      episode: this.episode
        ? {
            id: this.episode.id,
            epLabel: this.episode.epLabel,
            title: this.episode.title,
            officeState: this.episode.officeState,
            castCount: this.activeCharIds.length,
          }
        : null,
      activeCharIds: this.activeCharIds,
      episodeContext: this.episodeContextText(),
      missions,
      inventory: Object.entries(this.inventory).map(([id, count]) => ({
        id,
        count,
        name: ITEMS[id]?.name ?? id,
        emoji: ITEMS[id]?.emoji ?? "📦",
        edible: SHOP.some((s) => s.id === id),
      })),
      dialog: this.dialog
        ? {
            speaker: this.dialog.speaker,
            role: this.dialog.role,
            portrait: this.dialog.portrait,
            line: this.dialog.line,
            options: this.dialog.options.map((o) => ({ label: o.label, tag: o.tag })),
            canBack: this.dialogHistory.length > 0,
          }
        : null,
      chat: this.chatWith
        ? (() => {
            const c = charById(this.chatWith);
            return {
              id: c.id,
              name: c.name,
              role: this.roleOf(c.id),
              intro: this.introOf(c.id),
              history: [...(this.chatLogs[c.id] ?? [])],
              memories: [...(this.memories[c.id] ?? [])],
            };
          })()
        : null,
      chatRecords: CHARACTERS.filter(
        (c) => (this.chatLogs[c.id]?.length ?? 0) > 0 || (this.memories[c.id]?.length ?? 0) > 0,
      ).map((c) => ({
        id: c.id,
        name: c.name,
        role: this.roleOf(c.id),
        messages: [...(this.chatLogs[c.id] ?? [])],
        memories: [...(this.memories[c.id] ?? [])],
      })),
      aiEnabled: !!this.ai,
      pc: this.pc,
      toasts: this.toasts,
      gossip: {
        heard: this.heard.map((id) => ({
          title: this.convos.find((c) => c.def.id === id)?.def.title ?? id,
        })),
        total: this.convos.length,
      },
      dundies: { found: this.dundiesFound, total: DUNDIES.length },
      end: this.phase === "ended" ? this.endSummary() : null,
      pcStats: {
        money: this.money,
        calls: this.calls,
        sales: this.sales,
        rep: this.rep,
        missionsDone: this.dayMissions().filter((m) => this.missionStatus[m.id] === "done").length,
        missionsTotal: this.dayMissions().length,
      },
    };
  }
}

export { OBJ_BY_ID };
