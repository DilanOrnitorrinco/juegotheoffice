import { CHARACTERS, charById } from "../data/characters";
import { CONVERSATIONS } from "../data/conversations";
import { eventForDate, formatLongDate, parseLocalDate } from "../data/events";
import { BASE_MAILS, EVENT_MAILS } from "../data/mails";
import { spotAt } from "../data/map";
import { ITEMS, MISSIONS, missionById } from "../data/missions";
import { pick } from "../random";
import { DUNDIES, OBJECTS, OBJ_BY_ID, SERVICES, SHOP } from "../data/objects";
import {
  CLIENTS,
  HANGUPS,
  MAX_INTEREST,
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
import type { ConversationDef, EventDef, Facing, MissionDef, MissionStatus, ObjectDef, ServiceDef } from "../types";
import { blockedAt } from "./collision";
import { findPath, walkableTarget } from "./pathfinding";
import type {
  CallSnapshot,
  CallState,
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

export const PLAYER_RADIUS = 12;
const TALK_RADIUS = 62;
const OBJECT_RADIUS = 56;
const HEAR_RADIUS = 210;
const NPC_SPEED = 92;
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
  player: Player = { x: 730, y: 600, facing: "up", moving: false, walkT: 0 };
  npcs: NPC[] = [];
  convos: ConvoRuntime[] = [];
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
  dialog: { speaker: string; role: string; portrait: string | null; line: string; options: DialogOption[] } | null = null;
  dialogHistory: { line: string; options: DialogOption[] }[] = [];
  pc: PcUI | null = null;
  call: CallState | null = null;
  toasts: Toast[] = [];
  private toastId = 1;
  private listeners = new Set<Listener>();
  private snapshot: UIState;
  private lastEmitMinute = -1;
  private talkingTo: string | null = null;

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

  // ---------- setup ----------
  start(dateISO: string) {
    this.date = parseLocalDate(dateISO);
    this.event = eventForDate(this.date);
    this.npcs = CHARACTERS.map((def) => {
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
    this.convos = this.scheduleConvos().map((def) => ({ def, state: "pending", line: 0, lineT: 0, arrived: false }));
    for (const m of MISSIONS) this.missionStatus[m.id] = "locked";
    this.phase = "playing";
    this.activateMission("intro", true);
    this.toast(`Pam: «${missionById("intro").offer}»`, "mission");
    if (this.event) this.toast(`${this.event.emoji} Hoy es ${this.event.name}: ${this.event.description}`, "event");
    this.emit();
  }

  /** Event conversations first, then regular ones that don't clash with anybody's schedule. */
  private scheduleConvos(): ConversationDef[] {
    const pool = [
      ...CONVERSATIONS.filter((c) => c.event && c.event === this.event?.id),
      ...CONVERSATIONS.filter((c) => !c.event),
    ];
    const chosen: ConversationDef[] = [];
    for (const c of pool) {
      const clash = chosen.some(
        (o) => o.who.some((w) => c.who.includes(w)) && c.at < o.at + o.duration && o.at < c.at + c.duration,
      );
      if (!clash) chosen.push(c);
    }
    return chosen.sort((a, b) => a.at - b.at);
  }

  get frozen() {
    return this.phase !== "playing" || this.paused || this.journal || !!this.dialog || !!this.pc;
  }

  // ---------- loop ----------
  update(dt: number) {
    this.time += dt;
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
      if (c.state === "done") continue;
      if (!c.def.who.includes(id)) continue;
      if (this.mins >= c.def.at && this.mins < c.def.at + c.def.duration) return c;
    }
    return null;
  }

  private convoPos(c: ConvoRuntime, id: string) {
    const base = spotAt(c.def.spot);
    const side = c.def.who[0] === id ? -1 : 1;
    return walkableTarget(base.x + side * 24, base.y);
  }

  private updateNPCs(dt: number) {
    for (const n of this.npcs) {
      let key: string;
      let target: { x: number; y: number };
      let action: string;
      n.faceTo = undefined;
      const convo = this.activeConvoFor(n.def.id);
      if (convo) {
        key = "convo:" + convo.def.id;
        target = this.convoPos(convo, n.def.id);
        action = "Charlando";
        n.faceTo = convo.def.who[0] === n.def.id ? "right" : "left";
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
        n.path = findPath(n.x, n.y, target.x, target.y);
      }
      n.action = action;
      if (n.path.length) {
        const wp = n.path[0]!;
        const dx = wp.x - n.x;
        const dy = wp.y - n.y;
        const d = Math.hypot(dx, dy);
        const step = NPC_SPEED * dt;
        if (d <= step) {
          n.x = wp.x;
          n.y = wp.y;
          n.path.shift();
        } else {
          n.x += (dx / d) * step;
          n.y += (dy / d) * step;
        }
        n.moving = true;
        n.walkT += dt * 9;
        if (Math.abs(dx) > Math.abs(dy)) n.facing = dx > 0 ? "right" : "left";
        else n.facing = dy > 0 ? "down" : "up";
      } else {
        n.moving = false;
        if (n.faceTo) n.facing = n.faceTo;
        else if (n.targetKey.startsWith("seat_")) {
          n.facing = n.def.id === "pam" || n.def.id === "michael" ? "down" : "up";
        }
      }
    }
  }

  private updateConvos(dt: number) {
    for (const c of this.convos) {
      if (c.state === "done") continue;
      const inWindow = this.mins >= c.def.at && this.mins < c.def.at + c.def.duration;
      if (!inWindow) {
        if (this.mins >= c.def.at + c.def.duration) c.state = "done";
        continue;
      }
      const a = this.npcById(c.def.who[0]);
      const b = this.npcById(c.def.who[1]);
      if (!a || !b) continue;
      if (!c.arrived) {
        if (!a.moving && !b.moving && a.targetKey.startsWith("convo:") && b.targetKey.startsWith("convo:")) {
          c.arrived = true;
          c.state = "playing";
        } else continue;
      }
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const near = Math.hypot(this.player.x - mx, this.player.y - my) < HEAR_RADIUS;
      if (!near) continue;
      c.lineT += dt;
      const line = c.def.lines[c.line]!;
      const dur = 2.4 + line.text.length * 0.045;
      if (c.lineT >= dur) {
        c.lineT = 0;
        c.line++;
        if (c.line >= c.def.lines.length) {
          c.state = "done";
          if (!this.heard.includes(c.def.id)) {
            this.heard.push(c.def.id);
            this.rep += 1;
            this.toast(`🗣️ Cotilleo escuchado: ${c.def.title} (+1 ★)`, "gossip");
          }
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
  missionsDoneCount(excludeFinal = true) {
    return MISSIONS.filter((m) => this.missionStatus[m.id] === "done" && (!excludeFinal || m.id !== "final")).length;
  }

  private dayMissions(): MissionDef[] {
    return MISSIONS.filter((m) => !m.event || m.event === this.event?.id);
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
    const m = missionById(id);
    if (this.missionStatus[id] !== "active") return null;
    return m.steps[this.missionStep[id] ?? 0] ?? null;
  }

  private activateMission(id: string, silent = false) {
    this.missionStatus[id] = "active";
    this.missionStep[id] = 0;
    this.missionBase[id] = { sales: this.sales, gossip: this.heard.length };
    if (!silent) this.toast(`📋 Nueva misión: ${missionById(id).title}`, "mission");
  }

  private advanceMission(id: string) {
    const m = missionById(id);
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
    for (const m of MISSIONS) {
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
    for (const m of MISSIONS) {
      const s = this.currentStep(m.id);
      if (s?.kind === "object") out.add(s.target);
    }
    return out;
  }

  targetedNPCs(): Set<string> {
    const out = new Set<string>();
    for (const m of MISSIONS) {
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
      const d = Math.hypot(n.x - this.player.x, n.y - this.player.y);
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
    for (const m of MISSIONS) {
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
      for (const m of MISSIONS) {
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
    let line = n.def.intro;
    if (convo && convo.state === "playing") {
      const other = charById(convo.def.who.find((w) => w !== id)!);
      line = `Estoy hablando con ${other.name.split(" ")[0]}, pero dime.`;
    } else if (this.event && n.def.eventLines?.[this.event.id] && Math.random() < 0.5) {
      line = n.def.eventLines[this.event.id]!;
    }
    this.openDialog(n.def.name, n.def.role, id, line, this.npcOptions(id));
  }

  private npcOptions(id: string): DialogOption[] {
    const n = charById(id);
    const opts: DialogOption[] = [];
    // Deliveries first
    for (const m of MISSIONS) {
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
    if ((id === "darryl" || id === "roy") && Math.hypot(this.player.x - 1330, this.player.y - 1175) < 200) {
      opts.push({ label: "🏓 ¿Una partida de ping-pong?", tag: "game", act: () => this.startPingPong(id) });
    }
    opts.push({ label: "Despedirme", tag: "leave", act: this.closeDialog });
    return opts;
  }

  private noTaskLine(id: string): string {
    const pending = this.dayMissions().find((m) => m.giver === id && this.missionStatus[m.id] === "locked");
    const active = MISSIONS.find((m) => m.giver === id && this.missionStatus[m.id] === "active");
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
    const opp = this.npcs.find((n) => (n.def.id === "darryl" || n.def.id === "roy") && Math.hypot(n.x - 1330, n.y - 1175) < 160);
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
    };
    this.calls++;
    this.pc = { screen: "call", call: this.callSnapshot() };
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
    };
  }

  pcChooseOption = (i: number) => {
    const c = this.call;
    if (!c || this.pc?.screen !== "call") return;
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
    c.options = optionsFor(c.stage, opt.approach);
    c.clientLine = PROMPTS[p][c.stage] ?? "";
    this.pc = { screen: "call", call: this.callSnapshot() };
    this.emit();
  };

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
      [this.pcStartCall, this.pcMail, this.pcSummary, this.closePC][i]?.();
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
  toggleJournal = () => {
    if (this.phase !== "playing" || this.dialog || this.pc) return;
    this.journal = !this.journal;
    this.emit();
  };

  handleKey(key: string, down: boolean) {
    const k = key.length === 1 ? key.toLowerCase() : key;
    this.keys[k] = down;
    if (!down) return;
    if (this.phase !== "playing") return;
    if (/^[1-9]$/.test(k) && (this.dialog || this.pc)) {
      this.choose(Number(k) - 1);
      return;
    }
    if (k === "Escape") {
      if (this.dialog) return this.closeDialog();
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
    return {
      phase: this.phase,
      paused: this.paused,
      journal: this.journal,
      clock: formatClock(this.mins),
      mins: this.mins,
      money: this.money,
      rep: this.rep,
      energy: Math.round(this.energy),
      sales: this.sales,
      dateLabel: formatLongDate(this.date),
      event: this.event ? { id: this.event.id, name: this.event.name, emoji: this.event.emoji, description: this.event.description } : null,
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
