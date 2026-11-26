import type { ChatImpactKind, NpcMemory } from "../ai";
import type {
  CameraShot,
  CharacterDef,
  ConversationDef,
  CostumeKind,
  EpisodeEventEffect,
  ExclusiveSkinId,
  Facing,
  Look,
  MeetingGesture,
} from "../types";
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
  running?: boolean | undefined;
  walkT: number;
  path: { x: number; y: number; portalJump?: boolean }[];
  targetKey: string;
  target: { x: number; y: number };
  action: string;
  faceTo?: Facing | undefined;
  seated?: boolean | undefined;
  gesture?: MeetingGesture | undefined;
  override?: NPCOverride | undefined;
}

export interface Player {
  x: number;
  y: number;
  facing: Facing;
  moving: boolean;
  running?: boolean | undefined;
  walkT: number;
  action?: string | undefined;
  seated?: boolean | undefined;
  gesture?: MeetingGesture | undefined;
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
  tag:
    | "topic"
    | "mission"
    | "deliver"
    | "missing"
    | "event"
    | "shop"
    | "leave"
    | "accept"
    | "back"
    | "game"
    | "chat";
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

export interface DailyGoalUI {
  dayNumber: number;
  rankTitle: string;
  headline: string;
  why: string;
  rep: number;
  targetRep: number;
  sales: number;
  targetSales: number;
  missionsDone: number;
  targetMissions: number;
  completedCount: number;
  allCompleted: boolean;
}

export interface EndSummary {
  dayNumber: number;
  rankTitle: string;
  goalMet: boolean;
  goalSummary: string;
  money: number;
  sales: number;
  calls: number;
  missionsDone: number;
  missionsTotal: number;
  rep: number;
  careerRep: number;
  careerSales: number;
  gossip: number;
  gossipTotal: number;
  dundies: number;
  award: string;
  awardLine: string;
  recentEvents: string[];
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

export interface OfficeEventUI {
  id: string;
  title: string;
  room: string;
  roomName: string;
  spot: string;
  isMeeting: boolean;
  clockEnd: string;
  effect?: EpisodeEventEffect | undefined;
  lineText?: string | undefined;
  speakerName?: string | undefined;
}

export interface MeetingEntry {
  kind: "canon" | "player" | "ai" | "note";
  who?: string | undefined;
  name: string;
  text: string;
  clock: string;
}

export interface MeetingUI {
  eventId: string;
  title: string;
  roomName: string;
  hostId: string;
  attendees: string[];
  suggestedLines: string[];
  entries: MeetingEntry[];
  isSpontaneous: boolean;
  handRaised: boolean;
}

export interface MeetingNoticeUI {
  phase: "trigger" | "calling" | "gathering";
  eventId: string;
  title: string;
  headline: string;
  callText: string;
  replyText?: string;
  stepLabel?: string;
  seatedCount: number;
  totalCount: number;
  playerSeated: boolean;
  inRoom: boolean;
}

export interface MeetingCinemaUI {
  eventId: string;
  title: string;
  hostId: string;
  hostName: string;
  speakerId: string;
  speakerName: string;
  speakerAction: string;
  line: string;
  cameraShot: CameraShot;
  cameraLabel: string;
  focusNpcId: string;
  seatedCount: number;
  totalCount: number;
  handRaised: boolean;
  suggestedLines: string[];
  entries: MeetingEntry[];
  aiEnabled: boolean;
}

export type CameraMode = "shoulder_right" | "shoulder_left" | "first_person";

export interface UIState {
  phase: "start" | "playing" | "ended";
  paused: boolean;
  journal: boolean;
  cameraMode: CameraMode;
  floor: 0 | 1;
  playerLook: Look;
  unlockedSkins: ExclusiveSkinId[];
  playerSkin: ExclusiveSkinId | null;
  dayNumber: number;
  dailyGoal: DailyGoalUI;
  recentEvents: string[];
  approachingNpc: { id: string; name: string; reason: string } | null;
  cinematic: CinematicUI | null;
  activeOfficeEvent: OfficeEventUI | null;
  meetingNotice: MeetingNoticeUI | null;
  meetingCinema: MeetingCinemaUI | null;
  inConferenceRoom: boolean;
  meeting: MeetingUI | null;
  clock: string;
  mins: number;
  money: number;
  rep: number;
  energy: number;
  sales: number;
  dateLabel: string;
  event: { id: string; name: string; emoji: string; description: string } | null;
  episode: {
    id: string;
    epLabel: string;
    title: string;
    officeState: string;
    castCount: number;
  } | null;
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
  pcStats: {
    money: number;
    calls: number;
    sales: number;
    rep: number;
    missionsDone: number;
    missionsTotal: number;
  };
}
