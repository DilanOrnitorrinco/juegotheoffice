import { useEffect, useState } from "react";

import type { Game } from "@/game/engine/game";
import type { UIState } from "@/game/engine/state";
import type { HairStyle } from "@/game/types";

import { Portrait } from "./Portrait";

const HAIR_OPTIONS: { id: HairStyle; label: string }[] = [
  { id: "short", label: "Corto" },
  { id: "side", label: "Raya" },
  { id: "wavy", label: "Ondulado" },
  { id: "spiky", label: "De punta" },
  { id: "buzz", label: "Rapado" },
  { id: "curly", label: "Rizado" },
  { id: "bob", label: "Media melena" },
  { id: "bun", label: "Moño" },
  { id: "long", label: "Largo" },
  { id: "bald", label: "Calvo" },
];

const SKIN_SWATCHES = [
  { hex: "#f2ccb0", name: "Muy clara" },
  { hex: "#e6b48e", name: "Clara" },
  { hex: "#d4986a", name: "Media" },
  { hex: "#a86d42", name: "Morena" },
  { hex: "#6b4228", name: "Oscura" },
];

const HAIR_SWATCHES = [
  { hex: "#1e1b18", name: "Negro" },
  { hex: "#3b2a20", name: "Castaño oscuro" },
  { hex: "#6e472b", name: "Castaño" },
  { hex: "#b87a3d", name: "Castaño claro" },
  { hex: "#d8b45c", name: "Rubio" },
  { hex: "#a33c26", name: "Pelirrojo" },
  { hex: "#9a9ea4", name: "Canoso" },
];

const SHIRT_SWATCHES = [
  { hex: "#3f78a8", name: "Azul clásico" },
  { hex: "#e8eef2", name: "Camisa blanca" },
  { hex: "#b8453d", name: "Rojo granate" },
  { hex: "#3d7a5a", name: "Verde bosque" },
  { hex: "#6e528f", name: "Morado" },
  { hex: "#c97b36", name: "Mostaza" },
  { hex: "#2c3540", name: "Gris oscuro" },
  { hex: "#c46c92", name: "Rosa" },
];

const PANTS_SWATCHES = [
  { hex: "#2c3540", name: "Azul marino" },
  { hex: "#1f242b", name: "Negro" },
  { hex: "#4a433d", name: "Marrón" },
  { hex: "#33475c", name: "Pizarra" },
  { hex: "#5c4d3c", name: "Caqui" },
];

const TIE_SWATCHES = [
  { hex: "#f2c14e", name: "Dorada" },
  { hex: "#b83b36", name: "Roja" },
  { hex: "#2f6b8e", name: "Azul" },
  { hex: "#3d7a5a", name: "Verde" },
  { hex: "#6e528f", name: "Morada" },
  { hex: "#242830", name: "Negra" },
  { hex: "", name: "Sin corbata" },
];

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
    <div className="pointer-events-none fixed left-1/2 top-20 z-[60] flex w-[min(560px,92vw)] -translate-x-1/2 flex-col gap-2">
      {ui.toasts.map((t) => (
        <div key={t.id} className={`dm-panel toast-in border-l-8 px-3 py-2 text-sm font-semibold ${TONE[t.kind]}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function CinematicOverlay({ ui, game }: { ui: UIState; game: Game }) {
  const c = ui.cinematic;
  if (ui.phase !== "playing" || !c || ui.paused) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between" aria-live="polite">
      {/* Top letterbox cinema bar */}
      <div className="pointer-events-auto flex items-center justify-between gap-3 border-b border-white/15 bg-black px-4 py-3 text-white shadow-lg sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-amber-400 px-2 py-0.5 font-display text-[11px] uppercase tracking-wider text-black">
            🎬 Bienvenida #{c.sceneNumber}/{c.totalScenes}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">{c.category}</span>
          <span className="text-xs text-white/70">· {c.title}</span>
        </div>
        <button
          type="button"
          className="cursor-pointer rounded border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
          onClick={game.skipCinematic}
        >
          Saltar ⏭ <span className="ml-1 opacity-70">[Esc]</span>
        </button>
      </div>

      {/* Subtle cinema vignette frame */}
      <div className="pointer-events-none flex-1 shadow-[inset_0_0_90px_rgba(0,0,0,0.45)]" />

      {/* Bottom letterbox cinema bar with subtitle & choices */}
      <div className="pointer-events-auto border-t border-white/15 bg-black/95 px-4 py-4 text-white shadow-2xl sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-3xl items-start gap-4">
          <div className="hidden shrink-0 sm:block">
            <Portrait id="michael" costume={c.costume} size={78} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="font-display text-sm uppercase tracking-wider text-amber-300">{c.speaker}</div>
              <span className="text-[11px] uppercase tracking-widest text-white/50">Modo cinemático · 16:9</span>
            </div>
            <p className="mt-1.5 text-base leading-relaxed text-white sm:text-lg">«{c.line}»</p>

            {c.step === 1 ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {c.choices.map((ch, idx) => (
                  <button
                    key={ch.label}
                    type="button"
                    className="cursor-pointer rounded border border-amber-300/40 bg-white/10 px-3 py-2 text-left text-xs font-semibold text-white transition hover:border-amber-300 hover:bg-amber-400/20 sm:text-sm"
                    onClick={() => game.cinematicChoose(idx)}
                  >
                    <span className="mr-1.5 inline-block rounded bg-amber-300 px-1.5 py-0.5 text-[11px] font-black text-black">
                      {idx + 1}
                    </span>
                    {ch.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="cursor-pointer rounded bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-wide text-black transition hover:bg-amber-300 sm:text-sm"
                  onClick={game.cinematicNext}
                >
                  {c.step === 0 ? "Responder a Michael ▸" : "¡Empezar jornada! ▸"}{" "}
                  <span className="ml-1 opacity-75">[Enter]</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PauseScreen({ ui, game }: { ui: UIState; game: Game }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (ui.paused) setOpen(true);
  }, [ui.paused]);

  if (!ui.paused) return null;
  const look = ui.playerLook;

  return (
    <div
      className={
        open
          ? "dm-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          : "pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3"
      }
    >
      <div className={`dm-modal pointer-events-auto w-full ${open ? "max-h-[90vh] max-w-2xl overflow-y-auto p-5" : "max-w-md px-4 py-2.5"}`}>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-expanded={open}
            className="flex cursor-pointer items-center gap-2 text-left"
            onClick={() => setOpen((o) => !o)}
          >
            <h2 className={`dm-stamp text-primary ${open ? "text-3xl" : "text-xl"}`}>En pausa</h2>
            <span className="text-xs font-bold text-muted-foreground">{open ? "▾" : "▸"}</span>
          </button>
          <button
            type="button"
            aria-expanded={open}
            className="dm-btn px-2 py-1 text-xs"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Plegar ▸" : "Desplegar ▾"}
          </button>
        </div>
        {open && (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              Michael ha convocado una reunión, pero todavía no sabe de qué va a tratar. Aprovecha para retocar tu aspecto.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
              {/* Left preview column */}
              <div className="flex flex-col items-center rounded-md border border-border bg-secondary/40 p-3">
                <Portrait look={look} size={116} fullBody />
                <span className="mt-2 font-display text-xs uppercase text-primary">Tu personaje</span>
                <div className="mt-2 flex w-full flex-col gap-1.5">
                  <button type="button" className="dm-btn w-full py-1 text-xs" onClick={game.randomizePlayerLook}>
                    🎲 Aleatorio
                  </button>
                  <button type="button" className="dm-btn w-full py-1 text-xs" onClick={game.resetPlayerLook}>
                    ↺ Estilo original
                  </button>
                </div>
              </div>

              {/* Right customization controls */}
              <div className="space-y-3 text-xs">
                <div>
                  <div className="mb-1 font-display uppercase text-muted-foreground">Peinado</div>
                  <div className="flex flex-wrap gap-1">
                    {HAIR_OPTIONS.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => game.setPlayerLook({ hairStyle: h.id })}
                        className={`cursor-pointer rounded border px-2 py-1 font-semibold transition ${
                          look.hairStyle === h.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-secondary/60 hover:bg-mustard/40"
                        }`}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 font-display uppercase text-muted-foreground">Color de pelo</div>
                    <div className="flex flex-wrap gap-1.5">
                      {HAIR_SWATCHES.map((s) => (
                        <button
                          key={s.hex}
                          type="button"
                          title={s.name}
                          aria-label={`Pelo ${s.name}`}
                          onClick={() => game.setPlayerLook({ hair: s.hex })}
                          style={{ backgroundColor: s.hex }}
                          className={`h-6 w-6 cursor-pointer rounded-full border-2 transition ${
                            look.hair === s.hex ? "scale-110 border-primary ring-2 ring-mustard" : "border-border"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 font-display uppercase text-muted-foreground">Tono de piel</div>
                    <div className="flex flex-wrap gap-1.5">
                      {SKIN_SWATCHES.map((s) => (
                        <button
                          key={s.hex}
                          type="button"
                          title={s.name}
                          aria-label={`Piel ${s.name}`}
                          onClick={() => game.setPlayerLook({ skin: s.hex })}
                          style={{ backgroundColor: s.hex }}
                          className={`h-6 w-6 cursor-pointer rounded-full border-2 transition ${
                            look.skin === s.hex ? "scale-110 border-primary ring-2 ring-mustard" : "border-border"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 font-display uppercase text-muted-foreground">Vestuario / Camisa</div>
                    <div className="flex flex-wrap gap-1.5">
                      {SHIRT_SWATCHES.map((s) => (
                        <button
                          key={s.hex}
                          type="button"
                          title={s.name}
                          aria-label={`Camisa ${s.name}`}
                          onClick={() => game.setPlayerLook({ shirt: s.hex })}
                          style={{ backgroundColor: s.hex }}
                          className={`h-6 w-6 cursor-pointer rounded-full border-2 transition ${
                            look.shirt === s.hex ? "scale-110 border-primary ring-2 ring-mustard" : "border-border"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 font-display uppercase text-muted-foreground">Pantalón</div>
                    <div className="flex flex-wrap gap-1.5">
                      {PANTS_SWATCHES.map((s) => (
                        <button
                          key={s.hex}
                          type="button"
                          title={s.name}
                          aria-label={`Pantalón ${s.name}`}
                          onClick={() => game.setPlayerLook({ pants: s.hex })}
                          style={{ backgroundColor: s.hex }}
                          className={`h-6 w-6 cursor-pointer rounded-full border-2 transition ${
                            look.pants === s.hex ? "scale-110 border-primary ring-2 ring-mustard" : "border-border"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1 font-display uppercase text-muted-foreground">Corbata</div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {TIE_SWATCHES.map((s) => {
                      const active = (look.tie ?? "") === s.hex;
                      return s.hex ? (
                        <button
                          key={s.hex}
                          type="button"
                          title={s.name}
                          aria-label={`Corbata ${s.name}`}
                          onClick={() => game.setPlayerLook({ tie: s.hex })}
                          style={{ backgroundColor: s.hex }}
                          className={`h-6 w-6 cursor-pointer rounded-full border-2 transition ${
                            active ? "scale-110 border-primary ring-2 ring-mustard" : "border-border"
                          }`}
                        />
                      ) : (
                        <button
                          key="none"
                          type="button"
                          onClick={() => game.setPlayerLook({ tie: "" })}
                          className={`cursor-pointer rounded border px-2 py-0.5 font-semibold transition ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-secondary/60 hover:bg-mustard/40"
                          }`}
                        >
                          Sin corbata
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-1 font-display uppercase text-muted-foreground">Complementos</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => game.setPlayerLook({ glasses: !look.glasses })}
                      className={`cursor-pointer rounded border px-2.5 py-1 font-semibold transition ${
                        look.glasses
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-secondary/60 hover:bg-mustard/40"
                      }`}
                    >
                      👓 Gafas {look.glasses ? "✓" : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => game.setPlayerLook({ beard: !look.beard })}
                      className={`cursor-pointer rounded border px-2.5 py-1 font-semibold transition ${
                        look.beard
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-secondary/60 hover:bg-mustard/40"
                      }`}
                    >
                      🧔 Barba {look.beard ? "✓" : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => game.setPlayerLook({ dress: !look.dress })}
                      className={`cursor-pointer rounded border px-2.5 py-1 font-semibold transition ${
                        look.dress
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-secondary/60 hover:bg-mustard/40"
                      }`}
                    >
                      👗 Vestido / Falda {look.dress ? "✓" : ""}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-between gap-2 border-t border-border pt-3">
              <button type="button" className="dm-btn text-xs" onClick={game.replayWelcome}>
                🎬 Ver bienvenida de Michael
              </button>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="dm-btn" onClick={game.returnToMenu}>
                  Cambiar episodio / día
                </button>
                <button type="button" className="dm-btn dm-btn-primary" onClick={game.togglePause}>
                  Volver a la oficina
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function EndScreen({ ui }: { ui: UIState }) {
  const e = ui.end;
  const [open, setOpen] = useState(true);
  const [statsOpen, setStatsOpen] = useState(true);
  const hasEnd = Boolean(e);
  useEffect(() => {
    if (hasEnd) setOpen(true);
  }, [hasEnd]);

  if (!e) return null;
  return (
    <div className={open ? "dm-overlay fixed inset-0 z-50 flex items-center justify-center p-4" : "pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3"}>
      <div className={`dm-modal dm-memo pointer-events-auto w-full max-w-lg ${open ? "p-6" : "px-4 py-3"}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            {open && <p className="font-type text-sm uppercase text-muted-foreground">17:00 · Se acabó la jornada</p>}
            <button
              type="button"
              aria-expanded={open}
              className="flex cursor-pointer items-center gap-2 text-left"
              onClick={() => setOpen((o) => !o)}
            >
              <h2 className={`dm-stamp text-primary ${open ? "text-4xl" : "text-xl"}`}>Fin del día</h2>
              <span className="text-xs font-bold text-muted-foreground">{open ? "▾" : "▸"}</span>
            </button>
          </div>
          <button
            type="button"
            aria-expanded={open}
            className="dm-btn px-2 py-1 text-xs"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Plegar ▸" : "Desplegar ▾"}
          </button>
        </div>
        {open && (
          <>
            <div className="mt-4 rounded-md border-2 border-mustard bg-mustard/30 p-3 text-center">
              <div className="text-3xl">🏆</div>
              <div className="font-display">{e.award}</div>
              <p className="mt-1 text-sm italic">{e.awardLine}</p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                aria-expanded={statsOpen}
                className="flex w-full cursor-pointer items-center justify-between font-display text-xs uppercase text-muted-foreground hover:text-primary"
                onClick={() => setStatsOpen((s) => !s)}
              >
                <span>Resumen de resultados</span>
                <span>{statsOpen ? "▾" : "▸"}</span>
              </button>
              {statsOpen && (
                <ul className="mt-2 space-y-1.5">
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
              )}
            </div>
            <button type="button" className="dm-btn dm-btn-primary mt-5 w-full" onClick={() => window.location.reload()}>
              Jugar otro día
            </button>
          </>
        )}
      </div>
    </div>
  );
}
