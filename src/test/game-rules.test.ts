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
    const texts = APPROACHES.map((a) =>
      optionsFor(1, a)
        .map((o) => o.text)
        .join("|"),
    );
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
    const labels = () =>
      (g as unknown as { npcOptions(id: string): { tag: string }[] })
        .npcOptions("jim")
        .map((o) => o.tag);
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
    const { normalizeDailyConvos, normalizeDailyMissions, normalizeChatImpact } =
      await import("@/game/ai");
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
            {
              kind: "object",
              target: "beets",
              text: "Recoge las remolachas",
              found: "Huelen fuerte.",
            },
            {
              kind: "talk",
              target: "dwight",
              needs: "beets",
              text: "Dáselas a Dwight",
              line: "Bien hecho.",
            },
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
          steps: [
            {
              kind: "object",
              target: "whiteboard",
              text: "Revisa la pizarra",
              found: "Plan de defensa.",
            },
          ],
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
          steps: [
            {
              kind: "object",
              target: "jello",
              gives: "jello",
              text: "Coge gelatina",
              found: "Limón.",
            },
          ],
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
          steps: [
            { kind: "object", target: "pen", gives: "pen", text: "Coge el boli", found: "Azul." },
          ],
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
          steps: [
            {
              kind: "object",
              target: "mug",
              gives: "mug",
              text: "Coge la taza",
              found: "Caliente.",
            },
          ],
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
    expect(g.convos.some((c) => c.dynamic && c.seekBy === "dwight" && c.seekTarget === "jim")).toBe(
      true,
    );

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
      expect(
        Math.hypot(target.x - obj.x, target.y - obj.y),
        `object ${obj.id} too far from walkable tile`,
      ).toBeLessThan(50);
    }
    for (const svc of SERVICES) {
      const target = walkableTarget(svc.x, svc.y);
      const path = findPath(start.x, start.y, target.x, target.y);
      expect(path.length, `service ${svc.id} unreachable`).toBeGreaterThan(0);
      expect(
        Math.hypot(target.x - svc.x, target.y - svc.y),
        `service ${svc.id} outside interaction radius`,
      ).toBeLessThan(svc.radius);
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
    g.appendChatMessage("jim", {
      role: "assistant",
      content: "¡Hecho! Voy a meter su grapadora en gelatina.",
    });
    g.closeChat();
    await new Promise((r) => setTimeout(r, 10));

    const jim = g.npcs.find((n) => n.def.id === "jim")!;
    const dwight = g.npcs.find((n) => n.def.id === "dwight")!;
    expect(g.memories["jim"]).toHaveLength(1);
    expect(g.memories["jim"]![0]!.status).toBe("en_marcha");

    // Advance slightly so convo activates, complete prep at fridge, then place near Dwight
    g.mins += 1;
    const prankConvo = g.convos.find(
      (c) => c.dynamic && c.seekBy === "jim" && c.seekTarget === "dwight",
    )!;
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
    expect(
      snap.chat?.history.some((e) => e.role === "user" && e.content.includes("gelatina")),
    ).toBe(true);
    expect(
      snap.chat?.history.some((e) => e.role === "note" && e.content.includes("Broma ejecutada")),
    ).toBe(true);
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
      expect(
        g.npcs.some((n) => n.def.id === id),
        `expected ${id} in Merger`,
      ).toBe(true);
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
      expect(
        findPath(start.x, start.y, target.x, target.y).length,
        `obj ${obj.id} unreachable in s3e8`,
      ).toBeGreaterThan(0);
    }
    for (const svc of SERVICES) {
      const target = walkableTarget(svc.x, svc.y);
      expect(
        findPath(start.x, start.y, target.x, target.y).length,
        `svc ${svc.id} unreachable in s3e8`,
      ).toBeGreaterThan(0);
    }
    for (const d of DUNDIES) {
      const target = walkableTarget(d.x, d.y);
      expect(
        findPath(start.x, start.y, target.x, target.y).length,
        `dundie ${d.id} unreachable in s3e8`,
      ).toBeGreaterThan(0);
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
            expect(
              present.has(s.target),
              `${ep.id} mission ${m.id} target ${s.target} absent`,
            ).toBe(true);
          }
        }
      }
      for (const c of g.convos) {
        for (const w of c.def.who) {
          expect(present.has(w), `${ep.id} convo ${c.def.id} participant ${w} absent`).toBe(true);
        }
      }
      const snapEp = g.getSnapshot();
      expect(
        (snapEp.episodeContext ?? "").length,
        `${ep.id} episodeContext too long`,
      ).toBeLessThanOrEqual(800);
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

describe("canon episode live events and conference room hand-raise intervention", () => {
  it("defines valid canon events for all 12 episodes with cast-compatible participants and valid rooms/spots", async () => {
    const { EPISODES } = await import("@/game/data/episodes");
    const { EPISODE_EVENTS, FREE_MODE_EVENTS } = await import("@/game/data/episodeEvents");
    const { CLASSIC_CAST_IDS } = await import("@/game/data/characters");
    const { ROOMS, SPOTS } = await import("@/game/data/map");

    const roomIds = new Set(ROOMS.map((r) => r.id));
    const classicSet = new Set<string>(CLASSIC_CAST_IDS);

    for (const ev of FREE_MODE_EVENTS) {
      expect(roomIds.has(ev.room)).toBe(true);
      expect(SPOTS[ev.spot]).toBeDefined();
      expect(classicSet.has(ev.host)).toBe(true);
      for (const p of ev.participants) expect(classicSet.has(p)).toBe(true);
    }

    for (const ep of EPISODES) {
      const list = EPISODE_EVENTS[ep.id];
      expect(list, `missing events for ${ep.id}`).toBeDefined();
      expect(list!.length).toBeGreaterThanOrEqual(2);
      const cast = new Set(ep.castIds);
      for (const ev of list!) {
        expect(roomIds.has(ev.room), `invalid room ${ev.room} in ${ev.id}`).toBe(true);
        expect(SPOTS[ev.spot], `invalid spot ${ev.spot} in ${ev.id}`).toBeDefined();
        expect(cast.has(ev.host), `${ep.id} host ${ev.host} absent`).toBe(true);
        for (const p of ev.participants) {
          expect(cast.has(p), `${ep.id} participant ${p} absent in ${ev.id}`).toBe(true);
        }
        for (const ln of ev.lines) {
          expect(cast.has(ln.who), `${ep.id} speaker ${ln.who} absent in ${ev.id}`).toBe(true);
        }
        for (const step of ev.trigger?.preludeSteps ?? []) {
          expect(SPOTS[step.spot], `invalid prelude spot ${step.spot} in ${ev.id}`).toBeDefined();
          if (step.partnerSpot)
            expect(
              SPOTS[step.partnerSpot],
              `invalid partnerSpot ${step.partnerSpot} in ${ev.id}`,
            ).toBeDefined();
          expect(cast.has(step.who), `${ep.id} prelude who ${step.who} absent in ${ev.id}`).toBe(
            true,
          );
          expect(
            cast.has(step.speaker),
            `${ep.id} prelude speaker ${step.speaker} absent in ${ev.id}`,
          ).toBe(true);
          if (step.partner)
            expect(
              cast.has(step.partner),
              `${ep.id} prelude partner ${step.partner} absent in ${ev.id}`,
            ).toBe(true);
          if (step.replyWho)
            expect(
              cast.has(step.replyWho),
              `${ep.id} prelude replyWho ${step.replyWho} absent in ${ev.id}`,
            ).toBe(true);
        }
        for (const ov of ev.trigger?.aftermath?.overrides ?? []) {
          expect(SPOTS[ov.spot], `invalid aftermath spot ${ov.spot} in ${ev.id}`).toBeDefined();
          expect(cast.has(ov.who), `${ep.id} aftermath who ${ov.who} absent in ${ev.id}`).toBe(
            true,
          );
        }
      }
    }
  });

  it("runs meetings in 4 stages: trigger incident, Spanish call, waiting for everyone to sit, and Cinema Mode", async () => {
    const { CONF_SEATS } = await import("@/game/data/map");
    const { findPath } = await import("@/game/engine/pathfinding");
    for (const s of CONF_SEATS) {
      const p = findPath(745, 232, s.x, s.y);
      expect(p.length, `CONF_SEAT ${s.id} should be reachable`).toBeGreaterThan(0);
    }

    const g = new Game();
    g.start("2006-11-30", "s3e9", { skipWelcome: true });

    // 1. Trigger stage (inciting incident happens first)
    g.mins = 9 * 60 + 21;
    g.update(0.05);

    const sTrigger = g.getSnapshot();
    expect(sTrigger.activeOfficeEvent).not.toBeNull();
    expect(sTrigger.activeOfficeEvent!.id).toBe("ev_s3e9_prison_mike");
    expect(sTrigger.activeOfficeEvent!.effect).toBe("prison_mike");
    expect(sTrigger.meetingNotice?.phase).toBe("trigger");
    expect(sTrigger.meetingNotice?.headline).toContain("prisión");
    expect(sTrigger.meetingCinema).toBeNull();

    // 2. Prelude stage progresses through canon scenes before Calling stage
    expect(sTrigger.meetingNotice?.stepLabel).toBe("Escena 1/2");
    g.update(3.5);
    expect(g.getSnapshot().meetingNotice?.stepLabel).toBe("Escena 2/2");
    g.update(3.5);
    const sCall = g.getSnapshot();
    expect(sCall.meetingNotice?.phase).toBe("calling");
    expect(sCall.meetingNotice?.callText.toUpperCase()).toContain("CONFERENCIAS");

    // 3. Gathering stage (waits until EVERY active coworker and the player sit down)
    g.update(2.6);
    const sGather = g.getSnapshot();
    expect(sGather.meetingNotice?.phase).toBe("gathering");
    expect(g.isMeetingCinema).toBe(false);

    // Move all guests into their assigned seats; Cinema Mode should STILL wait for the player
    for (const n of g.npcs) {
      if (n.def.id === "michael") {
        n.x = 880;
        n.y = 85;
      } else {
        n.x = n.target.x;
        n.y = n.target.y;
      }
      n.path = [];
    }
    const michael = g.npcs.find((n) => n.def.id === "michael")!;
    g.update(0.05);
    expect(g.npcs.filter((n) => n.def.id !== "michael").every((n) => n.seated)).toBe(true);
    expect(g.isMeetingCinema).toBe(false);

    // 4. Player sits down -> enters 16:9 Cinema Mode with camera shots and character gestures
    g.sitInMeetingSeat();
    g.update(0.05);
    expect(g.player.seated).toBe(true);
    expect(g.isMeetingCinema).toBe(true);
    expect(g.getSnapshot().inConferenceRoom).toBe(true);

    const sCinema = g.getSnapshot();
    expect(sCinema.meetingNotice).toBeNull();
    expect(sCinema.meetingCinema).not.toBeNull();
    expect(sCinema.meetingCinema!.seatedCount).toBe(sCinema.meetingCinema!.totalCount);
    expect(sCinema.meetingCinema!.line).toContain("Prison Mike");
    expect(sCinema.meetingCinema!.cameraShot).toBeTruthy();
    expect(michael.action).toBe("En reunión");
  });

  it("lets the player raise their hand in Cinema Mode, intervene via AI, fall back gracefully, and exit cleanly", async () => {
    const g = new Game();
    let seenPrompt = "";
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
      meetingIntervene: async (input) => {
        seenPrompt = input.playerLine;
        return {
          mood: "aplausos",
          repDelta: 2,
          summary: "Toda la sala aplaude tu intervención contra los Dementores.",
          reactions: [
            {
              who: "michael",
              name: "Michael Scott",
              text: "¡Exacto! Al fin alguien que entiende el peligro de los Dementores.",
            },
            {
              who: "martin",
              name: "Martin Nash",
              text: "Gracias, al menos alguien aquí tiene sentido común.",
            },
          ],
          followUpAction: { who: "dwight", action: "Vigilando la puerta", spot: "conf_s2" },
        };
      },
    };

    g.start("2006-11-30", "s3e9", { skipWelcome: true });
    g.mins = 9 * 60 + 21;
    g.update(0.05);
    g.update(3.5);
    g.update(3.5);
    g.update(2.6);
    for (const n of g.npcs) {
      if (n.def.id === "michael") {
        n.x = 880;
        n.y = 85;
      } else {
        n.x = n.target.x;
        n.y = n.target.y;
      }
      n.path = [];
    }
    g.update(0.05);
    g.sitInMeetingSeat();
    g.update(0.05);
    expect(g.isMeetingCinema).toBe(true);

    // Pressing H raises hand inline inside the cinema meeting; Esc lowers hand while staying in Cinema Mode
    g.handleKey("h", true);
    expect(g.meetingOpen).toBe(true);
    expect(g.getSnapshot().meetingCinema?.handRaised).toBe(true);
    g.handleKey("Escape", true);
    expect(g.meetingOpen).toBe(false);
    expect(g.isMeetingCinema).toBe(true);

    // Raise hand again and submit AI intervention
    g.handleKey("h", true);
    const repBefore = g.rep;
    await g.interveneInMeeting("¿Podemos hablar de trabajo y dejar a los Dementores?");
    expect(seenPrompt).toContain("Dementores");
    expect(g.rep).toBe(repBefore + 2);
    expect(g.meetingOpen).toBe(false);

    const dwight = g.npcs.find((n) => n.def.id === "dwight")!;
    expect(dwight.override?.action).toBe("Vigilando la puerta");

    const entries = g.getSnapshot().meetingCinema!.entries;
    expect(entries.some((e) => e.kind === "player" && e.text.includes("Dementores"))).toBe(true);
    expect(entries.some((e) => e.kind === "ai" && e.who === "michael")).toBe(true);
    expect(entries.some((e) => e.kind === "note" && e.text.includes("aplaude"))).toBe(true);

    // Fallback check when AI rejects
    g.ai.meetingIntervene = async () => {
      throw new Error("Network down");
    };
    const fallbackRes = await g.interveneInMeeting("Segunda pregunta rápida");
    expect(fallbackRes?.reactions.length).toBeGreaterThan(0);

    // Esc when hand is lowered exits Cinema Mode and unseats everyone
    g.handleKey("Escape", true);
    expect(g.isMeetingCinema).toBe(false);
    expect(g.player.seated).toBe(false);
    expect(g.npcs.every((n) => !n.seated)).toBe(true);
  });

  it("tracks daily goal progress, promotes career across days via nextDay(), and resets cleanly", () => {
    const g = new Game();
    g.resetCareer();
    g.start("2026-11-11", null, { skipWelcome: true });

    const snap1 = g.getSnapshot();
    expect(snap1.dayNumber).toBe(1);
    expect(snap1.dailyGoal.targetSales).toBe(2);
    expect(snap1.dailyGoal.targetMissions).toBe(3);
    expect(snap1.dailyGoal.targetRep).toBe(7);
    expect(snap1.dailyGoal.allCompleted).toBe(false);

    g.sales = 2;
    g.rep = 7;
    const firstThreeIds = Object.keys(g.missionStatus).slice(0, 3);
    for (const id of firstThreeIds) g.missionStatus[id] = "done";
    g.update(1.1);
    const snapDone = g.getSnapshot();
    expect(snapDone.dailyGoal.completedCount).toBe(3);
    expect(snapDone.dailyGoal.allCompleted).toBe(true);

    g.mins = 17 * 60 + 5;
    g.update(0.05);
    expect(g.phase).toBe("ended");
    const endSnap = g.getSnapshot().end;
    expect(endSnap?.dayNumber).toBe(1);
    expect(endSnap?.goalMet).toBe(true);
    expect(endSnap?.careerRep).toBeGreaterThanOrEqual(7);
    expect(endSnap?.careerSales).toBeGreaterThanOrEqual(2);

    g.nextDay();
    const snap2 = g.getSnapshot();
    expect(g.phase).toBe("playing");
    expect(snap2.dayNumber).toBe(2);
    expect(snap2.dailyGoal.dayNumber).toBe(2);
    expect(snap2.sales).toBe(0);
    expect(snap2.rep).toBe(0);
    expect(snap2.dailyGoal.targetRep).toBeGreaterThan(snap1.dailyGoal.targetRep);
    expect(snap2.recentEvents.length).toBeGreaterThan(0);

    g.resetCareer();
    expect(g.getSnapshot().dayNumber).toBe(1);
    expect(g.getSnapshot().recentEvents).toEqual([]);
  });

  it("generates unique daily missions per dayNumber and recentEvents and forwards context to AI", async () => {
    const g = new Game();
    g.resetCareer();

    let capturedDay = 0;
    let capturedEvents: string[] = [];
    let capturedGoal = "";
    g.ai = {
      salesStart: async () => ({ client: {} as never, options: [] }),
      salesTurn: async () => ({ reaction: "", clientLine: "", options: [] }),
      chat: async () => "",
      dailyConvos: async () => [],
      dailyMissions: async (input) => {
        capturedDay = input.dayNumber ?? 0;
        capturedEvents = [...(input.recentEvents ?? [])];
        capturedGoal = input.dailyGoal ?? "";
        return [
          {
            id: "ai_unique_d2",
            title: "Auditar grapadoras tras la broma",
            desc: "Dwight exige revisar los cajones tras los incidentes recientes.",
            giver: "dwight",
            offer: "Después de lo que pasó ayer, revisa tu mesa ahora mismo.",
            doneLine: "Bien. Ninguna grapadora en gelatina… de momento.",
            steps: [
              {
                target: "my_desk",
                kind: "object",
                text: "Comprobar tu mesa tras los rumores de bromas",
                found: "Has revisado tu cajón por si acaso.",
              },
            ],
            reward: { money: 25, rep: 3 },
          },
          {
            id: "ai_unique_d2_b",
            title: "Conciliar facturas del día anterior",
            desc: "Oscar necesita comprobar una diferencia contable.",
            giver: "oscar",
            offer: "¿Puedes mirar la impresora antes de que llegue Michael?",
            doneLine: "Perfecto, cuadra hasta el último céntimo.",
            steps: [
              {
                target: "printer",
                kind: "object",
                text: "Revisar bandeja de la impresora",
                found: "Ahí estaba la factura.",
              },
            ],
            reward: { money: 20, rep: 2 },
          },
          {
            id: "ai_unique_d2_c",
            title: "Reserva táctica de café",
            desc: "Stanley solo aguantará el día con café recién hecho.",
            giver: "stanley",
            offer: "Tráeme algo de la cocina antes de la reunión.",
            doneLine: "Al fin alguien eficiente.",
            steps: [
              {
                target: "coffee",
                kind: "object",
                text: "Comprobar la cafetera",
                found: "Recién hecho.",
              },
            ],
            reward: { rep: 2 },
          },
          {
            id: "ai_unique_d2_d",
            title: "Inventario secreto de chili",
            desc: "Kevin teme por su receta.",
            giver: "kevin",
            offer: "Comprueba que la nevera esté bien cerrada.",
            doneLine: "Fiu, todo seguro.",
            steps: [
              {
                target: "fridge",
                kind: "object",
                text: "Revisar la nevera",
                found: "Sigue intacto.",
              },
            ],
            reward: { rep: 2 },
          },
        ];
      },
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

    g.start("2026-11-11", null, { skipWelcome: true });
    const day1Ids = Object.keys(g.missionStatus);
    expect(day1Ids).toContain("jim_mug");

    g.recordRecentEvent("Coordinaste una broma con Jim en la oficina");
    g.nextDay();
    await new Promise((r) => setTimeout(r, 10));

    const day2Ids = Object.keys(g.missionStatus);
    expect(capturedDay).toBe(2);
    expect(capturedEvents.some((e) => e.includes("broma"))).toBe(true);
    expect(capturedGoal.length).toBeGreaterThan(0);
    expect(day2Ids.some((id) => id.startsWith("dyn_ev_d2_"))).toBe(true);
    expect(day2Ids).toContain("ai_unique_d2");
    expect(day2Ids).not.toEqual(day1Ids);
  });

  it("lets coworkers proactively approach the player via AI with A* movement and dialog choices", async () => {
    const g = new Game();
    g.resetCareer();
    let seenDay = 0;
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
      npcApproach: async (input) => {
        seenDay = input.dayNumber;
        return {
          walkCallout: "¡Oye! Un segundo...",
          reason: "Comentario urgente sobre la cuota de ventas",
          openingLine: "¿Has visto la nota de Michael sobre los envíos de hoy?",
          replies: [
            {
              label: "Sí, ya voy a por otra venta.",
              reaction: "Perfecto, cuenta conmigo si necesitas precios.",
              repDelta: 2,
            },
            {
              label: "Prefiero evitar a Michael ahora.",
              reaction: "Sabia decisión, yo tampoco me fío.",
              repDelta: 1,
            },
            { label: "Ahora estoy liado.", reaction: "Vale, luego hablamos.", repDelta: 0 },
          ],
        };
      },
    };

    g.start("2026-11-11", null, { skipWelcome: true });
    const jim = g.npcs.find((n) => n.def.id === "jim")!;
    g.convos = [];

    const started = await g.triggerNpcApproach("jim");
    expect(started).toBe(true);
    expect(seenDay).toBe(1);
    expect(g.approachingNpcId()).toBe("jim");
    expect(g.getSnapshot().approachingNpc?.reason).toContain("cuota de ventas");

    g.update(0.05);
    expect(jim.path.length).toBeGreaterThan(0);
    const bubbles = g.bubbles();
    expect(bubbles.some((b) => b.text.includes("Un segundo"))).toBe(true);

    jim.x = g.player.x + 28;
    jim.y = g.player.y;
    g.update(0.05);

    expect(g.approachingNpcId()).toBeNull();
    expect(g.dialog).not.toBeNull();
    expect(g.dialog!.portrait).toBe("jim");
    expect(g.dialog!.line).toContain("nota de Michael");

    const repBefore = g.rep;
    g.dialog!.options[0]!.act();
    expect(g.rep).toBe(repBefore + 2);
    expect(g.getSnapshot().recentEvents.some((e) => e.includes("Jim se acercó"))).toBe(true);

    g.closeDialog();
    g.ai.npcApproach = async () => {
      throw new Error("Offline");
    };
    const fallbackStarted = await g.triggerNpcApproach("pam");
    expect(fallbackStarted).toBe(true);
    expect(g.getSnapshot().approachingNpc?.id).toBe("pam");
  });

  it("cycles over-the-shoulder camera modes via toggleCameraMode and V key, and moves relative to cameraYaw", () => {
    const g = new Game();
    g.start("2026-11-11", null, { skipWelcome: true });

    expect(g.getSnapshot().cameraMode).toBe("shoulder_right");
    g.handleKey("v", true);
    expect(g.getSnapshot().cameraMode).toBe("shoulder_left");
    g.toggleCameraMode();
    expect(g.getSnapshot().cameraMode).toBe("first_person");
    g.handleKey("v", true);
    expect(g.getSnapshot().cameraMode).toBe("shoulder_right");

    // Place player in open bullpen aisle and rotate cameraYaw +90 deg (looking East, +X)
    g.player.x = 775;
    g.player.y = 635;
    g.setCameraYaw(Math.PI / 2);
    g.keys["w"] = true;
    g.update(0.1);
    g.keys["w"] = false;
    expect(g.player.x).toBeGreaterThan(780);
    expect(Math.abs(g.player.y - 635)).toBeLessThan(1);

    // Strafing right (D) while facing East walks South (+Y)
    const beforeY = g.player.y;
    g.keys["d"] = true;
    g.update(0.1);
    g.keys["d"] = false;
    expect(g.player.y).toBeGreaterThan(beforeY + 5);
  });

  it("plays out the full multi-step Gay Witch Hunt (s3e1) build-up, conference room kiss, and Jan Lexus aftermath", () => {
    const g = new Game();
    g.start("2006-09-21", "s3e1", { skipWelcome: true });
    g.mins = 9 * 60 + 21;

    // Step 1: Michael insults Shakespeare in Love -> Oscar silently hurt
    g.update(0.05);
    const s1 = g.getSnapshot().meetingNotice;
    expect(s1?.phase).toBe("trigger");
    expect(s1?.stepLabel).toBe("Escena 1/3");
    expect(s1?.callText).toContain("Shakespeare in Love");

    // Step 2: Toby calls Michael to his office & reveals Oscar is gay
    g.update(4.6);
    const s2 = g.getSnapshot().meetingNotice;
    expect(s2?.stepLabel).toBe("Escena 2/3");
    expect(s2?.callText).toContain("Toby");
    expect(s2?.replyText).toContain("Michael");

    // Step 3: Michael ignores discretion & outs Oscar in Bullpen hug
    g.update(4.9);
    const s3 = g.getSnapshot().meetingNotice;
    expect(s3?.stepLabel).toBe("Escena 3/3");
    expect(s3?.callText).toContain("abrazo");

    // Calling -> Gathering -> Cinema Meeting (including the improvised kiss) -> Aftermath
    g.update(4.9);
    expect(g.getSnapshot().meetingNotice?.phase).toBe("calling");
    g.update(2.6);
    expect(g.getSnapshot().meetingNotice?.phase).toBe("gathering");

    for (const n of g.npcs) {
      n.x = n.def.id === "michael" ? 880 : n.target.x;
      n.y = n.def.id === "michael" ? 85 : n.target.y;
      n.path = [];
    }
    g.update(0.05);
    g.sitInMeetingSeat();
    g.update(0.05);
    expect(g.isMeetingCinema).toBe(true);

    // Advance all 6 cinema lines + completion wait -> triggers Lexus aftermath
    for (let i = 0; i < 6; i++) {
      g.update(14);
    }
    g.update(2.0);
    expect(g.isMeetingCinema).toBe(false);
    const oscar = g.npcs.find((n) => n.def.id === "oscar")!;
    const jan = g.npcs.find((n) => n.def.id === "jan")!;
    expect(oscar.override?.reactionLine).toContain("coche de empresa");
    expect(jan.override?.reactionLine).toContain("Lexus");
    expect(g.getSnapshot().recentEvents[0]).toContain("Lexus");
  });

  it("disperses coworkers across Michael's office, Break Room lunch tables, and shared overrides without stacking", async () => {
    const { SPOTS } = await import("@/game/data/map");
    const { findPath } = await import("@/game/engine/pathfinding");
    const requiredSpots = [
      "michael_visit",
      "michael_couch",
      "break_t1_n",
      "break_t1_s",
      "break_t1_w",
      "break_t1_e",
      "break_t2_n",
      "break_t2_s",
      "break_t2_w",
      "break_t2_e",
      "break_t3_n",
      "break_t3_s",
      "break_t3_w",
      "break_t3_e",
      "break_couch_n",
      "kitchen_round_w",
      "kitchen_round_e",
      "kitchen_round_s",
      "vending_2",
      "pingpong_e",
    ];
    for (const key of requiredSpots) {
      const sp = SPOTS[key]!;
      expect(sp, `Spot ${key} must exist`).toBeDefined();
      const path = findPath(775, 635, sp.x, sp.y);
      expect(path.length, `Spot ${key} must be reachable from bullpen`).toBeGreaterThan(0);
    }

    // Even in the 21-person Merger episode at lunch (12:05), nobody stacks on identical coordinates
    const g = new Game();
    g.start("2006-11-16", "s3e8", { skipWelcome: true });
    g.convos = [];
    g.mins = 12 * 60 + 5;
    g.update(0.05);

    for (let i = 0; i < g.npcs.length; i++) {
      for (let j = i + 1; j < g.npcs.length; j++) {
        const a = g.npcs[i]!;
        const b = g.npcs[j]!;
        const dist = Math.hypot(a.target.x - b.target.x, a.target.y - b.target.y);
        expect(dist, `${a.def.id} and ${b.def.id} lunch targets too close`).toBeGreaterThanOrEqual(
          24,
        );
      }
    }

    // Two NPCs forced onto the exact same override spot must automatically spread apart
    const angela = g.npcs.find((n) => n.def.id === "angela")!;
    const kevin = g.npcs.find((n) => n.def.id === "kevin")!;
    angela.override = {
      action: "Charlando",
      spot: "kitchen_mid",
      until: g.mins + 30,
      reactionLine: "Hola.",
    };
    kevin.override = {
      action: "Charlando",
      spot: "kitchen_mid",
      until: g.mins + 30,
      reactionLine: "Hola.",
    };
    g.update(0.05);
    expect(
      Math.hypot(angela.target.x - kevin.target.x, angela.target.y - kevin.target.y),
    ).toBeGreaterThanOrEqual(24);
  });

  it("keeps NPC spontaneous approaches natural and in-character without robotic log tags or game jargon", async () => {
    const { CHARACTERS } = await import("@/game/data/characters");
    const { normalizeNpcApproach } = await import("@/game/ai");

    for (const c of CHARACTERS) {
      const res = normalizeNpcApproach(null, c.id, 1, [
        "Acción en la oficina: Coordinación de emergencia (112)",
        "Día 1: Cuota superada (2 ventas, 8 ★)",
      ]);
      expect(res.openingLine).not.toMatch(
        /Día 1|encargos y las ventas|Acción en la oficina|meta del día/i,
      );
      expect(res.replies).toHaveLength(3);
      for (const rep of res.replies) {
        expect(rep.label).not.toMatch(/meta del día/i);
      }
    }
    const angelaApproach = normalizeNpcApproach(null, "angela", 1, []);
    expect(angelaApproach.openingLine).toMatch(/Comité de Fiestas|orden|cuentas/i);
  });

  it("suppresses duplicate pre-meeting toasts and ambient bubbles during trigger/calling phases", () => {
    const g = new Game();
    g.start("2006-09-21", "s3e1", { skipWelcome: true });
    g.convos = [
      {
        def: {
          id: "c_ambient_test",
          title: "Charla en ventas",
          spot: "bullpen_mid",
          at: 9 * 60 + 21,
          duration: 30,
          who: ["dwight", "stanley"],
          lines: [{ who: "dwight", text: "Silencio en la zona de ventas." }],
        },
        state: "playing",
        line: 0,
        lineT: 0,
        arrived: true,
        heardLines: 0,
      },
    ];
    g.mins = 9 * 60 + 21;

    // Trigger step 1..3 + calling phase: meetingNotice must carry the info without spamming toasts or ambient convo bubbles
    g.update(0.05);
    expect(g.getSnapshot().meetingNotice?.phase).toBe("trigger");
    expect(g.bubbles().some((b) => b.text.includes("Silencio en la zona de ventas"))).toBe(false);

    g.update(4.6);
    g.update(4.9);
    g.update(4.9);
    expect(g.getSnapshot().meetingNotice?.phase).toBe("calling");

    const preMeetingToasts = g
      .getSnapshot()
      .toasts.filter(
        (t) =>
          t.text.includes("Shakespeare in Love") ||
          t.text.includes("Sala de conferencias") ||
          t.text.includes("Michael convoca"),
      );
    expect(preMeetingToasts).toHaveLength(0);
  });

  it("focuses cinema camera on exact active speaker and animates Oscar, Michael, and Jan during s3e1", () => {
    const g = new Game();
    g.start("2006-09-21", "s3e1", { skipWelcome: true });
    g.mins = 9 * 60 + 21;
    g.update(0.05);
    g.update(4.6);
    g.update(4.9);
    g.update(4.9);
    g.update(2.6);

    for (const n of g.npcs) {
      n.x = n.def.id === "michael" ? 880 : n.target.x;
      n.y = n.def.id === "michael" ? 85 : n.target.y;
      n.path = [];
    }
    g.update(0.05);
    g.sitInMeetingSeat();
    g.update(0.05);
    expect(g.isMeetingCinema).toBe(true);

    // Line 0 (Michael): all guest NPCs seated and host in front
    const line0 = g.getSnapshot().meetingCinema!;
    expect(line0.speakerId).toBe("michael");
    expect(line0.focusNpcId).toBe("michael");
    expect(line0.seatedCount).toBe(line0.totalCount);

    // Line 1 (Oscar): camera MUST focus Oscar (not Angela) and Oscar steps out to confront Michael
    g.update(9.0);
    const line1 = g.getSnapshot().meetingCinema!;
    const oscar = g.npcs.find((n) => n.def.id === "oscar")!;
    expect(line1.speakerId).toBe("oscar");
    expect(line1.focusNpcId).toBe("oscar");
    expect(line1.cameraShot).toBe("speaker");
    expect(oscar.seated).toBe(false);

    // Line 2 (Toby): camera focuses Toby (never Angela reacting)
    g.update(9.0);
    const line2 = g.getSnapshot().meetingCinema!;
    expect(line2.speakerId).toBe("toby");
    expect(line2.focusNpcId).toBe("toby");
    expect(line2.cameraShot).toBe("speaker");

    // Advance through Dwight -> Michael kiss -> Jan (line 5)
    g.update(9.0); // Dwight
    g.update(9.5); // Michael kiss
    g.update(10.5); // Jan
    const line5 = g.getSnapshot().meetingCinema!;
    const jan = g.npcs.find((n) => n.def.id === "jan")!;
    expect(line5.speakerId).toBe("jan");
    expect(line5.focusNpcId).toBe("jan");
    expect(line5.cameraShot).toBe("speaker");
    expect(jan.seated).toBe(false);
  });

  it("places Archive and Warehouse downstairs with stairwell/elevator portals and cross-floor A*", async () => {
    const { FLOOR_PORTALS, FLOOR_SPLIT_Y, SPOTS, floorOfY } = await import("@/game/data/map");
    const { blockedAt } = await import("@/game/engine/collision");
    const { findPath } = await import("@/game/engine/pathfinding");

    expect(floorOfY(SPOTS["bullpen_mid"]!.y)).toBe(0);
    expect(floorOfY(SPOTS["seat_darryl"]!.y)).toBe(1);
    expect(floorOfY(SPOTS["archive"]!.y)).toBe(1);
    expect(blockedAt(775, FLOOR_SPLIT_Y, 13)).toBe(true);

    const crossFloorPath = findPath(
      SPOTS["bullpen_mid"]!.x,
      SPOTS["bullpen_mid"]!.y,
      SPOTS["seat_darryl"]!.x,
      SPOTS["seat_darryl"]!.y,
    );
    expect(crossFloorPath.length).toBeGreaterThan(2);
    expect(crossFloorPath.some((wp) => wp.portalJump === true)).toBe(true);

    const g = new Game();
    g.start("2006-09-21", "s3e1", { skipWelcome: true });
    expect(g.getSnapshot().floor).toBe(0);

    const stairsDown = FLOOR_PORTALS.find((p) => p.id === "stairs_down")!;
    g.player.x = stairsDown.x;
    g.player.y = stairsDown.y;
    g.interact();
    expect(floorOfY(g.player.y)).toBe(1);
    expect(g.getSnapshot().floor).toBe(1);

    const elevatorUp = FLOOR_PORTALS.find((p) => p.id === "elevator_up")!;
    g.player.x = elevatorUp.x;
    g.player.y = elevatorUp.y;
    g.interact();
    expect(floorOfY(g.player.y)).toBe(0);
    expect(g.getSnapshot().floor).toBe(0);
  });

  it("tracks player running/action state and renders 10 distinct call & action animations plus locomotion", async () => {
    const THREE = await import("three");
    const {
      ACTION_VARIANT_COUNT,
      CALL_ANIM_COUNT,
      animateCharacterRig,
      buildCharacterRig,
      classifyActionCategory,
    } = await import("@/game/engine/render3d/models");
    const { CHARACTERS } = await import("@/game/data/characters");

    expect(CALL_ANIM_COUNT).toBe(10);
    expect(ACTION_VARIANT_COUNT).toBe(10);

    // Every NPC routine action maps into a supported animation family
    for (const c of CHARACTERS) {
      for (const r of c.routine) {
        const cat = classifyActionCategory(r.action, {
          deskSeated: r.spot.startsWith("seat_"),
        });
        expect([
          "call",
          "desk",
          "drink_eat",
          "paperwork",
          "warehouse",
          "machine_prep",
          "social",
          "idle",
        ]).toContain(cat);
      }
    }

    // Engine tracks player running state and active call action
    const g = new Game();
    g.start("2026-11-11", null, { skipWelcome: true });
    g.keys["w"] = true;
    g.update(0.05);
    expect(g.player.moving).toBe(true);
    expect(g.player.running).toBe(false);

    g.keys["Shift"] = true;
    g.update(0.05);
    expect(g.player.running).toBe(true);

    g.keys["w"] = false;
    g.keys["Shift"] = false;
    g.openPC();
    g.pcStartCall();
    expect(g.player.action).toBe("Llamada de ventas");

    // 3D Rig builds cleanly with torso/foot pivots and cycles 10 distinct poses per action
    const dummyTex = new THREE.Texture();
    const rig = buildCharacterRig(CHARACTERS[0]!.look, undefined, dummyTex);

    const callSignatures = new Set<string>();
    for (let v = 0; v < CALL_ANIM_COUNT; v++) {
      animateCharacterRig(rig, {
        moving: false,
        walkT: 0,
        handRaised: false,
        idlePhase: 1.7,
        onCall: true,
        actionText: "Llamadas de ventas",
        actionVariant: v,
      });
      expect(rig.actionProps.phone.visible).toBe(true);
      callSignatures.add(
        [
          rig.torso.rotation.x.toFixed(2),
          rig.torso.rotation.y.toFixed(2),
          rig.head.rotation.z.toFixed(2),
          rig.leftArm.rotation.x.toFixed(2),
          rig.rightArm.rotation.x.toFixed(2),
          rig.actionProps.paper.visible ? 1 : 0,
        ].join("|"),
      );
    }
    expect(callSignatures.size).toBe(10);

    // Other action categories also execute all 10 variants without throwing
    const sampleActions = [
      "Despacho",
      "Café",
      "Crucigrama",
      "Moviendo cajas",
      "Fotocopias",
      "Charlando",
      "Ping-pong",
      "",
    ];
    for (const actionText of sampleActions) {
      const seen = new Set<string>();
      for (let v = 0; v < ACTION_VARIANT_COUNT; v++) {
        animateCharacterRig(rig, {
          moving: false,
          walkT: 0,
          handRaised: false,
          idlePhase: 1.25,
          actionText,
          actionVariant: v,
        });
        seen.add(
          [
            rig.torso.rotation.x.toFixed(2),
            rig.leftArm.rotation.x.toFixed(2),
            rig.rightArm.rotation.x.toFixed(2),
            rig.rightElbow.rotation.x.toFixed(2),
          ].join("|"),
        );
      }
      if (actionText !== "Ping-pong") {
        expect(seen.size).toBeGreaterThanOrEqual(8);
      }
    }

    // Running vs walking produces deeper stride, forward torso lean, and ankle roll
    animateCharacterRig(rig, {
      moving: true,
      running: false,
      walkT: Math.PI / 2,
      handRaised: false,
      idlePhase: 0,
    });
    const walkLean = rig.torso.rotation.x;
    const walkBounce = rig.body.position.y;

    animateCharacterRig(rig, {
      moving: true,
      running: true,
      walkT: Math.PI / 2,
      handRaised: false,
      idlePhase: 0,
    });
    expect(rig.torso.rotation.x).toBeLessThan(walkLean);
    expect(rig.body.position.y).toBeGreaterThan(walkBounce);

    rig.dispose();
    dummyTex.dispose();
  });

  it("smoothly interpolates between animations, seats cleanly on chair cushions with arms on desk, and curves/varies NPC paths", async () => {
    const THREE = await import("three");
    const { animateCharacterRig, buildCharacterRig, getDeskSeatAnchor3D } =
      await import("@/game/engine/render3d/models");
    const { CHARACTERS } = await import("@/game/data/characters");
    const { SPOTS } = await import("@/game/data/map");
    const { findPath } = await import("@/game/engine/pathfinding");

    const dummyTex = new THREE.Texture();
    const rig = buildCharacterRig(CHARACTERS[0]!.look, undefined, dummyTex);

    // Standing idle pose initialized without dt -> snaps cleanly
    animateCharacterRig(rig, {
      moving: false,
      walkT: 0,
      handRaised: false,
      idlePhase: 0.5,
      actionText: "Esperando",
      actionVariant: 0,
    });
    expect(rig.body.position.y).toBeGreaterThan(-0.05);

    // Transition to seated desk typing with dt = 1/60s -> blends smoothly without snapping
    animateCharacterRig(rig, {
      moving: false,
      walkT: 0,
      handRaised: false,
      idlePhase: 0.5,
      deskSeated: true,
      actionText: "Tecleando informe",
      actionVariant: 0,
      dt: 1 / 60,
    });
    expect(rig.leftLeg.rotation.x).toBeGreaterThan(0.02);
    expect(rig.leftLeg.rotation.x).toBeLessThan(1.3);
    expect(rig.body.position.y).toBeLessThan(0);
    expect(rig.body.position.y).toBeGreaterThan(-0.18);

    // Converge after sustained dt steps -> sits cleanly on cushion (-0.21) forward of backrest (-0.04) with forward torso lean and arms on desk
    for (let i = 0; i < 60; i++) {
      animateCharacterRig(rig, {
        moving: false,
        walkT: 0,
        handRaised: false,
        idlePhase: 0.5 + i * (1 / 60),
        deskSeated: true,
        actionText: "Tecleando informe",
        actionVariant: 0,
        dt: 1 / 60,
      });
    }
    expect(rig.body.position.y).toBeCloseTo(-0.21, 1);
    expect(rig.body.position.z).toBeCloseTo(-0.04, 1);
    expect(rig.torso.rotation.x).toBeLessThan(0);
    expect(rig.leftArm.rotation.x).toBeGreaterThan(0.65);
    expect(rig.leftElbow.rotation.x).toBeGreaterThan(0.75);

    // Desk chair 3D anchors exist cleanly for employees & reception/Michael
    for (const owner of ["angela", "michael", "pam", "jim"]) {
      const anchor = getDeskSeatAnchor3D(owner);
      expect(anchor, `missing desk chair anchor for ${owner}`).not.toBeNull();
    }

    // Open-floor pathing uses diagonal string-pulling / curve variation across distinct seeds
    const start = SPOTS["bullpen_mid"]!;
    const goal = SPOTS["reception_front"]!;
    const p1 = findPath(start.x, start.y, goal.x, goal.y, 17);
    const p2 = findPath(start.x, start.y, goal.x, goal.y, 943);
    expect(p1.length).toBeGreaterThan(2);
    expect(p2.length).toBeGreaterThan(2);
    const hasDiagonalSegment = p1.some((pt, idx) => {
      if (idx === 0) return false;
      const prev = p1[idx - 1]!;
      return Math.abs(pt.x - prev.x) > 4 && Math.abs(pt.y - prev.y) > 4;
    });
    expect(hasDiagonalSegment).toBe(true);
    const sig1 = p1.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(";");
    const sig2 = p2.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(";");
    expect(sig1).not.toBe(sig2);

    rig.dispose();
    dummyTex.dispose();
  });

  it("lets the player walk onto both upstairs and basement stairs cleanly to enter and exit the warehouse", async () => {
    const { floorOfY } = await import("@/game/data/map");
    const { blockedAt } = await import("@/game/engine/collision");

    // No invisible solid wall across either Floor 0 or Floor 1 staircase openings
    expect(blockedAt(1240, 112, 13)).toBe(false);
    expect(blockedAt(1176, 1084, 13)).toBe(false);
    expect(blockedAt(1176, 1055, 13)).toBe(false);

    const g = new Game();
    g.start("2026-11-11");

    // Position player in the upstairs stairwell facing the open top of the stairs and walk west onto the steps
    g.player.x = 1272;
    g.player.y = 112;
    g.cameraYaw = 0;
    g.keys["a"] = true;
    for (let i = 0; i < 40; i++) {
      g.update(0.05);
      if (floorOfY(g.player.y) === 1) break;
    }
    g.keys["a"] = false;
    expect(floorOfY(g.player.y)).toBe(1);
    expect(blockedAt(g.player.x, g.player.y, 13)).toBe(false);

    // Standing at the warehouse landing after cooldown expires should not immediately bounce upstairs
    for (let i = 0; i < 45; i++) g.update(0.05);
    expect(floorOfY(g.player.y)).toBe(1);

    // Walking north onto the basement stairs returns smoothly to Floor 0
    g.cameraYaw = 0;
    g.keys["w"] = true;
    for (let i = 0; i < 60; i++) {
      g.update(0.05);
      if (floorOfY(g.player.y) === 0) break;
    }
    g.keys["w"] = false;
    expect(floorOfY(g.player.y)).toBe(0);
    expect(blockedAt(g.player.x, g.player.y, 13)).toBe(false);
  });

  it("unlocks, persists, toggles, and renders the exclusive Indian meme skin only on exact phrase to Toby", async () => {
    const THREE = await import("three");
    const { DEFAULT_PLAYER_LOOK } = await import("@/game/types");
    const { animateCharacterRig, buildCharacterRig } =
      await import("@/game/engine/render3d/models");
    const { drawCharacter } = await import("@/game/engine/sprites");

    localStorage.clear();
    const g = new Game();
    g.start("2026-11-11");

    expect(g.getSnapshot().unlockedSkins).toEqual([]);
    expect(g.getSnapshot().playerSkin).toBeNull();

    // Exact phrase to another NPC must NOT unlock
    expect(g.isSecretChatTrigger("michael", "hola toby, dame la skin india")).toBe(false);
    g.openChat("michael");
    g.appendChatMessage("michael", { role: "user", content: "hola toby, dame la skin india" });
    expect(g.getSnapshot().unlockedSkins).toEqual([]);

    // Non-exact phrasing to Toby must NOT unlock
    expect(g.isSecretChatTrigger("toby", "Hola Toby, dame la skin india")).toBe(false);
    expect(g.isSecretChatTrigger("toby", "hola toby, dame la skin india!")).toBe(false);
    g.openChat("toby");
    g.appendChatMessage("toby", { role: "user", content: "Hola Toby, dame la skin india" });
    expect(g.getSnapshot().unlockedSkins).toEqual([]);

    // Exact phrase to Toby unlocks, equips, adds Toby's response + note, and persists
    expect(g.isSecretChatTrigger("toby", "hola toby, dame la skin india")).toBe(true);
    g.appendChatMessage("toby", { role: "user", content: "hola toby, dame la skin india" });
    g.closeChat();

    expect(g.getSnapshot().unlockedSkins).toContain("india");
    expect(g.getSnapshot().playerSkin).toBe("india");
    expect(
      g.chatHistory["toby"]?.some(
        (m) => m.role === "assistant" && m.content.includes("Maharajah del Meme"),
      ),
    ).toBe(true);
    expect(localStorage.getItem("dm_player_skin")).toBe("india");

    // Toggle off & reload in a fresh Game instance -> unlocked state stays, equipped skin updates
    g.setPlayerSkin(null);
    expect(g.getSnapshot().playerSkin).toBeNull();

    const gReloaded = new Game();
    gReloaded.start("2026-11-11");
    expect(gReloaded.getSnapshot().unlockedSkins).toContain("india");
    expect(gReloaded.getSnapshot().playerSkin).toBeNull();
    gReloaded.setPlayerSkin("india");
    expect(gReloaded.getSnapshot().playerSkin).toBe("india");

    // 3D rig richness + animated golden Mandala aura
    const dummyTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    const plainRig = buildCharacterRig(DEFAULT_PLAYER_LOOK, undefined, dummyTex);
    const indiaRig = buildCharacterRig(DEFAULT_PLAYER_LOOK, "india", dummyTex);

    let plainMeshes = 0;
    plainRig.root.traverse((o) => {
      if ((o as { isMesh?: boolean }).isMesh) plainMeshes++;
    });
    let indiaMeshes = 0;
    indiaRig.root.traverse((o) => {
      if ((o as { isMesh?: boolean }).isMesh) indiaMeshes++;
    });
    expect(indiaRig.indiaAura).toBeDefined();
    expect(indiaMeshes).toBeGreaterThan(plainMeshes + 35);

    animateCharacterRig(indiaRig, {
      moving: false,
      walkT: 0,
      handRaised: false,
      idlePhase: 1.5,
      dt: 1 / 60,
    });
    expect(indiaRig.indiaAura!.rotation.z).not.toBe(0);

    // 2D Portrait / Sprite smoke test with mock 2D canvas context
    const noop = () => {};
    const mockCtx = {
      save: noop,
      restore: noop,
      translate: noop,
      scale: noop,
      beginPath: noop,
      closePath: noop,
      moveTo: noop,
      lineTo: noop,
      bezierCurveTo: noop,
      quadraticCurveTo: noop,
      arc: noop,
      ellipse: noop,
      roundRect: noop,
      rect: noop,
      fillRect: noop,
      strokeRect: noop,
      fill: noop,
      stroke: noop,
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      lineCap: "round",
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;
    expect(() =>
      drawCharacter(mockCtx, {
        x: 32,
        y: 58,
        facing: "down",
        moving: false,
        walkT: 1.2,
        look: DEFAULT_PLAYER_LOOK,
        costume: "india",
        scale: 1,
      }),
    ).not.toThrow();

    plainRig.dispose();
    indiaRig.dispose();
    dummyTex.dispose();
    localStorage.clear();
  });
});
