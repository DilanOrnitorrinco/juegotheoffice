import type { ObjectDef, ServiceDef } from "../types";

/** Mission objects. They are only visible/usable while an active mission step points at them. */
export const OBJECTS: ObjectDef[] = [
  { id: "memo", name: "Nota de la reunión", x: 300, y: 285, sprite: "paper" },
  { id: "mug", name: "Taza «World's Best Boss»", x: 1565, y: 300, sprite: "mug" },
  { id: "jello", name: "Gelatina de la nevera", x: 1920, y: 125, sprite: "jello" },
  { id: "stapler", name: "Grapadora de Dwight", x: 600, y: 545, sprite: "stapler" },
  { id: "files_blue", name: "Archivador azul", x: 1130, y: 985, sprite: "folder" },
  { id: "beets", name: "Caja de remolachas", x: 1800, y: 1240, sprite: "box" },
  { id: "invoices", name: "Carpeta de facturas", x: 870, y: 1270, sprite: "folder" },
  { id: "printer_jam", name: "Impresora atascada", x: 930, y: 985, sprite: "paper" },
  { id: "labels", name: "Rollo de etiquetas", x: 1500, y: 1240, sprite: "labels" },
  { id: "paper_box", name: "Caja de papel perdida", x: 1295, y: 1345, sprite: "box" },
  { id: "dock", name: "Muelle de expedición", x: 1860, y: 1290, sprite: "none" },
  { id: "cat_photo", name: "Foto de Sprinkles", x: 120, y: 290, sprite: "photo" },
  { id: "pen", name: "Bolígrafo de la suerte", x: 600, y: 300, sprite: "pen" },
  { id: "flowers", name: "Ramo de flores", x: 700, y: 280, sprite: "flowers" },
  { id: "sprouts", name: "Cuenco de brotes", x: 1620, y: 1240, sprite: "sprouts" },
  { id: "form", name: "Formulario de queja", x: 450, y: 1055, sprite: "form" },
  { id: "report", name: "Informe de ventas impreso", x: 930, y: 985, sprite: "report" },
  { id: "supplier_list", name: "Lista de proveedores", x: 460, y: 725, sprite: "list" },
  { id: "whiteboard", name: "Pizarra de la sala", x: 270, y: 80, sprite: "none" },
  { id: "party_box", name: "Caja de decoración", x: 155, y: 700, sprite: "box" },
  { id: "toner", name: "Tóner nuevo", x: 1040, y: 1290, sprite: "box" },
  // Event objects
  { id: "costume_box", name: "Caja de disfraces", x: 1300, y: 1235, sprite: "costume", event: "halloween" },
  { id: "candy1", name: "Caramelos de Phyllis", x: 1180, y: 545, sprite: "candy", event: "halloween" },
  { id: "candy2", name: "Caramelos de Angela", x: 1570, y: 545, sprite: "candy", event: "halloween" },
  { id: "candy3", name: "Caramelos de Kelly", x: 150, y: 1055, sprite: "candy", event: "halloween" },
  { id: "star", name: "Estrella del árbol", x: 1130, y: 1330, sprite: "star", event: "navidad" },
  { id: "xmas_tree", name: "Árbol de Navidad", x: 735, y: 345, sprite: "none", event: "navidad" },
  { id: "gift", name: "Regalo del amigo invisible", x: 1720, y: 1240, sprite: "gift", event: "navidad" },
  { id: "cards", name: "Tarjetas de San Valentín", x: 660, y: 300, sprite: "cards", event: "sanvalentin" },
  { id: "cake", name: "Tarta de cumpleaños", x: 1920, y: 125, sprite: "cake", event: "cumplemichael" },
  { id: "shamrock1", name: "Trébol escondido", x: 1950, y: 820, sprite: "shamrock", event: "sanpatricio" },
  { id: "shamrock2", name: "Trébol escondido", x: 60, y: 1180, sprite: "shamrock", event: "sanpatricio" },
  { id: "shamrock3", name: "Trébol escondido", x: 1180, y: 330, sprite: "shamrock", event: "sanpatricio" },
  { id: "pretzel_stand", name: "Puesto de pretzels", x: 700, y: 330, sprite: "none", event: "pretzel" },
];

export const OBJ_BY_ID: Record<string, ObjectDef> = Object.fromEntries(OBJECTS.map((o) => [o.id, o]));

/** Always-available activities. */
export const SERVICES: ServiceDef[] = [
  { id: "pc", name: "Tu ordenador", x: 730, y: 545, radius: 60 },
  { id: "coffee", name: "Cafetera", x: 1480, y: 120, radius: 55 },
  { id: "vending", name: "Máquinas expendedoras", x: 1800, y: 135, radius: 60 },
  { id: "couch", name: "Sofá de descanso", x: 1880, y: 245, radius: 55 },
  { id: "cooler", name: "Fuente de agua", x: 1276, y: 115, radius: 50 },
  { id: "pingpong", name: "Mesa de ping-pong", x: 1330, y: 1175, radius: 60 },
];

/** Hidden Dundie trophies to collect. */
export const DUNDIES: { id: string; x: number; y: number; title: string }[] = [
  { id: "d1", x: 480, y: 340, title: "Dundie al «Pie más bonito»" },
  { id: "d2", x: 1950, y: 355, title: "Dundie a la «Mejor siesta»" },
  { id: "d3", x: 1170, y: 1345, title: "Dundie al «Jefe más guapo»" },
  { id: "d4", x: 1950, y: 935, title: "Dundie «Tigre Fino»" },
  { id: "d5", x: 50, y: 1345, title: "Dundie a «La más larga relación de Kevin con la comida»" },
  { id: "d6", x: 1370, y: 830, title: "Dundie al «Cliente más agradecido»" },
];

export const SHOP: { id: string; name: string; price: number; energy: number; emoji: string }[] = [
  { id: "mms", name: "Bolsa de M&M's", price: 1, energy: 10, emoji: "🍬" },
  { id: "chips", name: "Patatas fritas", price: 2, energy: 15, emoji: "🥔" },
  { id: "soda", name: "Refresco de cola", price: 2, energy: 20, emoji: "🥤" },
  { id: "bar", name: "Barrita de cereales", price: 3, energy: 25, emoji: "🍫" },
];
