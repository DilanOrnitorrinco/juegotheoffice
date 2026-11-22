import { CHARACTERS, CLASSIC_CAST_IDS, charById } from "../data/characters";
import { CONVERSATIONS } from "../data/conversations";
import { EPISODE_CONVERSATIONS, EPISODE_MISSIONS, episodeById } from "../data/episodes";
import { eventForDate, formatLongDate, parseLocalDate } from "../data/events";
import { BASE_MAILS, EVENT_MAILS } from "../data/mails";
import { getActiveFurniture, setActiveFurniture, spotAt } from "../data/map";
import { ITEMS, MISSIONS } from "../data/missions";
import { WELCOME_SCENES, type WelcomeScene } from "../data/welcome";
import { pick } from "../random";
import { homeSpotFor, type ChatMessage, type GameAi, type NpcMemory } from "../ai";
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
  ConversationDef,
  CostumeKind,
  EpisodeDef,
  EventDef,
  Facing,
  HairStyle,
  Look,
  MissionDef,
  MissionStatus,
  ObjectDef,
  ServiceDef,
} from "../types";
import { blockedAt } from "./collision";
import { findPath, resetNavGrid, walkableTarget } from "./pathfinding";
import type {
  CallSnapshot,
  CallState,
  ChatLogEntry,
  CinematicUI,
  ConvoRuntime,
  DialogOption,
  EndSummary,
  Mail,
  MissionUI,
  NPC,
  PcUI,
  Player,
  Toast,
  UIState,
} from "./state";

const LOOK_STORAGE_KEY = "dm_player_look";
const WELCOME_STORAGE_KEY = "dm_welcome_seen";

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

const HAIR_STYLES: HairStyle[] = ["short", "side", "wavy", "spiky", "buzz", "curly", "bob", "bun", "long", "bald"];
const SKIN_TONES = ["#f2ccb0", "#e6b48e", "#d4986a", "#a86d42", "#6b4228"];
const HAIR_COLORS = ["#1e1b18", "#3b2a20", "#6e472b", "#b87a3d", "#d8b45c", "#a33c26", "#9a9ea4"];
const SHIRT_COLORS = ["#3f78a8", "#e8eef2", "#b8453d", "#3d7a5a", "#6e528f", "#c97b36", "#2c3540", "#c46c92"];
const PANTS_COLORS = ["#2c3540", "#1f242b", "#4a433d", "#33475c", "#5c4d3c"];
const TIE_COLORS = ["#f2c14e", "#b83b36", "#2f6b8e", "#3d7a5a", "#6e528f", "#242830", ""];

function loadPlayerLook(): Look {
  try {
    if (typeof window === "undefined" || !window.localStorage) return { ...DEFAULT_PLAYER_LOOK };
    const raw = window.localStorage.getItem(LOOK_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PLAYER_LOOK };
    const parsed = JSON.parse(raw) as Partial<Look>;
    const style = HAIR_STYLES.includes(parsed.hairStyle as HairStyle) ? (parsed.hairStyle as HairStyle) : DEFAULT_PLAYER_LOOK.hairStyle;
    const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
    const resolvedTie = parsed.tie === "" || parsed.tie === undefined ? undefined : isHex(parsed.tie) ? parsed.tie : DEFAULT_PLAYER_LOOK.tie;
    return {
      skin: isHex(parsed.skin) ? parsed.skin : DEFAULT_PLAYER_LOOK.skin,
      shirt: isHex(parsed.shirt) ? parsed.shirt : DEFAULT_PLAYER_LOOK.shirt,
      pants: isHex(parsed.pants) ? parsed.pants : DEFAULT_PLAYER_LOOK.pants,
      hair: isHex(parsed.hair) ? parsed.hair : DEFAULT_PLAYER_LOOK.hair,
      hairStyle: style,
      ...(resolvedTie ? { tie: resolvedTie } : {}),
      glasses: !!parsed.glasses,
      beard: !!parsed.beard,
      dress: !!parsed.dress,
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
  | { kind: "service"; id: string; x: number; y: number; label: string };

type Listener = () => void;

const HAPPENINGS: { at: number; text: string }[] = [
  { at: 10 * 60, text: "📢 Michael grita desde su despacho: «¡Que nadie toque mi taza!»" },
  { at: 12 * 60, text: "🍽️ Hora de comer: la sala de descanso se llena." },
  { at: 13 * 60 + 30, text: "📠 Dwight ha activado el «protocolo de seguridad». Nadie sabe qué significa." },
  { at: 15 * 60, text: "☕ Bajón de las tres: hasta Michael bosteza." },
  { at: 16 * 60 + 30, text: "⏰ Queda media hora. Stanley ya tiene el abrigo puesto." },
];

export class Game {
  // world
  player: Player = { x: 685, y: 582, facing: "up", moving: false, walkT: 0 };
  npcs: NPC[] = [];
  convos: ConvoRuntime[] = [];
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

  // progress
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

  // ui
  phase: UIState["phase"] = "start";
  paused = false;
  journal = false;
  playerLook: Look = loadPlayerLook();
  private cinematicState: { scene: WelcomeScene; sceneNumber: number; step: 0 | 1 | 2; reactionText: string } | null = null;
  dialog: { speaker: string; role: string; portrait: string | null; line: string; options: DialogOption[] } | null = null;
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

  // ---------- player look & welcome cinematic ----------
  get isCinematic(): boolean {
    return !!this.cinematicState;
  }

  get cinematicCostume(): CostumeKind | undefined {
    return this.cinematicState?.scene.costume;
  }

  setPlayerLook = (patch: Partial<Look> & { tie?: string | undefined }) => {
    const { tie, ...rest } = patch;
    const next: Look = { ...this.playerLook, ...rest };
    if ("tie" in patch) {
      if (tie) next.tie = tie;
      else delete next.tie;
    }
    this.playerLook = next;
    savePlayerLook(this.playerLook);
    this.emit();
  };

  resetPlayerLook = () => {
    this.playerLook = { ...DEFAULT_PLAYER_LOOK };
    savePlayerLook(this.playerLook);
    this.emit();
  };

  randomizePlayerLook = () => {
    const tieChoice = pick(TIE_COLORS);
    this.setPlayerLook({
      skin: pick(SKIN_TONES),
      hair: pick(HAIR_COLORS),
      hairStyle: pick(HAIR_STYLES),
      shirt: pick(SHIRT_COLORS),
      pants: pick(PANTS_COLORS),
      tie: tieChoice,
      glasses: Math.random() < 0.3,
      beard: Math.random() < 0.25,
      dress: Math.random() < 0.25,
    });
  };

  private beginWelcomeCinematic(avoidId?: string) {
    const michael = this.npcById("michael");
    if (!michael || WELCOME_SCENES.length === 0) return;
    let idx = Math.floor(Math.random() * WELCOME_SCENES.length);
    if (avoidId && WELCOME_SCENES.length > 1 && WELCOME_SCENES[idx]!.id === avoidId) {
      idx = (idx + 1 + Math.floor(Math.random() * (WELCOME_SCENES.length - 1))) % WELCOME_SCENES.length;
    }
    const scene = WELCOME_SCENES[idx]!;
    this.player = { x: 285, y: 425, facing: "right", moving: false, walkT: 0 };
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
    return `${this.episode.epLabel} «${this.episode.title}» (${this.episode.dateLabel}): ${this.episode.officeState}. ${this.episode.summary}`.slice(0, 750);
  }

  private isMissionCompatible(m: MissionDef, activeSet: Set<string>): boolean {
    if (!activeSet.has(m.giver)) return false;
    for (const s of m.steps) {
      if (s.kind === "talk" && !activeSet.has(s.target)) return false;
    }
    return true;
  }

  start(dateISO: string, episodeId?: string | null, opts?: { forceWelcome?: boolean; skipWelcome?: boolean }) {
    const runId = ++this.startRunId;
    const ep = episodeById(episodeId ?? null);
    this.episode = ep;
    this.date = parseLocalDate(ep ? ep.dateISO : dateISO);
    this.event = eventForDate(this.date);
    this.activeCharIds = ep ? [...ep.castIds] : [...CLASSIC_CAST_IDS];
    const activeSet = new Set(this.activeCharIds);
    this.seatOverrides = { ...(ep?.seatOverrides ?? {}) };
    this.roleOverrides = { ...(ep?.roleOverrides ?? {}) };
    this.introOverrides = { ...(ep?.introOverrides ?? {}) };

    setActiveFurniture(ep?.extraDesks ?? []);
    resetNavGrid();

    this.player = { x: 685, y: 582, facing: "up", moving: false, walkT: 0 };
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
              routine: rawDef.routine.map((r) => (assignedSeat && r.spot === ownSeat ? { ...r, spot: assignedSeat } : r)),
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
    const baseConvos = [...epConvos, ...CONVERSATIONS].filter((c) => c.who.every((w) => activeSet.has(w)));
    this.convos = this.scheduleConvos(baseConvos).map((def) => ({ def, state: "pending", line: 0, lineT: 0, arrived: false }));

    const epMissions = ep ? (EPISODE_MISSIONS[ep.id] ?? []) : [];
    const compatibleMissions = [...MISSIONS, ...epMissions]
      .filter((m) => this.isMissionCompatible(m, activeSet))
      .map((m) => ({ ...m }));
    const activeById = new Set(compatibleMissions.map((m) => m.id));
    this.missions = compatibleMissions.filter((m) => !m.requires || m.requires.every((req) => activeById.has(req)));
    const finalM = this.missions.find((m) => m.id === "final");
    if (finalM) {
      const regCount = this.missions.filter((m) => m.id !== "intro" && m.id !== "final" && !m.event).length;
      finalM.requiresCount = Math.min(8, Math.max(3, Math.floor(regCount * 0.5)));
    }

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
    const shouldWelcome = !opts?.skipWelcome && (opts?.forceWelcome || !hasSeenWelcome()) && !!this.npcById("michael");
    if (shouldWelcome) {
      this.beginWelcomeCinematic();
    } else {
      this.toast(`Pam: «${this.missionById("intro").offer}»`, "mission");
    }
    if (ep) this.toast(ep.openingToast, "event");
    if (this.event) this.toast(`${this.event.emoji} Hoy es ${this.event.name}: ${this.event.description}`, "event");
    this.emit();
    if (this.ai) void this.loadAiDayContent(runId);
  }

  private async loadAiDayContent(runId: number) {
    if (!this.ai) return;
    const activeSet = new Set(this.activeCharIds);
    const input = {
      dateLabel: formatLongDate(this.date),
      eventId: this.event?.id ?? null,
      eventName: this.event?.name ?? null,
      eventDesc: this.event?.description ?? null,
      activeCharIds: this.activeCharIds,
      episodeContext: this.episodeContextText(),
    };
    const [convosRes, missionsRes] = await Promise.allSettled([this.ai.dailyConvos(input), this.ai.dailyMissions(input)]);
    if (this.startRunId !== runId || this.phase !== "playing") return;

    if (convosRes.status === "fulfilled" && convosRes.value.length >= 3) {
      const kept = this.convos.filter((c) => c.dynamic || c.state !== "pending");
      const validAiConvos = convosRes.value.filter((c) => c.who.every((w) => activeSet.has(w)));
      const scheduledAi = this.scheduleConvos(validAiConvos, kept.map((k) => k.def)).filter(
        (c) => c.at + c.duration > this.mins + 2,
      );
      if (scheduledAi.length > 0) {
        this.convos = [
          ...kept,
          ...scheduledAi.map((def) => ({ def, state: "pending" as const, line: 0, lineT: 0, arrived: false })),
        ];
      }
    }

    if (missionsRes.status === "fulfilled" && missionsRes.value.length >= 4) {
      const kept = this.missions.filter(
        (m) =>
          m.id === "intro" ||
          m.id === "final" ||
          m.id.startsWith("ep_") ||
          !!m.event ||
          this.missionStatus[m.id] === "active" ||
          this.missionStatus[m.id] === "done",
      );
      const activeRegularGivers = new Set(kept.filter((m) => m.id !== "intro" && m.id !== "final" && !m.event).map((m) => m.giver));
      const fresh = missionsRes.value.filter((m) => !activeRegularGivers.has(m.giver) && this.isMissionCompatible(m, activeSet));
      const finalM = kept.find((m) => m.id === "final");
      if (finalM && this.missionStatus["final"] === "locked") {
        finalM.requiresCount = Math.min(8, Math.max(3, Math.floor((fresh.length + activeRegularGivers.size) * 0.55)));
      }
      for (const m of fresh) this.missionStatus[m.id] = "locked";
      this.missions = [...kept, ...fresh];
    }

    this.emit();
  }

  /** Episode and event conversations first, then regular ones that don't clash with anybody's schedule. */
  private scheduleConvos(source: ConversationDef[], existing: ConversationDef[] = []): ConversationDef[] {
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
        (o) => o.who.some((w) => c.who.includes(w)) && c.at < o.at + o.duration && o.at < c.at + c.duration,
      );
      if (!clash) {
        chosen.push(c);
        added.push(c);
      }
    }
    return added.sort((a, b) => a.at - b.at);
  }

  get frozen() {
    return this.phase !== "playing" || this.paused || !!this.cinematicState || this.journal || !!this.dialog || !!this.pc || !!this.chatWith;
  }

  // ---------- loop ----------
  update(dt: number) {
    this.time += dt;
    if (this.cinematicState && !this.paused && this.phase === "playing") {
      this.player.moving = false;
      this.updateCinematicActors(dt);
      return;
    }
    if (this.frozen) {
      this.player.moving = false;
      return;
    }
    this.updatePlayer(dt);
    const prevMin = Math.floor(this.mins);
    this.mins += dt * MINUTES_PER_SECOND;
    this.energy = Math.max(0, this.energy - dt * MINUTES_PER_SECOND * (this.player.moving && this.isRunning() ? 0.22 : 0.07));
    if (this.energy < 20 && !this.lowEnergyWarned) {
      this.lowEnergyWarned = true;
      this.toast("😴 Estás agotado: caminas más lento. Tómate un café o algo de la máquina.", "warn");
    }
    if (this.energy > 30) this.lowEnergyWarned = false;
    for (const h of HAPPENINGS) {
      if (this.mins >= h.at && !this.happeningsShown.has(h.at)) {
        this.happeningsShown.add(h.at);
        this.toast(h.text, "info");
      }
    }
    this.updateNPCs(dt);
    this.updateConvos(dt);
    this.checkAutoSteps();
    this.updateHover();
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
    michael.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
  }

  private isRunning() {
    return !!this.keys["Shift"];
  }

  private updatePlayer(dt: number) {
    let dx = 0;
    let dy = 0;
    if (this.keys["w"] || this.keys["ArrowUp"]) dy--;
    if (this.keys["s"] || this.keys["ArrowDown"]) dy++;
    if (this.keys["a"] || this.keys["ArrowLeft"]) dx--;
    if (this.keys["d"] || this.keys["ArrowRight"]) dx++;
    const p = this.player;
    if (!dx && !dy) {
      p.moving = false;
      return;
    }
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    let speed = this.isRunning() ? RUN_SPEED : WALK_SPEED;
    if (this.energy < 20) speed *= 0.65;
    const step = speed * dt;
    const nx = p.x + dx * step;
    const ny = p.y + dy * step;
    if (!this.playerBlocked(nx, p.y, p.x, p.y)) p.x = nx;
    if (!this.playerBlocked(p.x, ny, p.x, p.y)) p.y = ny;
    p.moving = true;
    p.walkT += dt * (this.isRunning() ? 14 : 10);
    if (Math.abs(dx) > Math.abs(dy)) p.facing = dx > 0 ? "right" : "left";
    else p.facing = dy > 0 ? "down" : "up";
  }

  private playerBlocked(x: number, y: number, ox: number, oy: number) {
    if (blockedAt(x, y, PLAYER_RADIUS)) return true;
    for (const n of this.npcs) {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < 22 && d < Math.hypot(n.x - ox, n.y - oy)) return true;
    }
    return false;
  }

  private npcById(id: string): NPC | undefined {
    return this.npcs.find((n) => n.def.id === id);
  }

  private activeConvoFor(id: string): ConvoRuntime | null {
    for (const c of this.convos) {
      if (!c.dynamic || c.state === "done") continue;
      if (!c.def.who.includes(id)) continue;
      if (this.mins >= c.def.at && this.mins < c.def.at + c.def.duration + 15 && (c.state === "playing" || this.mins < c.def.at + c.def.duration)) {
        return c;
      }
    }
    for (const c of this.convos) {
      if (c.dynamic || c.state === "done") continue;
      if (!c.def.who.includes(id)) continue;
      if (this.mins >= c.def.at && this.mins < c.def.at + c.def.duration + 15 && (c.state === "playing" || this.mins < c.def.at + c.def.duration)) {
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

  private updateNPCs(dt: number) {
    for (const n of this.npcs) {
      if (n.override && this.mins >= n.override.until) n.override = undefined;
      let key: string;
      let target: { x: number; y: number };
      let action: string;
      n.faceTo = undefined;
      const convo = this.activeConvoFor(n.def.id);
      if (convo?.dynamic && convo.seekBy && convo.seekTarget) {
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
            action = convo.kind === "prank" ? "Preparando broma" : (n.override?.action ?? "Preparando");
          } else {
            const cellKey = `${Math.round(targetNpc.x / 40)},${Math.round(targetNpc.y / 40)}`;
            key = `seek:${convo.def.id}:${cellKey}`;
            target = this.seekPosNextTo(seeker, targetNpc);
            action = convo.kind === "prank" ? `Broma a ${targetNpc.def.name.split(" ")[0]}` : `Buscando a ${targetNpc.def.name.split(" ")[0]}`;
            n.faceTo = this.faceTowards(n, targetNpc.x, targetNpc.y);
          }
        } else if (
          seeker &&
          targetNpc &&
          n.def.id === convo.seekTarget &&
          (convo.state === "playing" || ((!convo.prepSpot || convo.prepDone) && Math.hypot(seeker.x - targetNpc.x, seeker.y - targetNpc.y) < 120))
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
      if (key !== n.targetKey) {
        n.targetKey = key;
        n.target = target;
        if (!key.startsWith("dynplay:") && !key.startsWith("dynwait:")) {
          n.path = findPath(n.x, n.y, target.x, target.y);
        }
      }
      n.action = action;
      if (n.path.length) {
        const wp = n.path[0]!;
        const dx = wp.x - n.x;
        const dy = wp.y - n.y;
        const d = Math.hypot(dx, dy);
        const urgent = !!(convo?.dynamic && convo.seekBy === n.def.id && convo.state !== "playing");
        const step = (urgent ? URGENT_NPC_SPEED : NPC_SPEED) * dt;
        if (d <= step) {
          n.x = wp.x;
          n.y = wp.y;
          n.path.shift();
        } else {
          n.x += (dx / d) * step;
          n.y += (dy / d) * step;
        }
        n.moving = true;
        n.walkT += dt * (urgent ? 12 : 9);
        if (Math.abs(dx) > Math.abs(dy)) n.facing = dx > 0 ? "right" : "left";
        else n.facing = dy > 0 ? "down" : "up";
      } else {
        n.moving = false;
        if (n.faceTo) n.facing = n.faceTo;
        else if (n.targetKey.startsWith("seat_") || n.targetKey.startsWith("override:seat_")) {
          const seatKey = n.targetKey.startsWith("override:") ? n.targetKey.slice("override:".length) : n.targetKey;
          const seatOwner = seatKey.startsWith("seat_") ? seatKey.slice("seat_".length) : n.def.id;
          const seat = getActiveFurniture().find((f) => f.owner === seatOwner)?.seat;
          n.facing = seat === "north" ? "down" : seat === "west" ? "right" : seat === "east" ? "left" : "up";
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
          c.kind === "prank" ? `🎭 Broma ejecutada: ${c.def.title}` : `✅ Acción completada: ${c.def.title}`,
        );
        if (c.kind === "prank") {
          this.rep += 1;
          this.toast(`🎭 ¡Broma completada! ${c.def.title} (+1 ★)`, "event");
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
      const inWindow = this.mins >= c.def.at && !hardExpired && (c.state === "playing" || !pastWindow);
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
        } else if (!a.moving && !b.moving && a.targetKey.startsWith("convo:") && b.targetKey.startsWith("convo:")) {
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
            this.toast(`🗣️ Cotilleo escuchado: ${c.def.title} (+1 ★)`, "gossip");
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
    return out;
  }

  // ---------- missions ----------
  private missionById(id: string): MissionDef {
    const m = this.missions.find((x) => x.id === id) ?? MISSIONS.find((x) => x.id === id);
    if (!m) throw new Error(`Unknown mission ${id}`);
    return m;
  }

  missionsDoneCount(excludeFinal = true) {
    return this.missions.filter((m) => this.missionStatus[m.id] === "done" && (!excludeFinal || m.id !== "final")).length;
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
      this.toast(
        `✅ Misión completada: ${m.title} · +${m.reward.rep} ★${m.reward.money ? ` · +$${m.reward.money}` : ""}`,
        "mission",
      );
      const unlocked = this.dayMissions().filter((x) => this.isAvailable(x) && x.requires?.includes(id));
      if (unlocked.length) {
        const names = [...new Set(unlocked.map((u) => charById(u.giver).name.split(" ")[0]))].join(", ");
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
      else if (s.kind === "gossip" && this.heard.length - base.gossip >= s.count) this.advanceMission(m.id);
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
    let best: NPC | null = null;
    let bd = TALK_RADIUS;
    for (const n of this.npcs) {
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
    const targeted = this.targetedObjects();
    let best: ObjectDef | null = null;
    let bd = OBJECT_RADIUS;
    for (const o of OBJECTS) {
      if (!targeted.has(o.id)) continue;
      const d = Math.hypot(o.x - this.player.x, o.y - this.player.y);
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  }

  private nearestDundie() {
    for (const d of DUNDIES) {
      if (this.dundiesFound.includes(d.id)) continue;
      if (Math.hypot(d.x - this.player.x, d.y - this.player.y) < 44) return d;
    }
    return null;
  }

  private nearestService(): ServiceDef | null {
    for (const s of SERVICES) {
      if (Math.hypot(s.x - this.player.x, s.y - this.player.y) < s.radius) return s;
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
      this.hover = { kind: "object", id: o.id, x: o.x, y: o.y - 30, label: "E · " + o.name.toUpperCase() };
      return;
    }
    const d = this.nearestDundie();
    if (d) {
      this.hover = { kind: "dundie", id: d.id, x: d.x, y: d.y - 26, label: "E · ¡UN DUNDIE!" };
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
    else this.useService(h.id as ServiceDef["id"]);
  }

  private useObject(id: string) {
    for (const m of this.missions) {
      const s = this.currentStep(m.id);
      if (s?.kind === "object" && s.target === id) {
        if (s.gives) this.addItem(s.gives);
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
    this.toast(`🏆 Has encontrado un Dundie: ${d.title} (+2 ★) · ${this.dundiesFound.length}/${DUNDIES.length}`, "event");
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
        this.toast(`☕ La cafetera se está recargando. Vuelve a las ${formatClock(this.coffeeReadyAt)}.`, "warn");
        return;
      }
      this.coffeeReadyAt = this.mins + 45;
      this.energy = Math.min(100, this.energy + 35);
      this.skipTime(5);
      this.toast("☕ Café de oficina: sabe a cartón, pero funciona. +35 energía", "info");
      this.emit();
      return;
    }
    if (id === "vending") return this.openShop();
    if (id === "couch") {
      this.energy = Math.min(100, this.energy + 40);
      this.skipTime(20);
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

  private openDialog(speaker: string, role: string, portrait: string | null, line: string, options: DialogOption[]) {
    this.dialog = { speaker, role, portrait, line, options };
    this.dialogHistory = [];
    this.emit();
  }

  closeDialog = () => {
    this.dialog = null;
    this.dialogHistory = [];
    this.talkingTo = null;
    this.emit();
  };

  dialogBack = () => {
    const prev = this.dialogHistory.pop();
    if (!prev || !this.dialog) return;
    this.dialog = { ...this.dialog, line: prev.line, options: this.talkingTo ? this.npcOptions(this.talkingTo) : prev.options };
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
            { label: "Ahora no puedo", tag: "back", act: () => this.setDialog("Vale, cuando puedas.", this.npcOptions(id)) },
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
    n.topics.forEach((tp) => opts.push({ label: tp.q, tag: "topic", act: () => this.setDialog(tp.a, this.npcOptions(id)) }));
    const pp = spotAt("pingpong");
    if ((id === "darryl" || id === "roy") && Math.hypot(this.player.x - pp.x, this.player.y - pp.y) < 200) {
      opts.push({ label: "🏓 ¿Una partida de ping-pong?", tag: "game", act: () => this.startPingPong(id) });
    }
    if (this.ai) opts.push({ label: "💬 Charlar libremente (escribe tú)", tag: "chat", act: () => this.openChat(id) });
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
      this.chatLogs[this.chatWith] = [...base, ...messages.map((m) => ({ role: m.role, content: m.content, clock }))];
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
    if (id && this.ai && msgs.some((m) => m.role === "user")) {
      void this.analyzeChatImpact(id, msgs);
    }
  };

  private async analyzeChatImpact(id: string, messages: ChatMessage[]) {
    if (!this.ai) return;
    try {
      const memList = this.memories[id] ?? [];
      const impact = await this.ai.chatImpact({
        characterId: id,
        messages: messages.slice(-18).map((m) => ({ role: m.role, content: m.content.slice(0, 750) })),
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
      const hasTarget = !!(impact.seekTargetId && impact.convoLines.length >= 2 && this.npcById(impact.seekTargetId));
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
    const pending = this.dayMissions().find((m) => m.giver === id && this.missionStatus[m.id] === "locked");
    const active = this.missions.find((m) => m.giver === id && this.missionStatus[m.id] === "active");
    if (active) return `Aún estás con «${active.title}». Termina eso primero.`;
    if (pending) {
      if (pending.minTime && this.mins < pending.minTime) return `Ahora mismo no. Pásate a partir de las ${formatClock(pending.minTime)}.`;
      if (pending.requiresCount) return `Primero demuestra lo que vales: ayuda a la gente de la oficina (${this.missionsDoneCount()}/${pending.requiresCount}).`;
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
          this.setDialog(`No tienes suficiente dinero. Tienes $${this.money}. Cierra alguna venta.`, this.dialog!.options, false);
          return;
        }
        this.money -= it.price;
        this.addItem(it.id);
        this.setDialog(`*clonc* Has comprado: ${it.name}. Lo tienes en el inventario (pulsa sobre él para comerlo).`, this.dialog!.options, false);
      },
    }));
    opts.push({ label: "Salir", tag: "leave", act: this.closeDialog });
    this.openDialog("Máquinas expendedoras", `Tienes $${this.money}`, null, "Bzzzz… La máquina zumba esperando monedas.", opts);
  }

  // ---------- ping-pong mini game ----------
  private openPingPong() {
    const pp = spotAt("pingpong");
    const opp = this.npcs.find((n) => (n.def.id === "darryl" || n.def.id === "roy") && Math.hypot(n.x - pp.x, n.y - pp.y) < 160);
    if (!opp) {
      this.toast("🏓 No hay nadie para jugar. Darryl y Roy juegan a la hora de comer (12:00).", "info");
      return;
    }
    this.talkingTo = null;
    this.openDialog(opp.def.name, "Ping-pong", opp.def.id, "¿Una partida rápida? Al mejor de tres puntos.", [
      { label: "🏓 ¡Vamos!", tag: "game", act: () => this.startPingPong(opp.def.id) },
      { label: "Mejor no", tag: "leave", act: this.closeDialog },
    ]);
  }

  private startPingPong(oppId: string) {
    if (this.mins < this.pingpongReadyAt) {
      this.setDialog(`Ya hemos jugado. Revancha a las ${formatClock(this.pingpongReadyAt)}.`, this.dialog!.options);
      return;
    }
    const state = { me: 0, them: 0 };
    const shots = ["Remate fuerte", "Con efecto", "Dejada suave"] as const;
    const beats: Record<string, string> = { "Remate fuerte": "Dejada suave", "Dejada suave": "Con efecto", "Con efecto": "Remate fuerte" };
    const round = (msg: string) => {
      if (state.me === 2 || state.them === 2) {
        const won = state.me === 2;
        this.pingpongReadyAt = this.mins + 60;
        this.skipTime(10);
        if (won) {
          this.rep += 2;
          this.money += 5;
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
    this.emit();
  };
  closePC = () => {
    this.pc = null;
    this.call = null;
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
      mails: this.mails().map((m) => ({ id: m.id, from: m.from, subject: m.subject, read: this.readMails.has(m.id) })),
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
    this.emit();
  };

  /** Same tree rules, but the client and every line are invented by the AI. */
  pcStartAiCall = async () => {
    if (!this.ai) return this.pcStartCall();
    const call: CallState = {
      client: { company: "Marcando…", contact: "…", personality: "amable", need: "…", budget: 0, greeting: "" },
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
      path: c.history.map((h) => ({ approach: h.option.approach, delta: h.delta, text: h.option.text })),
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
    const delta = scoreOption(p, opt, c.history.map((h) => h.option.approach));
    c.history.push({ stage: c.stage, option: opt, delta });
    c.interest = Math.max(0, Math.min(MAX_INTEREST, c.interest + delta));
    const pool = REACTIONS[p][bucketFor(delta)];
    c.reaction = pick(pool);
    c.youLine = opt.text;
    c.lastDelta = delta;
    this.skipTime(3);
    if (c.interest <= 0) {
      c.clientLine = HANGUPS[p];
      this.pc = { screen: "result", call: this.callSnapshot(), outcome: { kind: "none", amount: 0 }, hungUp: true };
      this.emit();
      return;
    }
    if (c.stage >= 4) {
      const outcome = outcomeFor(c.interest, c.client.budget, this.event?.salesBonus ?? 1);
      if (outcome.amount > 0) {
        this.money += outcome.amount;
        this.sales++;
        this.rep += outcome.kind === "big" ? 2 : outcome.kind === "sale" ? 1 : 0;
        this.toast(`💰 Venta cerrada con ${c.client.company}: +$${outcome.amount}`, "money");
      }
      this.checkAutoSteps();
      this.pc = { screen: "result", call: this.callSnapshot(), outcome, hungUp: false };
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
      const r = await this.ai!.salesTurn({ client: c.client, stage: c.stage, interest: c.interest, delta, history });
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

  // ---------- misc UI ----------
  toast(text: string, kind: Toast["kind"] = "info") {
    const id = this.toastId++;
    this.toasts = [...this.toasts, { id, text, kind }].slice(-4);
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
      this.emit();
    }, kind === "event" || kind === "mission" ? 5200 : 3800);
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
    this.cinematicState = null;
    this.dialog = null;
    this.pc = null;
    this.chatWith = null;
    this.emit();
  };
  toggleJournal = () => {
    if (this.phase !== "playing" || this.cinematicState || this.dialog || this.pc || this.chatWith) return;
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
      if (this.dialog) return this.closeDialog();
      if (this.chatWith) return this.closeChat();
      if (this.pc) return this.closePC();
      if (this.journal) return this.toggleJournal();
      return this.togglePause();
    }
    if (k === "e" && !this.frozen) this.interact();
    if (k === "j") this.toggleJournal();
  }

  private endDay() {
    if (this.phase === "ended") return;
    this.phase = "ended";
    this.dialog = null;
    this.chatWith = null;
    this.pc = null;
    this.emit();
  }

  private endSummary(): EndSummary {
    const done = this.dayMissions().filter((m) => this.missionStatus[m.id] === "done").length;
    const total = this.dayMissions().length;
    let award = "Dundie al «Empleado nuevo más prometedor»";
    let awardLine = "Michael: «Buen trabajo, empleado nuevo. Mañana más.»";
    if (this.money >= 4000) {
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
      money: this.money,
      sales: this.sales,
      calls: this.calls,
      missionsDone: done,
      missionsTotal: total,
      rep: this.rep,
      gossip: this.heard.length,
      gossipTotal: this.convos.length,
      dundies: this.dundiesFound.length,
      award,
      awardLine,
    };
  }

  // ---------- snapshot ----------
  private buildSnapshot(): UIState {
    const missions: MissionUI[] = this.dayMissions().map((m) => {
      const st = this.missionStatus[m.id] ?? "locked";
      const step = st === "active" ? (m.steps[this.missionStep[m.id] ?? 0] ?? null) : null;
      let stepText = step?.text ?? null;
      if (step?.kind === "sales") stepText = `${step.text} (${this.sales - (this.missionBase[m.id]?.sales ?? 0)}/${step.count})`;
      if (step?.kind === "money") stepText = `${step.text} ($${this.money}/$${step.amount})`;
      if (step?.kind === "gossip") stepText = `${step.text} (${this.heard.length - (this.missionBase[m.id]?.gossip ?? 0)}/${step.count})`;
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
          line: cin.step === 0 ? cin.scene.opening : cin.step === 1 ? cin.scene.prompt : cin.reactionText,
          step: cin.step,
          choices: cin.step === 1 ? cin.scene.replies.map((r) => ({ label: r.label })) : [],
        }
      : null;
    return {
      phase: this.phase,
      paused: this.paused,
      journal: this.journal,
      playerLook: { ...this.playerLook },
      cinematic,
      clock: formatClock(this.mins),
      mins: this.mins,
      money: this.money,
      rep: this.rep,
      energy: Math.round(this.energy),
      sales: this.sales,
      dateLabel: formatLongDate(this.date),
      event: this.event ? { id: this.event.id, name: this.event.name, emoji: this.event.emoji, description: this.event.description } : null,
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
      chatRecords: CHARACTERS.filter((c) => (this.chatLogs[c.id]?.length ?? 0) > 0 || (this.memories[c.id]?.length ?? 0) > 0).map((c) => ({
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
        heard: this.heard.map((id) => ({ title: this.convos.find((c) => c.def.id === id)?.def.title ?? id })),
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
