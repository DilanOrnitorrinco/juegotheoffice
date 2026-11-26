import { useEffect, useState } from "react";

import type { Game } from "@/game/engine/game";
import type { UIState } from "@/game/engine/state";
import type { CostumeKind } from "@/game/types";

import { Portrait } from "./Portrait";

export function DialogBox({
  ui,
  game,
  costume,
}: {
  ui: UIState;
  game: Game;
  costume?: CostumeKind | undefined;
}) {
  const d = ui.dialog;
  const [open, setOpen] = useState(true);
  const dialogSpeaker = d?.speaker ?? null;

  useEffect(() => {
    if (dialogSpeaker) setOpen(true);
  }, [dialogSpeaker]);

  if (!d) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 top-20 z-40 flex items-end justify-center px-3">
      <div className="dm-modal pointer-events-auto flex max-h-full w-full max-w-3xl flex-col p-4">
        {!open ? (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-expanded={open}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
              onClick={() => setOpen(true)}
            >
              <span className="font-display text-sm text-primary">{d.speaker}</span>
              <span className="truncate text-xs text-muted-foreground">«{d.line}»</span>
              <span className="shrink-0 text-xs font-bold text-primary">Desplegar ▾</span>
            </button>
            <button
              type="button"
              className="dm-btn shrink-0 px-2 py-1 text-xs"
              onClick={game.closeDialog}
            >
              Salir ✕
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              {d.portrait ? (
                <Portrait id={d.portrait} costume={costume} />
              ) : (
                <div className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-md border-2 border-border bg-secondary text-4xl">
                  🥤
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-lg leading-none text-primary">
                      {d.speaker}
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground">{d.role}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      aria-expanded={open}
                      className="dm-btn px-2 py-1 text-xs"
                      onClick={() => setOpen(false)}
                      title="Plegar diálogo"
                    >
                      Plegar ▸
                    </button>
                    <button
                      type="button"
                      className="dm-btn px-2 py-1 text-xs"
                      onClick={game.closeDialog}
                    >
                      Salir ✕
                    </button>
                  </div>
                </div>
                <p
                  key={d.line}
                  className="toast-in mt-2 max-h-28 overflow-auto text-[15px] leading-snug"
                >
                  «{d.line}»
                </p>
              </div>
            </div>
            <div className="mt-3 grid min-h-0 flex-1 gap-1.5 overflow-auto sm:grid-cols-2">
              {d.options.map((o, i) => (
                <button
                  key={i + o.label}
                  type="button"
                  data-tag={o.tag}
                  className="dm-choice"
                  onClick={() => game.choose(i)}
                >
                  <span className="dm-kbd mr-1.5">{i + 1}</span>
                  {o.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                className="dm-btn px-2 py-1 text-xs"
                disabled={!d.canBack}
                onClick={game.dialogBack}
              >
                ← Volver
              </button>
              <span className="text-xs text-muted-foreground">
                El tiempo se detiene mientras hablas
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
