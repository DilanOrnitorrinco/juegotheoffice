import type { Game } from "@/game/engine/game";
import type { UIState } from "@/game/engine/state";

const TONE: Record<string, string> = {
  info: "border-border",
  mission: "border-teal",
  money: "border-mustard",
  gossip: "border-primary",
  event: "border-mustard",
  warn: "border-destructive",
};

export function Toasts({ ui }: { ui: UIState }) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-24 z-[60] flex w-[min(560px,92vw)] -translate-x-1/2 flex-col gap-2">
      {ui.toasts.map((t) => (
        <div key={t.id} className={`dm-panel toast-in border-l-8 px-3 py-2 text-sm font-semibold ${TONE[t.kind]}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function PauseScreen({ ui, game }: { ui: UIState; game: Game }) {
  if (!ui.paused) return null;
  return (
    <div className="dm-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="dm-modal max-w-md p-6 text-center">
        <h2 className="dm-stamp text-3xl text-primary">En pausa</h2>
        <p className="mt-2">Michael ha convocado una reunión, pero todavía no sabe de qué va a tratar.</p>
        <button type="button" className="dm-btn dm-btn-primary mt-4" onClick={game.togglePause}>
          Volver a la oficina
        </button>
      </div>
    </div>
  );
}

export function EndScreen({ ui }: { ui: UIState }) {
  const e = ui.end;
  if (!e) return null;
  return (
    <div className="dm-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="dm-modal dm-memo w-full max-w-lg p-6">
        <p className="font-type text-sm uppercase text-muted-foreground">17:00 · Se acabó la jornada</p>
        <h2 className="dm-stamp text-4xl text-primary">Fin del día</h2>
        <div className="mt-4 rounded-md border-2 border-mustard bg-mustard/30 p-3 text-center">
          <div className="text-3xl">🏆</div>
          <div className="font-display">{e.award}</div>
          <p className="mt-1 text-sm italic">{e.awardLine}</p>
        </div>
        <ul className="mt-4 space-y-1.5">
          <li>
            💼 <b>Ventas:</b> ${e.money} ({e.sales} cerradas de {e.calls} llamadas)
          </li>
          <li>
            📋 <b>Misiones:</b> {e.missionsDone}/{e.missionsTotal}
          </li>
          <li>
            🗣️ <b>Cotilleos escuchados:</b> {e.gossip}/{e.gossipTotal}
          </li>
          <li>
            🏆 <b>Dundies encontrados:</b> {e.dundies}
          </li>
          <li>
            ★ <b>Reputación:</b> {e.rep}
          </li>
        </ul>
        <button type="button" className="dm-btn dm-btn-primary mt-5 w-full" onClick={() => window.location.reload()}>
          Jugar otro día
        </button>
      </div>
    </div>
  );
}
