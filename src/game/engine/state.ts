import type { ChatImpactKind, NpcMemory } from "../ai";
import type { CharacterDef, ConversationDef, CostumeKind, Facing, Look } from "../types";
import type { Approach, Client, SaleOption, SaleOutcome } from "../data/sales";

export interface ChatLogEntry {
  role: "user" | "assistant" | "note";
  content: string;
  clock: string;
}

export interface NPCOverride {
  action: string;
  spot: string;
  until: number;
  reactionLine: string;
  memoryId?: string | undefined;
}

export interface NPC {
  def: CharacterDef;
  x: number;
  y: number;
  facing: Facing;
  moving: boolean;
  walkT: number;
  path: { x: number; y: number }[];
  targetKey: string;
  target: { x: number; y: number };
  action: string;
  faceTo?: Facing | undefined;
  override?: NPCOverride | undefined;
}

export interface Player {
  x: number;
  y: number;
  facing: Facing;
  moving: boolean;
  walkT: number;
}

export type ConvoState = "pending" | "playing" | "done";

export interface ConvoRuntime {
  def: ConversationDef;
  state: ConvoState;
  line: number;
  lineT: number;
  arrived: boolean;
  heardLines?: number | undefined;
  dynamic?: boolean | undefined;
  seekBy?: string | undefined;
  seekTarget?: string | undefined;
  kind?: ChatImpactKind | undefined;
  prepSpot?: string | undefined;
  prepDone?: boolean | undefined;
  prepTimer?: number | undefined;
  memoryId?: string | undefined;
  targetAction?: string | undefined;
}

export interface DialogOption {
  label: string;
  tag: "topic" | "mission" | "deliver" | "missing" | "event" | "shop" | "leave" | "accept" | "back" | "game" | "chat";
  act: () => void;
}

export interface DialogUI {
  speaker: string;
  role: string;
  portrait: string | null;
  line: string;
  options: { label: string; tag: DialogOption["tag"] }[];
  canBack: boolean;
}

export interface CallState {
  client: Client;
  stage: number;
  interest: number;
  history: { stage: number; option: SaleOption; delta: number }[];
  options: SaleOption[];
  clientLine: string;
  youLine: string | null;
  reaction: string | null;
  lastDelta: number | null;
  /** Lines and client invented by the AI. */
  ai: boolean;
  /** Waiting for the AI to answer. */
  loading: boolean;
}

export type PcUI =
  | { screen: "menu" }
  | { screen: "call"; call: CallSnapshot }
  | { screen: "result"; call: CallSnapshot; outcome: SaleOutcome; hungUp: boolean }
  | { screen: "mail"; mails: { id: string; from: string; subject: string; read: boolean }[] }
  | { screen: "mailRead"; mail: Mail }
  | { screen: "summary" };

export interface CallSnapshot {
  company: string;
  contact: string;
  need: string;
  budget: number;
  stage: number;
  interest: number;
  path: { approach: Approach; delta: number; text: string }[];
  options: { text: string; approach: Approach }[];
  clientLine: string;
  youLine: string | null;
  reaction: string | null;
  lastDelta: number | null;
  ai: boolean;
  loading: boolean;
}

export interface Mail {
  id: string;
  from: string;
  subject: string;
  body: string;
}

export interface Toast {
  id: number;
  text: string;
  kind: "info" | "mission" | "money" | "gossip" | "event" | "warn";
}

export interface MissionUI {
  id: string;
  title: string;
  desc: string;
  status: "locked" | "active" | "done";
  giver: string;
  step: string | null;
  stepIndex: number;
  steps: number;
  event: boolean;
  available: boolean;
}

export interface EndSummary {
  money: number;
  sales: number;
  calls: number;
  missionsDone: number;
  missionsTotal: number;
  rep: number;
  gossip: number;
  gossipTotal: number;
  dundies: number;
  award: string;
  awardLine: string;
}

export interface CinematicUI {
  sceneId: string;
  sceneNumber: number;
  totalScenes: number;
  title: string;
  category: string;
  costume?: CostumeKind | undefined;
  speaker: string;
  line: string;
  step: 0 | 1 | 2;
  choices: { label: string }[];
}

export interface UIState {
  phase: "start" | "playing" | "ended";
  paused: boolean;
  journal: boolean;
  playerLook: Look;
  cinematic: CinematicUI | null;
  clock: string;
  mins: number;
  money: number;
  rep: number;
  energy: number;
  sales: number;
  dateLabel: string;
  event: { id: string; name: string; emoji: string; description: string } | null;
  episode: { id: string; epLabel: string; title: string; officeState: string; castCount: number } | null;
  activeCharIds: string[];
  episodeContext: string | null;
  missions: MissionUI[];
  inventory: { id: string; name: string; emoji: string; count: number; edible: boolean }[];
  dialog: DialogUI | null;
  chat: {
    id: string;
    name: string;
    role: string;
    intro: string;
    history: ChatLogEntry[];
    memories: NpcMemory[];
  } | null;
  chatRecords: {
    id: string;
    name: string;
    role: string;
    messages: ChatLogEntry[];
    memories: NpcMemory[];
  }[];
  aiEnabled: boolean;
  pc: PcUI | null;
  toasts: Toast[];
  gossip: { heard: { title: string }[]; total: number };
  dundies: { found: string[]; total: number };
  end: EndSummary | null;
  pcStats: { money: number; calls: number; sales: number; rep: number; missionsDone: number; missionsTotal: number };
}
