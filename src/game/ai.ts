/**
 * Client-safe contract between the game engine and the AI (Pollinations) server functions.
 * The engine only knows this interface; GameRoot plugs the real server calls in.
 */
import { APPROACHES, type Approach, type Client, type Personality, type SaleOption } from "./data/sales";

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

export interface ChatInput {
  characterId: string;
  messages: ChatMessage[];
  eventName: string | null;
  clock: string;
}

export interface GameAi {
  salesStart(): Promise<SalesStartResult>;
  salesTurn(input: SalesTurnInput): Promise<SalesTurnResult>;
  chat(input: ChatInput): Promise<string>;
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

export { cleanLine };
