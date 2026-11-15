export type Facing = "down" | "up" | "left" | "right";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type HairStyle =
  | "short"
  | "side"
  | "long"
  | "bob"
  | "bun"
  | "curly"
  | "buzz"
  | "bald"
  | "wavy"
  | "spiky";

export interface Look {
  skin: string;
  shirt: string;
  pants: string;
  hair: string;
  hairStyle: HairStyle;
  tie?: string;
  glasses?: boolean;
  beard?: boolean;
  dress?: boolean;
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
  | "crown";

export type EventId =
  | "halloween"
  | "navidad"
  | "sanvalentin"
  | "cumplemichael"
  | "sanpatricio"
  | "pretzel"
  | "viernes";

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

export interface ConversationLine {
  who: string;
  text: string;
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
