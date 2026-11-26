import type { EpisodeDef, EventId, MissionDef, MissionStep } from "../types";
import { t } from "../time";
import { charById } from "./characters";

export interface DailyGoalSpec {
  dayNumber: number;
  rankTitle: string;
  headline: string;
  why: string;
  targetRep: number;
  targetSales: number;
  targetMissions: number;
}

export const RECENT_EVENT_MAX = 12;

export function careerRankFor(careerRep: number, careerSales: number, dayNumber: number): string {
  if (dayNumber <= 1 && careerRep < 10 && careerSales < 2) return "Temporal en pruebas";
  if (careerRep >= 55 && careerSales >= 10) return "Subdirector Regional (A.T.R.M.)";
  if (careerRep >= 34 && careerSales >= 6) return "Favorito de Michael";
  if (careerRep >= 18 && careerSales >= 3) return "Vendedor Senior";
  return "Vendedor Junior";
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(items: T[], seedInput: string): T[] {
  const arr = [...items];
  let s = hashSeed(seedInput) || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function buildDailyGoal(opts: {
  dayNumber: number;
  episode: EpisodeDef | null;
  eventId: EventId | null;
  eventName: string | null;
  recentEvents: string[];
  careerRep: number;
  careerSales: number;
}): DailyGoalSpec {
  const { dayNumber, episode, eventId, eventName, recentEvents, careerRep, careerSales } = opts;
  const rankTitle = careerRankFor(careerRep, careerSales, dayNumber);

  const targetRep = dayNumber === 1 ? 7 : Math.min(18, 6 + dayNumber * 2);
  const targetSales = eventId ? 1 : dayNumber === 1 ? 2 : Math.min(4, 1 + Math.ceil(dayNumber / 2));
  const targetMissions = dayNumber === 1 ? 3 : Math.min(5, 2 + Math.floor(dayNumber / 2));

  const lastEv = recentEvents[0];
  let why: string;
  if (episode) {
    why = `${episode.epLabel} («${episode.title}»): cumple la cuota antes de las 17:00 mientras sobrevives al caos de la sucursal.`;
  } else if (eventName) {
    why = `Hoy se celebra ${eventName}: demuestra a Michael y Jan que puedes cumplir metas incluso en día de fiesta.`;
  } else if (lastEv) {
    why = `Tras lo ocurrido («${lastEv.slice(0, 72)}»), toca demostrar tu valía en Scranton antes del cierre.`;
  } else if (dayNumber === 1) {
    why =
      "Tu primer día en Scranton: preséntate a Michael, ayuda al equipo y cierra ventas desde tu mesa antes de las 17:00.";
  } else {
    why = `Jornada ${dayNumber} en Dunder Mifflin: mantén el ritmo de ventas y resuelve los nuevos imprevistos del equipo.`;
  }

  return {
    dayNumber,
    rankTitle,
    headline: `Día ${dayNumber} (${rankTitle}): ${targetSales} ventas · ${targetMissions} encargos · ${targetRep} ★`,
    why,
    targetRep,
    targetSales,
    targetMissions,
  };
}

interface ProceduralTemplate {
  key: string;
  giver: string;
  title: string;
  offer: string;
  desc: string;
  steps: MissionStep[];
  reward: { rep: number; money?: number };
  doneLine: string;
  minTime?: number;
  /** Keyword in recentEvents that unlocks/prioritizes this reactive mission. */
  triggerKeyword?: RegExp;
}

const REACTIVE_TEMPLATES: ProceduralTemplate[] = [
  {
    key: "react_prank_toby",
    giver: "toby",
    triggerKeyword: /broma|gelatina|lanzacohete|grapa/i,
    title: "Acta anti-bromas",
    offer:
      "Después de la última broma en la oficina, la central me pide un formulario firmado de convivencia. ¿Se lo pasas a Michael?",
    desc: "Coge el formulario en el anexo y consigue que Michael o Dwight lo revisen.",
    steps: [
      {
        kind: "object",
        target: "form",
        gives: "form",
        text: "Recoge el formulario de convivencia (anexo)",
        found: "Toby ha puesto un sello enorme de «URGENTE».",
      },
      {
        kind: "talk",
        target: "michael",
        needs: "form",
        text: "Entrégaselo a Michael",
        line: "¿Otro papel de Toby por lo de la broma? Toma, diles que todo fue «trabajo en equipo».",
      },
    ],
    reward: { rep: 4, money: 15 },
    doneLine: "Toby archiva el parte (durará cinco minutos).",
  },
  {
    key: "react_prank_jim",
    giver: "jim",
    triggerKeyword: /broma|gelatina|lanzacohete|grapa/i,
    title: "Operación Post-Broma",
    offer:
      "Dwight sigue paranoico desde el último incidente. Ve a por algo dulce de la nevera para despistarle y vigila cómo reacciona.",
    desc: "Coge gelatina de la nevera y habla con Jim.",
    steps: [
      {
        kind: "object",
        target: "jello",
        gives: "jello",
        text: "Coge gelatina de la nevera",
        found: "Limón clásico. Ya solo ver el envase pone nervioso a Dwight.",
      },
      {
        kind: "talk",
        target: "jim",
        needs: "jello",
        text: "Llévasela a Jim",
        line: "Solo tener esto sobre la mesa va a hacerle sudar toda la tarde.",
      },
    ],
    reward: { rep: 3, money: 10 },
    doneLine: "Jim sonríe a cámara.",
  },
  {
    key: "react_meeting_michael",
    giver: "michael",
    triggerKeyword: /reuni[oó]n|mano|conferencias|seminario/i,
    title: "Seguimiento de tu discurso",
    offer:
      "Tu intervención en la sala de reuniones me inspiró. Revisa la pizarra y cierra una venta para demostrar que el equipo está motivado.",
    desc: "Revisa la pizarra de reuniones, cierra 1 venta y avisa a Michael.",
    steps: [
      {
        kind: "object",
        target: "whiteboard",
        text: "Revisa la pizarra de la sala de reuniones",
        found: "Michael ha escrito tu frase motivadora subrayada en rojo.",
      },
      { kind: "sales", count: 1, text: "Cierra 1 venta para respaldar la reunión" },
      {
        kind: "talk",
        target: "michael",
        text: "Informa a Michael",
        line: "¡ESO es liderazgo! Igual te nombro vicepresidente de entusiasmo.",
      },
    ],
    reward: { rep: 4, money: 25 },
    doneLine: "Michael está eufórico con los resultados.",
  },
  {
    key: "react_sales_jan",
    giver: "jan",
    triggerKeyword: /venta|dinero|cliente|cuota/i,
    title: "Auditoría tras tu racha",
    offer:
      "En Nueva York han visto tus últimas ventas. Imprime el balance actual y confirma los números antes de las 15:00.",
    desc: "Imprime el informe en fotocopias y entrégaselo a Jan (o a Oscar).",
    steps: [
      {
        kind: "object",
        target: "report",
        gives: "report",
        text: "Recoge el informe impreso (fotocopias)",
        found: "Las gráficas suben por primera vez este trimestre.",
      },
      {
        kind: "talk",
        target: "jan",
        needs: "report",
        text: "Entrega el informe a Jan",
        line: "Bien. No dejes que Michael se atribuya todo el mérito.",
      },
    ],
    reward: { rep: 5, money: 35 },
    doneLine: "La central toma nota de tu rendimiento.",
  },
  {
    key: "react_gossip_kelly",
    giver: "kelly",
    triggerKeyword: /cotille|rumor|pasillo|ping-pong|dundie/i,
    title: "Edición especial de chismes",
    offer:
      "Todo el mundo comenta lo último que ha pasado aquí. Escucha 2 conversaciones nuevas y tráeme un refresco mientras me pones al día.",
    desc: "Escucha 2 charlas, compra un refresco en la máquina y habla con Kelly.",
    steps: [
      { kind: "gossip", count: 2, text: "Escucha 2 conversaciones en la oficina" },
      {
        kind: "talk",
        target: "kelly",
        needs: "soda",
        text: "Lleva un refresco y los cotilleos a Kelly",
        line: "¡OMG! Esto supera todo lo de ayer. Dame el refresco, me muero.",
      },
    ],
    reward: { rep: 4 },
    doneLine: "Kelly ya tiene tema para toda la semana.",
  },
];

const ROTATING_DAY_TEMPLATES: ProceduralTemplate[] = [
  {
    key: "rot_pam_pen",
    giver: "pam",
    title: "Inventario de recepción",
    offer:
      "Alguien se ha llevado todos los bolis buenos y me he quedado sin nada para los mensajes. ¿Me traes un bolígrafo y una taza limpia?",
    desc: "Recoge un bolígrafo en recepción y llévaselo a Pam.",
    steps: [
      {
        kind: "object",
        target: "pen",
        gives: "pen",
        text: "Recoge el bolígrafo de repuesto en recepción",
        found: "El boli azul favorito de Pam, escondido tras el teléfono.",
      },
      {
        kind: "talk",
        target: "pam",
        needs: "pen",
        text: "Dáselo a Pam",
        line: "¡Lo había dado por perdido! Dwight dijo que era material clasificado.",
      },
    ],
    reward: { rep: 3 },
    doneLine: "Recepción vuelve a estar operativa.",
  },
  {
    key: "rot_dwight_drill",
    giver: "dwight",
    title: "Inspección del muelle",
    offer:
      "Sospecho actividad no autorizada en el almacén. Inspecciona la caja de papel perdida, déjala en expedición e infórmame.",
    desc: "Mueve la caja de papel al muelle de expedición e informa a Dwight.",
    steps: [
      {
        kind: "object",
        target: "paper_box",
        gives: "paper_box",
        text: "Recoge la caja sospechosa del almacén",
        found: "Solo es papel A4 de 80 gramos… o eso quiere hacernos creer.",
      },
      {
        kind: "object",
        target: "dock",
        text: "Comprueba el muelle de carga",
        found: "Zona asegurada. Ningún intruso de Vance Refrigeration a la vista.",
      },
      {
        kind: "talk",
        target: "dwight",
        text: "Informa a Dwight",
        line: "Excelente perímetro. Te asciendo a ayudante provisional de seguridad.",
      },
    ],
    reward: { rep: 3, money: 15 },
    doneLine: "El almacén cumple el estándar Schrute.",
  },
  {
    key: "rot_oscar_coffee",
    giver: "oscar",
    title: "Cierre de caja matinal",
    offer:
      "Me falta validar las etiquetas del último envío con las facturas de archivo. ¿Me consigues las etiquetas y las compruebas?",
    desc: "Recoge las etiquetas del almacén y entrégaselas a Oscar.",
    steps: [
      {
        kind: "object",
        target: "labels",
        gives: "labels",
        text: "Coge el rollo de etiquetas (almacén)",
        found: "Etiquetas de envío numeradas del 400 al 499.",
      },
      {
        kind: "talk",
        target: "oscar",
        needs: "labels",
        text: "Entrega las etiquetas a Oscar",
        line: "Por fin cuadran los códigos. Kevin estaba intentando leerlas al revés.",
      },
    ],
    reward: { rep: 3, money: 10 },
    doneLine: "Contabilidad respira tranquila.",
  },
  {
    key: "rot_stanley_snack",
    giver: "stanley",
    title: "Combustible de crucigrama",
    offer:
      "Sin algo dulce no llego ni al mediodía. Tráeme una barrita de la máquina y no hagas ruido al dejarla.",
    desc: "Compra una barrita en la máquina expendedora y dásela a Stanley.",
    steps: [
      {
        kind: "talk",
        target: "stanley",
        needs: "bar",
        text: "Compra una barrita (máquina expendedora) para Stanley",
        line: "Mm. Esto mejora mi martes. Ya puedes seguir con tu vida.",
      },
    ],
    reward: { rep: 3 },
    doneLine: "Stanley ha sonreído 0,2 segundos.",
  },
  {
    key: "rot_kevin_chili",
    giver: "kevin",
    title: "Patatas de emergencia",
    offer:
      "Me pasé toda la noche viendo programas de cocina y hoy necesito patatas de la máquina para pensar mejor los números.",
    desc: "Lleva unas patatas de la máquina expendedora a Kevin.",
    steps: [
      {
        kind: "talk",
        target: "kevin",
        needs: "chips",
        text: "Compra patatas (máquina) para Kevin",
        line: "¡Crujientes! Ahora mismo calculo lo que sea. Más o menos.",
      },
    ],
    reward: { rep: 2, money: 5 },
    doneLine: "Kevin vuelve a las hojas de cálculo.",
  },
  {
    key: "rot_andy_memo",
    giver: "andy",
    title: "Estrategia Cornell",
    offer:
      "¡Rit-dit-dit-do-doo! En Stamford cerrábamos acuerdos cantando. Cierra 1 venta hoy, revisa la nota de reuniones y cuéntamelo.",
    desc: "Coge la nota de la sala de reuniones, cierra 1 venta y avisa a Andy.",
    steps: [
      {
        kind: "object",
        target: "memo",
        gives: "memo",
        text: "Recoge la nota de reuniones",
        found: "Anotaciones de ventas con el escudo de Cornell dibujado al margen.",
      },
      { kind: "sales", count: 1, text: "Cierra 1 venta desde tu ordenador" },
      {
        kind: "talk",
        target: "andy",
        needs: "memo",
        text: "Informa a Andy",
        line: "¡Boom! ¡Big Tuna estaría orgulloso! Vamos a celebrarlo a capela.",
      },
    ],
    reward: { rep: 4, money: 20 },
    doneLine: "Andy te añade a su grupo vocal imaginario.",
  },
  {
    key: "rot_karen_toner",
    giver: "karen",
    title: "Impresora a toda máquina",
    offer:
      "Necesitamos imprimir presupuestos nuevos para nuestros clientes. Cambia el tóner de fotocopias antes de que se atasque todo.",
    desc: "Coge el tóner nuevo y dáselo a Karen.",
    steps: [
      {
        kind: "object",
        target: "toner",
        gives: "toner",
        text: "Coge el tóner nuevo (fotocopias)",
        found: "Cartucho XL intacto. Todavía huele a fábrica.",
      },
      {
        kind: "talk",
        target: "karen",
        needs: "toner",
        text: "Entrégaselo a Karen",
        line: "Mil gracias. Por fin alguien en Scranton que no pierde la tarde entera.",
      },
    ],
    reward: { rep: 3, money: 15 },
    doneLine: "Presupuestos listos.",
  },
  {
    key: "rot_phyllis_party",
    giver: "phyllis",
    title: "Detalles del comité",
    offer:
      "Angela ha vuelto a cambiar de opinión sobre la mesa de centro. Tráeme la caja de decoración antes de que se enfade más.",
    desc: "Coge la caja de decoración y llévasela a Phyllis.",
    steps: [
      {
        kind: "object",
        target: "party_box",
        gives: "decor",
        text: "Coge la caja de decoración (rincón fiestas)",
        found: "Servilletas beige aprobadas por Angela.",
      },
      {
        kind: "talk",
        target: "phyllis",
        needs: "decor",
        text: "Dásela a Phyllis",
        line: "Qué amable, cielo. Con esto sobrevivimos a otra reunión del comité.",
      },
    ],
    reward: { rep: 3 },
    doneLine: "Phyllis guarda las servilletas.",
  },
  {
    key: "rot_creed_misterio",
    giver: "creed",
    title: "Asunto confidencial",
    offer:
      "Oye chaval, tengo unos brotes y unos papeles en el archivador azul. Tráeme los brotes del almacén y no mires debajo de la mesa.",
    desc: "Revisa el archivador azul, recoge los brotes y dáselos a Creed.",
    steps: [
      {
        kind: "object",
        target: "files_blue",
        text: "Comprueba el archivador azul",
        found: "Hay un pasaporte caducado con la foto de Creed y otro nombre.",
      },
      {
        kind: "object",
        target: "sprouts",
        gives: "sprouts",
        text: "Coge los brotes del almacén",
        found: "Un cuenco bastante sospechoso.",
      },
      {
        kind: "talk",
        target: "creed",
        needs: "sprouts",
        text: "Entrega el cuenco a Creed",
        line: "Nadie te ha visto. Y si te vieron, no era yo.",
      },
    ],
    reward: { rep: 3 },
    doneLine: "Creed desaparece detrás del archivador.",
  },
  {
    key: "rot_darryl_sprint",
    giver: "darryl",
    title: "Ruta del almacén",
    offer:
      "Hoy el camión sale pronto. Confirma las facturas de archivo y pásame el parte en el almacén.",
    desc: "Coge las facturas de archivo y llévaselas a Darryl.",
    steps: [
      {
        kind: "object",
        target: "invoices",
        gives: "invoices",
        text: "Coge las facturas (estanterías de archivo)",
        found: "Albaranes listos para el camión de las 16:00.",
      },
      {
        kind: "talk",
        target: "darryl",
        needs: "invoices",
        text: "Llévaselas a Darryl",
        line: "Perfecto. Arriba deberían pagarte el doble por bajar las escaleras.",
      },
    ],
    reward: { rep: 3, money: 20 },
    doneLine: "Camión en ruta.",
  },
  {
    key: "rot_angela_inspector",
    giver: "angela",
    title: "Orden en la oficina",
    offer:
      "Alguien ha dejado la foto de Sprinkles mal puesta y la impresora atascada. Arregla ambas cosas con decoro.",
    desc: "Desatasca la impresora, recoge la foto en la sala de reuniones y avisa a Angela.",
    steps: [
      {
        kind: "object",
        target: "printer_jam",
        text: "Desatasca la impresora (fotocopias)",
        found: "Sacaste el atasco sin mancharte de tinta.",
      },
      {
        kind: "object",
        target: "cat_photo",
        gives: "photo",
        text: "Recoge la foto de Sprinkles",
        found: "Sprinkles te juzga desde el marco.",
      },
      {
        kind: "talk",
        target: "angela",
        needs: "photo",
        text: "Dásela a Angela",
        line: "Aceptable. Al menos tú respetas la decencia básica.",
      },
    ],
    reward: { rep: 3 },
    doneLine: "Angela guarda la foto.",
  },
  {
    key: "rot_ryan_pitch",
    giver: "ryan",
    title: "Proyecto WUPHF 0.1",
    offer:
      "Estoy preparando una presentación rompedora. Cierra 2 ventas hoy para demostrar que el papel tradicional todavía respira.",
    desc: "Cierra 2 ventas en el ordenador y habla con Ryan.",
    steps: [
      { kind: "sales", count: 2, text: "Cierra 2 ventas en tu ordenador" },
      {
        kind: "talk",
        target: "ryan",
        text: "Coméntalo con Ryan",
        line: "Interesante. Lo voy a incluir en mi dossier con una fuente minimalista.",
      },
    ],
    reward: { rep: 4, money: 20 },
    doneLine: "Ryan apunta tus cifras.",
  },
  {
    key: "rot_meredith_cup",
    giver: "meredith",
    title: "Supervivencia de tarde",
    offer:
      "Necesito una taza nueva para mi… té especial de la tarde. Si encuentras una en la sala de descanso, eres mi héroe.",
    desc: "Recoge la taza de la sala de descanso y llévasela a Meredith.",
    minTime: t("11:00"),
    steps: [
      {
        kind: "object",
        target: "mug",
        gives: "mug",
        text: "Busca la taza (sala de descanso)",
        found: "Una taza sospechosamente pegajosa.",
      },
      {
        kind: "talk",
        target: "meredith",
        needs: "mug",
        text: "Entrega la taza a Meredith",
        line: "Gracias, cariño. No preguntes qué lleva dentro.",
      },
    ],
    reward: { rep: 2 },
    doneLine: "Meredith vuelve a sonreír.",
  },
];

function isTemplateCompatible(t: ProceduralTemplate, activeSet: Set<string>): boolean {
  if (!activeSet.has(t.giver)) return false;
  for (const s of t.steps) {
    if (s.kind === "talk" && !activeSet.has(s.target)) return false;
  }
  return true;
}

function toMissionDef(id: string, tmpl: ProceduralTemplate): MissionDef {
  return {
    id,
    title: tmpl.title,
    giver: tmpl.giver,
    requires: ["intro"],
    ...(tmpl.minTime ? { minTime: tmpl.minTime } : {}),
    offer: tmpl.offer,
    desc: tmpl.desc,
    steps: tmpl.steps,
    reward: tmpl.reward,
    doneLine: tmpl.doneLine,
  };
}

export function buildDynamicDayMissions(opts: {
  dayNumber: number;
  dateISO: string;
  activeCharIds: string[];
  episode: EpisodeDef | null;
  eventId: EventId | null;
  recentEvents: string[];
  baseMissions: MissionDef[];
  epMissions: MissionDef[];
}): MissionDef[] {
  const {
    dayNumber,
    dateISO,
    activeCharIds,
    episode,
    eventId,
    recentEvents,
    baseMissions,
    epMissions,
  } = opts;
  const activeSet = new Set(activeCharIds);
  const compatible = (m: MissionDef) =>
    activeSet.has(m.giver) && m.steps.every((s) => s.kind !== "talk" || activeSet.has(s.target));

  // 1. Customize "intro" for the specific day & recent events (always keep id = "intro")
  const rawIntro = baseMissions.find((m) => m.id === "intro")!;
  const leadId = activeSet.has("michael") ? "michael" : (activeCharIds[0] ?? "michael");
  const leadFirst = charById(leadId).name.split(" ")[0];
  const lastEv = recentEvents[0];
  const intro: MissionDef =
    dayNumber <= 1 && !episode
      ? { ...rawIntro }
      : {
          ...rawIntro,
          giver: activeSet.has("pam")
            ? "pam"
            : (activeCharIds.find((id) => id !== leadId) ?? leadId),
          title: episode ? `Briefing: ${episode.epLabel}` : `Arranque del Día ${dayNumber}`,
          offer: episode
            ? `${leadFirst} está al mando hoy en «${episode.title}». Pásate a ver qué se cuece antes de empezar.`
            : lastEv
              ? `Buenos días (Día ${dayNumber}). Después de lo de «${lastEv.slice(0, 62)}», ${leadFirst} quiere poner objetivos hoy.`
              : `Buenos días, Día ${dayNumber}. ${leadFirst} tiene las nuevas metas de la sucursal listas en su despacho.`,
          desc: `Saluda a ${leadFirst} para poner en marcha el Día ${dayNumber}.`,
          steps: [
            {
              kind: "talk",
              target: leadId,
              text: `Habla con ${leadFirst} al empezar el día`,
              line:
                dayNumber > 1
                  ? `¡Bienvenido al Día ${dayNumber}! Hoy el objetivo es más serio… más o menos. ¡Habla con el equipo y cierra ventas!`
                  : `¡Aquí está! Hoy es ${episode?.title ?? "un gran día"} en Scranton. Habla con todos y a por la cuota.`,
            },
          ],
          doneLine: `Día ${dayNumber} en marcha. Cada compañero tiene encargos nuevos hoy.`,
        };

  // 2. Reactive missions based on recentEvents
  const recentText = recentEvents.join(" | ");
  const out: MissionDef[] = [intro];
  const usedGivers = new Set<string>();
  const usedObjects = new Set<string>();

  if (recentText) {
    const matchedReactive = seededShuffle(
      REACTIVE_TEMPLATES.filter(
        (rt) =>
          isTemplateCompatible(rt, activeSet) &&
          rt.triggerKeyword &&
          rt.triggerKeyword.test(recentText),
      ),
      `${dayNumber}|${dateISO}|react|${recentText}`,
    );
    for (const rt of matchedReactive.slice(0, 2)) {
      usedGivers.add(rt.giver);
      for (const s of rt.steps) if (s.kind === "object") usedObjects.add(s.target);
      out.push(toMissionDef(`dyn_ev_d${dayNumber}_${rt.key}`, rt));
    }
  }

  // 3. Episode missions & current date event missions
  for (const em of epMissions) {
    if (compatible(em)) {
      usedGivers.add(em.giver);
      out.push({ ...em });
    }
  }
  for (const evM of baseMissions.filter((m) => !!m.event && m.event === eventId && compatible(m))) {
    usedGivers.add(evM.giver);
    out.push({ ...evM });
  }

  // 4. Seeded daily mix from rotating templates + classic missions so Day 1 ≠ Day 2 ≠ Day 3
  const daySeed = `${dayNumber}|${dateISO}|${episode?.id ?? "free"}|${recentEvents.slice(0, 3).join(",")}`;
  const shuffledRotating = seededShuffle(
    ROTATING_DAY_TEMPLATES.filter(
      (t) => isTemplateCompatible(t, activeSet) && !usedGivers.has(t.giver),
    ),
    `${daySeed}|rot`,
  );

  for (const rt of shuffledRotating) {
    if (out.length >= 9) break;
    if (usedGivers.has(rt.giver)) continue;
    const objTarget = rt.steps.find((s) => s.kind === "object")?.target;
    if (objTarget && usedObjects.has(objTarget)) continue;
    usedGivers.add(rt.giver);
    if (objTarget) usedObjects.add(objTarget);
    out.push(toMissionDef(`dyn_d${dayNumber}_${rt.key}`, rt));
  }

  // Fill remaining slots from shuffled static regular pool without always taking the same fixed order
  const staticRegular = baseMissions.filter(
    (m) =>
      m.id !== "intro" && m.id !== "final" && !m.event && compatible(m) && !usedGivers.has(m.giver),
  );
  if (dayNumber === 1 && !episode && recentEvents.length === 0) {
    const jimMug = staticRegular.find((m) => m.id === "jim_mug");
    if (jimMug && !usedGivers.has("jim")) {
      usedGivers.add("jim");
      out.push({ ...jimMug });
    }
  }
  // Also preserve dependency chains (e.g. jim_prank requires jim_mug -> remap orphan chains to require ["intro"] when standalone)
  const shuffledStatic = seededShuffle(staticRegular, `${daySeed}|static`);
  for (const sm of shuffledStatic) {
    if (out.length >= 11) break;
    if (usedGivers.has(sm.giver)) continue;
    const objTarget = sm.steps.find((s) => s.kind === "object")?.target;
    if (objTarget && usedObjects.has(objTarget)) continue;
    usedGivers.add(sm.giver);
    if (objTarget) usedObjects.add(objTarget);
    const reqsOk = !sm.requires || sm.requires.every((r) => out.some((x) => x.id === r));
    out.push(reqsOk ? { ...sm } : { ...sm, requires: ["intro"] });
  }

  // 5. Final mission
  const rawFinal = baseMissions.find((m) => m.id === "final");
  if (rawFinal && compatible(rawFinal)) {
    const regCount = out.filter((m) => m.id !== "intro" && !m.event).length;
    out.push({
      ...rawFinal,
      title: dayNumber > 1 ? `Cierre del Día ${dayNumber}` : rawFinal.title,
      requiresCount: Math.min(6, Math.max(2, Math.floor(regCount * 0.45))),
    });
  }

  return out;
}
