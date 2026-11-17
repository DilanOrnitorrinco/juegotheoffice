import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { WORLD } from "@/game/data/map";
import { Game } from "@/game/engine/game";
import { renderMinimap, renderWorld } from "@/game/engine/render";
import { aiChat, aiSalesStart, aiSalesTurn } from "@/lib/ai.functions";

import { Computer } from "./Computer";
import { DialogBox } from "./DialogBox";
import { FreeChat } from "./FreeChat";
import { Hud } from "./Hud";
import { Journal } from "./Journal";
import { EndScreen, PauseScreen, Toasts } from "./Overlays";
import { StartScreen } from "./StartScreen";

export function GameRoot() {
  const [game] = useState(() => new Game());
  const ui = useSyncExternalStore(game.subscribe, game.getSnapshot, game.getSnapshot);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const salesStartFn = useServerFn(aiSalesStart);
  const salesTurnFn = useServerFn(aiSalesTurn);
  const chatFn = useServerFn(aiChat);

  useEffect(() => {
    game.ai = {
      salesStart: async () => {
        const r = await salesStartFn();
        if (!r.ok) throw new Error(r.error);
        return { client: r.client, options: r.options };
      },
      salesTurn: async (input) => {
        const r = await salesTurnFn({ data: input });
        if (!r.ok) throw new Error(r.error);
        return { reaction: r.reaction, clientLine: r.clientLine, options: r.options };
      },
      chat: async (input) => {
        const r = await chatFn({ data: input });
        if (!r.ok) throw new Error(r.error);
        return r.reply;
      },
    };
    game.emit();
  }, [game, salesStartFn, salesTurnFn, chatFn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext("2d")!;
    if (import.meta.env.DEV) (window as unknown as { __game?: Game }).__game = game;
    let vw = window.innerWidth;
    let vh = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = vw * dpr;
      canvas.height = vh * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const cam = { x: game.player.x - vw / 2, y: game.player.y - vh / 2 };
    let last = performance.now();
    let raf = 0;
    let frame = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      game.update(dt);
      const zoom = Math.max(0.8, Math.min(1.25, Math.min(vw / 1150, vh / 820)));
      const viewW = vw / zoom;
      const viewH = vh / zoom;
      const tx = Math.max(0, Math.min(WORLD.w - viewW, game.player.x - viewW / 2));
      const ty = Math.max(0, Math.min(WORLD.h - viewH, game.player.y - viewH / 2));
      const k = Math.min(1, dt * 8);
      cam.x += (tx - cam.x) * k;
      cam.y += (ty - cam.y) * k;
      renderWorld(g, game, { vw, vh, dpr, zoom, cam });
      const mm = minimapRef.current;
      if (mm && frame % 3 === 0) {
        const mw = 220;
        const mh = 154;
        if (mm.width !== mw * dpr) {
          mm.width = mw * dpr;
          mm.height = mh * dpr;
        }
        renderMinimap(mm.getContext("2d")!, game, mw, mh, dpr);
      }
      frame++;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping(e) || game.phase !== "playing") return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      if (e.repeat && e.key.toLowerCase() === "e") return;
      game.handleKey(e.key, true);
    };
    const up = (e: KeyboardEvent) => game.handleKey(e.key, false);
    const blur = () => {
      game.keys = {};
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [game]);

  const portraitCostume = ui.dialog?.portrait && ui.event ? (game.event?.costumes[ui.dialog.portrait] ?? undefined) : undefined;
  const chatCostume = ui.chat && ui.event ? (game.event?.costumes[ui.chat.id] ?? undefined) : undefined;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      <h1 className="sr-only">The Office: Scranton — juego de oficina</h1>
      <canvas ref={canvasRef} className="block h-full w-full" aria-label="Oficina de Dunder Mifflin Scranton" />
      {ui.phase === "playing" && <Hud ui={ui} game={game} minimapRef={minimapRef} />}
      <Toasts ui={ui} />
      <DialogBox ui={ui} game={game} costume={portraitCostume} />
      <FreeChat ui={ui} game={game} costume={chatCostume} />
      <Computer ui={ui} game={game} />
      <Journal ui={ui} game={game} />
      <PauseScreen ui={ui} game={game} />
      {ui.phase === "start" && <StartScreen onStart={(d) => game.start(d)} />}
      <EndScreen ui={ui} />
    </main>
  );
}
