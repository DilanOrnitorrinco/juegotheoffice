import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  MISSION_OBJECT_CATALOG,
  VALID_CONVO_SPOTS,
  asPersonality,
  cleanLine,
  homeSpotFor,
  normalizeChatImpact,
  normalizeDailyConvos,
  normalizeDailyMissions,
  normalizeOptions,
} from "@/game/ai";
import { CHARACTERS, charById } from "@/game/data/characters";
import { PERSONAS } from "@/game/data/personas";
import { OPENING, PROMPTS, STAGES, optionsFor } from "@/game/data/sales";
import type { EventId } from "@/game/types";

const ENDPOINT = "https://gen.pollinations.ai/v1/chat/completions";
const MODEL = "openai";

type Msg = { role: "system" | "user" | "assistant"; content: string };
type Fail = { ok: false; error: string };

async function complete(apiKey: string, messages: Msg[], json: boolean, maxTokens: number): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Pollinations request failed [${res.status}]: ${body.slice(0, 500)}`);
    throw new Error(`Pollinations ${res.status}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Respuesta vacía");
  return text;
}

function parseJson(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("JSON no encontrado");
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

const SALES_RULES = `Eres el guionista de un juego de The Office (Dunder Mifflin Scranton, empresa de papel). Todo en español de España, divertido y apto para todos los públicos.
Los 4 enfoques de venta son: "cercano" (empático, personal), "tecnico" (datos, logística, calidad), "precio" (descuentos, ahorro), "humor" (chistes al estilo The Office).
Las frases del vendedor deben ser cortas (máx. 22 palabras), distintas entre sí y propias de la etapa. Responde SOLO con JSON válido.`;

const clientSchema = z.object({
  company: z.string().max(80),
  contact: z.string().max(60),
  personality: z.enum(["amable", "tacano", "ocupado", "bromista"]),
  need: z.string().max(120),
  budget: z.number().min(0).max(5000),
  greeting: z.string().max(300),
});

export const aiSalesStart = createServerFn({ method: "POST" }).handler(async () => {
  const apiKey = process.env["POLLINATIONS_API_KEY"];
  if (!apiKey) return { ok: false, error: "Falta la clave de Pollinations" } satisfies Fail;
  try {
    const text = await complete(
      apiKey,
      [
        { role: "system", content: SALES_RULES },
        {
          role: "user",
          content: `Inventa un cliente nuevo y original de la zona de Scranton (Pensilvania) que llama o recibe una llamada de Dunder Mifflin. Formato:
{"company": "...", "contact": "Sr./Sra. ...", "personality": "amable|tacano|ocupado|bromista", "need": "qué papel necesita (frase corta)", "budget": número entre 300 y 1000, "greeting": "su primera frase al descolgar, que deje intuir su personalidad",
 "options": {"cercano": "...", "tecnico": "...", "precio": "...", "humor": "..."}}
"options" son 4 frases de APERTURA del vendedor, una por enfoque. Semilla de variedad: ${Math.floor(Math.random() * 1e6)}.`,
        },
      ],
      true,
      600,
    );
    const j = parseJson(text);
    const personality = asPersonality(j["personality"]);
    const budgetNum = Number(j["budget"]);
    const client = {
      company: cleanLine(j["company"], 60) ?? "Cliente misterioso S.L.",
      contact: cleanLine(j["contact"], 40) ?? "Sr. Smith",
      personality,
      need: cleanLine(j["need"], 90) ?? "papel de oficina",
      budget: Math.round(Math.max(300, Math.min(1000, Number.isFinite(budgetNum) ? budgetNum : 500)) / 10) * 10,
      greeting: cleanLine(j["greeting"], 240) ?? "¿Diga?",
    };
    return { ok: true as const, client, options: normalizeOptions(j["options"], OPENING) };
  } catch (e) {
    console.error("aiSalesStart", e);
    return { ok: false, error: "La IA no está disponible ahora mismo" } satisfies Fail;
  }
});

export const aiSalesTurn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        client: clientSchema,
        stage: z.number().int().min(1).max(4),
        interest: z.number().min(0).max(10),
        delta: z.number().min(-10).max(10),
        history: z
          .array(z.object({ approach: z.enum(["cercano", "tecnico", "precio", "humor"]), text: z.string().max(300), reaction: z.string().max(300).nullable() }))
          .min(1)
          .max(5),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env["POLLINATIONS_API_KEY"];
    if (!apiKey) return { ok: false, error: "Falta la clave de Pollinations" } satisfies Fail;
    const { client, stage, interest, delta, history } = data;
    const last = history[history.length - 1]!;
    const tone = delta >= 2 ? "le ha gustado mucho" : delta >= 0 ? "le deja indiferente" : "le ha molestado o aburrido";
    const transcript = history
      .map((h, i) => `Vendedor (${STAGES[i]}, enfoque ${h.approach}): «${h.text}»${h.reaction ? `\nCliente: «${h.reaction}»` : ""}`)
      .join("\n");
    try {
      const text = await complete(
        apiKey,
        [
          { role: "system", content: SALES_RULES },
          {
            role: "user",
            content: `Cliente: ${client.contact} de ${client.company}. Personalidad: ${client.personality}. Necesita: ${client.need}.
Saludo inicial: «${client.greeting}»
Conversación hasta ahora:
${transcript}
La última frase del vendedor (enfoque ${last.approach}) ${tone} al cliente. Interés actual: ${interest}/10.
Genera:
- "reaction": reacción inmediata del cliente a esa última frase (máx. 20 palabras, coherente con su personalidad y con que ${tone}).
- "clientLine": lo siguiente que dice el cliente para abrir la etapa «${STAGES[stage]}» (máx. 22 palabras).
- "options": 4 respuestas NUEVAS del vendedor para la etapa «${STAGES[stage]}», una por enfoque, que continúen lo hablado${stage === 4 ? " y que intenten cerrar la venta" : ""}.
Formato: {"reaction": "...", "clientLine": "...", "options": {"cercano": "...", "tecnico": "...", "precio": "...", "humor": "..."}}`,
          },
        ],
        true,
        600,
      );
      const j = parseJson(text);
      return {
        ok: true as const,
        reaction: cleanLine(j["reaction"], 200) ?? "Mm.",
        clientLine: cleanLine(j["clientLine"], 220) ?? PROMPTS[client.personality][stage] ?? "",
        options: normalizeOptions(j["options"], optionsFor(stage, last.approach)),
      };
    } catch (e) {
      console.error("aiSalesTurn", e);
      return { ok: false, error: "La IA no está disponible ahora mismo" } satisfies Fail;
    }
  });

export const aiChat = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        characterId: z.string().max(30),
        messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(800) })).min(1).max(40),
        eventName: z.string().max(60).nullable(),
        clock: z.string().max(10),
        memories: z.array(z.string().max(300)).max(20).optional(),
        activeCharIds: z.array(z.string().max(30)).max(40).optional(),
        episodeContext: z.string().max(800).nullable().optional(),
        speakerRole: z.string().max(100).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env["POLLINATIONS_API_KEY"];
    if (!apiKey) return { ok: false, error: "Falta la clave de Pollinations" } satisfies Fail;
    const persona = PERSONAS[data.characterId];
    if (!persona) return { ok: false, error: "Personaje desconocido" } satisfies Fail;
    const c = charById(data.characterId);
    const activeNames =
      data.activeCharIds && data.activeCharIds.length > 0
        ? CHARACTERS.filter((ch) => data.activeCharIds!.includes(ch.id))
            .map((ch) => ch.name.split(" ")[0])
            .join(", ")
        : "Michael, Dwight, Jim, Pam, Stanley, Angela, Kevin, Oscar, Toby";
    const memoryBlock =
      data.memories && data.memories.length > 0
        ? `\nMemoria persistente de lo acordado/pasado hoy con el jugador (NUNCA lo olvides aunque haya pasado la hora de comer; haz referencia a ello con naturalidad si viene al caso):\n- ${data.memories.join("\n- ")}`
        : "";
    const episodeHint = data.episodeContext ? `\nContexto del episodio actual: ${data.episodeContext}` : "";
    const role = data.speakerRole ?? c.role;
    const system = `Eres ${c.name} (${role}) de The Office, en la oficina de Dunder Mifflin Scranton. ${persona}
Hablas con el empleado nuevo, que acaba de empezar. Son las ${data.clock}${data.eventName ? ` y hoy es ${data.eventName} en la oficina` : ""}.${episodeHint}${memoryBlock}
Reglas: responde SIEMPRE en español de España, en personaje, en 1-3 frases cortas, con el humor de la serie. Nunca digas que eres una IA ni rompas el personaje. Mantén todo apto para todos los públicos. Compañeros presentes hoy en Scranton: ${activeNames}.`;
    try {
      const reply = await complete(apiKey, [{ role: "system", content: system }, ...data.messages.slice(-18)], false, 240);
      return { ok: true as const, reply: reply.slice(0, 600) };
    } catch (e) {
      console.error("aiChat", e);
      return { ok: false, error: `${c.name.split(" ")[0]} está distraído y no te ha oído. Prueba otra vez.` } satisfies Fail;
    }
  });

const dailyInputSchema = z.object({
  dateLabel: z.string().max(80),
  eventId: z.enum(["halloween", "navidad", "sanvalentin", "cumplemichael", "sanpatricio", "pretzel", "viernes"]).nullable(),
  eventName: z.string().max(60).nullable(),
  eventDesc: z.string().max(160).nullable(),
  activeCharIds: z.array(z.string().max(30)).max(40).optional(),
  episodeContext: z.string().max(800).nullable().optional(),
});

function rosterForPrompt(activeCharIds?: string[]) {
  const allowed = activeCharIds && activeCharIds.length > 0 ? new Set(activeCharIds) : null;
  const list = allowed ? CHARACTERS.filter((c) => allowed.has(c.id)) : CHARACTERS;
  const prompt = list.map((c) => `${c.id} (${c.name}, ${c.role})`).join("; ");
  const idsPrompt = list.map((c) => c.id).join(", ");
  const allowedSet = new Set(list.map((c) => c.id));
  return { prompt, idsPrompt, allowedSet };
}

export const aiDailyConvos = createServerFn({ method: "POST" })
  .inputValidator((d) => dailyInputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env["POLLINATIONS_API_KEY"];
    if (!apiKey) return { ok: false, error: "Falta la clave de Pollinations" } satisfies Fail;
    const { prompt: charListPrompt, allowedSet } = rosterForPrompt(data.activeCharIds);
    const eventHint = data.eventName
      ? `Hoy es un día especial: ${data.eventName} (${data.eventDesc}). Incluye al menos 2-3 conversaciones sobre este evento.`
      : data.episodeContext
        ? `Contexto del episodio: ${data.episodeContext}. Incluye guiños al episodio en 2-3 conversaciones.`
        : "Hoy es un día normal de oficina en Scranton.";
    try {
      const text = await complete(
        apiKey,
        [
          {
            role: "system",
            content: `Eres guionista de The Office (Dunder Mifflin Scranton) en español de España. Apto para todos los públicos, humor fiel a la serie. Responde SOLO con JSON válido.`,
          },
          {
            role: "user",
            content: `Inventa 9 conversaciones cortas y completamente nuevas que tendrán parejas de personajes hoy (${data.dateLabel}) por la oficina. ${eventHint}
Personajes presentes HOY en la oficina (usa SOLO estos ids en minúsculas): ${charListPrompt}.
Lugares válidos ("spot"): ${VALID_CONVO_SPOTS.join(", ")}.
Horarios ("at"): repártelas entre "09:20" y "16:25" (formato "HH:MM") evitando que un mismo personaje esté en dos conversaciones a la vez.
Formato JSON:
{"conversations": [
  {
    "title": "título corto de cotilleo",
    "who": ["id1", "id2"],
    "spot": "lugar_valido",
    "at": "10:15",
    "duration": 35,
    "lines": [
      {"who": "id1", "text": "frase corta máx 20 palabras"},
      {"who": "id2", "text": "respuesta..."}
    ]
  }
]}
Cada conversación debe tener entre 4 y 6 líneas alternando entre id1 e id2. Semilla de variedad: ${Math.floor(Math.random() * 1e6)}.`,
          },
        ],
        true,
        2200,
      );
      const j = parseJson(text);
      const conversations = normalizeDailyConvos(j, data.eventId as EventId | null, allowedSet);
      if (conversations.length < 3) throw new Error("Pocas conversaciones válidas");
      return { ok: true as const, conversations };
    } catch (e) {
      console.error("aiDailyConvos", e);
      return { ok: false, error: "No se pudieron generar conversaciones con IA" } satisfies Fail;
    }
  });

export const aiDailyMissions = createServerFn({ method: "POST" })
  .inputValidator((d) => dailyInputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env["POLLINATIONS_API_KEY"];
    if (!apiKey) return { ok: false, error: "Falta la clave de Pollinations" } satisfies Fail;
    const { idsPrompt, allowedSet } = rosterForPrompt(data.activeCharIds);
    const objCatalog = MISSION_OBJECT_CATALOG.map((o) => `${o.id} (${o.desc}, en ${o.place}${o.item ? `, da ítem "${o.item}"` : ""})`).join("\n- ");
    const eventHint = data.eventName ? `Hoy se celebra ${data.eventName} (${data.eventDesc}). Adapta el tono de varias misiones si encaja.` : "";
    const episodeHint = data.episodeContext ? ` Episodio actual: ${data.episodeContext}.` : "";
    try {
      const text = await complete(
        apiKey,
        [
          {
            role: "system",
            content: `Eres el diseñador de misiones de un juego de The Office (Dunder Mifflin Scranton) en español de España. Humor de la serie, apto para todos los públicos. Responde SOLO con JSON válido.`,
          },
          {
            role: "user",
            content: `Inventa 12 misiones diarias DISTINTAS (una por cada personaje que la pide, mezclando SOLO personajes presentes hoy: ${idsPrompt}) para hoy (${data.dateLabel}). ${eventHint}${episodeHint}
REGLAS ESTRICTAS:
1. Cada misión usa SOLO objetos/lugares que ya existen en la oficina:
- ${objCatalog}
- También existen snacks de máquina expendedora ("mms", "chips", "soda", "bar") que se pueden pedir en un paso "talk" con "needs".
2. Tipos de pasos permitidos en "steps":
- {"kind": "object", "target": "<id_objeto_valido>", "text": "texto corto de objetivo", "found": "frase divertida al encontrarlo/usarlo"}
- {"kind": "talk", "target": "<id_personaje_presente_hoy>", "needs": "<opcional: ítem de un objeto previo o snack>", "text": "texto corto", "line": "lo que dice ese personaje"}
- {"kind": "sales", "count": 1 o 2, "text": "Cierra X ventas en tu ordenador"}
- {"kind": "gossip", "count": 2 o 3, "text": "Escucha X conversaciones en la oficina"}
3. Usa únicamente ids presentes hoy (${idsPrompt}) tanto en "giver" como en "steps[].target" de tipo "talk".
4. Si una misión tiene paso "object" con ítem, pon después un paso "talk" al personaje que te la pidió (o a otro destinatario presente hoy) para entregarlo. No repitas el mismo "target" de objeto en dos misiones diferentes si puedes evitarlo.
5. Formato JSON:
{"missions": [
  {
    "giver": "dwight",
    "title": "Título corto",
    "offer": "Lo que dice el personaje al pedirte el encargo",
    "desc": "Resumen corto para el cuaderno",
    "minTime": "09:30" (opcional, entre "09:15" y "14:00"),
    "steps": [...],
    "reward": {"rep": 2..5, "money": 0..35},
    "doneLine": "Frase final cuando terminas"
  }
]}
Semilla de variedad: ${Math.floor(Math.random() * 1e6)}.`,
          },
        ],
        true,
        2600,
      );
      const j = parseJson(text);
      const missions = normalizeDailyMissions(j, allowedSet);
      if (missions.length < 4) throw new Error("Pocas misiones válidas");
      return { ok: true as const, missions };
    } catch (e) {
      console.error("aiDailyMissions", e);
      return { ok: false, error: "No se pudieron generar misiones con IA" } satisfies Fail;
    }
  });

export const aiChatImpact = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        characterId: z.string().max(30),
        messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(800) })).min(1).max(40),
        eventName: z.string().max(60).nullable(),
        clock: z.string().max(10),
        memories: z.array(z.string().max(300)).max(20).optional(),
        activeCharIds: z.array(z.string().max(30)).max(40).optional(),
        episodeContext: z.string().max(800).nullable().optional(),
        speakerRole: z.string().max(100).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env["POLLINATIONS_API_KEY"];
    if (!apiKey) return { ok: false, error: "Falta la clave de Pollinations" } satisfies Fail;
    const persona = PERSONAS[data.characterId];
    if (!persona) return { ok: false, error: "Personaje desconocido" } satisfies Fail;
    const c = charById(data.characterId);
    const { prompt: charListPrompt, allowedSet } = rosterForPrompt(data.activeCharIds);
    const transcript = data.messages
      .slice(-14)
      .map((m) => `${m.role === "user" ? "Empleado nuevo" : c.name}: ${m.content}`)
      .join("\n");
    const memoryHint =
      data.memories && data.memories.length > 0 ? `\nRecuerdos previos ya registrados hoy con ${c.name}: ${data.memories.join(" | ")}` : "";
    const episodeHint = data.episodeContext ? `\nEpisodio actual: ${data.episodeContext}.` : "";
    const spotList = [
      `${homeSpotFor(data.characterId)} (su sitio habitual)`,
      "seat_dwight",
      "seat_jim",
      "seat_michael",
      "seat_pam",
      ...VALID_CONVO_SPOTS,
    ].join(", ");
    try {
      const text = await complete(
        apiKey,
        [
          {
            role: "system",
            content: `Analizas una conversación libre en un juego de The Office en español de España. Decides si lo que ha dicho el jugador provoca una acción inmediata en la oficina (gastar una broma, confrontar a alguien, vigilar algo o investigar). Responde SOLO con JSON válido.`,
          },
          {
            role: "user",
            content: `Personaje con el que habló el jugador: ${c.id} (${c.name}, ${data.speakerRole ?? c.role}). Personalidad: ${persona}
Hora: ${data.clock}${data.eventName ? `. Evento hoy: ${data.eventName}` : ""}.${episodeHint}${memoryHint}
Personajes presentes HOY en la oficina: ${charListPrompt}.
Lugares válidos (behaviorSpot / prepSpot): ${spotList}.

Último tramo de la conversación:
${transcript}

Evalúa:
- Si solo ha sido un saludo, charla trivial o continuación de algo ya en marcha sin un plan nuevo concreto, responde: {"important": false}.
- Si el jugador le ha propuesto o contado algo accionable (por ejemplo: coordinar una broma contra alguien, darle un chivatazo para que confronte a un compañero, avisarle de un rumor o encargarle algo urgente):
  1. "kind": "prank" (si es una broma), "confront" (si va a encarar o hablar serio con alguien), "alert" (si se queda alerta o vigilando), o "task" (si va a hacer algo concreto).
  2. "newAction": acción corta (2-4 palabras, máx 28 chars) mientras actúa (ej: "Preparando broma", "Sentado vigilando", "Yendo a por Dwight", "En alerta máxima").
  3. "behaviorSpot": uno de los lugares válidos (ej: "${homeSpotFor(data.characterId)}").
  4. "prepSpot": OPCIONAL. Si para una broma o plan necesita pasar rápido antes por un sitio concreto (ej: "fridge" para gelatina, "copier" para fotocopias, "warehouse_a", "vending"), pon ese spot válido; si no hace falta o va directo, pon null.
  5. "summary": 1 frase breve en español para avisar al jugador (ej: "Jim va rápido a por Dwight para gastarle la broma de la grapadora.").
  6. "reactionLine": frase que dirá ${c.name} si vuelves a hablar con él/ella (máx 25 palabras).
  7. "seekTargetId": id de un personaje PRESENTE HOY distinto de "${c.id}". IMPORTANTE: si "kind" es "prank" o "confront", pon SIEMPRE un "seekTargetId" válido y presente hoy y sus líneas, para que ejecute la broma enseguida en lugar de quedarse quieto en su mesa.
  8. "targetAction": OPCIONAL (máx 28 chars). Lo que hará brevemente la víctima justo después (ej: "Buscando su grapadora", "Desconfiando de Jim", "Revisando su mesa"), o null.
  9. "convoTitle": título corto para la escena/conversación en vivo.
  10. "convoLines": 4-6 líneas [{"who": "${c.id}" o seekTargetId, "text": "..."}] de la ejecución de la broma o conversación cuando se encuentren en vivo.

Formato:
{"important": true, "kind": "prank", "summary": "...", "newAction": "...", "behaviorSpot": "...", "prepSpot": null, "reactionLine": "...", "seekTargetId": "dwight", "targetAction": "...", "convoTitle": "...", "convoLines": [{"who": "...", "text": "..."}]}`,
          },
        ],
        true,
        900,
      );
      const j = parseJson(text);
      return { ok: true as const, impact: normalizeChatImpact(j, data.characterId, allowedSet) };
    } catch (e) {
      console.error("aiChatImpact", e);
      return { ok: false, error: "No se pudo analizar el impacto de la charla" } satisfies Fail;
    }
  });
