export type Facing = "down" | "up" | "left" | "right";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type HairStyle =
  "short" | "side" | "long" | "bob" | "bun" | "curly" | "buzz" | "bald" | "wavy" | "spiky";

export type BodyBuild = "slim" | "regular" | "tall" | "petite" | "heavy" | "broad";

export type TopKind =
  "shirt" | "suit" | "cardigan" | "vest" | "workshirt" | "short_sleeve" | "blouse";

export type HairParting = "center" | "side" | "receding" | "slick" | "floppy";

export type EyebrowMood = "neutral" | "stern" | "warm" | "raised" | "sad";

export type CharacterAccessory =
  "mug" | "crossword" | "catPin" | "pearls" | "earrings" | "watch" | "badge";

export interface Look {
  skin: string;
  shirt: string;
  pants: string;
  hair: string;
  hairStyle: HairStyle;
  tie?: string;
  bowTie?: string;
  glasses?: boolean;
  beard?: boolean;
  mustache?: boolean;
  dress?: boolean;
  build?: BodyBuild;
  topKind?: TopKind;
  jacketColor?: string;
  parting?: HairParting;
  eyebrows?: EyebrowMood;
  accessory?: CharacterAccessory;
  eyeColor?: string;
  lipColor?: string;
}

export type CostumeKind =
  | "sith"
  | "catEars"
  | "threeHole"
  | "witch"
  | "vampire"
  | "pumpkin"
  | "ghost"
  | "santa"
  | "elf"
  | "reindeer"
  | "heart"
  | "partyHat"
  | "leprechaun"
  | "hawaiian"
  | "crown"
  | "india";

export type ExclusiveSkinId = "india";

export const EXCLUSIVE_SKINS: {
  id: ExclusiveSkinId;
  name: string;
  subtitle: string;
  badge: string;
}[] = [
  {
    id: "india",
    name: "El Maharajah del Meme",
    subtitle: "Turbante imperial, pluma de pavo real, gafas VIP, sherwani dorado y aura de loto.",
    badge: "EXCLUSIVA · TOBY",
  },
];

export type EventId =
  "halloween" | "navidad" | "sanvalentin" | "cumplemichael" | "sanpatricio" | "pretzel" | "viernes";

export interface RoutineEntry {
  at: number; // minutes from midnight
  spot: string;
  action: string;
}

export interface Topic {
  q: string;
  a: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  role: string;
  look: Look;
  intro: string;
  topics: Topic[];
  eventLines?: Partial<Record<EventId, string>>;
  routine: RoutineEntry[];
}

export type ItemId = string;

export type MissionStep =
  | { kind: "object"; target: string; text: string; gives?: ItemId; found: string }
  | { kind: "talk"; target: string; text: string; needs?: ItemId; line: string }
  | { kind: "sales"; count: number; text: string }
  | { kind: "money"; amount: number; text: string }
  | { kind: "gossip"; count: number; text: string };

export interface MissionDef {
  id: string;
  title: string;
  giver: string;
  offer: string;
  desc: string;
  steps: MissionStep[];
  reward: { rep: number; money?: number };
  requires?: string[];
  requiresCount?: number;
  minTime?: number;
  event?: EventId;
  doneLine: string;
}

export type MissionStatus = "locked" | "active" | "done";

export interface ObjectDef {
  id: string;
  name: string;
  x: number;
  y: number;
  sprite:
    | "paper"
    | "mug"
    | "jello"
    | "stapler"
    | "folder"
    | "box"
    | "labels"
    | "photo"
    | "pen"
    | "flowers"
    | "sprouts"
    | "form"
    | "report"
    | "list"
    | "candy"
    | "star"
    | "gift"
    | "cards"
    | "cake"
    | "shamrock"
    | "pretzel"
    | "costume"
    | "trophy"
    | "none";
  event?: EventId;
}

export type ServiceId = "coffee" | "vending" | "couch" | "cooler" | "pc" | "pingpong";

export interface ServiceDef {
  id: ServiceId;
  name: string;
  x: number;
  y: number;
  radius: number;
}

export type MeetingGesture =
  "none" | "talk" | "point" | "clap" | "note" | "facepalm" | "nod" | "raise_hand" | "pace";

export type CameraShot = "wide" | "host" | "speaker" | "reaction" | "player";

export interface ConversationLine {
  who: string;
  text: string;
  action?: MeetingGesture;
  cameraShot?: CameraShot;
  react?: { who: string; gesture: MeetingGesture }[];
}

export interface ConversationDef {
  id: string;
  title: string;
  who: [string, string];
  spot: string;
  at: number;
  duration: number;
  lines: ConversationLine[];
  event?: EventId | undefined;
}

export interface EventDef {
  id: EventId;
  name: string;
  emoji: string;
  dateLabel: string;
  description: string;
  match: (d: Date) => boolean;
  costumes: Partial<Record<string, CostumeKind>>;
  playerCostume?: CostumeKind;
  salesBonus?: number;
  example: (year: number) => string;
}

export type OfficeDecorKind = "diversity" | "casino" | "merger" | "convict" | "return" | "funrun";

export interface EpisodeDef {
  id: string;
  season: 1 | 2 | 3 | 4;
  epLabel: string;
  title: string;
  dateISO: string;
  dateLabel: string;
  summary: string;
  officeState: string;
  castIds: string[];
  extraDesks: string[];
  seatOverrides?: Record<string, string>;
  roleOverrides?: Record<string, string>;
  introOverrides?: Record<string, string>;
  decor?: OfficeDecorKind;
  openingToast: string;
}

export type EpisodeEventEffect =
  | "sticky_notes"
  | "prison_mike"
  | "gelatin_stapler"
  | "wall_hole"
  | "casino_crowd"
  | "fun_run_jog"
  | "fake_firing"
  | "yankee_swap";

export interface MeetingPreludeStep {
  who: string;
  partner?: string;
  spot: string;
  partnerSpot?: string;
  action: string;
  toastText: string;
  speaker: string;
  line: string;
  replyWho?: string;
  replyLine?: string;
  gesture?: MeetingGesture;
  duration?: number;
}

export interface MeetingAftermath {
  toastText: string;
  summaryLine: string;
  overrides?: { who: string; action: string; spot: string; reactionLine: string; mins?: number }[];
}

export interface MeetingTrigger {
  who: string;
  spot: string;
  action: string;
  toastText: string;
  line: string;
  callLine: string;
  preludeSteps?: MeetingPreludeStep[];
  aftermath?: MeetingAftermath;
}

export interface EpisodeEventDef {
  id: string;
  title: string;
  room: string;
  spot: string;
  at: number;
  duration: number;
  isMeeting?: boolean;
  trigger?: MeetingTrigger;
  host: string;
  participants: string[];
  effect?: EpisodeEventEffect;
  announcement: string;
  topicPrompt: string;
  suggestedLines?: string[];
  lines: ConversationLine[];
}
