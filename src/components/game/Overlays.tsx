import { useEffect, useState } from "react";

import { charById } from "@/game/data/characters";
import type { Game } from "@/game/engine/game";
import type { UIState } from "@/game/engine/state";
import { EXCLUSIVE_SKINS, type HairStyle, type TopKind } from "@/game/types";

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

const TOP_OPTIONS: { id: TopKind; label: string }[] = [
  { id: "shirt", label: "Camisa" },
  { id: "suit", label: "Traje" },
  { id: "cardigan", label: "Cárdigan" },
  { id: "vest", label: "Chaleco" },
  { id: "short_sleeve", label: "Manga corta" },
];

const JACKET_SWATCHES = [
  { hex: "#2c3442", name: "Azul marino" },
  { hex: "#3a3532", name: "Carbón" },
  { hex: "#47525e", name: "Gris pizarra" },
  { hex: "#7c3b46", name: "Burdeos" },
  { hex: "#3d6b56", name: "Verde bosque" },
  { hex: "#6b543c", name: "Marrón" },
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
  if (ui.meetingCinema) return null;
  return (
    <div
      className={`pointer-events-none fixed left-1/2 z-[60] flex w-[min(560px,92vw)] -translate-x-1/2 flex-col gap-2 ${
        ui.meetingNotice ? "top-[13.5rem]" : "top-20"
      }`}
    >
      {ui.toasts.map((t) => (
        <div
          key={t.id}
          className={`dm-panel toast-in border-l-8 px-3 py-2 text-sm font-semibold ${TONE[t.kind]}`}
        >
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
    <div
      className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between"
      aria-live="polite"
    >
      {/* Top letterbox cinema bar */}
      <div className="pointer-events-auto flex items-center justify-between gap-3 border-b border-white/15 bg-black px-4 py-3 text-white shadow-lg sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-amber-400 px-2 py-0.5 font-display text-[11px] uppercase tracking-wider text-black">
            🎬 Bienvenida #{c.sceneNumber}/{c.totalScenes}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
            {c.category}
          </span>
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
              <div className="font-display text-sm uppercase tracking-wider text-amber-300">
                {c.speaker}
              </div>
              <span className="text-[11px] uppercase tracking-widest text-white/50">
                Modo cinemático · 16:9
              </span>
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

export function MeetingCinemaOverlay({ ui, game }: { ui: UIState; game: Game }) {
  const mc = ui.meetingCinema;
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  if (ui.phase !== "playing" || !mc || ui.paused) return null;

  const speakerCostume = ui.event ? (game.event?.costumes[mc.speakerId] ?? undefined) : undefined;

  const submit = async (textOverride?: string) => {
    const text = (textOverride ?? draft).trim();
    if (!text || loading) return;
    if (!textOverride) setDraft("");
    setLoading(true);
    try {
      await game.interveneInMeeting(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between"
      aria-live="polite"
    >
      {/* Top 16:9 letterbox bar */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 border-b border-white/15 bg-black px-4 py-2.5 text-white shadow-lg sm:px-6 sm:py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-amber-400 px-2 py-0.5 font-display text-[11px] uppercase tracking-wider text-black">
            🎬 Sala de Conferencias
          </span>
          <span className="text-xs font-bold uppercase tracking-wide text-amber-200">
            {mc.title}
          </span>
          <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/90">
            🎥 {mc.cameraLabel}
          </span>
          <span className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/75 tabular-nums">
            🪑 {mc.seatedCount}/{mc.totalCount}
          </span>
        </div>
        <button
          type="button"
          className="cursor-pointer rounded border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
          onClick={game.leaveMeetingCinema}
        >
          Salir <span className="ml-1 opacity-70">[Esc]</span>
        </button>
      </div>

      {/* Unobstructed 3D multi-angle movie viewport */}
      <div className="pointer-events-none flex-1 shadow-[inset_0_0_95px_rgba(0,0,0,0.42)]" />

      {/* Bottom 16:9 letterbox bar: subtitles + action + inline [H] intervention */}
      <div className="pointer-events-auto border-t border-white/15 bg-black/95 px-4 py-3 text-white shadow-2xl sm:px-6 sm:py-4">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="hidden shrink-0 sm:block">
              <Portrait id={mc.speakerId} costume={speakerCostume} size={68} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-sm uppercase tracking-wider text-amber-300">
                    {mc.speakerName}
                  </span>
                  <span className="rounded border border-amber-300/35 bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                    {mc.speakerAction}
                  </span>
                </div>
                {!mc.handRaised ? (
                  <button
                    type="button"
                    className="cursor-pointer rounded bg-amber-400 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-black transition hover:bg-amber-300"
                    onClick={game.openMeeting}
                  >
                    ✋ Levantar la mano <span className="ml-1 opacity-75">[H]</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="cursor-pointer rounded border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
                    onClick={game.closeMeeting}
                  >
                    Bajar mano <span className="ml-1 opacity-75">[Esc]</span>
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-white sm:text-base">«{mc.line}»</p>
            </div>
          </div>

          {mc.handRaised && (
            <div className="mt-3 border-t border-white/15 pt-3">
              {mc.entries.length > 0 && (
                <div className="mb-2 max-h-28 space-y-1.5 overflow-y-auto pr-1 text-xs">
                  {mc.entries.slice(-4).map((entry, idx) => (
                    <div
                      key={`${entry.clock}_${idx}`}
                      className={`rounded px-2.5 py-1.5 ${
                        entry.kind === "player"
                          ? "bg-amber-400/20 text-amber-100"
                          : entry.kind === "note"
                            ? "bg-white/10 italic text-amber-200"
                            : "bg-white/5 text-white/90"
                      }`}
                    >
                      <span className="font-bold">
                        {entry.kind === "player" ? "✋ " : ""}
                        {entry.name}:
                      </span>{" "}
                      <span>{entry.text}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mb-2 flex flex-wrap gap-1.5">
                {mc.suggestedLines.map((line) => (
                  <button
                    key={line}
                    type="button"
                    disabled={loading}
                    className="cursor-pointer rounded border border-white/20 bg-white/10 px-2.5 py-1 text-left text-[11px] font-medium text-white transition hover:border-amber-300 hover:bg-amber-400/20 disabled:opacity-50"
                    onClick={() => void submit(line)}
                  >
                    “{line}”
                  </button>
                ))}
              </div>

              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={loading}
                  maxLength={400}
                  placeholder="Has levantado la mano: di algo a toda la sala…"
                  className="flex-1 rounded border border-white/25 bg-white/10 px-3 py-1.5 text-sm text-white placeholder:text-white/50 focus:border-amber-300 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !draft.trim()}
                  className="cursor-pointer rounded bg-amber-400 px-4 py-1.5 text-xs font-black uppercase text-black transition hover:bg-amber-300 disabled:opacity-50"
                >
                  {loading ? "Hablando…" : "✋ Intervenir"}
                </button>
              </form>
            </div>
          )}
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
      <div
        className={`dm-modal pointer-events-auto w-full ${open ? "max-h-[90vh] max-w-2xl overflow-y-auto p-5" : "max-w-md px-4 py-2.5"}`}
      >
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
              Michael ha convocado una reunión, pero todavía no sabe de qué va a tratar. Aprovecha
              para retocar tu aspecto.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
              {/* Left preview column */}
              <div className="flex flex-col items-center rounded-md border border-border bg-secondary/40 p-3">
                <Portrait look={look} costume={ui.playerSkin ?? undefined} size={116} fullBody />
                <span className="mt-2 text-center font-display text-xs uppercase text-primary">
                  {ui.playerSkin
                    ? (EXCLUSIVE_SKINS.find((s) => s.id === ui.playerSkin)?.name ?? "Tu personaje")
                    : "Tu personaje"}
                </span>
                <div className="mt-2 flex w-full flex-col gap-1.5">
                  {ui.unlockedSkins.length > 0 && ui.playerSkin && (
                    <button
                      type="button"
                      className="dm-btn dm-btn-accent w-full py-1 text-xs"
                      onClick={() => game.setPlayerSkin(null)}
                    >
                      👔 Quitar skin especial
                    </button>
                  )}
                  <button
                    type="button"
                    className="dm-btn w-full py-1 text-xs"
                    onClick={game.randomizePlayerLook}
                  >
                    🎲 Aleatorio
                  </button>
                  <button
                    type="button"
                    className="dm-btn w-full py-1 text-xs"
                    onClick={game.resetPlayerLook}
                  >
                    ↺ Estilo original
                  </button>
                </div>
              </div>

              {/* Right customization controls */}
              <div className="space-y-3 text-xs">
                {ui.unlockedSkins.length > 0 && (
                  <div className="rounded-md border-2 border-amber-500/80 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 p-2.5">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="font-display text-xs uppercase text-amber-800">
                        👑 Skins exclusivas desbloqueadas
                      </span>
                      <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-black uppercase text-black">
                        {ui.unlockedSkins.length} VIP
                      </span>
                    </div>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => game.setPlayerSkin(null)}
                        className={`cursor-pointer rounded border p-2 text-left transition ${
                          ui.playerSkin === null
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-card/85 hover:bg-mustard/30"
                        }`}
                      >
                        <div className="font-bold">
                          👔 Ropa de oficina {ui.playerSkin === null ? "✓" : ""}
                        </div>
                        <div
                          className={`mt-0.5 text-[10px] ${ui.playerSkin === null ? "opacity-85" : "text-muted-foreground"}`}
                        >
                          Tu aspecto personalizado normal
                        </div>
                      </button>
                      {EXCLUSIVE_SKINS.filter((s) => ui.unlockedSkins.includes(s.id)).map((sk) => {
                        const active = ui.playerSkin === sk.id;
                        return (
                          <button
                            key={sk.id}
                            type="button"
                            onClick={() => game.setPlayerSkin(sk.id)}
                            className={`cursor-pointer rounded border p-2 text-left transition ${
                              active
                                ? "border-amber-500 bg-gradient-to-br from-rose-900 to-amber-800 text-amber-100 shadow-md ring-2 ring-amber-400"
                                : "border-amber-400/70 bg-card/90 hover:bg-amber-500/15"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 font-bold">
                              <span>
                                🕉️ {sk.name} {active ? "✓" : ""}
                              </span>
                            </div>
                            <div
                              className={`mt-0.5 text-[10px] ${active ? "text-amber-200/90" : "text-muted-foreground"}`}
                            >
                              {sk.subtitle}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
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
                    <div className="mb-1 font-display uppercase text-muted-foreground">
                      Color de pelo
                    </div>
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
                            look.hair === s.hex
                              ? "scale-110 border-primary ring-2 ring-mustard"
                              : "border-border"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 font-display uppercase text-muted-foreground">
                      Tono de piel
                    </div>
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
                            look.skin === s.hex
                              ? "scale-110 border-primary ring-2 ring-mustard"
                              : "border-border"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 font-display uppercase text-muted-foreground">
                      Vestuario / Camisa
                    </div>
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
                            look.shirt === s.hex
                              ? "scale-110 border-primary ring-2 ring-mustard"
                              : "border-border"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 font-display uppercase text-muted-foreground">
                      Pantalón
                    </div>
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
                            look.pants === s.hex
                              ? "scale-110 border-primary ring-2 ring-mustard"
                              : "border-border"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1 font-display uppercase text-muted-foreground">
                    Estilo de prenda
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {TOP_OPTIONS.map((opt) => {
                      const active = (look.topKind ?? "shirt") === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            game.setPlayerLook({
                              topKind: opt.id,
                              ...(opt.id === "suit" || opt.id === "cardigan" || opt.id === "vest"
                                ? { jacketColor: look.jacketColor || "#2c3442" }
                                : { jacketColor: "" }),
                            })
                          }
                          className={`cursor-pointer rounded border px-2 py-1 font-semibold transition ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-secondary/60 hover:bg-mustard/40"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {(look.topKind === "suit" ||
                  look.topKind === "cardigan" ||
                  look.topKind === "vest") && (
                  <div>
                    <div className="mb-1 font-display uppercase text-muted-foreground">
                      Color de chaqueta / suéter
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {JACKET_SWATCHES.map((s) => (
                        <button
                          key={s.hex}
                          type="button"
                          title={s.name}
                          aria-label={`Chaqueta ${s.name}`}
                          onClick={() => game.setPlayerLook({ jacketColor: s.hex })}
                          style={{ backgroundColor: s.hex }}
                          className={`h-6 w-6 cursor-pointer rounded-full border-2 transition ${
                            (look.jacketColor ?? "#2c3442") === s.hex
                              ? "scale-110 border-primary ring-2 ring-mustard"
                              : "border-border"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-1 font-display uppercase text-muted-foreground">Corbata</div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {TIE_SWATCHES.map((s) => {
                      const active = (look.tie ?? "") === s.hex && !look.bowTie;
                      return s.hex ? (
                        <button
                          key={s.hex}
                          type="button"
                          title={s.name}
                          aria-label={`Corbata ${s.name}`}
                          onClick={() => game.setPlayerLook({ tie: s.hex, bowTie: "" })}
                          style={{ backgroundColor: s.hex }}
                          className={`h-6 w-6 cursor-pointer rounded-full border-2 transition ${
                            active
                              ? "scale-110 border-primary ring-2 ring-mustard"
                              : "border-border"
                          }`}
                        />
                      ) : (
                        <button
                          key="none"
                          type="button"
                          onClick={() => game.setPlayerLook({ tie: "", bowTie: "" })}
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
                  <div className="mb-1 font-display uppercase text-muted-foreground">
                    Complementos
                  </div>
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
                      onClick={() => game.setPlayerLook({ mustache: !look.mustache })}
                      className={`cursor-pointer rounded border px-2.5 py-1 font-semibold transition ${
                        look.mustache
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-secondary/60 hover:bg-mustard/40"
                      }`}
                    >
                      🥸 Bigote {look.mustache ? "✓" : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        game.setPlayerLook({
                          bowTie: look.bowTie ? "" : "#7e2538",
                          tie: "",
                        })
                      }
                      className={`cursor-pointer rounded border px-2.5 py-1 font-semibold transition ${
                        look.bowTie
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-secondary/60 hover:bg-mustard/40"
                      }`}
                    >
                      🎀 Pajarita {look.bowTie ? "✓" : ""}
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

export function EndScreen({ ui, game }: { ui: UIState; game: Game }) {
  const e = ui.end;
  const [open, setOpen] = useState(true);
  const [statsOpen, setStatsOpen] = useState(true);
  const [eventsOpen, setEventsOpen] = useState(true);
  const hasEnd = Boolean(e);
  useEffect(() => {
    if (hasEnd) setOpen(true);
  }, [hasEnd]);

  if (!e) return null;
  return (
    <div
      className={
        open
          ? "dm-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          : "pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3"
      }
    >
      <div
        className={`dm-modal dm-memo pointer-events-auto w-full max-w-lg ${open ? "max-h-[90vh] overflow-y-auto p-6" : "px-4 py-3"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            {open && (
              <p className="font-type text-xs uppercase text-muted-foreground sm:text-sm">
                17:00 · Día {e.dayNumber} · Puesto: {e.rankTitle}
              </p>
            )}
            <button
              type="button"
              aria-expanded={open}
              className="flex cursor-pointer items-center gap-2 text-left"
              onClick={() => setOpen((o) => !o)}
            >
              <h2 className={`dm-stamp text-primary ${open ? "text-4xl" : "text-xl"}`}>
                Fin del día
              </h2>
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
            <div
              className={`mt-3 rounded-md border px-3 py-2 text-xs ${e.goalMet ? "border-success/60 bg-success/10 text-success" : "border-border bg-secondary/40 text-foreground"}`}
            >
              <div className="font-display text-sm uppercase">
                {e.goalMet ? "✅ Objetivo del día cumplido" : "⏳ Evaluación diaria"}
              </div>
              <p className="mt-0.5 font-medium">{e.goalSummary}</p>
            </div>
            <div className="mt-3 rounded-md border-2 border-mustard bg-mustard/30 p-3 text-center">
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
                <ul className="mt-2 space-y-1.5 text-sm">
                  <li>
                    💼 <b>Ventas hoy:</b> ${e.money} ({e.sales} cerradas de {e.calls} llamadas ·
                    Total carrera: {e.careerSales})
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
                    ★ <b>Reputación:</b> {e.rep} (Carrera: {e.careerRep})
                  </li>
                </ul>
              )}
            </div>
            {e.recentEvents.length > 0 && (
              <div className="mt-3 rounded border border-border bg-secondary/25 px-3 py-2">
                <button
                  type="button"
                  aria-expanded={eventsOpen}
                  className="flex w-full cursor-pointer items-center justify-between font-display text-xs uppercase text-muted-foreground hover:text-primary"
                  onClick={() => setEventsOpen((o) => !o)}
                >
                  <span>📰 Acontecimientos recientes ({e.recentEvents.length})</span>
                  <span>{eventsOpen ? "▾" : "▸"}</span>
                </button>
                {eventsOpen && (
                  <ul className="mt-1.5 space-y-1 text-xs text-foreground">
                    {e.recentEvents.slice(0, 5).map((ev, i) => (
                      <li key={`${i}_${ev}`}>• {ev}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className="dm-btn dm-btn-primary flex-1" onClick={game.nextDay}>
                Continuar al Día {e.dayNumber + 1} →
              </button>
              <button type="button" className="dm-btn" onClick={game.returnToMenu}>
                Cambiar episodio / día
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function MeetingModal({ ui, game }: { ui: UIState; game: Game }) {
  const m = ui.meeting;
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const eventId = m?.eventId ?? null;
  useEffect(() => {
    if (eventId) setOpen(true);
  }, [eventId]);

  if (!m || ui.meetingCinema) return null;

  const submit = async (textOverride?: string) => {
    const text = (textOverride ?? draft).trim();
    if (!text || loading) return;
    if (!textOverride) setDraft("");
    setLoading(true);
    try {
      await game.interveneInMeeting(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={
        open
          ? "dm-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          : "pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-3"
      }
    >
      <div
        className={`dm-modal pointer-events-auto w-full ${open ? "flex max-h-[88vh] max-w-2xl flex-col p-4 sm:p-5" : "max-w-lg px-4 py-2.5"}`}
      >
        <div className="flex items-start justify-between gap-2 border-b border-border pb-2.5">
          <div>
            <button
              type="button"
              aria-expanded={open}
              className="flex cursor-pointer items-center gap-2 text-left"
              onClick={() => setOpen((o) => !o)}
            >
              <span className="rounded bg-amber-400 px-2 py-0.5 font-display text-[11px] uppercase text-black">
                ✋ Mano levantada
              </span>
              <h2 className="font-display text-base leading-tight text-primary sm:text-lg">
                {m.title}
              </h2>
              <span className="text-xs font-bold text-muted-foreground">{open ? "▾" : "▸"}</span>
            </button>
            {open && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {m.roomName} ·{" "}
                {m.isSpontaneous ? "Reunión improvisada" : "Evento del episodio en curso"}
                {ui.aiEnabled ? " · Respuestas en vivo con Pollinations" : ""}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              aria-expanded={open}
              className="dm-btn px-2 py-1 text-xs"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? "Plegar ▸" : "Desplegar ▾"}
            </button>
            <button
              type="button"
              className="dm-btn px-2.5 py-1 text-xs"
              onClick={game.closeMeeting}
            >
              Bajar mano <span className="dm-kbd">Esc</span>
            </button>
          </div>
        </div>

        {open && (
          <>
            {/* Attendees strip */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-muted-foreground">
                Presentes:
              </span>
              {m.attendees.map((id) => {
                const c = charById(id);
                const isHost = id === m.hostId;
                return (
                  <div
                    key={id}
                    className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      isHost
                        ? "border-amber-500 bg-amber-100/80 text-amber-950"
                        : "border-border bg-secondary/60"
                    }`}
                    title={c.name}
                  >
                    <Portrait id={id} size={22} />
                    <span>{c.name.split(" ")[0]}</span>
                  </div>
                );
              })}
            </div>

            {/* Live meeting transcript */}
            <div className="mt-3 flex-1 space-y-2 overflow-y-auto rounded-md border border-border bg-secondary/25 p-3 text-sm">
              {m.entries.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">
                  Has levantado la mano en la Sala de Reuniones. Todos se giran a mirarte… escribe
                  lo que quieres decir o elige una sugerencia.
                </p>
              ) : (
                m.entries.map((entry, idx) => (
                  <div
                    key={`${entry.clock}_${idx}`}
                    className={`rounded-md px-3 py-2 ${
                      entry.kind === "player"
                        ? "ml-6 border border-primary/30 bg-primary text-primary-foreground"
                        : entry.kind === "note"
                          ? "border border-amber-500/40 bg-amber-100/70 text-xs font-semibold text-amber-950"
                          : entry.kind === "ai"
                            ? "mr-4 border border-teal/40 bg-card shadow-xs"
                            : "mr-4 border border-border bg-card/85"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] opacity-80">
                      <span className="font-bold">
                        {entry.kind === "player" ? "✋ " : ""}
                        {entry.name}
                      </span>
                      <span className="tabular-nums">{entry.clock}</span>
                    </div>
                    <p className="mt-0.5 leading-snug">{entry.text}</p>
                  </div>
                ))
              )}
              {loading && (
                <div className="rounded-md border border-dashed border-amber-500 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                  ✋ Todos en la sala escuchan tu intervención… pensando reacciones…
                </div>
              )}
            </div>

            {/* Suggested interventions */}
            <div className="mt-2.5">
              <div className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">
                Intervenciones rápidas:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {m.suggestedLines.map((line) => (
                  <button
                    key={line}
                    type="button"
                    disabled={loading}
                    className="cursor-pointer rounded border border-border bg-secondary/70 px-2.5 py-1 text-left text-xs font-medium transition hover:border-amber-500 hover:bg-mustard/50 disabled:opacity-50"
                    onClick={() => void submit(line)}
                  >
                    “{line}”
                  </button>
                ))}
              </div>
            </div>

            {/* Free input form */}
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={loading}
                maxLength={400}
                placeholder="Levanta la mano y di lo que quieras a toda la sala…"
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !draft.trim()}
                className="dm-btn dm-btn-primary px-4 py-2 text-xs font-bold disabled:opacity-50"
              >
                {loading ? "Hablando…" : "✋ Intervenir"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
