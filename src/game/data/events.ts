import type { EventDef, EventId } from "../types";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

export const EVENTS: EventDef[] = [
  {
    id: "halloween",
    name: "Halloween",
    emoji: "🎃",
    dateLabel: "31 de octubre",
    description: "Disfraces, calabazas, telarañas y concurso de disfraces organizado por Michael.",
    match: (d) => d.getMonth() === 9 && d.getDate() === 31,
    costumes: {
      dwight: "sith",
      pam: "catEars",
      angela: "catEars",
      jim: "threeHole",
      kelly: "witch",
      michael: "vampire",
      kevin: "pumpkin",
      creed: "ghost",
      oscar: "vampire",
      meredith: "witch",
      ryan: "vampire",
    },
    playerCostume: "pumpkin",
    salesBonus: 1,
    example: (y) => ymd(y, 10, 31),
  },
  {
    id: "navidad",
    name: "Fiesta de Navidad",
    emoji: "🎄",
    dateLabel: "18 – 25 de diciembre",
    description: "Árbol, luces, gorros de Papá Noel y amigo invisible. Las ventas suben un 20%.",
    match: (d) => d.getMonth() === 11 && d.getDate() >= 18 && d.getDate() <= 25,
    costumes: {
      michael: "santa",
      phyllis: "santa",
      dwight: "elf",
      kevin: "reindeer",
      jim: "elf",
      pam: "elf",
      kelly: "elf",
      ryan: "reindeer",
      oscar: "elf",
      angela: "elf",
      darryl: "santa",
    },
    playerCostume: "elf",
    salesBonus: 1.2,
    example: (y) => ymd(y, 12, 22),
  },
  {
    id: "sanvalentin",
    name: "San Valentín",
    emoji: "💘",
    dateLabel: "14 de febrero",
    description: "Corazones por la oficina, flores para Phyllis y tarjetas que repartir.",
    match: (d) => d.getMonth() === 1 && d.getDate() === 14,
    costumes: { kelly: "heart", michael: "heart", phyllis: "heart" },
    example: (y) => ymd(y, 2, 14),
  },
  {
    id: "cumplemichael",
    name: "Cumpleaños de Michael",
    emoji: "🎂",
    dateLabel: "15 de marzo",
    description:
      "Globos, pancarta y una tarta que nadie debe estropear. Michael está insoportable.",
    match: (d) => d.getMonth() === 2 && d.getDate() === 15,
    costumes: {
      michael: "crown",
      kevin: "partyHat",
      pam: "partyHat",
      jim: "partyHat",
      phyllis: "partyHat",
      kelly: "partyHat",
      dwight: "partyHat",
    },
    playerCostume: "partyHat",
    example: (y) => ymd(y, 3, 15),
  },
  {
    id: "sanpatricio",
    name: "San Patricio",
    emoji: "☘️",
    dateLabel: "17 de marzo",
    description: "Todo es verde. Tréboles escondidos y Michael asegura ser irlandés.",
    match: (d) => d.getMonth() === 2 && d.getDate() === 17,
    costumes: {
      michael: "leprechaun",
      kevin: "leprechaun",
      meredith: "leprechaun",
      creed: "leprechaun",
    },
    playerCostume: "leprechaun",
    example: (y) => ymd(y, 3, 17),
  },
  {
    id: "pretzel",
    name: "Día del Pretzel",
    emoji: "🥨",
    dateLabel: "26 de abril",
    description: "Un puesto de pretzels gratis en recepción. Stanley está, por una vez, feliz.",
    match: (d) => d.getMonth() === 3 && d.getDate() === 26,
    costumes: {},
    example: (y) => ymd(y, 4, 26),
  },
  {
    id: "viernes",
    name: "Viernes casual",
    emoji: "🌺",
    dateLabel: "Cualquier viernes",
    description: "Camisas hawaianas y un Michael demasiado relajado.",
    match: (d) => d.getDay() === 5,
    costumes: { michael: "hawaiian", kevin: "hawaiian", packer: "hawaiian", darryl: "hawaiian" },
    example: () => "",
  },
];

/** Returns the special event for a date. Named holidays beat the generic Friday. */
export function eventForDate(d: Date): EventDef | null {
  const named = EVENTS.find((e) => e.id !== "viernes" && e.match(d));
  if (named) return named;
  return EVENTS.find((e) => e.id === "viernes" && e.match(d)) ?? null;
}

export function eventById(id: EventId | null | undefined): EventDef | null {
  return EVENTS.find((e) => e.id === id) ?? null;
}

/** Parse "YYYY-MM-DD" as a local date (no timezone shift). */
export function parseLocalDate(s: string): Date {
  const [y = 2026, m = 1, d = 1] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function formatLongDate(d: Date): string {
  return `${DAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}
