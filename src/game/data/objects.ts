import type { ObjectDef, ServiceDef } from "../types";

/** Mission objects. They are only visible/usable while an active mission step points at them. */
export const OBJECTS: ObjectDef[] = [
  { id: "memo", name: "Nota de la reunión", x: 875, y: 230, sprite: "paper" },
  { id: "mug", name: "Taza «World's Best Boss»", x: 1620, y: 232, sprite: "mug" },
  { id: "jello", name: "Gelatina de la nevera", x: 1300, y: 384, sprite: "jello" },
  { id: "stapler", name: "Grapadora de Dwight", x: 545, y: 552, sprite: "stapler" },
  { id: "files_blue", name: "Archivador azul", x: 410, y: 1062, sprite: "folder" },
  { id: "beets", name: "Caja de remolachas", x: 1755, y: 1305, sprite: "box" },
  { id: "invoices", name: "Carpeta de facturas", x: 170, y: 1345, sprite: "folder" },
  { id: "printer_jam", name: "Impresora atascada", x: 248, y: 1068, sprite: "paper" },
  { id: "labels", name: "Rollo de etiquetas", x: 1550, y: 1285, sprite: "labels" },
  { id: "paper_box", name: "Caja de papel perdida", x: 1205, y: 1445, sprite: "box" },
  { id: "dock", name: "Muelle de expedición", x: 2040, y: 1410, sprite: "none" },
  { id: "cat_photo", name: "Foto de Sprinkles", x: 755, y: 232, sprite: "photo" },
  { id: "pen", name: "Bolígrafo de la suerte", x: 270, y: 405, sprite: "pen" },
  { id: "flowers", name: "Ramo de flores", x: 275, y: 495, sprite: "flowers" },
  { id: "sprouts", name: "Cuenco de brotes", x: 1650, y: 1285, sprite: "sprouts" },
  { id: "form", name: "Formulario de queja", x: 2065, y: 800, sprite: "form" },
  { id: "report", name: "Informe de ventas impreso", x: 248, y: 1068, sprite: "report" },
  { id: "supplier_list", name: "Lista de proveedores", x: 930, y: 658, sprite: "list" },
  { id: "whiteboard", name: "Pizarra de la sala", x: 880, y: 82, sprite: "none" },
  { id: "party_box", name: "Caja de decoración", x: 989, y: 380, sprite: "box" },
  { id: "toner", name: "Tóner nuevo", x: 450, y: 1445, sprite: "box" },
  // Event objects
  { id: "costume_box", name: "Caja de disfraces", x: 1320, y: 1285, sprite: "costume", event: "halloween" },
  { id: "candy1", name: "Caramelos de Phyllis", x: 790, y: 816, sprite: "candy", event: "halloween" },
  { id: "candy2", name: "Caramelos de Angela", x: 112, y: 768, sprite: "candy", event: "halloween" },
  { id: "candy3", name: "Caramelos de Kelly", x: 2065, y: 462, sprite: "candy", event: "halloween" },
  { id: "star", name: "Estrella del árbol", x: 510, y: 1445, sprite: "star", event: "navidad" },
  { id: "xmas_tree", name: "Árbol de Navidad", x: 295, y: 350, sprite: "none", event: "navidad" },
  { id: "gift", name: "Regalo del amigo invisible", x: 1875, y: 1335, sprite: "gift", event: "navidad" },
  { id: "cards", name: "Tarjetas de San Valentín", x: 270, y: 455, sprite: "cards", event: "sanvalentin" },
  { id: "cake", name: "Tarta de cumpleaños", x: 1300, y: 384, sprite: "cake", event: "cumplemichael" },
  { id: "shamrock1", name: "Trébol escondido", x: 385, y: 785, sprite: "shamrock", event: "sanpatricio" },
  { id: "shamrock2", name: "Trébol escondido", x: 1810, y: 735, sprite: "shamrock", event: "sanpatricio" },
  { id: "shamrock3", name: "Trébol escondido", x: 1410, y: 330, sprite: "shamrock", event: "sanpatricio" },
  { id: "pretzel_stand", name: "Puesto de pretzels", x: 305, y: 540, sprite: "none", event: "pretzel" },
];

export const OBJ_BY_ID: Record<string, ObjectDef> = Object.fromEntries(OBJECTS.map((o) => [o.id, o]));

/** Always-available activities. */
export const SERVICES: ServiceDef[] = [
  { id: "pc", name: "Tu ordenador", x: 685, y: 552, radius: 60 },
  { id: "coffee", name: "Cafetera", x: 1150, y: 374, radius: 58 },
  { id: "vending", name: "Máquinas expendedoras", x: 1820, y: 128, radius: 64 },
  { id: "couch", name: "Sofá de descanso", x: 2080, y: 165, radius: 58 },
  { id: "cooler", name: "Fuente de agua", x: 1036, y: 376, radius: 54 },
  { id: "pingpong", name: "Mesa de ping-pong", x: 1150, y: 1310, radius: 64 },
];

/** Hidden Dundie trophies to collect. */
export const DUNDIES: { id: string; x: number; y: number; title: string }[] = [
  { id: "d1", x: 1045, y: 235, title: "Dundie al «Pie más bonito»" },
  { id: "d2", x: 2135, y: 235, title: "Dundie a la «Mejor siesta»" },
  { id: "d3", x: 960, y: 1470, title: "Dundie al «Jefe más guapo»" },
  { id: "d4", x: 2135, y: 985, title: "Dundie «Tigre Fino»" },
  { id: "d5", x: 65, y: 885, title: "Dundie a «La más larga relación de Kevin con la comida»" },
  { id: "d6", x: 2135, y: 325, title: "Dundie al «Cliente más agradecido»" },
];

export const SHOP: { id: string; name: string; price: number; energy: number; emoji: string }[] = [
  { id: "mms", name: "Bolsa de M&M's", price: 1, energy: 10, emoji: "🍬" },
  { id: "chips", name: "Patatas fritas", price: 2, energy: 15, emoji: "🥔" },
  { id: "soda", name: "Refresco de cola", price: 2, energy: 20, emoji: "🥤" },
  { id: "bar", name: "Barrita de cereales", price: 3, energy: 25, emoji: "🍫" },
];
