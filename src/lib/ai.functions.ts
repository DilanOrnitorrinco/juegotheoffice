import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { asPersonality, cleanLine, normalizeOptions } from "@/game/ai";
import { charById } from "@/game/data/characters";
import { PERSONAS } from "@/game/data/personas";
import { OPENING, PROMPTS, STAGES, optionsFor } from "@/game/data/sales";

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
    const personality = asPersonality(j.personality);
    const budgetNum = Number(j.budget);
    const client = {
      company: cleanLine(j.company, 60) ?? "Cliente misterioso S.L.",
      contact: cleanLine(j.contact, 40) ?? "Sr. Smith",
      personality,
      need: cleanLine(j.need, 90) ?? "papel de oficina",
      budget: Math.round(Math.max(300, Math.min(1000, Number.isFinite(budgetNum) ? budgetNum : 500)) / 10) * 10,
      greeting: cleanLine(j.greeting, 240) ?? "¿Diga?",
    };
    return { ok: true as const, client, options: normalizeOptions(j.options, OPENING) };
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
        reaction: cleanLine(j.reaction, 200) ?? "Mm.",
        clientLine: cleanLine(j.clientLine, 220) ?? PROMPTS[client.personality][stage] ?? "",
        options: normalizeOptions(j.options, optionsFor(stage, last.approach)),
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
        messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(500) })).min(1).max(30),
        eventName: z.string().max(60).nullable(),
        clock: z.string().max(10),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env["POLLINATIONS_API_KEY"];
    if (!apiKey) return { ok: false, error: "Falta la clave de Pollinations" } satisfies Fail;
    const persona = PERSONAS[data.characterId];
    if (!persona) return { ok: false, error: "Personaje desconocido" } satisfies Fail;
    const c = charById(data.characterId);
    const system = `Eres ${c.name} (${c.role}) de The Office, en la oficina de Dunder Mifflin Scranton. ${persona}
Hablas con el empleado nuevo, que acaba de empezar. Son las ${data.clock}${data.eventName ? ` y hoy es ${data.eventName} en la oficina` : ""}.
Reglas: responde SIEMPRE en español de España, en personaje, en 1-3 frases cortas, con el humor de la serie. Nunca digas que eres una IA ni rompas el personaje. Mantén todo apto para todos los públicos. Puedes mencionar a otros compañeros (Michael, Dwight, Jim, Pam, Stanley, Angela, Kevin, Oscar, Toby…).`;
    try {
      const reply = await complete(apiKey, [{ role: "system", content: system }, ...data.messages.slice(-12)], false, 220);
      return { ok: true as const, reply: reply.slice(0, 600) };
    } catch (e) {
      console.error("aiChat", e);
      return { ok: false, error: `${c.name.split(" ")[0]} está distraído y no te ha oído. Prueba otra vez.` } satisfies Fail;
    }
  });
