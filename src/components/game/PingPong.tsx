import { useEffect, useRef } from "react";

import type { Game } from "@/game/engine/game";
import type { PingPongUI, UIState } from "@/game/engine/state";

export function PingPong({ ui, game }: { ui: UIState; game: Game }) {
  const pp = ui.pingpong;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pp) return;
    const g = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = pp.fieldW * dpr;
    canvas.height = pp.fieldH * dpr;
    draw(g, pp, dpr);
  });

  if (!pp) return null;

  const won = pp.status === "ended" && pp.me > pp.them;
  const oppFirst = pp.opponentName.split(" ")[0];

  return (
    <div className="dm-overlay fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="dm-modal pointer-events-auto flex w-full max-w-3xl flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-display text-xl text-primary">🏓 Ping-pong · Almacén</div>
            <div className="text-xs font-semibold text-muted-foreground">Contrincante: {pp.opponentName}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-type text-2xl font-bold tabular-nums">
              <span className="text-primary">{pp.me}</span>
              <span className="text-muted-foreground"> – </span>
              <span className="text-destructive">{pp.them}</span>
            </span>
            <button type="button" className="dm-btn px-2 py-1 text-xs" onClick={game.closePingPong}>
              Salir ✕
            </button>
          </div>
        </div>

        <div className="relative mt-3 overflow-hidden rounded-md border-2 border-border bg-[oklch(0.18_0.02_245)]">
          <canvas ref={canvasRef} style={{ width: "100%", aspectRatio: `${pp.fieldW} / ${pp.fieldH}` }} className="block" aria-label="Mesa de ping-pong" />
          {pp.status === "point" && pp.flash && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="toast-in rounded bg-black/70 px-4 py-2 font-display text-xl text-mustard">{pp.flash}</span>
            </div>
          )}
          {pp.status === "ended" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75">
              <span className={`font-display text-3xl ${won ? "text-teal" : "text-destructive"}`}>
                {won ? "¡Victoria!" : "Derrota"}
              </span>
              <span className="font-type text-lg text-white">
                {pp.me} – {pp.them} contra {oppFirst}
              </span>
              <span className="max-w-sm text-center text-sm text-white/80">
                {won ? "¡Le has ganado en el almacén! +2 ★ de reputación y $5 de apuesta." : `«${oppFirst} celebra con un gruñido. Revancha en una hora.»`}
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Muévete con <b>W</b>/<b>S</b> o <b>↑</b>/<b>↓</b> · Primer o en llegar a {pp.target} gana
          </span>
          {pp.status === "ended" ? (
            <div className="flex gap-2">
              <button type="button" className="dm-btn dm-btn-primary text-xs" onClick={game.pingPongRestart}>
                🏓 Revancha
              </button>
              <button type="button" className="dm-btn text-xs" onClick={game.closePingPong}>
                Volver a la oficina
              </button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">El tiempo del juego se detiene mientras juegas</span>
          )}
        </div>
      </div>
    </div>
  );
}

function draw(g: CanvasRenderingContext2D, pp: PingPongUI, dpr: number) {
  const W = pp.fieldW;
  const H = pp.fieldH;
  g.save();
  g.scale(dpr, dpr);
  g.clearRect(0, 0, W, H);

  const wallPad = 18;
  g.fillStyle = "#123";
  g.fillRect(0, 0, W, H);

  g.strokeStyle = "rgba(255,255,255,0.18)";
  g.lineWidth = 2;
  g.setLineDash([10, 12]);
  g.beginPath();
  g.moveTo(W / 2, wallPad);
  g.lineTo(W / 2, H - wallPad);
  g.stroke();
  g.setLineDash([]);

  g.strokeStyle = "rgba(255,255,255,0.25)";
  g.lineWidth = 3;
  g.strokeRect(wallPad, wallPad, W - wallPad * 2, H - wallPad * 2);

  const paddleW = 12;
  g.fillStyle = "#e8eef2";
  g.fillRect(wallPad, pp.playerY - pp.paddleH / 2, paddleW, pp.paddleH);

  g.fillStyle = "#b8453d";
  g.fillRect(W - wallPad - paddleW, pp.aiY - pp.paddleH / 2, paddleW, pp.paddleH);

  if (pp.status === "playing") {
    g.fillStyle = "#f2c14e";
    g.beginPath();
    g.arc(pp.ball.x, pp.ball.y, 8, 0, Math.PI * 2);
    g.fill();
  }

  g.fillStyle = "rgba(255,255,255,0.12)";
  g.font = "700 64px 'Archivo Black', sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(pp.me), W * 0.28, H / 2);
  g.fillText(String(pp.them), W * 0.72, H / 2);

  g.restore();
}
