/**
 * Client-safe contract between the game engine and the AI (Pollinations) server functions.
 * The engine only knows this interface; GameRoot plugs the real server calls in.
 */
import { CHARACTERS } from "./data/characters";
import { SPOTS } from "./data/map";
import {
  APPROACHES,
  type Approach,
  type Client,
  type Personality,
  type SaleOption,
} from "./data/sales";
import { t } from "./time";
import type { ConversationDef, EventId, MissionDef, MissionStep } from "./types";

export interface AiSaleOption {
  approach: Approach;
  text: string;
}

export interface SalesStartResult {
  client: Client;
  options: AiSaleOption[];
}

export interface SalesTurnInput {
  client: Client;
  /** Stage the new options are for (1..4). */
  stage: number;
  interest: number;
  /** Interest change caused by the player's last line. */
  delta: number;
  history: { approach: Approach; text: string; reaction: string | null }[];
}

export interface SalesTurnResult {
  reaction: string;
  clientLine: string;
  options: AiSaleOption[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type ChatImpactKind = "prank" | "confront" | "alert" | "task";

export interface NpcMemory {
  id: string;
  atClock: string;
  summary: string;
  kind: ChatImpactKind;
  status: "en_marcha" | "completada" | "recordada";
  targetId?: string | null;
  reactionLine?: string;
}

export interface ChatInput {
  characterId: string;
  messages: ChatMessage[];
  eventName: string | null;
  clock: string;
  memories?: string[];
  activeCharIds?: string[];
  episodeContext?: string | null;
  speakerRole?: string;
}

export interface DailyContentInput {
  dateLabel: string;
  dayNumber?: number;
  recentEvents?: string[];
  dailyGoal?: string | null;
  eventId: EventId | null;
  eventName: string | null;
  eventDesc: string | null;
  activeCharIds?: string[];
  episodeContext?: string | null;
}

export interface ChatImpactInput {
  characterId: string;
  messages: ChatMessage[];
  eventName: string | null;
  clock: string;
  memories?: string[];
  activeCharIds?: string[];
  episodeContext?: string | null;
  speakerRole?: string;
}

export interface ChatImpactResult {
  important: boolean;
  kind?: ChatImpactKind;
  summary: string;
  newAction: string;
  behaviorSpot: string;
  prepSpot?: string | null;
  reactionLine: string;
  seekTargetId: string | null;
  targetAction?: string | null;
  convoTitle: string;
  convoLines: { who: string; text: string }[];
}

export interface MeetingInterveneInput {
  meetingTitle: string;
  topicPrompt: string;
  roomName: string;
  hostId: string;
  attendeeIds: string[];
  recentLines: { who: string; text: string }[];
  playerLine: string;
  clock: string;
  eventName: string | null;
  episodeContext: string | null;
}

export interface MeetingReaction {
  who: string;
  name: string;
  text: string;
}

export type MeetingMood = "aplausos" | "risa" | "caos" | "incomodo";

export interface MeetingInterveneResult {
  mood: MeetingMood;
  repDelta: number;
  summary: string;
  reactions: MeetingReaction[];
  followUpAction?: { who: string; action: string; spot: string } | null;
}

export interface NpcApproachInput {
  characterId: string;
  speakerRole: string;
  dayNumber: number;
  clock: string;
  eventName: string | null;
  episodeContext: string | null;
  recentEvents: string[];
  memories: string[];
  activeCharIds: string[];
  dailyGoal: string;
  stats: { money: number; rep: number; sales: number; missionsDone: number };
}

export interface NpcApproachReply {
  label: string;
  reaction: string;
  repDelta: number;
}

export interface NpcApproachResult {
  reason: string;
  walkCallout: string;
  openingLine: string;
  replies: NpcApproachReply[];
}

export interface GameAi {
  salesStart(): Promise<SalesStartResult>;
  salesTurn(input: SalesTurnInput): Promise<SalesTurnResult>;
  chat(input: ChatInput): Promise<string>;
  dailyConvos(input: DailyContentInput): Promise<ConversationDef[]>;
  dailyMissions(input: DailyContentInput): Promise<MissionDef[]>;
  chatImpact(input: ChatImpactInput): Promise<ChatImpactResult>;
  meetingIntervene?(input: MeetingInterveneInput): Promise<MeetingInterveneResult>;
  npcApproach?(input: NpcApproachInput): Promise<NpcApproachResult>;
}

const PERSONALITIES: Personality[] = ["amable", "tacano", "ocupado", "bromista"];

export function asPersonality(v: unknown): Personality {
  return PERSONALITIES.includes(v as Personality) ? (v as Personality) : "amable";
}

function cleanLine(v: unknown, max = 220): string | null {
  if (typeof v !== "string") return null;
  const s = v
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["«]|["»]$/g, "");
  return s ? s.slice(0, max) : null;
}

/**
 * Turns whatever the model returned into exactly 4 options, one per approach
 * (always in APPROACHES order). Missing or broken entries are filled from `fallback`.
 */
export function normalizeOptions(raw: unknown, fallback: SaleOption[]): AiSaleOption[] {
  const byApproach = new Map<Approach, string>();
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw)) {
      for (const o of raw) {
        const a = (o as { approach?: unknown })?.approach as Approach;
        const t = cleanLine((o as { text?: unknown })?.text);
        if (APPROACHES.includes(a) && t && !byApproach.has(a)) byApproach.set(a, t);
      }
    } else {
      for (const a of APPROACHES) {
        const t = cleanLine((raw as Record<string, unknown>)[a]);
        if (t) byApproach.set(a, t);
      }
    }
  }
  return APPROACHES.map((a) => ({
    approach: a,
    text: byApproach.get(a) ?? fallback.find((f) => f.approach === a)?.text ?? "…",
  }));
}

export const VALID_CHAR_IDS = new Set(CHARACTERS.map((c) => c.id));

export const VALID_CONVO_SPOTS = [
  "reception_front",
  "reception_side",
  "michael_visit",
  "michael_couch",
  "conf_s1",
  "conf_s2",
  "coffee",
  "kitchen_t1",
  "kitchen_t2",
  "kitchen_mid",
  "fridge",
  "cooler",
  "hall",
  "party",
  "bullpen_mid",
  "bullpen_east",
  "bullpen_west",
  "accounting_mid",
  "annex_mid",
  "copier",
  "printer",
  "archive_table",
  "warehouse_a",
  "warehouse_b",
] as const;

export function homeSpotFor(charId: string): string {
  const seat = `seat_${charId}`;
  return SPOTS[seat] ? seat : "warehouse_b";
}

function parseMinutes(v: unknown, fallbackMin: number): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.round(Math.max(555, Math.min(985, v)));
  }
  if (typeof v === "string") {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
    if (m) {
      const mins = Number(m[1]) * 60 + Number(m[2]);
      return Math.max(555, Math.min(985, mins));
    }
  }
  return fallbackMin;
}

export function normalizeDailyConvos(
  raw: unknown,
  eventId: EventId | null,
  allowedIds: Set<string> = VALID_CHAR_IDS,
): ConversationDef[] {
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { conversations?: unknown })?.conversations)
      ? (raw as { conversations: unknown[] }).conversations
      : [];
  const out: ConversationDef[] = [];
  const baseSeed = Math.floor(Math.random() * 10000);
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i] as Record<string, unknown> | null;
    if (!item || typeof item !== "object") continue;
    const rawWho = Array.isArray(item["who"]) ? item["who"] : [];
    const a = typeof rawWho[0] === "string" ? rawWho[0].trim().toLowerCase() : "";
    const b = typeof rawWho[1] === "string" ? rawWho[1].trim().toLowerCase() : "";
    if (!allowedIds.has(a) || !allowedIds.has(b) || a === b) continue;
    const rawSpot = typeof item["spot"] === "string" ? item["spot"].trim() : "";
    const spot = SPOTS[rawSpot] ? rawSpot : VALID_CONVO_SPOTS[i % VALID_CONVO_SPOTS.length]!;
    const title = cleanLine(item["title"], 70) ?? `${a} y ${b} charlan`;
    const at = parseMinutes(item["at"], t("09:25") + i * 40);
    const durNum = Number(item["duration"]);
    const duration = Number.isFinite(durNum) ? Math.round(Math.max(25, Math.min(45, durNum))) : 35;
    const rawLines = Array.isArray(item["lines"]) ? item["lines"] : [];
    const lines: { who: string; text: string }[] = [];
    for (const l of rawLines) {
      if (!l || typeof l !== "object") continue;
      const lw =
        typeof (l as Record<string, unknown>)["who"] === "string"
          ? String((l as Record<string, unknown>)["who"])
              .trim()
              .toLowerCase()
          : "";
      const lt = cleanLine((l as Record<string, unknown>)["text"], 150);
      if ((lw === a || lw === b) && lt) lines.push({ who: lw, text: lt });
    }
    if (lines.length < 3) continue;
    out.push({
      id: `ai_convo_${baseSeed}_${i}`,
      title,
      who: [a, b],
      spot,
      at,
      duration,
      lines: lines.slice(0, 7),
      ...(eventId ? { event: eventId } : {}),
    });
  }
  return out;
}

/** Existing office objects (non-event) that AI missions can reference safely. */
export const MISSION_OBJECT_CATALOG = [
  { id: "memo", place: "Sala de reuniones", item: "memo", desc: "Nota en la mesa de reuniones" },
  { id: "mug", place: "Sala de descanso", item: "mug", desc: "Taza en la sala de descanso" },
  { id: "jello", place: "Nevera (sala de descanso)", item: "jello", desc: "Gelatina de la nevera" },
  {
    id: "stapler",
    place: "Mesa de Dwight (Ventas)",
    item: "stapler",
    desc: "Grapadora en la mesa de Dwight",
  },
  {
    id: "files_blue",
    place: "Fotocopias y archivo",
    item: null,
    desc: "Archivador azul (revisar)",
  },
  { id: "beets", place: "Almacén", item: "beets", desc: "Caja de remolachas en el almacén" },
  {
    id: "invoices",
    place: "Estanterías de fotocopias",
    item: "invoices",
    desc: "Carpeta de facturas",
  },
  {
    id: "printer_jam",
    place: "Impresora (fotocopias)",
    item: null,
    desc: "Impresora (revisar/desatascar)",
  },
  { id: "labels", place: "Estanterías del almacén", item: "labels", desc: "Rollo de etiquetas" },
  { id: "paper_box", place: "Almacén (zona de cajas)", item: "paper_box", desc: "Caja de papel" },
  {
    id: "dock",
    place: "Muelle de expedición (almacén)",
    item: null,
    desc: "Muelle de carga (entregar/comprobar)",
  },
  {
    id: "cat_photo",
    place: "Sala de reuniones",
    item: "photo",
    desc: "Foto de gato en la sala de reuniones",
  },
  { id: "pen", place: "Recepción", item: "pen", desc: "Bolígrafo en recepción" },
  { id: "flowers", place: "Recepción", item: "flowers", desc: "Ramo de flores en recepción" },
  { id: "sprouts", place: "Almacén", item: "sprouts", desc: "Cuenco de brotes en el almacén" },
  { id: "form", place: "Mesa de Toby (Anexo RRHH)", item: "form", desc: "Formulario en el anexo" },
  {
    id: "report",
    place: "Impresora (fotocopias)",
    item: "report",
    desc: "Informe impreso en la impresora",
  },
  {
    id: "supplier_list",
    place: "Mesa de Meredith (Ventas)",
    item: "list",
    desc: "Lista de proveedores",
  },
  {
    id: "whiteboard",
    place: "Pizarra (Sala de reuniones)",
    item: null,
    desc: "Pizarra de reuniones (revisar)",
  },
  {
    id: "party_box",
    place: "Rincón del comité de fiestas",
    item: "decor",
    desc: "Caja de decoración",
  },
  { id: "toner", place: "Estanterías de fotocopias", item: "toner", desc: "Tóner nuevo" },
] as const;

export const OBJECT_TO_ITEM: Record<string, string> = Object.fromEntries(
  MISSION_OBJECT_CATALOG.filter((o) => o.item !== null).map((o) => [o.id, o.item as string]),
);
const VALID_MISSION_OBJECTS = new Set<string>(MISSION_OBJECT_CATALOG.map((o) => o.id));
const SHOP_ITEMS = new Set(["mms", "chips", "soda", "bar"]);

export function normalizeDailyMissions(
  raw: unknown,
  allowedIds: Set<string> = VALID_CHAR_IDS,
): MissionDef[] {
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { missions?: unknown })?.missions)
      ? (raw as { missions: unknown[] }).missions
      : [];
  const out: MissionDef[] = [];
  const seenGivers = new Set<string>();
  const baseSeed = Math.floor(Math.random() * 10000);

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i] as Record<string, unknown> | null;
    if (!item || typeof item !== "object") continue;
    const giver = typeof item["giver"] === "string" ? item["giver"].trim().toLowerCase() : "";
    if (!allowedIds.has(giver) || seenGivers.has(giver)) continue;

    const title = cleanLine(item["title"], 60);
    const offer = cleanLine(item["offer"], 220);
    const desc = cleanLine(item["desc"], 160);
    const doneLine = cleanLine(item["doneLine"], 160) ?? "Encargo completado.";
    if (!title || !offer || !desc) continue;

    const rawSteps = Array.isArray(item["steps"]) ? item["steps"] : [];
    const steps: MissionStep[] = [];
    const givenItems = new Set<string>();

    for (const rs of rawSteps) {
      if (!rs || typeof rs !== "object") continue;
      const s = rs as Record<string, unknown>;
      const kind = typeof s["kind"] === "string" ? s["kind"].trim() : "";
      if (kind === "object") {
        const target = typeof s["target"] === "string" ? s["target"].trim() : "";
        if (!VALID_MISSION_OBJECTS.has(target)) continue;
        const text = cleanLine(s["text"], 110);
        const found = cleanLine(s["found"], 160);
        if (!text || !found) continue;
        const gives = OBJECT_TO_ITEM[target];
        if (gives) givenItems.add(gives);
        steps.push(
          gives
            ? { kind: "object", target, gives, text, found }
            : { kind: "object", target, text, found },
        );
      } else if (kind === "talk") {
        const target = typeof s["target"] === "string" ? s["target"].trim().toLowerCase() : "";
        if (!allowedIds.has(target)) continue;
        const text = cleanLine(s["text"], 110);
        const line = cleanLine(s["line"], 180);
        if (!text || !line) continue;
        const rawNeeds = typeof s["needs"] === "string" ? s["needs"].trim() : undefined;
        const needs =
          rawNeeds && (givenItems.has(rawNeeds) || SHOP_ITEMS.has(rawNeeds)) ? rawNeeds : undefined;
        steps.push(
          needs
            ? { kind: "talk", target, needs, text, line }
            : { kind: "talk", target, text, line },
        );
      } else if (kind === "sales") {
        const count = Math.max(1, Math.min(3, Math.round(Number(s["count"]) || 1)));
        const text = cleanLine(s["text"], 110) ?? `Cierra ${count} ventas en tu ordenador`;
        steps.push({ kind: "sales", count, text });
      } else if (kind === "gossip") {
        const count = Math.max(1, Math.min(3, Math.round(Number(s["count"]) || 2)));
        const text = cleanLine(s["text"], 110) ?? `Escucha ${count} conversaciones en la oficina`;
        steps.push({ kind: "gossip", count, text });
      }
    }

    if (steps.length === 0) continue;
    // Ensure missions that only picked up an object or did sales/gossip end with reporting back if appropriate, or stay valid as-is.
    const last = steps[steps.length - 1]!;
    if (last.kind === "object" && last.gives) {
      steps.push({
        kind: "talk",
        target: giver,
        needs: last.gives,
        text: `Entrégaselo a ${CHARACTERS.find((c) => c.id === giver)!.name.split(" ")[0]}`,
        line: doneLine,
      });
    }

    const repRaw = Number((item["reward"] as { rep?: unknown } | undefined)?.rep);
    const moneyRaw = Number((item["reward"] as { money?: unknown } | undefined)?.money);
    const rep = Number.isFinite(repRaw) ? Math.max(2, Math.min(5, Math.round(repRaw))) : 3;
    const money =
      Number.isFinite(moneyRaw) && moneyRaw > 0 ? Math.min(50, Math.round(moneyRaw)) : undefined;
    const minTime = item["minTime"] ? parseMinutes(item["minTime"], 0) : undefined;

    seenGivers.add(giver);
    out.push({
      id: `ai_m_${baseSeed}_${i}_${giver}`,
      title,
      giver,
      requires: ["intro"],
      ...(minTime && minTime > 555 ? { minTime: Math.min(minTime, t("14:30")) } : {}),
      offer,
      desc,
      steps: steps.slice(0, 4),
      reward: money ? { rep, money } : { rep },
      doneLine,
    });
  }

  return out;
}

const VALID_IMPACT_KINDS: ChatImpactKind[] = ["prank", "confront", "alert", "task"];

export function normalizeChatImpact(
  raw: unknown,
  speakerId: string,
  allowedIds: Set<string> = VALID_CHAR_IDS,
): ChatImpactResult {
  const empty: ChatImpactResult = {
    important: false,
    kind: "alert",
    summary: "",
    newAction: "",
    behaviorSpot: homeSpotFor(speakerId),
    prepSpot: null,
    reactionLine: "",
    seekTargetId: null,
    targetAction: null,
    convoTitle: "",
    convoLines: [],
  };
  if (!raw || typeof raw !== "object") return empty;
  const r = raw as Record<string, unknown>;
  if (r["important"] !== true) return empty;

  const summary = cleanLine(r["summary"], 140);
  const newAction = cleanLine(r["newAction"], 32);
  if (!summary || !newAction) return empty;

  const rawKind = typeof r["kind"] === "string" ? r["kind"].trim().toLowerCase() : "alert";
  const kind: ChatImpactKind = VALID_IMPACT_KINDS.includes(rawKind as ChatImpactKind)
    ? (rawKind as ChatImpactKind)
    : "alert";

  const rawSpot = typeof r["behaviorSpot"] === "string" ? r["behaviorSpot"].trim() : "";
  const behaviorSpot = SPOTS[rawSpot] ? rawSpot : homeSpotFor(speakerId);

  const rawPrep = typeof r["prepSpot"] === "string" ? r["prepSpot"].trim() : "";
  const prepSpot = rawPrep && SPOTS[rawPrep] ? rawPrep : null;

  const reactionLine = cleanLine(r["reactionLine"], 180) ?? summary;

  const rawTarget =
    typeof r["seekTargetId"] === "string" ? r["seekTargetId"].trim().toLowerCase() : "";
  const seekTargetId = allowedIds.has(rawTarget) && rawTarget !== speakerId ? rawTarget : null;

  const targetAction = cleanLine(r["targetAction"], 30);

  const convoTitle = cleanLine(r["convoTitle"], 70) ?? "Conversación urgente";
  const rawLines = Array.isArray(r["convoLines"]) ? r["convoLines"] : [];
  const convoLines: { who: string; text: string }[] = [];
  if (seekTargetId) {
    for (const l of rawLines) {
      if (!l || typeof l !== "object") continue;
      const lw =
        typeof (l as Record<string, unknown>)["who"] === "string"
          ? String((l as Record<string, unknown>)["who"])
              .trim()
              .toLowerCase()
          : "";
      const lt = cleanLine((l as Record<string, unknown>)["text"], 150);
      if ((lw === speakerId || lw === seekTargetId) && lt) {
        convoLines.push({ who: lw, text: lt });
      }
    }
  }

  return {
    important: true,
    kind,
    summary,
    newAction,
    behaviorSpot,
    prepSpot,
    reactionLine,
    seekTargetId: convoLines.length >= 2 ? seekTargetId : null,
    targetAction,
    convoTitle,
    convoLines: convoLines.slice(0, 6),
  };
}

const VALID_MOODS: MeetingMood[] = ["aplausos", "risa", "caos", "incomodo"];

export function normalizeMeetingIntervene(
  raw: unknown,
  attendeeIds: string[],
  hostId: string,
): MeetingInterveneResult {
  const validSet = new Set(attendeeIds.length ? attendeeIds : ["michael", "dwight", "jim", "pam"]);
  const hostChar = CHARACTERS.find((c) => c.id === hostId) ?? CHARACTERS[0]!;
  const fallback: MeetingInterveneResult = {
    mood: "risa",
    repDelta: 1,
    summary: `${hostChar.name.split(" ")[0]} tomó nota de tu intervención en la reunión.`,
    reactions: [
      {
        who: hostChar.id,
        name: hostChar.name,
        text: "Interesante punto… no sé qué tiene que ver con el papel, pero me ha llegado al corazón.",
      },
    ],
    followUpAction: null,
  };
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Record<string, unknown>;
  const rawMood = typeof r["mood"] === "string" ? r["mood"].trim().toLowerCase() : "risa";
  const mood: MeetingMood = VALID_MOODS.includes(rawMood as MeetingMood)
    ? (rawMood as MeetingMood)
    : "risa";
  const repRaw = Number(r["repDelta"]);
  const repDelta = Number.isFinite(repRaw) ? Math.max(-1, Math.min(2, Math.round(repRaw))) : 1;
  const summary = cleanLine(r["summary"], 140) ?? fallback.summary;

  const rawReactions = Array.isArray(r["reactions"]) ? r["reactions"] : [];
  const reactions: MeetingReaction[] = [];
  for (const item of rawReactions) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const who = typeof rec["who"] === "string" ? rec["who"].trim().toLowerCase() : "";
    const text = cleanLine(rec["text"], 200);
    if (!validSet.has(who) || !text) continue;
    const ch = CHARACTERS.find((c) => c.id === who);
    if (!ch) continue;
    reactions.push({ who, name: ch.name, text });
  }
  if (reactions.length === 0) return fallback;

  let followUpAction: { who: string; action: string; spot: string } | null = null;
  const fu = r["followUpAction"];
  if (fu && typeof fu === "object") {
    const f = fu as Record<string, unknown>;
    const who = typeof f["who"] === "string" ? f["who"].trim().toLowerCase() : "";
    const action = cleanLine(f["action"], 30);
    const spotRaw = typeof f["spot"] === "string" ? f["spot"].trim() : "";
    const spot = SPOTS[spotRaw] ? spotRaw : homeSpotFor(who);
    if (validSet.has(who) && action) {
      followUpAction = { who, action, spot };
    }
  }

  return {
    mood,
    repDelta,
    summary,
    reactions: reactions.slice(0, 4),
    followUpAction,
  };
}

export function humanizeRecentTopic(raw: string): string {
  let s = raw.replace(/\s+/g, " ").trim();
  if (!s) return "";
  // Drop purely mechanical end-of-day quota summaries
  if (/^Día\s+\d+:\s*Cuota/i.test(s)) return "";
  s = s
    .replace(/^Acción en la oficina:\s*/i, "")
    .replace(/^Broma ejecutada:\s*/i, "la broma de ")
    .replace(/^Viviste en directo:\s*/i, "lo de ")
    .replace(/^Asististe a la reunión:\s*/i, "la reunión sobre ")
    .replace(/^Cotilleo oído:\s*/i, "el rumor de ")
    .replace(/^Completaste el encargo\s*/i, "el recado ")
    .replace(/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ se acercó[^:]*:\s*/i, "")
    .replace(/\s*\([^)]*(?:ventas|★|encargos)[^)]*\)/gi, "")
    .replace(/[«»"]/g, "")
    .trim();
  if (!s) return "";
  return s.slice(0, 72);
}

interface ApproachPersonaSeed {
  reason: string;
  callout: string;
  opening: string;
  replies: NpcApproachReply[];
}

export function normalizeNpcApproach(
  raw: unknown,
  characterId: string,
  _dayNumber = 1,
  recentEvents: string[] = [],
): NpcApproachResult {
  const ch = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0]!;
  const first = ch.name.split(" ")[0] ?? ch.name;
  const topic = recentEvents.map(humanizeRecentTopic).find((t) => t.length >= 6) ?? "";
  const topicNote = topic
    ? ` Después de lo de ${topic.charAt(0).toLowerCase() + topic.slice(1)}, esto parece un circo.`
    : "";

  const fallbackByChar: Record<string, ApproachPersonaSeed> = {
    michael: {
      reason: "Ocurrencia de despacho",
      callout: "¡Eh, tú! ¡Necesito tu genio!",
      opening: `Oye, entre tú y yo: eres oficialmente mi persona de confianza aquí.${topicNote} Se me ha ocurrido juntar el espíritu de familia con un premio sorpresa en la sala de reuniones, ¿me sigues o qué?`,
      replies: [
        {
          label: "Totalmente contigo, Michael",
          reaction:
            "Michael se señala el pecho emocionado: «¡Sabía que tenías madera de líder! Eso es lo que ella dijo… no, da igual.»",
          repDelta: 1,
        },
        {
          label: "¿Eso no es básicamente una fiesta sin permiso de Toby?",
          reaction:
            "Michael pone los ojos en blanco: «¡Shh! Ni nombres a Toby, que me amarga la inspiración.»",
          repDelta: 1,
        },
        {
          label: "Luego me lo cuentas, voy a llamar a un cliente",
          reaction:
            "Michael chasquea los dedos: «¡Eso! A cerrar papel, tiburón. Luego me aplaudes.»",
          repDelta: 0,
        },
      ],
    },
    dwight: {
      reason: "Inspección de puesto",
      callout: "¡Alto! Dos preguntas rápidas.",
      opening: `He cronometrado cuánto tardas en cruzar el pasillo desde tu escritorio.${topicNote} Solo aclárame una cosa antes de anotarlo en mi libreta: ¿eres un vendedor leal a la sucursal o otro espía de las bromas de Jim?`,
      replies: [
        {
          label: "Lealtad absoluta a Dunder Mifflin, Dwight",
          reaction:
            "Dwight asiente muy serio: «Respuesta aceptable. Si ves gelatina sospechosa, infórmame por código alfa.»",
          repDelta: 1,
        },
        {
          label: "¿Qué te ha hecho pensar que trabajo para Jim?",
          reaction:
            "Dwight entorna los ojos: «Eso es exactamente lo que diría un agente doble. Seguiré observándote.»",
          repDelta: 1,
        },
        {
          label: "Tengo clientes al teléfono, Dwight",
          reaction:
            "Dwight teclea su reloj imaginario: «Excelente. La productividad es el escudo de la empresa.»",
          repDelta: 0,
        },
      ],
    },
    jim: {
      reason: "Complicidad rápida",
      callout: "Oye, ¿tienes diez segundos?",
      opening: `Necesito un segundo de gente normal antes de volver frente a Dwight.${topicNote} Dime la verdad: ¿tú también has notado lo en serio que se toma hoy el reglamento de la grapadora?`,
      replies: [
        {
          label: "Si necesitas distracción, avísame",
          reaction:
            "Jim sonríe de lado mirando hacia la nada: «Me encanta cómo piensas. Luego te guiño un ojo.»",
          repDelta: 1,
        },
        {
          label: "Cualquier día acaba trayendo una sirena de policía",
          reaction:
            "Jim se ríe bajo: «No le des ideas, por favor, que ya tiene un megáfono en el maletero.»",
          repDelta: 1,
        },
        {
          label: "Luego te veo, tengo una llamada pendiente",
          reaction: "Jim levanta el café: «Suerte ahí fuera. No mires mucho a su mesa.»",
          repDelta: 0,
        },
      ],
    },
    pam: {
      reason: "Recado desde recepción",
      callout: "¡Oye! Una cosita rápida…",
      opening: `Tenía un respiro en la centralita y pasaba por aquí.${topicNote} Si ves a Michael salir de su despacho con rotuladores gordos, dime hacia qué lado vas para no cruzármelo.`,
      replies: [
        {
          label: "Tranquila, te aviso si se acerca",
          reaction:
            "Pam suspira aliviada: «Mil gracias. Lleva toda la mañana buscando excusas para reunirnos.»",
          repDelta: 1,
        },
        {
          label: "Seguro que ya está inventando otro acróstico",
          reaction:
            "Pam suelta una risita: «No lo dudes. Creo que le vi escribir en la pizarra hace cinco minutos.»",
          repDelta: 1,
        },
        {
          label: "Voy a revisar el correo un momento",
          reaction: "Pam sonríe amable: «Claro, luego nos vemos en la cocina.»",
          repDelta: 0,
        },
      ],
    },
    ryan: {
      reason: "Networking de pasillo",
      callout: "Oye, un segundo.",
      opening: `Estaba pensando mientras bajaba a fotocopias que aquí casi nadie tiene mentalidad de crecimiento.${topicNote} Tú que acabas de llegar, ¿tampoco piensas quedarte diez años vendiendo folios aquí?`,
      replies: [
        {
          label: "Bueno, por ahora toca aprender y vender bien",
          reaction:
            "Ryan levanta una ceja: «Pragmático. Me sirve. Pero piensa en escala, en marca personal.»",
          repDelta: 0,
        },
        {
          label: "Cuidado, como te oiga Michael te asciende a su mano derecha",
          reaction:
            "Ryan hace una mueca incómoda: «Por favor no. Ya me cuesta suficiente evitar sus abrazos.»",
          repDelta: 1,
        },
        {
          label: "Ahora mismo solo pienso en cerrar una cuenta",
          reaction: "Ryan asiente frío: «Vale, avísame si ves alguna idea disruptiva.»",
          repDelta: 0,
        },
      ],
    },
    stanley: {
      reason: "Queja breve",
      callout: "Oye. Dos segundos.",
      opening: `No sé quién te haya dicho que aquí somos una gran familia, pero yo vengo a trabajar y a irme a las cinco en punto.${topicNote} Mientras nadie monte escándalos junto a mi mesa, nos llevaremos de maravilla.`,
      replies: [
        {
          label: "Prometido, ni un ruido cerca de tu crucigrama",
          reaction:
            "Stanley cierra los ojos aliviado: «Gracias. Al fin alguien con dos dedos de frente en este edificio.»",
          repDelta: 1,
        },
        {
          label: "¿Al menos ha llegado ya el día del Pretzel?",
          reaction:
            "Por primera vez Stanley esboza media sonrisa: «Ni me hables de pretzels o empiezo a hacer cola ahora mismo.»",
          repDelta: 1,
        },
        {
          label: "Te dejo tranquilo con tu mesa, Stanley",
          reaction: "Stanley ni levanta la vista del papel: «Que tengas buena tarde.»",
          repDelta: 0,
        },
      ],
    },
    phyllis: {
      reason: "Comentario amable",
      callout: "Hola cariño, ¿un momento?",
      opening: `Solo pasaba a ver si estás cómodo desde que llegaste.${topicNote} Bob Vance siempre me dice que los sitios pequeños tienen carácter… aunque aquí a veces nos pasamos de carácter, ¿verdad?`,
      replies: [
        {
          label: "La verdad es que aquí no te aburres nunca",
          reaction:
            "Phyllis sonríe dulce: «Ay, qué bien que te lo tomes así. Si necesitas caramelos tengo en el cajón.»",
          repDelta: 1,
        },
        {
          label: "Bob Vance de Vance Refrigeration sabe mucho de eso",
          reaction:
            "Phyllis se ilumina orgullosa: «¡Claro! Siempre me trae flores más grandes que la mesa de Angela.»",
          repDelta: 1,
        },
        {
          label: "Todo bien por ahora, Phyllis, gracias",
          reaction: "Phyllis te da unas palmaditas en el brazo: «Cualquier cosa me dices, cielo.»",
          repDelta: 0,
        },
      ],
    },
    angela: {
      reason: "Queja de protocolo",
      callout: "Disculpa. Un momento.",
      opening: `No sé si en tu anterior empleo permitían tanto ruido y tan poca formalidad, pero aquí llevamos libros de cuentas y un calendario serio del Comité de Fiestas.${topicNote} Por favor, dime que al menos tú respetas el orden en el edificio.`,
      replies: [
        {
          label: "Por supuesto, siempre todo en orden y en silencio",
          reaction:
            "Angela asiente tiesa: «Bueno. Al menos alguien tiene modales además de mis gatos.»",
          repDelta: 1,
        },
        {
          label: "¿Qué color toca este mes en el Comité de Fiestas?",
          reaction:
            "Angela frunce el ceño satisfecha: «Verde pálido. El naranja es vulgar, como le dije ya a Phyllis.»",
          repDelta: 1,
        },
        {
          label: "No me entretengo, vuelvo a mi puesto",
          reaction: "Angela ajusta su chaqueta: «Eso es lo correcto. Hay trabajo que auditar.»",
          repDelta: 0,
        },
      ],
    },
    oscar: {
      reason: "Aclaración sensata",
      callout: "Oye, ¿tienes un minuto?",
      opening: `Pasaba a estirar las piernas antes de revisar otra hoja de gastos absurda de Michael.${topicNote} Dime que al menos tú distingues una deducción fiscal básica de un presupuesto de magia, porque en esta oficina hace falta sentido común.`,
      replies: [
        {
          label: "Contigo al cien por cien, Oscar",
          reaction:
            "Oscar respira hondo: «Gracias. A veces siento que soy el único adulto en esta planta.»",
          repDelta: 1,
        },
        {
          label: "Apuesto a que Michael puso un truco de magia como gasto de oficina",
          reaction:
            "Oscar niega con la cabeza medio riéndose: «No me sorprendería nada. Literalmente puso «esposas de entrenamiento» la semana pasada.»",
          repDelta: 1,
        },
        {
          label: "Vuelvo a mis cuentas antes de que cierre el día",
          reaction: "Oscar asiente educado: «Claro, ánimo con tus clientes.»",
          repDelta: 0,
        },
      ],
    },
    kevin: {
      reason: "Pregunta muy seria",
      callout: "¡Oye! ¡Una duda!",
      opening: `Me quedé atascado sumando unas cajas antes de ir a por M&M's.${topicNote} Si pones una coma en el número equivocado pero el total queda bonito, ¿se nota mucho en el ordenador?`,
      replies: [
        {
          label: "Mejor que no lo vea Angela antes de corregir esa coma",
          reaction:
            "Kevin abre mucho los ojos: «Buen consejo. Angela da mucho miedo cuando frunce la nariz.»",
          repDelta: 1,
        },
        {
          label: "¿Por qué no usas el truco del keleven?",
          reaction:
            "Kevin sonríe de oreja a oreja: «¡Un error más keleven te deja en casa antes de las siete!»",
          repDelta: 1,
        },
        {
          label: "Luego nos vemos en la sala de descanso, Kevin",
          reaction: "Kevin asiente pensativo: «Vale. Espero que queden galletas.»",
          repDelta: 0,
        },
      ],
    },
    meredith: {
      reason: "Charla sin filtro",
      callout: "¡Ey, tú! Ven aquí.",
      opening: `Menos mal que hay cara nueva por el pasillo.${topicNote} A ver, entre nosotros: si Michael vuelve a convocar otra reunión absurda, ¿dónde escondemos el termo de café cargado para aguantarla?`,
      replies: [
        {
          label: "Yo me siento cerca de la puerta por si hay que escapar",
          reaction:
            "Meredith suelta una carcajada: «Eres de los míos. Si pasa algo, tú no me has visto.»",
          repDelta: 1,
        },
        {
          label: "¿Cómo llevas los pedidos con los proveedores?",
          reaction:
            "Meredith se encoge de hombros: «Siempre consigo descuento. Lo importante es tener mano izquierda.»",
          repDelta: 1,
        },
        {
          label: "Te veo luego, Meredith, tengo curro",
          reaction: "Meredith levanta la mano: «Venga, no trabajes más de la cuenta.»",
          repDelta: 0,
        },
      ],
    },
    creed: {
      reason: "Aviso misterioso",
      callout: "Psst. Escúchame.",
      opening: `No hagas movimientos bruscos. Creo que hoy el tipo que viene a revisar las fotocopiadoras es el mismo que me vendió unas semillas ilegales en los ochenta.${topicNote} Si alguien pregunta por el responsable de calidad, nunca me has visto aquí.`,
      replies: [
        {
          label: "Tranquilo, Creed, no diré ni una palabra",
          reaction:
            "Creed te guiña un ojo: «Buen chico. Algún día te enseño mi colección de pasaportes.»",
          repDelta: 1,
        },
        {
          label: "¿Cuál se supone que es exactamente tu trabajo aquí?",
          reaction:
            "Creed mira al vacío muy serio: «Quabity… quabity assuance. No, casi. Pero estoy cerca.»",
          repDelta: 1,
        },
        {
          label: "Eh… tengo que volver a mi escritorio",
          reaction: "Creed desaparece paso atrás: «Nos vemos en el muelle o nunca.»",
          repDelta: 0,
        },
      ],
    },
    kelly: {
      reason: "Último drama",
      callout: "¡Oye! ¡Ni te imaginas!",
      opening: `¡Dios mío, menos mal que te encuentro! Tengo mil cosas que contarte y nadie me escucha porque todos están obsesionados con el papel.${topicNote} A ti qué te parece más grave: que Ryan mire el móvil mientras le hablo o que nadie comente la ropa nueva que traigo hoy.`,
      replies: [
        {
          label: "Claramente tu estilismo merece atención primero",
          reaction:
            "Kelly da un gritito feliz: «¡LO SABÍA! Eres oficialmente mi nueva persona favorita aquí.»",
          repDelta: 1,
        },
        {
          label: "Ryan debería soltar el móvil cinco minutos",
          reaction:
            "Kelly asiente rapidísimo: «¡Exacto! Se lo dije ayer y ni siquiera levantó la vista.»",
          repDelta: 1,
        },
        {
          label: "Luego me pones al día, Kelly, estoy con llamadas",
          reaction: "Kelly suspira dramática: «Bueno, luego te lo cuento TODO en el anexo.»",
          repDelta: 0,
        },
      ],
    },
    toby: {
      reason: "Recordatorio de RRHH",
      callout: "Hola… ¿tienes un segundo?",
      opening: `Perdona que te moleste… solo pasaba a comprobar que tienes los papeles de bienvenida en regla.${topicNote} Si Michael te dice que RRHH no manda nada aquí, bueno… casi tiene razón, pero cualquier queja me la puedes dejar en el anexo.`,
      replies: [
        {
          label: "Gracias, Toby. ¿Todo tranquilo por el anexo?",
          reaction:
            "Toby sonríe cansado: «Más o menos. Al menos allí nadie grita desde una pizarra.»",
          repDelta: 1,
        },
        {
          label: "¿Cuántos formularios acumulas esta semana por culpa de Michael?",
          reaction:
            "Toby baja la voz: «Una carpeta entera. Y todavía no hemos llegado al viernes.»",
          repDelta: 1,
        },
        {
          label: "Todo en orden, gracias por pasarte",
          reaction: "Toby asiente suave: «Estupendo… bueno, ya me vuelvo al fondo.»",
          repDelta: 0,
        },
      ],
    },
    darryl: {
      reason: "Asunto del almacén",
      callout: "Eh, sube un segundo.",
      opening: `Acabo de subir un momento de abajo y ya hay más ruido en esta planta que en el muelle de carga.${topicNote} Solo dime si vas a pedir envíos urgentes hoy para organizar los palés antes de que Michael baje a «ayudar».`,
      replies: [
        {
          label: "Todo limpio por ahora, os aviso con tiempo",
          reaction:
            "Darryl asiente tranquilo: «De lujo. Ojalá todos en esta planta pensaran antes de pulsar enviar.»",
          repDelta: 1,
        },
        {
          label: "Dime que Michael no ha vuelto a tocar la carretilla",
          reaction:
            "Darryl niega serio: «Me tocó esconderle las llaves detrás de las cajas de archivo.»",
          repDelta: 1,
        },
        {
          label: "Nos vemos abajo luego, Darryl",
          reaction: "Darryl levanta el puño: «Cuando quieras bajarte a echar un ping-pong, avisa.»",
          repDelta: 0,
        },
      ],
    },
    roy: {
      reason: "Recado rápido",
      callout: "Ey, una cosa.",
      opening: `Subía un paquete desde el almacén y pasaba por aquí.${topicNote} ¿No habrás visto una caja de folios mal etiquetada por vuestra zona? Siempre nos echan el muerto abajo.`,
      replies: [
        {
          label: "Si la veo por fotocopias te aviso",
          reaction: "Roy asiente: «Se agradece. Así me ahorro otra charla.»",
          repDelta: 1,
        },
        {
          label: "¿Mucho lío abajo hoy?",
          reaction:
            "Roy se encoge de hombros: «Lo de siempre, camiones entrando y gente arriba pidiendo prisas.»",
          repDelta: 1,
        },
        {
          label: "Ahora mismo no he visto nada, lo siento",
          reaction: "Roy asiente seco: «Vale, sigo mirando por aquí.»",
          repDelta: 0,
        },
      ],
    },
    jan: {
      reason: "Supervisión de Nueva York",
      callout: "Un momento, por favor.",
      opening: `He venido desde Nueva York a revisar los números de esta sucursal y espero encontrar algo de profesionalidad entre tanto caos.${topicNote} ¿Cómo ves el ritmo de llamadas y disciplina aquí abajo?`,
      replies: [
        {
          label: "Mucha actividad en Ventas, enfocándonos en los clientes",
          reaction:
            "Jan toma nota breve: «Me alegra oír que alguien mantiene la cabeza fría en Scranton.»",
          repDelta: 1,
        },
        {
          label: "Aquí se improvisa bastante pero las cuentas acaban saliendo",
          reaction: "Jan aprieta los labios: «Eso me temía. Voy a hablar con Michael enseguida.»",
          repDelta: 1,
        },
        {
          label: "Vuelvo justo a atender una llamada",
          reaction: "Jan asiente fría: «Haga el favor. No pierda el tiempo.»",
          repDelta: 0,
        },
      ],
    },
    packer: {
      reason: "Broma de paso",
      callout: "¡Eh, novato!",
      opening: `Venga esa mano, chaval. Estoy de paso por Scranton antes de volver a la carretera.${topicNote} ¿Qué tal aguantas al jefe? Dime que al menos tú tienes sentido del humor y no eres un muermo como los de Contabilidad.`,
      replies: [
        {
          label: "Aquí hay que tener aguante para sobrevivir",
          reaction: "Packer se ríe fuerte: «¡Esa es la actitud! Ya nos veremos por el parking.»",
          repDelta: 1,
        },
        {
          label: "Mejor no le des más ideas a Michael hoy",
          reaction: "Packer guiña un ojo: «Si es que se pone a tiro él solo, chaval.»",
          repDelta: 1,
        },
        {
          label: "Te dejo, tengo que trabajar",
          reaction: "Packer se da la vuelta: «Venga, a facturar, campeón.»",
          repDelta: 0,
        },
      ],
    },
    devon: {
      reason: "Desahogo breve",
      callout: "Oye, ¿un segundo?",
      opening: `Llevo toda la mañana oyendo rumores de recortes desde la central y ya no sé quién manda aquí.${topicNote} ¿Tú tampoco entiendes por qué Michael hace más reuniones cuanto más lío hay?`,
      replies: [
        {
          label: "Ojalá se centre en apoyar a los equipos",
          reaction: "Devon asiente agradecido: «Gracias, tío. A ver si pasa esta semana rápido.»",
          repDelta: 1,
        },
        {
          label: "Si ves a Creed muy callado cerca de Michael, vigila",
          reaction: "Devon frunce el ceño: «Qué raro está Creed hoy, sí… voy a estar atento.»",
          repDelta: 1,
        },
        {
          label: "Ánimo Devon, vuelvo al teléfono",
          reaction: "Devon levanta la mano: «Nos vemos luego.»",
          repDelta: 0,
        },
      ],
    },
    andy: {
      reason: "Presentación entusiasta",
      callout: "¡Eh, amigo! ¡Ri-dit-dit-di-do!",
      opening: `¡Qué pasa, tío! En Cornell siempre decíamos que hay que hacer equipo desde el primer minuto.${topicNote} ¿Te mola la música a capela? Porque en cuanto haya un respiro monto un cuarteto en la cocina.`,
      replies: [
        {
          label: "¡Claro! Aquí hace falta un poco de ritmo",
          reaction:
            "Andy choca el puño entusiasmado: «¡Brutal! Tú y yo vamos a ser uña y carne, colega.»",
          repDelta: 1,
        },
        {
          label: "Ten cuidado, Angela odia cualquier ruido en Contabilidad",
          reaction:
            "Andy traga saliva: «Uf, gracias por el chivatazo… me apunto lo del volumen bajo.»",
          repDelta: 1,
        },
        {
          label: "Luego cantamos, ahora tengo que vender papel",
          reaction: "Andy hace saludo militar: «¡A por ellos, lobo de Scranton!»",
          repDelta: 0,
        },
      ],
    },
    karen: {
      reason: "Comentario desde Stamford",
      callout: "Oye, ¿tienes un momento?",
      opening: `Desde que cerraron Stamford todo aquí funciona… bueno, a su manera.${topicNote} Dime que en tu opinión la mitad de las cosas que pasan en este pasillo tampoco tienen ningún sentido.`,
      replies: [
        {
          label: "Cero sentido, pero acabas cogiéndole el truco",
          reaction:
            "Karen sonríe irónica: «Eso espero, porque llevo dos cafés intentando entender a Michael.»",
          repDelta: 1,
        },
        {
          label: "Por lo menos aquí nadie se duerme aburrido",
          reaction:
            "Karen se ríe: «Eso te lo concedo. En Stamford al menos hacíamos pausas de Call of Duty.»",
          repDelta: 1,
        },
        {
          label: "Ánimo con la adaptación, Karen",
          reaction: "Karen asiente simpática: «Igualmente, nos vemos luego.»",
          repDelta: 0,
        },
      ],
    },
    martin: {
      reason: "Observación tranquila",
      callout: "Disculpa, ¿un segundo?",
      opening: `Estaba comparando horarios y ambiente desde que llegamos de Stamford.${topicNote} Aquí todo el mundo monta un drama por un correo, cuando de donde vengo yo sí que había normas raras.`,
      replies: [
        {
          label: "Aquí Michael convierte cualquier detalle en espectáculo",
          reaction: "Martin asiente tranquilo: «Ya me voy dando cuenta. Solo intento ir a lo mío.»",
          repDelta: 1,
        },
        {
          label: "Seguro que tienes mil anécdotas mejores que las nuestras",
          reaction: "Martin sonríe educado: «Alguna que otra sí tengo, créeme.»",
          repDelta: 1,
        },
        {
          label: "Que tengas buen turno, Martin",
          reaction: "Martin levanta la mano: «Gracias, igualmente.»",
          repDelta: 0,
        },
      ],
    },
    tony: {
      reason: "Agobio con la mudanza",
      callout: "Eh… disculpa.",
      opening: `Acabo de traer mis cosas desde Stamford y ya me duele la cabeza solo de ver cómo dirige Michael esto.${topicNote} Si intenta inventarse otro ejercicio físico absurdo, creo que ni me quedo a comer.`,
      replies: [
        {
          label: "Tómate un respiro en la cocina antes de decidir nada",
          reaction: "Tony resopla: «Tienes razón… voy a por un refresco antes de que me dé algo.»",
          repDelta: 1,
        },
        {
          label: "Aquí lo mejor es esconderse detrás de la fotocopiadora",
          reaction: "Tony suelta una risa nerviosa: «Tomo nota del escondite, gracias.»",
          repDelta: 1,
        },
        {
          label: "Mucho ánimo hoy, Tony",
          reaction: "Tony asiente agobiado: «Gracias… a ver qué pasa.»",
          repDelta: 0,
        },
      ],
    },
    hannah: {
      reason: "Orden en el escritorio",
      callout: "Perdona, un segundo.",
      opening: `Desde que llegué de Stamford parece que a algunas personas les molesta hasta una foto familiar en la mesa.${topicNote} Por lo menos dime que aquí dejan trabajar en paz a quien cumple con sus números.`,
      replies: [
        {
          label: "Tú ni caso, defiende tu mesa y tus fotos",
          reaction: "Hannah asiente firme: «Eso pienso hacer. Muchas gracias.»",
          repDelta: 1,
        },
        {
          label: "Angela es estricta con todo el mundo, no es personal",
          reaction:
            "Hannah suspira: «Ya lo veo, pero tampoco voy a dejar que me mande sin motivo.»",
          repDelta: 1,
        },
        {
          label: "Te dejo seguir con lo tuyo, Hannah",
          reaction: "Hannah asiente educada: «Gracias, que vaya bien.»",
          repDelta: 0,
        },
      ],
    },
  };

  const base = fallbackByChar[ch.id] ?? {
    reason: "Charla espontánea",
    callout: "¡Eh! ¿Tienes un segundo?",
    opening: `Pasaba por aquí a estirar un poco las piernas.${topicNote} ¿Todo tranquilo por tu zona hoy?`,
    replies: [
      {
        label: "Todo bien, aguantando el ritmo de Scranton",
        reaction: `${first} asiente con una sonrisa: «Aquí nunca sabes qué pasará dentro de cinco minutos.»`,
        repDelta: 1,
      },
      {
        label: "Solo espero que Michael no convoque otra reunión eterna",
        reaction: `${first} baja la voz: «Ni lo digas en voz alta, que aparece al instante.»`,
        repDelta: 1,
      },
      {
        label: "Voy justo de tiempo, luego seguimos",
        reaction: `${first} asiente: «Claro, nos vemos luego.»`,
        repDelta: 0,
      },
    ],
  };

  if (!raw || typeof raw !== "object") {
    return {
      reason: base.reason,
      walkCallout: base.callout,
      openingLine: base.opening,
      replies: base.replies,
    };
  }
  const r = raw as Record<string, unknown>;
  const reason = cleanLine(r["reason"], 42) ?? base.reason;
  const walkCallout = cleanLine(r["walkCallout"], 60) ?? base.callout;
  const openingLine = cleanLine(r["openingLine"], 260) ?? base.opening;
  const rawReplies = Array.isArray(r["replies"]) ? r["replies"] : [];
  const replies: NpcApproachReply[] = [];
  for (const item of rawReplies) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    const label = cleanLine(it["label"], 90);
    const reaction = cleanLine(it["reaction"], 180);
    const deltaNum = Number(it["repDelta"]);
    const repDelta = Number.isFinite(deltaNum)
      ? Math.max(-1, Math.min(2, Math.round(deltaNum)))
      : 1;
    if (label && reaction) replies.push({ label, reaction, repDelta });
  }
  while (replies.length < 3) {
    replies.push(base.replies[replies.length]!);
  }
  return { reason, walkCallout, openingLine, replies: replies.slice(0, 3) };
}

export { cleanLine };
