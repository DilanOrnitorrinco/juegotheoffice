import type { Game } from "@/game/engine/game";
import type { UIState } from "@/game/engine/state";
import type { CostumeKind } from "@/game/types";

import { Portrait } from "./Portrait";

export function DialogBox({ ui, game, costume }: { ui: UIState; game: Game; costume?: CostumeKind }) {
  const d = ui.dialog;
  if (!d) return null;
  return (
    <div className="fixed inset-x-0 bottom-3 z-40 flex justify-center px-3">
      <div className="dm-modal w-full max-w-3xl p-4">
        <div className="flex items-start gap-3">
          {d.portrait ? <Portrait id={d.portrait} costume={costume} /> : <div className="grid h-[76px] w-[76px] place-items-center rounded-md border-2 border-border bg-secondary text-4xl">🥤</div>}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-display text-lg leading-none text-primary">{d.speaker}</div>
                <div className="text-xs font-semibold text-muted-foreground">{d.role}</div>
              </div>
              <button type="button" className="dm-btn px-2 py-1 text-xs" onClick={game.closeDialog}>
                Salir ✕
              </button>
            </div>
            <p key={d.line} className="toast-in mt-2 text-[15px] leading-snug">
              «{d.line}»
            </p>
          </div>
        </div>
        <div className="mt-3 grid max-h-[38vh] gap-1.5 overflow-auto sm:grid-cols-2">
          {d.options.map((o, i) => (
            <button key={i + o.label} type="button" data-tag={o.tag} className="dm-choice" onClick={() => game.choose(i)}>
              <span className="dm-kbd mr-1.5">{i + 1}</span>
              {o.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <button type="button" className="dm-btn px-2 py-1 text-xs" disabled={!d.canBack} onClick={game.dialogBack}>
            ← Volver
          </button>
          <span className="text-xs text-muted-foreground">El tiempo se detiene mientras hablas</span>
        </div>
      </div>
    </div>
  );
}
