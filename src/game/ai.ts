/**
 * Client-safe contract between the game engine and the AI (Pollinations) server functions.
 * The engine only knows this interface; GameRoot plugs the real server calls in.
 */
import { CHARACTERS } from "./data/characters";
import { SPOTS } from "./data/map";
import { APPROACHES, type Approach, type Client, type Personality, type SaleOption } from "./data/sales";
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

export interface GameAi {
  salesStart(): Promise<SalesStartResult>;
  salesTurn(input: SalesTurnInput): Promise<SalesTurnResult>;
  chat(input: ChatInput): Promise<string>;
  dailyConvos(input: DailyContentInput): Promise<ConversationDef[]>;
  dailyMissions(input: DailyContentInput): Promise<MissionDef[]>;
  chatImpact(input: ChatImpactInput): Promise<ChatImpactResult>;
}

const PERSONALITIES: Personality[] = ["amable", "tacano", "ocupado", "bromista"];

export function asPersonality(v: unknown): Personality {
  return PERSONALITIES.includes(v as Personality) ? (v as Personality) : "amable";
}

function cleanLine(v: unknown, max = 220): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim().replace(/^["«]|["»]$/g, "");
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
  const arr = Array.isArray(raw) ? raw : Array.isArray((raw as { conversations?: unknown })?.conversations) ? (raw as { conversations: unknown[] }).conversations : [];
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
      const lw = typeof (l as Record<string, unknown>)["who"] === "string" ? String((l as Record<string, unknown>)["who"]).trim().toLowerCase() : "";
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
  { id: "stapler", place: "Mesa de Dwight (Ventas)", item: "stapler", desc: "Grapadora en la mesa de Dwight" },
  { id: "files_blue", place: "Fotocopias y archivo", item: null, desc: "Archivador azul (revisar)" },
  { id: "beets", place: "Almacén", item: "beets", desc: "Caja de remolachas en el almacén" },
  { id: "invoices", place: "Estanterías de fotocopias", item: "invoices", desc: "Carpeta de facturas" },
  { id: "printer_jam", place: "Impresora (fotocopias)", item: null, desc: "Impresora (revisar/desatascar)" },
  { id: "labels", place: "Estanterías del almacén", item: "labels", desc: "Rollo de etiquetas" },
  { id: "paper_box", place: "Almacén (zona de cajas)", item: "paper_box", desc: "Caja de papel" },
  { id: "dock", place: "Muelle de expedición (almacén)", item: null, desc: "Muelle de carga (entregar/comprobar)" },
  { id: "cat_photo", place: "Sala de reuniones", item: "photo", desc: "Foto de gato en la sala de reuniones" },
  { id: "pen", place: "Recepción", item: "pen", desc: "Bolígrafo en recepción" },
  { id: "flowers", place: "Recepción", item: "flowers", desc: "Ramo de flores en recepción" },
  { id: "sprouts", place: "Almacén", item: "sprouts", desc: "Cuenco de brotes en el almacén" },
  { id: "form", place: "Mesa de Toby (Anexo RRHH)", item: "form", desc: "Formulario en el anexo" },
  { id: "report", place: "Impresora (fotocopias)", item: "report", desc: "Informe impreso en la impresora" },
  { id: "supplier_list", place: "Mesa de Meredith (Ventas)", item: "list", desc: "Lista de proveedores" },
  { id: "whiteboard", place: "Pizarra (Sala de reuniones)", item: null, desc: "Pizarra de reuniones (revisar)" },
  { id: "party_box", place: "Rincón del comité de fiestas", item: "decor", desc: "Caja de decoración" },
  { id: "toner", place: "Estanterías de fotocopias", item: "toner", desc: "Tóner nuevo" },
] as const;

export const OBJECT_TO_ITEM: Record<string, string> = Object.fromEntries(
  MISSION_OBJECT_CATALOG.filter((o) => o.item !== null).map((o) => [o.id, o.item as string]),
);
const VALID_MISSION_OBJECTS = new Set<string>(MISSION_OBJECT_CATALOG.map((o) => o.id));
const SHOP_ITEMS = new Set(["mms", "chips", "soda", "bar"]);

export function normalizeDailyMissions(raw: unknown, allowedIds: Set<string> = VALID_CHAR_IDS): MissionDef[] {
  const arr = Array.isArray(raw) ? raw : Array.isArray((raw as { missions?: unknown })?.missions) ? (raw as { missions: unknown[] }).missions : [];
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
        steps.push(gives ? { kind: "object", target, gives, text, found } : { kind: "object", target, text, found });
      } else if (kind === "talk") {
        const target = typeof s["target"] === "string" ? s["target"].trim().toLowerCase() : "";
        if (!allowedIds.has(target)) continue;
        const text = cleanLine(s["text"], 110);
        const line = cleanLine(s["line"], 180);
        if (!text || !line) continue;
        const rawNeeds = typeof s["needs"] === "string" ? s["needs"].trim() : undefined;
        const needs = rawNeeds && (givenItems.has(rawNeeds) || SHOP_ITEMS.has(rawNeeds)) ? rawNeeds : undefined;
        steps.push(needs ? { kind: "talk", target, needs, text, line } : { kind: "talk", target, text, line });
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
    const money = Number.isFinite(moneyRaw) && moneyRaw > 0 ? Math.min(50, Math.round(moneyRaw)) : undefined;
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
  const kind: ChatImpactKind = VALID_IMPACT_KINDS.includes(rawKind as ChatImpactKind) ? (rawKind as ChatImpactKind) : "alert";

  const rawSpot = typeof r["behaviorSpot"] === "string" ? r["behaviorSpot"].trim() : "";
  const behaviorSpot = SPOTS[rawSpot] ? rawSpot : homeSpotFor(speakerId);

  const rawPrep = typeof r["prepSpot"] === "string" ? r["prepSpot"].trim() : "";
  const prepSpot = rawPrep && SPOTS[rawPrep] ? rawPrep : null;

  const reactionLine = cleanLine(r["reactionLine"], 180) ?? summary;

  const rawTarget = typeof r["seekTargetId"] === "string" ? r["seekTargetId"].trim().toLowerCase() : "";
  const seekTargetId = allowedIds.has(rawTarget) && rawTarget !== speakerId ? rawTarget : null;

  const targetAction = cleanLine(r["targetAction"], 30);

  const convoTitle = cleanLine(r["convoTitle"], 70) ?? "Conversación urgente";
  const rawLines = Array.isArray(r["convoLines"]) ? r["convoLines"] : [];
  const convoLines: { who: string; text: string }[] = [];
  if (seekTargetId) {
    for (const l of rawLines) {
      if (!l || typeof l !== "object") continue;
      const lw = typeof (l as Record<string, unknown>)["who"] === "string" ? String((l as Record<string, unknown>)["who"]).trim().toLowerCase() : "";
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

export { cleanLine };
