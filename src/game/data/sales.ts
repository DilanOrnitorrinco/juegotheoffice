/**
 * Sales call decision tree.
 * Every node offers exactly 4 options — one per approach. The approach you pick
 * decides which 4 options appear at the next level, so each path through the
 * 5 levels (4^5 = 1024 paths) is a different conversation.
 */

export type Approach = "cercano" | "tecnico" | "precio" | "humor";
export type Personality = "amable" | "tacano" | "ocupado" | "bromista";

export const APPROACHES: Approach[] = ["cercano", "tecnico", "precio", "humor"];

export const APPROACH_INFO: Record<Approach, { label: string; icon: string }> = {
  cercano: { label: "Cercano", icon: "🤝" },
  tecnico: { label: "Técnico", icon: "📊" },
  precio: { label: "Precio", icon: "💲" },
  humor: { label: "Humor", icon: "😄" },
};

export const STAGES = ["Apertura", "Descubrir necesidad", "Propuesta", "Objeción", "Cierre"] as const;

/** How much each personality likes each approach. */
export const FIT: Record<Personality, Record<Approach, number>> = {
  amable: { cercano: 2, humor: 1, tecnico: 0, precio: -1 },
  tacano: { precio: 2, tecnico: 1, cercano: 0, humor: -2 },
  ocupado: { tecnico: 2, precio: 1, cercano: -1, humor: -1 },
  bromista: { humor: 2, cercano: 1, precio: 0, tecnico: -1 },
};

export interface Client {
  company: string;
  contact: string;
  personality: Personality;
  need: string;
  budget: number;
  greeting: string;
}

export const CLIENTS: Client[] = [
  { company: "Blue Cross of Pennsylvania", contact: "Sra. Wright", personality: "amable", need: "renovar el pedido trimestral de A4", budget: 520, greeting: "¡Hola, cielo! Qué detalle que llamen. ¿En qué puedo ayudarle?" },
  { company: "Scranton White Pages", contact: "Sr. Hammond", personality: "tacano", need: "papel para la guía telefónica", budget: 680, greeting: "Si esto va a costarme dinero, sea breve. Y barato." },
  { company: "Condado de Lackawanna", contact: "Sra. Davis", personality: "ocupado", need: "una licitación de papel reciclado", budget: 760, greeting: "Tengo dos minutos. Literalmente. Tengo un cronómetro delante." },
  { company: "Vance Refrigeration", contact: "Bob Vance", personality: "bromista", need: "facturas y papel continuo", budget: 480, greeting: "¡Bob Vance, Vance Refrigeration! ¿Usted es el que hace chistes por teléfono?" },
  { company: "Residencia Lakeview", contact: "Sr. Patel", personality: "amable", need: "papel para los boletines semanales", budget: 380, greeting: "Buenos días. Aquí todos son muy mayores, así que hable despacito, por favor." },
  { company: "Diario The Electric City", contact: "Sr. Grotti", personality: "tacano", need: "un contrato anual de papel prensa", budget: 900, greeting: "Ya tenemos proveedor. Uno barato. ¿Por qué debería escucharle?" },
  { company: "Clínica Dental Lustig", contact: "Dra. Lustig", personality: "ocupado", need: "formularios y papel de impresora", budget: 420, greeting: "Tengo un paciente con la boca abierta. Rápido." },
  { company: "Restaurante Cugino's", contact: "Tony Cugino", personality: "bromista", need: "servilletas de papel y cartas", budget: 350, greeting: "¡Ey! ¿Dunder qué? Suena a nombre de mago. Me gusta. Hable." },
  { company: "Colegio Scranton Prep", contact: "Directora Moore", personality: "amable", need: "papel para todo el curso escolar", budget: 840, greeting: "Hola, buenos días. Estoy organizando el inicio de curso, ¡qué alegría que llamen!" },
  { company: "Bufete Hirsch & Lee", contact: "Sr. Hirsch", personality: "ocupado", need: "papel de alto gramaje para contratos", budget: 960, greeting: "Facturo 300 dólares la hora. Este minuto se lo regalo. Vaya al grano." },
  { company: "Gimnasio Iron Valley", contact: "Coach Ruiz", personality: "bromista", need: "carteles y folletos de promoción", budget: 410, greeting: "¡Vamos, vamos, VAMOS! ¿Qué me vende, campeón?" },
  { company: "Ferretería Krupp", contact: "Sra. Krupp", personality: "tacano", need: "tickets y papel de embalar", budget: 300, greeting: "¿Cuánto cuesta esta llamada? A mí nada, ¿verdad? Bien. Hable." },
];

export interface SaleOption {
  approach: Approach;
  text: string;
  /** Personality that gets an extra +1 from this specific line. */
  bonus?: Personality | undefined;
}

const O = (approach: Approach, text: string, bonus?: Personality): SaleOption => ({ approach, text, bonus });

export const OPENING: SaleOption[] = [
  O("cercano", "¡Buenos días! Soy de Dunder Mifflin Scranton. ¿Qué tal le va la semana?"),
  O("tecnico", "Le llamo por su consumo de papel: tengo datos que pueden interesarle.", "ocupado"),
  O("precio", "Este mes tenemos una oferta que podría ahorrarle bastante dinero.", "tacano"),
  O("humor", "Le llamo para hablar del producto más emocionante del mundo: el papel."),
];

/** TREE[stageIndex][previousApproach] -> 4 options (one per approach). Stages 1..4. */
export const TREE: Record<number, Record<Approach, SaleOption[]>> = {
  1: {
    cercano: [
      O("cercano", "Cuénteme, ¿cómo es un día normal en su oficina?", "amable"),
      O("tecnico", "¿Cuántos folios calcula que imprimen al mes?"),
      O("precio", "¿Qué presupuesto suelen manejar para material de oficina?"),
      O("humor", "¿Su impresora también tiene vida propia? La nuestra odia los lunes."),
    ],
    tecnico: [
      O("cercano", "Antes de los números: ¿quién decide las compras ahí?"),
      O("tecnico", "¿Qué gramaje usan ahora? ¿75 u 80 g/m²?", "ocupado"),
      O("precio", "¿Cuánto pagan por caja con su proveedor actual?", "tacano"),
      O("humor", "Prometo que esto es más divertido de lo que suena. Un poco."),
    ],
    precio: [
      O("cercano", "Más allá del precio, ¿qué es lo que más valoran de un proveedor?"),
      O("tecnico", "¿Qué volumen necesitarían para entrar en tarifa mayorista?"),
      O("precio", "¿Su proveedor actual les cobra los portes?", "tacano"),
      O("humor", "¿Ha visto lo que cuesta una caja de papel? Es casi un robo. Casi."),
    ],
    humor: [
      O("cercano", "Bueno, en serio: ¿qué tal les trata su proveedor?", "amable"),
      O("tecnico", "Vale, vale, datos: ¿cuántas impresoras tienen?"),
      O("precio", "Si le hago reír y además le ahorro dinero, ¿me da cinco minutos?"),
      O("humor", "¿Sabe qué le dijo un folio a otro? Nada. El papel no habla. Por eso lo vendo yo.", "bromista"),
    ],
  },
  2: {
    cercano: [
      O("cercano", "Le asigno un comercial fijo: yo. Me llama cuando quiera.", "amable"),
      O("tecnico", "Podemos programar entregas automáticas cada dos semanas.", "ocupado"),
      O("precio", "Para clientes de confianza tenemos un 10% de descuento fijo."),
      O("humor", "Si nos elige, le mando una postal en Navidad. Firmada por Michael. Lo siento de antemano."),
    ],
    tecnico: [
      O("cercano", "Lo mejor: si algo falla, habla con una persona, no con una máquina."),
      O("tecnico", "Nuestro papel tiene un 98% de blancura y no atasca impresoras láser.", "ocupado"),
      O("precio", "Con su volumen, le saldría a 24 $ la caja en lugar de 31 $.", "tacano"),
      O("humor", "Es tan bueno que Dwight lo usa para sus manuales de supervivencia."),
    ],
    precio: [
      O("cercano", "Y como sé que cada dólar cuenta, le reviso la factura cada trimestre."),
      O("tecnico", "Le preparo un comparativo por escrito con su proveedor actual."),
      O("precio", "Si firma hoy, el primer envío va sin portes.", "tacano"),
      O("humor", "Le ahorro tanto que podrá comprar una cafetera decente. O dos malas.", "bromista"),
    ],
    humor: [
      O("cercano", "Somos una oficina pequeña: le tratamos como a uno más de la familia.", "amable"),
      O("tecnico", "Fuera bromas: entrega en 24 horas en todo el condado."),
      O("precio", "Y ahora la parte seria: le igualo cualquier precio de la competencia."),
      O("humor", "Nuestro lema: «Dunder Mifflin, el papel que no te deja tirado». Lo acabo de inventar."),
    ],
  },
  3: {
    cercano: [
      O("cercano", "Lo entiendo perfectamente. ¿Qué le haría sentirse más tranquilo?", "amable"),
      O("tecnico", "Le mando muestras gratis y las prueba sin compromiso."),
      O("precio", "Le congelo el precio durante un año entero.", "tacano"),
      O("humor", "Si no le gusta, le devuelvo el dinero y le canto algo. Mal."),
    ],
    tecnico: [
      O("cercano", "Hablemos claro: ¿qué tendría que pasar para que dijera que sí?"),
      O("tecnico", "Tenemos garantía de calidad: si hay un fallo, reponemos el lote.", "ocupado"),
      O("precio", "Le ofrezco pagar a 60 días en lugar de 30."),
      O("humor", "Ni las grandes cadenas tienen a un Dwight revisando cada caja. Créame, es aterrador.", "bromista"),
    ],
    precio: [
      O("cercano", "No quiero presionarle. ¿Le parece si lo hablamos con su equipo?"),
      O("tecnico", "Firmamos tres meses de prueba, sin permanencia.", "ocupado"),
      O("precio", "Último esfuerzo: un 5% extra si sube un poco el pedido."),
      O("humor", "Si dice que no, Michael se pondrá triste. Y nadie quiere eso. Créame."),
    ],
    humor: [
      O("cercano", "Vale, me pongo serio: me importa que esto le funcione.", "amable"),
      O("tecnico", "Le dejo referencias de tres clientes de Scranton satisfechos."),
      O("precio", "Y si me da una oportunidad, el primer mes con un 15% menos.", "tacano"),
      O("humor", "¿Y si le digo que el papel reciclado salva árboles y también mi trabajo?", "bromista"),
    ],
  },
  4: {
    cercano: [
      O("cercano", "¿Le parece si empezamos con un pedido pequeño y vamos viendo?", "amable"),
      O("tecnico", "Le envío el contrato por fax ahora y lo revisa con calma."),
      O("precio", "¿Cerramos hoy con el descuento aplicado?"),
      O("humor", "¿Choque de manos telefónico? Yo ya he levantado la mía."),
    ],
    tecnico: [
      O("cercano", "¿Puedo contar con usted como cliente?"),
      O("tecnico", "Le confirmo: 40 cajas, entrega el lunes, factura a 30 días. ¿Correcto?", "ocupado"),
      O("precio", "Con ese ahorro anual, ¿firmamos hoy?", "tacano"),
      O("humor", "Diga «sí» y le quito el «quizás» de encima."),
    ],
    precio: [
      O("cercano", "Me alegraría mucho trabajar con ustedes. ¿Lo hacemos?"),
      O("tecnico", "Le paso la propuesta formal con todas las cifras. ¿Firmamos?"),
      O("precio", "Precio cerrado, sin sorpresas. ¿Trato hecho?", "tacano"),
      O("humor", "Oferta válida hasta que cuelgue. Sin presión. Bueno, un poco."),
    ],
    humor: [
      O("cercano", "¿Bienvenido a la familia Dunder Mifflin?", "amable"),
      O("tecnico", "¿Le tomo los datos de envío?"),
      O("precio", "¿Lo dejamos firmado con el precio que hemos hablado?"),
      O("humor", "That's what she sai… digo, ¿cerramos el trato?", "bromista"),
    ],
  },
};

/** What the client says before each stage's options (index = stage). */
export const PROMPTS: Record<Personality, string[]> = {
  amable: [
    "",
    "Pues mire, la verdad es que estamos contentos, pero siempre se puede mejorar.",
    "Ajá, entiendo. ¿Y ustedes qué me podrían ofrecer?",
    "Me sabe un poco mal por nuestro proveedor de siempre. Llevamos años con ellos.",
    "Bueno… me está convenciendo usted, ¿eh?",
  ],
  tacano: [
    "",
    "Gastamos demasiado en papel. Demasiado. ¿Y qué?",
    "Vale. Hábleme de números. Números pequeños.",
    "Sigue pareciéndome caro. En Staples me lo dejan más barato.",
    "Mm. Puede que esté dispuesto a hablar de cerrar algo.",
  ],
  ocupado: [
    "",
    "Al grano: ¿qué necesita saber de nosotros?",
    "Bien. ¿Qué propone exactamente?",
    "No tengo tiempo para cambiar de proveedor ahora mismo.",
    "Me queda un minuto. ¿Cerramos o no?",
  ],
  bromista: [
    "",
    "¡Ja! Me cae bien. A ver, ¿qué quiere saber?",
    "Vale, vale, pero ¿qué tiene de especial su papel? ¿Cuenta chistes?",
    "Me cae genial, pero ¿y si me arrepiento? ¿Me devuelven la risa?",
    "Venga, que me lo estoy pasando bien. ¿Cómo cerramos esto?",
  ],
};

export type FitBucket = "good" | "ok" | "bad";

export const REACTIONS: Record<Personality, Record<FitBucket, string[]>> = {
  amable: {
    good: ["¡Ay, qué agradable es usted! Me gusta hablar así.", "Eso me da mucha confianza, la verdad.", "Qué majo. Así da gusto."],
    ok: ["Ya veo, ya.", "Entiendo. Siga, siga.", "Mm, de acuerdo."],
    bad: ["Bueno… no hace falta hablar tanto de dinero, ¿eh?", "Uy, eso suena un poco frío.", "No sé yo… parece usted un vendedor de esos."],
  },
  tacano: {
    good: ["Eso ya me gusta más. Siga hablando de ahorrar.", "Interesante. Muy interesante.", "Ahora sí nos entendemos."],
    ok: ["Ya. ¿Y eso cuánto me cuesta?", "Vale. Siga.", "Mm. Sin más."],
    bad: ["No le pago para que me haga reír. No le pago, de hecho.", "Eso no me ahorra ni un centavo.", "Está gastando mi tiempo. Y el tiempo es dinero."],
  },
  ocupado: {
    good: ["Bien. Claro y concreto. Siga.", "Eso es exactamente lo que necesitaba oír.", "Perfecto. Sin rodeos."],
    ok: ["Ajá. ¿Algo más?", "De acuerdo. Rápido.", "Vale, vale."],
    bad: ["No tengo tiempo para charlas.", "¿Podemos ir al grano, por favor?", "*suspira* Le quedan treinta segundos."],
  },
  bromista: {
    good: ["¡JA! ¡Me encanta! ¡Usted es de los míos!", "¡Ja, ja! Esto es lo mejor que me ha pasado hoy.", "¡Genial! Siga, siga."],
    ok: ["Je. Vale, vale.", "Bueno, no está mal.", "Ajá, ¿y qué más?"],
    bad: ["Uf, qué serio todo. Me estoy durmiendo.", "Esto parece una auditoría…", "¿Me está leyendo un manual?"],
  },
};

export const HANGUPS: Record<Personality, string> = {
  amable: "Lo siento, de verdad, pero creo que no es el momento. ¡Que tenga un buen día!",
  tacano: "Demasiado caro. Adiós. *clic*",
  ocupado: "Se acabó el tiempo. *clic*",
  bromista: "Qué aburrimiento, colega. Llame cuando sea divertido. *clic*",
};

export const START_INTEREST = 4;
export const MAX_INTEREST = 10;

export interface SaleStep {
  stage: number;
  option: SaleOption;
  delta: number;
}

/** Interest change for picking `option`, given previous approaches. */
export function scoreOption(personality: Personality, option: SaleOption, history: Approach[]): number {
  let d = FIT[personality][option.approach];
  if (option.bonus === personality) d += 1;
  const n = history.length;
  if (n >= 2 && history[n - 1] === option.approach && history[n - 2] === option.approach) d -= 2;
  return d;
}

export function bucketFor(delta: number): FitBucket {
  if (delta >= 2) return "good";
  if (delta >= 0) return "ok";
  return "bad";
}

export function optionsFor(stage: number, prev: Approach | null): SaleOption[] {
  if (stage === 0 || !prev) return OPENING;
  return TREE[stage]?.[prev] ?? OPENING;
}

export type SaleOutcome = { kind: "big" | "sale" | "small" | "none"; amount: number };

export function outcomeFor(interest: number, budget: number, bonus = 1): SaleOutcome {
  if (interest >= 9) return { kind: "big", amount: Math.round(budget * 1.25 * bonus) };
  if (interest >= 7) return { kind: "sale", amount: Math.round(budget * bonus) };
  if (interest >= 5) return { kind: "small", amount: Math.round(budget * 0.45 * bonus) };
  return { kind: "none", amount: 0 };
}
