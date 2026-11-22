import { describe, expect, it } from "vitest";

import { eventForDate, parseLocalDate } from "@/game/data/events";
import { APPROACHES, OPENING, TREE, optionsFor, outcomeFor, scoreOption } from "@/game/data/sales";
import { Game } from "@/game/engine/game";

describe("sales decision tree", () => {
  it("offers exactly 4 options, one per approach, at every node", () => {
    const nodes = [OPENING, ...[1, 2, 3, 4].flatMap((s) => APPROACHES.map((a) => TREE[s]![a]))];
    expect(nodes).toHaveLength(17);
    for (const n of nodes) {
      expect(n).toHaveLength(4);
      expect(new Set(n.map((o) => o.approach)).size).toBe(4);
    }
  });

  it("each choice leads to a different set of 4 options", () => {
    const texts = APPROACHES.map((a) => optionsFor(1, a).map((o) => o.text).join("|"));
    expect(new Set(texts).size).toBe(4);
  });

  it("repeating the same approach three times in a row is penalised", () => {
    const opt = { approach: "precio" as const, text: "x" };
    expect(scoreOption("tacano", opt, [])).toBe(2);
    expect(scoreOption("tacano", opt, ["precio", "precio"])).toBe(0);
  });

  it("needs at least 5 interest to sell", () => {
    expect(outcomeFor(4, 1000).amount).toBe(0);
    expect(outcomeFor(5, 1000).amount).toBeGreaterThan(0);
  });
});

describe("special dates", () => {
  it("31 October is Halloween", () => {
    expect(eventForDate(parseLocalDate("2026-10-31"))?.id).toBe("halloween");
  });
  it("an ordinary Wednesday has no event", () => {
    expect(eventForDate(parseLocalDate("2026-11-11"))).toBeNull();
  });
});

describe("missions are locked until someone asks", () => {
  it("only the intro is active at the start and no mission object is usable", () => {
    const g = new Game();
    g.start("2026-11-11");
    expect(g.missionStatus["intro"]).toBe("active");
    expect(g.missionStatus["jim_mug"]).toBe("locked");
    expect(g.offerFor("jim")).toBeNull();
    expect(g.targetedObjects().size).toBe(0);
  });

  it("event missions only exist on their date", () => {
    const normal = new Game();
    normal.start("2026-11-11");
    expect(normal.getSnapshot().missions.some((m) => m.id === "ev_costume")).toBe(false);
    const hw = new Game();
    hw.start("2026-10-31");
    expect(hw.getSnapshot().missions.some((m) => m.id === "ev_costume")).toBe(true);
  });
});

describe("AI sales calls keep the 4-option tree", () => {
  it("always yields exactly 4 options, one per approach, even if the AI returns junk", async () => {
    const { normalizeOptions } = await import("@/game/ai");
    const fromAi = normalizeOptions({ cercano: "Hola", humor: "Chiste", precio: 42 }, OPENING);
    expect(fromAi.map((o) => o.approach)).toEqual(APPROACHES);
    expect(fromAi[0]!.text).toBe("Hola");
    expect(fromAi[2]!.text).toBe(OPENING.find((o) => o.approach === "precio")!.text);
    expect(normalizeOptions(null, OPENING)).toHaveLength(4);
  });

  it("free chat is offered in conversations only when the AI is available", () => {
    const g = new Game();
    g.start("2026-11-11");
    const labels = () => (g as unknown as { npcOptions(id: string): { tag: string }[] }).npcOptions("jim").map((o) => o.tag);
    expect(labels()).not.toContain("chat");
    g.ai = {
      salesStart: async () => ({ client: {} as never, options: [] }),
      salesTurn: async () => ({ reaction: "", clientLine: "", options: [] }),
      chat: async () => "",
      dailyConvos: async () => [],
      dailyMissions: async () => [],
      chatImpact: async () => ({
        important: false,
        summary: "",
        newAction: "",
        behaviorSpot: "seat_jim",
        reactionLine: "",
        seekTargetId: null,
        convoTitle: "",
        convoLines: [],
      }),
    };
    expect(labels()).toContain("chat");
  });
});

describe("AI daily conversations, missions, and chat impact", () => {
  it("normalizes daily conversations and missions with valid characters and office objects", async () => {
    const { normalizeDailyConvos, normalizeDailyMissions, normalizeChatImpact } = await import("@/game/ai");
    const convos = normalizeDailyConvos(
      {
        conversations: [
          {
            title: "Jim y Dwight sobre osos",
            who: ["jim", "dwight"],
            spot: "coffee",
            at: "10:15",
            duration: 35,
            lines: [
              { who: "jim", text: "¿Qué oso es mejor?" },
              { who: "dwight", text: "El oso negro. Sin discusión." },
              { who: "jim", text: "Falso." },
            ],
          },
          {
            title: "Inválida",
            who: ["nobody", "dwight"],
            spot: "coffee",
            at: "10:15",
            lines: [],
          },
        ],
      },
      null,
    );
    expect(convos).toHaveLength(1);
    expect(convos[0]!.who).toEqual(["jim", "dwight"]);

    const missions = normalizeDailyMissions({
      missions: [
        {
          giver: "dwight",
          title: "Remolachas secretas",
          offer: "Tráeme las remolachas del almacén.",
          desc: "Recoge remolachas y dáselas a Dwight.",
          steps: [
            { kind: "object", target: "beets", text: "Recoge las remolachas", found: "Huelen fuerte." },
            { kind: "talk", target: "dwight", needs: "beets", text: "Dáselas a Dwight", line: "Bien hecho." },
          ],
          reward: { rep: 3 },
          doneLine: "Listo.",
        },
        {
          giver: "jim",
          title: "Objeto inexistente",
          offer: "Busca un unicornio",
          desc: "No existe",
          steps: [{ kind: "object", target: "unicorn", text: "Buscar", found: "Nada" }],
          reward: { rep: 2 },
          doneLine: "Fin",
        },
      ],
    });
    expect(missions).toHaveLength(1);
    expect(missions[0]!.giver).toBe("dwight");
    expect(missions[0]!.requires).toEqual(["intro"]);

    const impact = normalizeChatImpact(
      {
        important: true,
        summary: "Dwight vigila por el lanzacohetes",
        newAction: "Sentado vigilando",
        behaviorSpot: "seat_dwight",
        reactionLine: "¡Jim no me pillará desprevenido!",
        seekTargetId: "jim",
        convoTitle: "Dwight confronta a Jim",
        convoLines: [
          { who: "dwight", text: "Sé lo del lanzacohetes, Jim." },
          { who: "jim", text: "¿Un lanzacohetes? Eso es ridículo." },
        ],
      },
      "dwight",
    );
    expect(impact.important).toBe(true);
    expect(impact.seekTargetId).toBe("jim");
    expect(impact.convoLines).toHaveLength(2);
  });

  it("replaces pending conversations and locked regular missions when AI responds, keeping AI missions locked", async () => {
    const g = new Game();
    g.ai = {
      salesStart: async () => ({ client: {} as never, options: [] }),
      salesTurn: async () => ({ reaction: "", clientLine: "", options: [] }),
      chat: async () => "",
      dailyConvos: async () => [
        {
          id: "ai_c1",
          title: "Kevin y Oscar hablan de chili",
          who: ["kevin", "oscar"],
          spot: "kitchen_mid",
          at: 600,
          duration: 30,
          lines: [
            { who: "kevin", text: "Traje chili." },
            { who: "oscar", text: "Por favor no en la alfombra." },
            { who: "kevin", text: "Demasiado tarde." },
          ],
        },
        {
          id: "ai_c2",
          title: "Pam y Jim hablan de acuarelas",
          who: ["pam", "jim"],
          spot: "reception_front",
          at: 640,
          duration: 30,
          lines: [
            { who: "pam", text: "He pintado la oficina." },
            { who: "jim", text: "Te quedó mejor que la real." },
            { who: "pam", text: "Eso seguro." },
          ],
        },
        {
          id: "ai_c3",
          title: "Michael y Toby hablan de normas",
          who: ["michael", "toby"],
          spot: "michael_visit",
          at: 680,
          duration: 30,
          lines: [
            { who: "toby", text: "Michael, el formulario." },
            { who: "michael", text: "No." },
            { who: "toby", text: "Vale." },
          ],
        },
      ],
      dailyMissions: async () => [
        {
          id: "ai_m1",
          title: "Misión IA de Dwight",
          giver: "dwight",
          requires: ["intro"],
          offer: "Revisa la pizarra.",
          desc: "Inspecciona la pizarra.",
          steps: [{ kind: "object", target: "whiteboard", text: "Revisa la pizarra", found: "Plan de defensa." }],
          reward: { rep: 3 },
          doneLine: "Bien.",
        },
        {
          id: "ai_m2",
          title: "Misión IA de Jim",
          giver: "jim",
          requires: ["intro"],
          offer: "Coge la gelatina.",
          desc: "Gelatina.",
          steps: [{ kind: "object", target: "jello", gives: "jello", text: "Coge gelatina", found: "Limón." }],
          reward: { rep: 2 },
          doneLine: "Genial.",
        },
        {
          id: "ai_m3",
          title: "Misión IA de Pam",
          giver: "pam",
          requires: ["intro"],
          offer: "Coge el bolígrafo.",
          desc: "Bolígrafo.",
          steps: [{ kind: "object", target: "pen", gives: "pen", text: "Coge el boli", found: "Azul." }],
          reward: { rep: 2 },
          doneLine: "Gracias.",
        },
        {
          id: "ai_m4",
          title: "Misión IA de Stanley",
          giver: "stanley",
          requires: ["intro"],
          offer: "Tráeme café.",
          desc: "Taza.",
          steps: [{ kind: "object", target: "mug", gives: "mug", text: "Coge la taza", found: "Caliente." }],
          reward: { rep: 2 },
          doneLine: "Mm.",
        },
      ],
      chatImpact: async () => ({
        important: false,
        summary: "",
        newAction: "",
        behaviorSpot: "seat_dwight",
        reactionLine: "",
        seekTargetId: null,
        convoTitle: "",
        convoLines: [],
      }),
    };
    g.start("2026-11-11");
    await new Promise((r) => setTimeout(r, 10));
    expect(g.convos.some((c) => c.def.id === "ai_c1")).toBe(true);
    expect(g.missionStatus["ai_m1"]).toBe("locked");
    expect(g.missions.some((m) => m.id === "ai_m1")).toBe(true);
    expect(g.targetedObjects().size).toBe(0);
  });

  it("changes NPC behavior, seeks the other character, and shows speech bubbles after important free chat", async () => {
    const g = new Game();
    g.ai = {
      salesStart: async () => ({ client: {} as never, options: [] }),
      salesTurn: async () => ({ reaction: "", clientLine: "", options: [] }),
      chat: async () => "¡¿Un lanzacohetes?!",
      dailyConvos: async () => [],
      dailyMissions: async () => [],
      chatImpact: async () => ({
        important: true,
        summary: "Dwight vigila en su mesa y busca a Jim",
        newAction: "Sentado vigilando",
        behaviorSpot: "seat_dwight",
        reactionLine: "¡Jim no podrá usar ese lanzacohetes!",
        seekTargetId: "jim",
        convoTitle: "Dwight confronta a Jim por el lanzacohetes",
        convoLines: [
          { who: "dwight", text: "Jim, sé lo del lanzacohetes." },
          { who: "jim", text: "¿Quién te ha dicho eso?" },
        ],
      }),
    };
    g.start("2026-11-11");
    g.openChat("dwight");
    g.recordChatMessages([
      { role: "user", content: "Jim está preparando una broma con un lanzacohetes" },
      { role: "assistant", content: "¡¿Un lanzacohetes?!" },
    ]);
    g.closeChat();
    await new Promise((r) => setTimeout(r, 10));

    const dwight = g.npcs.find((n) => n.def.id === "dwight")!;
    const jim = g.npcs.find((n) => n.def.id === "jim")!;
    expect(dwight.override?.action).toBe("Sentado vigilando");
    expect(g.convos.some((c) => c.dynamic && c.seekBy === "dwight" && c.seekTarget === "jim")).toBe(true);

    // Move time forward past the 5-min reaction window and place Dwight next to Jim + player nearby
    g.mins += 6;
    dwight.x = jim.x + 40;
    dwight.y = jim.y;
    dwight.moving = false;
    jim.moving = false;
    g.player.x = jim.x;
    g.player.y = jim.y + 40;
    g.update(0.05);

    const bubbles = g.bubbles();
    expect(bubbles.length).toBeGreaterThan(0);
    expect(bubbles[0]!.muted).toBe(false);
    expect(bubbles[0]!.text).toContain("lanzacohetes");
  });
});

describe("gossip lifecycle and new office map reachability", () => {
  it("completes and removes unmonitored gossip conversations without rewarding heard gossip", () => {
    const g = new Game();
    g.start("2026-11-11");
    const c = g.convos[0]!;
    expect(c).toBeDefined();
    // Place both participants at their conversation spot (reception_front), far away from player
    const a = g.npcs.find((n) => n.def.id === c.def.who[0])!;
    const b = g.npcs.find((n) => n.def.id === c.def.who[1])!;
    g.mins = c.def.at;
    c.state = "playing";
    c.arrived = true;
    a.x = 260;
    a.y = 425;
    b.x = 300;
    b.y = 425;
    g.player.x = 1850;
    g.player.y = 620;

    // Simulate ~45 seconds without player approaching
    for (let i = 0; i < 900; i++) {
      g.update(0.05);
      if (g.convos[0]!.state === "done") break;
    }
    expect(g.convos[0]!.state).toBe("done");
    expect(g.heard).not.toContain(c.def.id);
    expect(g.bubbles().some((bub) => c.def.lines.some((l) => l.text === bub.text))).toBe(false);
  });

  it("keeps all SPOTS, OBJECTS, SERVICES, and DUNDIES reachable on the real Scranton floorplan", async () => {
    const { SPOTS, spotAt } = await import("@/game/data/map");
    const { DUNDIES, OBJECTS, SERVICES } = await import("@/game/data/objects");
    const { blockedAt } = await import("@/game/engine/collision");
    const { findPath, walkableTarget } = await import("@/game/engine/pathfinding");

    const start = spotAt("seat_player");
    expect(blockedAt(start.x, start.y, 11)).toBe(false);

    for (const [name, pos] of Object.entries(SPOTS)) {
      const target = walkableTarget(pos.x, pos.y);
      const path = findPath(start.x, start.y, target.x, target.y);
      expect(path.length, `spot ${name} at (${pos.x},${pos.y}) unreachable`).toBeGreaterThan(0);
    }
    for (const obj of OBJECTS) {
      const target = walkableTarget(obj.x, obj.y);
      const path = findPath(start.x, start.y, target.x, target.y);
      expect(path.length, `object ${obj.id} unreachable`).toBeGreaterThan(0);
      expect(Math.hypot(target.x - obj.x, target.y - obj.y), `object ${obj.id} too far from walkable tile`).toBeLessThan(50);
    }
    for (const svc of SERVICES) {
      const target = walkableTarget(svc.x, svc.y);
      const path = findPath(start.x, start.y, target.x, target.y);
      expect(path.length, `service ${svc.id} unreachable`).toBeGreaterThan(0);
      expect(Math.hypot(target.x - svc.x, target.y - svc.y), `service ${svc.id} outside interaction radius`).toBeLessThan(svc.radius);
    }
    for (const d of DUNDIES) {
      const target = walkableTarget(d.x, d.y);
      const path = findPath(start.x, start.y, target.x, target.y);
      expect(path.length, `dundie ${d.id} unreachable`).toBeGreaterThan(0);
      expect(Math.hypot(target.x - d.x, target.y - d.y), `dundie ${d.id} blocked`).toBeLessThan(40);
    }
  });
});

describe("persistent chat log, character memory across lunch, and efficient pranks", () => {
  it("persists chat history and memories across reopen and after lunch while completing pranks swiftly", async () => {
    const g = new Game();
    g.ai = {
      salesStart: async () => ({ client: {} as never, options: [] }),
      salesTurn: async () => ({ reaction: "", clientLine: "", options: [] }),
      chat: async () => "¡Hecho! Voy a meter su grapadora en gelatina.",
      dailyConvos: async () => [],
      dailyMissions: async () => [],
      chatImpact: async () => ({
        important: true,
        kind: "prank",
        summary: "Jim va a gastar la broma de la gelatina a Dwight",
        newAction: "Coordinando broma",
        behaviorSpot: "seat_jim",
        prepSpot: "fridge",
        reactionLine: "En nada verás la cara de Dwight cuando abra su cajón.",
        seekTargetId: "dwight",
        targetAction: "Buscando grapadora",
        convoTitle: "La grapadora en gelatina",
        convoLines: [
          { who: "jim", text: "Dwight, ¿has visto tu grapadora?" },
          { who: "dwight", text: "¡¿Por qué está dentro de una gelatina, JIM?!" },
        ],
      }),
    };
    g.start("2026-11-11");

    // Chat before lunch (11:45)
    g.mins = 11 * 60 + 45;
    g.openChat("jim");
    g.appendChatMessage("jim", { role: "user", content: "Pon la grapadora de Dwight en gelatina" });
    g.appendChatMessage("jim", { role: "assistant", content: "¡Hecho! Voy a meter su grapadora en gelatina." });
    g.closeChat();
    await new Promise((r) => setTimeout(r, 10));

    const jim = g.npcs.find((n) => n.def.id === "jim")!;
    const dwight = g.npcs.find((n) => n.def.id === "dwight")!;
    expect(g.memories["jim"]).toHaveLength(1);
    expect(g.memories["jim"]![0]!.status).toBe("en_marcha");

    // Advance slightly so convo activates, complete prep at fridge, then place near Dwight
    g.mins += 1;
    const prankConvo = g.convos.find((c) => c.dynamic && c.seekBy === "jim" && c.seekTarget === "dwight")!;
    expect(prankConvo).toBeDefined();
    expect(prankConvo.prepDone).toBe(false);
    // Simulate reaching fridge (prep timer / position)
    const { spotAt } = await import("@/game/data/map");
    const fridge = spotAt("fridge");
    jim.x = fridge.x;
    jim.y = fridge.y;
    jim.moving = false;
    g.update(0.05);
    expect(prankConvo.prepDone).toBe(true);

    // Execute prank next to Dwight
    jim.x = dwight.x + 42;
    jim.y = dwight.y;
    jim.moving = false;
    dwight.moving = false;
    g.player.x = dwight.x;
    g.player.y = dwight.y + 40;
    const repBefore = g.rep;

    for (let i = 0; i < 400; i++) {
      g.update(0.05);
      if (prankConvo.state === "done") break;
    }
    expect(prankConvo.state).toBe("done");
    // "Coordinando broma" override cleared on completion!
    expect(jim.override).toBeUndefined();
    expect(g.memories["jim"]![0]!.status).toBe("completada");
    expect(g.rep).toBeGreaterThanOrEqual(repBefore + 1);
    expect(dwight.override?.action).toBe("Buscando grapadora");

    // Advance past lunch (13:30) — Dwight's brief override expires, but both chat history and memories persist!
    g.mins = 13 * 60 + 30;
    g.update(0.05);
    expect(dwight.override).toBeUndefined();

    // Talking to Jim after lunch references the remembered prank instead of forgetting it
    g.interact = Game.prototype.interact;
    (g as unknown as { openTalk(id: string): void }).openTalk("jim");
    expect(g.getSnapshot().dialog?.line).toContain("Me acuerdo de lo de hoy");

    // Reopening FreeChat keeps all user, assistant, and note entries plus memories
    g.openChat("jim");
    const snap = g.getSnapshot();
    expect(snap.chat?.history.some((e) => e.role === "user" && e.content.includes("gelatina"))).toBe(true);
    expect(snap.chat?.history.some((e) => e.role === "note" && e.content.includes("Broma ejecutada"))).toBe(true);
    expect(snap.chat?.memories).toHaveLength(1);
    expect(snap.chatRecords.some((r) => r.id === "jim" && r.messages.length >= 4)).toBe(true);
  });
});

describe("seasons and canon episodes (T1 through T4·E01)", () => {
  it("loads authentic cast headcounts, arrivals/departures, and desk overrides across S1–S4E01", async () => {
    const { EPISODES } = await import("@/game/data/episodes");
    const { SPOTS, getActiveFurniture } = await import("@/game/data/map");
    const { blockedAt } = await import("@/game/engine/collision");
    const { findPath, walkableTarget } = await import("@/game/engine/pathfinding");
    const { DUNDIES, OBJECTS, SERVICES } = await import("@/game/data/objects");

    const g = new Game();

    // T1·E01 Pilot: 19 employees incl. Devon, Jan, Packer
    g.start("2005-03-24", "s1e1");
    expect(g.npcs).toHaveLength(19);
    expect(g.npcs.some((n) => n.def.id === "devon")).toBe(true);

    // T2·E10 Christmas Party: Devon fired (16 employees)
    g.start("2005-12-22", "s2e10");
    expect(g.npcs).toHaveLength(16);
    expect(g.npcs.some((n) => n.def.id === "devon")).toBe(false);
    expect(g.event?.id).toBe("navidad");

    // T3·E01 Gay Witch Hunt: Jim in Stamford (absent), Ryan takes Jim's desk
    g.start("2006-09-21", "s3e1");
    expect(g.npcs).toHaveLength(16);
    expect(g.npcs.some((n) => n.def.id === "jim")).toBe(false);
    const ryanS3 = g.npcs.find((n) => n.def.id === "ryan")!;
    expect(ryanS3.def.role).toBe("Ventas");
    expect(ryanS3.def.routine[0]!.spot).toBe("seat_jim");

    // T3·E08 The Merger: 21 employees (5 Stamford arrive: Andy, Karen, Martin Nash, Tony Gardner, Hannah; Oscar on leave)
    g.start("2006-11-16", "s3e8");
    expect(g.npcs).toHaveLength(21);
    for (const id of ["andy", "karen", "martin", "tony", "hannah", "jim", "jan"]) {
      expect(g.npcs.some((n) => n.def.id === id), `expected ${id} in Merger`).toBe(true);
    }
    expect(g.npcs.some((n) => n.def.id === "oscar")).toBe(false);
    expect(g.npcs.find((n) => n.def.id === "andy")!.def.routine[0]!.spot).toBe("seat_oscar");
    expect(getActiveFurniture().some((f) => f.owner === "karen")).toBe(true);
    expect(getActiveFurniture().some((f) => f.owner === "martin")).toBe(true);

    // Every desk, spot, object, service, and Dundie remains A* reachable in crowded Merger layout
    const start = walkableTarget(SPOTS["seat_player"]!.x, SPOTS["seat_player"]!.y);
    expect(blockedAt(start.x, start.y, 11)).toBe(false);
    for (const [name, pos] of Object.entries(SPOTS)) {
      const target = walkableTarget(pos.x, pos.y);
      const path = findPath(start.x, start.y, target.x, target.y);
      expect(path.length, `spot ${name} unreachable in s3e8`).toBeGreaterThan(0);
    }
    for (const obj of OBJECTS) {
      const target = walkableTarget(obj.x, obj.y);
      expect(findPath(start.x, start.y, target.x, target.y).length, `obj ${obj.id} unreachable in s3e8`).toBeGreaterThan(0);
    }
    for (const svc of SERVICES) {
      const target = walkableTarget(svc.x, svc.y);
      expect(findPath(start.x, start.y, target.x, target.y).length, `svc ${svc.id} unreachable in s3e8`).toBeGreaterThan(0);
    }
    for (const d of DUNDIES) {
      const target = walkableTarget(d.x, d.y);
      expect(findPath(start.x, start.y, target.x, target.y).length, `dundie ${d.id} unreachable in s3e8`).toBeGreaterThan(0);
    }

    // T3·E09 The Convict: Tony Gardner left (19 remain)
    g.start("2006-11-30", "s3e9");
    expect(g.npcs).toHaveLength(19);
    expect(g.npcs.some((n) => n.def.id === "tony")).toBe(false);
    expect(g.npcs.some((n) => n.def.id === "martin")).toBe(true);
    expect(g.npcs.some((n) => n.def.id === "hannah")).toBe(true);

    // T3·E13 The Return: Dwight at Staples (absent), Oscar back, Andy takes Dwight's desk
    g.start("2007-01-18", "s3e13");
    expect(g.npcs).toHaveLength(17);
    expect(g.npcs.some((n) => n.def.id === "dwight")).toBe(false);
    expect(g.npcs.some((n) => n.def.id === "oscar")).toBe(true);
    expect(g.npcs.find((n) => n.def.id === "andy")!.def.routine[0]!.spot).toBe("seat_dwight");

    // T3·E19 The Negotiation: Roy fired (absent), Dwight back, Andy on his own bullpen desk
    g.start("2007-04-05", "s3e19");
    expect(g.npcs).toHaveLength(17);
    expect(g.npcs.some((n) => n.def.id === "roy")).toBe(false);
    expect(g.npcs.some((n) => n.def.id === "dwight")).toBe(true);
    expect(g.npcs.find((n) => n.def.id === "andy")!.def.routine[0]!.spot).toBe("seat_andy");

    // T4·E01 Fun Run: Karen (Utica), Ryan (NY corporate), and Roy are gone (16 cast)
    g.start("2007-09-27", "s4e1");
    expect(g.npcs).toHaveLength(16);
    expect(g.npcs.some((n) => n.def.id === "karen")).toBe(false);
    expect(g.npcs.some((n) => n.def.id === "ryan")).toBe(false);
    expect(g.npcs.some((n) => n.def.id === "andy")).toBe(true);
    expect(g.getSnapshot().episode?.id).toBe("s4e1");

    // Every episode has clean compatible missions & conversations (no absent NPC references)
    for (const ep of EPISODES) {
      g.start(ep.dateISO, ep.id);
      const present = new Set(ep.castIds);
      expect(present.size).toBe(ep.castIds.length);
      for (const m of g.missions) {
        expect(present.has(m.giver), `${ep.id} mission ${m.id} giver ${m.giver} absent`).toBe(true);
        for (const s of m.steps) {
          if (s.kind === "talk") {
            expect(present.has(s.target), `${ep.id} mission ${m.id} target ${s.target} absent`).toBe(true);
          }
        }
      }
      for (const c of g.convos) {
        for (const w of c.def.who) {
          expect(present.has(w), `${ep.id} convo ${c.def.id} participant ${w} absent`).toBe(true);
        }
      }
      const snapEp = g.getSnapshot();
      expect((snapEp.episodeContext ?? "").length, `${ep.id} episodeContext too long`).toBeLessThanOrEqual(800);
    }

    // Returning to free mode restores classic 19-person cast and drops extra Stamford desks
    g.start("2026-11-11", null);
    expect(g.npcs).toHaveLength(19);
    expect(g.getSnapshot().episode).toBeNull();
    expect(g.getSnapshot().episodeContext).toBeNull();
    expect(getActiveFurniture().some((f) => f.owner === "karen")).toBe(false);
  });
});

describe("first-time welcome cinematic and player customization", () => {
  it("provides 100+ unique Michael welcome scenes with 3 replies each", async () => {
    const { WELCOME_SCENES } = await import("@/game/data/welcome");
    expect(WELCOME_SCENES.length).toBeGreaterThanOrEqual(100);
    expect(new Set(WELCOME_SCENES.map((s) => s.id)).size).toBe(WELCOME_SCENES.length);
    expect(new Set(WELCOME_SCENES.map((s) => s.title)).size).toBe(WELCOME_SCENES.length);
    for (const s of WELCOME_SCENES) {
      expect(s.replies).toHaveLength(3);
      expect(s.opening.length).toBeGreaterThan(5);
      expect(s.closing.length).toBeGreaterThan(5);
    }
  });

  it("auto-triggers Cinema Mode on first play only, advances interactively, and replays on demand", () => {
    window.localStorage.removeItem("dm_welcome_seen");
    const g = new Game();
    g.start("2026-11-11");

    expect(g.isCinematic).toBe(true);
    expect(g.frozen).toBe(true);
    const snap0 = g.getSnapshot();
    expect(snap0.cinematic).not.toBeNull();
    expect(snap0.cinematic!.totalScenes).toBeGreaterThanOrEqual(100);
    expect(snap0.cinematic!.step).toBe(0);

    // Michael walks toward the player during cinema mode while the workday clock stays paused
    const minsBefore = g.mins;
    const michael = g.npcs.find((n) => n.def.id === "michael")!;
    const mxBefore = michael.x;
    const myBefore = michael.y;
    for (let i = 0; i < 40; i++) g.update(0.05);
    expect(g.mins).toBe(minsBefore);
    expect(Math.hypot(michael.x - mxBefore, michael.y - myBefore)).toBeGreaterThan(10);

    // Advance step 0 -> step 1 (3 choices) -> step 2 (reaction + closing) -> end
    g.cinematicNext();
    expect(g.getSnapshot().cinematic!.step).toBe(1);
    expect(g.getSnapshot().cinematic!.choices).toHaveLength(3);

    g.cinematicChoose(1);
    expect(g.getSnapshot().cinematic!.step).toBe(2);

    g.cinematicNext();
    expect(g.isCinematic).toBe(false);
    expect(g.frozen).toBe(false);
    expect(window.localStorage.getItem("dm_welcome_seen")).toBe("1");

    // Starting again as returning player skips the first-time cinematic
    g.start("2026-11-11");
    expect(g.isCinematic).toBe(false);

    // Replay from Pause menu launches a fresh welcome cinematic and Escape skips it
    g.togglePause();
    g.replayWelcome();
    expect(g.isCinematic).toBe(true);
    expect(g.paused).toBe(false);
    g.handleKey("Escape", true);
    expect(g.isCinematic).toBe(false);
  });

  it("customizes player hair, outfit, and accessories and persists them", () => {
    window.localStorage.removeItem("dm_player_look");
    const g = new Game();
    g.setPlayerLook({
      hairStyle: "curly",
      hair: "#a33c26",
      shirt: "#b8453d",
      pants: "#1f242b",
      glasses: true,
      beard: true,
      dress: false,
      tie: "",
    });

    const snap = g.getSnapshot();
    expect(snap.playerLook.hairStyle).toBe("curly");
    expect(snap.playerLook.hair).toBe("#a33c26");
    expect(snap.playerLook.shirt).toBe("#b8453d");
    expect(snap.playerLook.glasses).toBe(true);
    expect(snap.playerLook.beard).toBe(true);
    expect(snap.playerLook.tie).toBeUndefined();

    // New Game instance restores saved appearance from localStorage
    const g2 = new Game();
    expect(g2.playerLook.hairStyle).toBe("curly");
    expect(g2.playerLook.glasses).toBe(true);
    expect(g2.playerLook.tie).toBeUndefined();

    g2.randomizePlayerLook();
    expect(g2.playerLook.shirt).toMatch(/^#[0-9a-fA-F]{6}$/);
    g2.resetPlayerLook();
    expect(g2.playerLook.hairStyle).toBe("short");
    expect(g2.playerLook.glasses).toBe(false);

    // Restore seen flag for any later tests
    window.localStorage.setItem("dm_welcome_seen", "1");
  });
});


