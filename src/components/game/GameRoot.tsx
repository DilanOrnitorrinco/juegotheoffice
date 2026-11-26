import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Game } from "@/game/engine/game";
import { renderMinimap } from "@/game/engine/render";
import { OfficeScene3D } from "@/game/engine/render3d/OfficeScene3D";
import {
  aiChat,
  aiChatImpact,
  aiDailyConvos,
  aiDailyMissions,
  aiMeetingIntervene,
  aiNpcApproach,
  aiSalesStart,
  aiSalesTurn,
} from "@/lib/ai.functions";

import { Computer } from "./Computer";
import { DialogBox } from "./DialogBox";
import { FreeChat } from "./FreeChat";
import { Hud } from "./Hud";
import { Journal } from "./Journal";
import {
  CinematicOverlay,
  EndScreen,
  MeetingCinemaOverlay,
  MeetingModal,
  PauseScreen,
  Toasts,
} from "./Overlays";
import { StartScreen } from "./StartScreen";

export function GameRoot() {
  const [game] = useState(() => new Game());
  const ui = useSyncExternalStore(game.subscribe, game.getSnapshot, game.getSnapshot);
  const viewportRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const salesStartFn = useServerFn(aiSalesStart);
  const salesTurnFn = useServerFn(aiSalesTurn);
  const chatFn = useServerFn(aiChat);
  const dailyConvosFn = useServerFn(aiDailyConvos);
  const dailyMissionsFn = useServerFn(aiDailyMissions);
  const chatImpactFn = useServerFn(aiChatImpact);
  const meetingInterveneFn = useServerFn(aiMeetingIntervene);
  const npcApproachFn = useServerFn(aiNpcApproach);

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
      dailyConvos: async (input) => {
        const r = await dailyConvosFn({ data: input });
        if (!r.ok) throw new Error(r.error);
        return r.conversations;
      },
      dailyMissions: async (input) => {
        const r = await dailyMissionsFn({ data: input });
        if (!r.ok) throw new Error(r.error);
        return r.missions;
      },
      chatImpact: async (input) => {
        const r = await chatImpactFn({ data: input });
        if (!r.ok) throw new Error(r.error);
        return r.impact;
      },
      meetingIntervene: async (input) => {
        const r = await meetingInterveneFn({ data: input });
        if (!r.ok) throw new Error(r.error);
        return r.result;
      },
      npcApproach: async (input) => {
        const r = await npcApproachFn({ data: input });
        if (!r.ok) throw new Error(r.error);
        return r.result;
      },
    };
    game.emit();
  }, [
    game,
    salesStartFn,
    salesTurnFn,
    chatFn,
    dailyConvosFn,
    dailyMissionsFn,
    chatImpactFn,
    meetingInterveneFn,
    npcApproachFn,
  ]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const overlay = overlayRef.current;
    if (!viewport || !overlay) return;

    const overlayCtx = overlay.getContext("2d")!;
    if (import.meta.env.DEV) (window as unknown as { __game?: Game }).__game = game;

    const scene3d = new OfficeScene3D(viewport);

    let vw = window.innerWidth;
    let vh = window.innerHeight;
    let dpr = scene3d.softwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      dpr = scene3d.softwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      overlay.width = vw * dpr;
      overlay.height = vh * dpr;
      scene3d.resize(vw, vh);
    };
    resize();
    window.addEventListener("resize", resize);

    // Free mouse-move look (no click required), drag, optional pointer-lock, and wheel-zoom for 3D Over-the-Shoulder camera
    let dragging = false;
    let dragPointerId = -1;
    let lastX = 0;
    let lastY = 0;
    let hasHoverPos = false;
    let hoverLastX = 0;
    let hoverLastY = 0;
    const applyLookDelta = (dx: number, dy: number, sensitivity = 1) => {
      if (game.frozen || game.phase !== "playing") return;
      const cur = scene3d.getLookAngles();
      const yaw = cur.yaw + dx * 0.0046 * sensitivity;
      const pitch = cur.pitch + dy * 0.0035 * sensitivity;
      scene3d.setLookAngles(yaw, pitch);
      game.setCameraYaw(yaw);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 2) return;
      if (game.frozen) return;
      dragging = true;
      dragPointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      hoverLastX = e.clientX;
      hoverLastY = e.clientY;
      hasHoverPos = true;
      try {
        viewport.setPointerCapture(e.pointerId);
      } catch {
        // ignore if unsupported
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (document.pointerLockElement === viewport) {
        hasHoverPos = false;
        applyLookDelta(e.movementX, e.movementY, 1.05);
        return;
      }
      if (dragging && e.pointerId === dragPointerId) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        hoverLastX = e.clientX;
        hoverLastY = e.clientY;
        hasHoverPos = true;
        applyLookDelta(dx, dy, 1.12);
        return;
      }
      if (e.pointerType === "touch" || game.frozen || game.phase !== "playing") {
        hasHoverPos = false;
        return;
      }
      const onSceneCanvas = e.target === viewport || e.target === scene3d.renderer.domElement;
      if (!onSceneCanvas) {
        hasHoverPos = false;
        return;
      }
      if (!hasHoverPos) {
        hoverLastX = e.clientX;
        hoverLastY = e.clientY;
        hasHoverPos = true;
        return;
      }
      const dx = e.clientX - hoverLastX;
      const dy = e.clientY - hoverLastY;
      hoverLastX = e.clientX;
      hoverLastY = e.clientY;
      if (Math.hypot(dx, dy) > 120) return;
      applyLookDelta(dx, dy, 0.92);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === dragPointerId) {
        dragging = false;
        dragPointerId = -1;
        try {
          if (viewport.hasPointerCapture(e.pointerId)) viewport.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
    };
    const onPointerLeave = () => {
      hasHoverPos = false;
    };
    const onDoubleClick = () => {
      if (game.frozen) return;
      if (document.pointerLockElement === viewport) {
        document.exitPointerLock?.();
      } else {
        try {
          viewport.requestPointerLock?.();
        } catch {
          // iframe may restrict pointer lock; hover-to-look remains active
        }
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (game.frozen || game.phase !== "playing") return;
      scene3d.adjustZoom(e.deltaY * 0.0018);
    };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("dblclick", onDoubleClick);
    viewport.addEventListener("wheel", onWheel, { passive: true });
    viewport.addEventListener("contextmenu", onContextMenu);

    // Frame loop with software-WebGL compositor pacing
    let last = performance.now();
    let frame = 0;
    let prevPhase = game.phase;
    let prevDay = game.dayNumber;
    let alive = true;
    let rafId = 0;
    let timerId = 0;

    const afterSoftwareDraw = (next: () => void) => {
      const gl = scene3d.renderer.getContext() as WebGL2RenderingContext | null;
      const sync = gl && "fenceSync" in gl ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      const poll = () => {
        if (!alive) return;
        if (sync && gl) {
          const res = gl.clientWaitSync(sync, gl.SYNC_FLUSH_COMMANDS_BIT, 0);
          if (res === gl.TIMEOUT_EXPIRED) {
            timerId = window.setTimeout(poll, 16);
            return;
          }
          gl.deleteSync(sync);
        }
        rafId = requestAnimationFrame(() => {
          if (!alive) return;
          timerId = window.setTimeout(next, 80);
        });
      };
      poll();
    };

    const tick = () => {
      if (!alive) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if ((prevPhase !== "playing" && game.phase === "playing") || prevDay !== game.dayNumber) {
        scene3d.resetCamera(game.cameraYaw);
      }
      prevPhase = game.phase;
      prevDay = game.dayNumber;

      if (game.frozen && document.pointerLockElement === viewport) {
        document.exitPointerLock?.();
      }
      if (game.frozen || game.phase !== "playing") {
        hasHoverPos = false;
      }

      game.update(dt);
      scene3d.renderFrame(game, dt);
      scene3d.drawScreenOverlay(overlayCtx, game, vw, vh, dpr);

      const mm = minimapRef.current;
      if (mm && game.phase === "playing" && frame % 3 === 0) {
        const mw = 220;
        const mh = 154;
        if (mm.width !== mw * dpr) {
          mm.width = mw * dpr;
          mm.height = mh * dpr;
        }
        renderMinimap(mm.getContext("2d")!, game, mw, mh, dpr);
      }
      frame++;

      if (scene3d.softwareGl) afterSoftwareDraw(tick);
      else rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping(e) || game.phase !== "playing") return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key))
        e.preventDefault();
      if (e.repeat && e.key.toLowerCase() === "e") return;
      game.handleKey(e.key, true);
    };
    const up = (e: KeyboardEvent) => game.handleKey(e.key, false);
    const blur = () => {
      game.keys = {};
      dragging = false;
      hasHoverPos = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      window.removeEventListener("resize", resize);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("dblclick", onDoubleClick);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      if (document.pointerLockElement === viewport) document.exitPointerLock?.();
      scene3d.dispose();
    };
  }, [game]);

  const portraitCostume =
    ui.dialog?.portrait && ui.event
      ? (game.event?.costumes[ui.dialog.portrait] ?? undefined)
      : undefined;
  const chatCostume =
    ui.chat && ui.event ? (game.event?.costumes[ui.chat.id] ?? undefined) : undefined;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      <h1 className="sr-only">The Office: Scranton — juego de oficina en 3D</h1>
      <div
        ref={viewportRef}
        className="absolute inset-0 h-full w-full cursor-crosshair"
        aria-label="Oficina de Dunder Mifflin Scranton en 3D"
      />
      <canvas
        ref={overlayRef}
        className="pointer-events-none fixed inset-0 z-10 h-full w-full"
        aria-hidden="true"
      />
      {ui.phase === "playing" && <Hud ui={ui} game={game} minimapRef={minimapRef} />}
      <CinematicOverlay ui={ui} game={game} />
      <MeetingCinemaOverlay ui={ui} game={game} />
      <Toasts ui={ui} />
      <DialogBox ui={ui} game={game} costume={portraitCostume} />
      <FreeChat ui={ui} game={game} costume={chatCostume} />
      <MeetingModal ui={ui} game={game} />
      <Computer ui={ui} game={game} />
      <Journal ui={ui} game={game} />
      <PauseScreen ui={ui} game={game} />
      {ui.phase === "start" && (
        <StartScreen
          ui={ui}
          onResetCareer={game.resetCareer}
          onStart={(d, ep) => game.start(d, ep)}
        />
      )}
      <EndScreen ui={ui} game={game} />
    </main>
  );
}
