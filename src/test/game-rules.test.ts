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
