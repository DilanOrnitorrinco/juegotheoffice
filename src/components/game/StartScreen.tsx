import { useEffect, useMemo, useState } from "react";

import { charById } from "@/game/data/characters";
import { EPISODES, SEASON_LABELS } from "@/game/data/episodes";
import { EVENTS, eventForDate, formatLongDate, parseLocalDate } from "@/game/data/events";
import type { UIState } from "@/game/engine/state";

import { Portrait } from "./Portrait";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const SEASONS: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
const STAMFORD_IDS = new Set(["andy", "karen", "martin", "tony", "hannah"]);

export function StartScreen({
  ui,
  onResetCareer,
  onStart,
}: {
  ui: UIState;
  onResetCareer: () => void;
  onStart: (date: string, episodeId?: string | null) => void;
}) {
  const [mode, setMode] = useState<"episodes" | "free">("episodes");
  const [season, setSeason] = useState<1 | 2 | 3 | 4>(3);
  const [episodeId, setEpisodeId] = useState<string>("s3e8");
  const [date, setDate] = useState("");
  const [menuOpen, setMenuOpen] = useState(true);
  const [careerOpen, setCareerOpen] = useState(true);
  const [seasonsOpen, setSeasonsOpen] = useState(true);
  const [epListOpen, setEpListOpen] = useState(true);
  const [officeStateOpen, setOfficeStateOpen] = useState(true);
  const [rosterOpen, setRosterOpen] = useState(true);
  const [datePickOpen, setDatePickOpen] = useState(true);
  const [specialDatesOpen, setSpecialDatesOpen] = useState(true);

  useEffect(() => setDate(todayISO()), []);

  const seasonEpisodes = useMemo(() => EPISODES.filter((e) => e.season === season), [season]);
  const selectedEp = useMemo(
    () => seasonEpisodes.find((e) => e.id === episodeId) ?? seasonEpisodes[0] ?? EPISODES[0]!,
    [seasonEpisodes, episodeId],
  );
  const epEvent = useMemo(() => eventForDate(parseLocalDate(selectedEp.dateISO)), [selectedEp]);

  const parsedFree = useMemo(() => (date ? parseLocalDate(date) : null), [date]);
  const evFree = parsedFree ? eventForDate(parsedFree) : null;
  const year = parsedFree?.getFullYear() ?? 2026;
  const hasCareer = ui.dayNumber > 1 || ui.recentEvents.length > 0 || ui.dailyGoal.rep > 0;

  const handleSeasonChange = (s: 1 | 2 | 3 | 4) => {
    setSeason(s);
    const first = EPISODES.find((e) => e.season === s);
    if (first) setEpisodeId(first.id);
  };

  return (
    <div className="dm-overlay fixed inset-0 z-50 flex items-center justify-center overflow-auto p-3 md:p-5">
      <div className="dm-modal dm-memo flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden p-5 md:p-7">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-4">
          <div>
            <p className="font-type text-xs uppercase tracking-widest text-muted-foreground md:text-sm">
              Dunder Mifflin Paper Company · Scranton
            </p>
            <h1 className="dm-stamp mt-1 text-3xl leading-none text-primary md:text-5xl">
              THE OFFICE
            </h1>
            <p className="font-type mt-1 text-base md:text-lg">Un día en la oficina</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <div className="rotate-2 rounded-md border-2 border-destructive px-2.5 py-0.5 font-type text-xs uppercase text-destructive">
                Juego fan · T1 – T4·E01
              </div>
              <button
                type="button"
                aria-expanded={menuOpen}
                className="dm-btn px-2.5 py-1 text-xs"
                onClick={() => setMenuOpen((o) => !o)}
              >
                {menuOpen ? "Plegar menú ▸" : "Desplegar menú ▾"}
              </button>
            </div>
            {/* Mode switch */}
            <div className="inline-flex rounded-md border-2 border-border bg-secondary/50 p-0.5 text-xs font-bold">
              <button
                type="button"
                className={`whitespace-nowrap rounded px-3 py-1.5 transition-colors ${
                  mode === "episodes"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setMode("episodes");
                  setMenuOpen(true);
                }}
              >
                Temporadas y episodios
              </button>
              <button
                type="button"
                className={`whitespace-nowrap rounded px-3 py-1.5 transition-colors ${
                  mode === "free"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setMode("free");
                  setMenuOpen(true);
                }}
              >
                Jugar día libre
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        {menuOpen && (
          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            {hasCareer && (
              <div className="mb-4 rounded-md border border-border bg-mustard/15 px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    aria-expanded={careerOpen}
                    className="flex cursor-pointer items-center gap-1.5 font-display uppercase text-primary"
                    onClick={() => setCareerOpen((o) => !o)}
                  >
                    <span>
                      🎯 Carrera · Día {ui.dayNumber} · Puesto: {ui.dailyGoal.rankTitle}
                    </span>
                    <span className="text-muted-foreground">{careerOpen ? "▾" : "▸"}</span>
                  </button>
                  <button
                    type="button"
                    className="dm-btn px-2 py-0.5 text-[11px]"
                    onClick={onResetCareer}
                  >
                    Reiniciar historial
                  </button>
                </div>
                {careerOpen && (
                  <div className="mt-1.5 space-y-1">
                    <p className="text-muted-foreground">{ui.dailyGoal.why}</p>
                    {ui.recentEvents.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {ui.recentEvents.slice(0, 3).map((ev, i) => (
                          <span
                            key={`${i}_${ev}`}
                            className="rounded border border-border/70 bg-card/70 px-2 py-0.5 text-[11px]"
                          >
                            📰 {ev}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {mode === "episodes" ? (
              <div className="space-y-4">
                {/* Season selector tabs */}
                <div>
                  <button
                    type="button"
                    aria-expanded={seasonsOpen}
                    className="mb-2 flex cursor-pointer items-center gap-1.5 font-display text-xs uppercase tracking-wide text-muted-foreground hover:text-primary"
                    onClick={() => setSeasonsOpen((o) => !o)}
                  >
                    <span>Temporadas</span>
                    <span>{seasonsOpen ? "▾" : "▸"}</span>
                  </button>
                  {seasonsOpen && (
                    <div className="flex flex-wrap gap-2">
                      {SEASONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`dm-btn whitespace-nowrap px-3.5 py-1.5 text-xs md:text-sm ${season === s ? "dm-btn-accent" : ""}`}
                          onClick={() => handleSeasonChange(s)}
                        >
                          {SEASON_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-[0.92fr_1.35fr]">
                  {/* Episode list */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      aria-expanded={epListOpen}
                      className="flex w-full cursor-pointer items-center justify-between font-display text-xs uppercase tracking-wide text-muted-foreground hover:text-primary"
                      onClick={() => setEpListOpen((o) => !o)}
                    >
                      <span>Elige episodio ({seasonEpisodes.length})</span>
                      <span>{epListOpen ? "▾" : "▸"}</span>
                    </button>
                    {epListOpen && (
                      <div className="space-y-1.5">
                        {seasonEpisodes.map((ep) => {
                          const active = ep.id === selectedEp.id;
                          return (
                            <button
                              key={ep.id}
                              type="button"
                              onClick={() => setEpisodeId(ep.id)}
                              className={`flex w-full items-center justify-between gap-2 rounded-md border-2 px-3 py-2 text-left transition-colors ${
                                active
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-border bg-paper/70 text-foreground hover:bg-secondary/50"
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
                                  {ep.epLabel}
                                </div>
                                <div className="truncate font-display text-sm leading-snug">
                                  {ep.title}
                                </div>
                              </div>
                              <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground tabular-nums">
                                {ep.castIds.length} pers.
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected Episode Dossier */}
                  <div className="rounded-md border-2 border-border bg-paper/80 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/50 pb-2.5">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-primary">
                          {selectedEp.epLabel} · {selectedEp.dateLabel}
                        </div>
                        <h2 className="font-display text-xl leading-tight text-foreground">
                          {selectedEp.title}
                        </h2>
                      </div>
                      <div className="font-mono text-xs font-bold text-primary tabular-nums">
                        {selectedEp.castIds.length} empleados en Scranton
                      </div>
                    </div>

                    <p className="mt-2.5 text-sm leading-relaxed text-foreground">
                      {selectedEp.summary}
                    </p>

                    <div className="mt-3 rounded border border-border/80 bg-secondary/45 px-3 py-2 text-xs leading-relaxed">
                      <button
                        type="button"
                        aria-expanded={officeStateOpen}
                        className="flex w-full cursor-pointer items-center justify-between font-display uppercase text-primary"
                        onClick={() => setOfficeStateOpen((o) => !o)}
                      >
                        <span>Estado de la oficina</span>
                        <span className="text-muted-foreground">{officeStateOpen ? "▾" : "▸"}</span>
                      </button>
                      {officeStateOpen && (
                        <p className="mt-1 font-medium text-foreground">{selectedEp.officeState}</p>
                      )}
                    </div>

                    {/* Roster grid */}
                    <div className="mt-3.5">
                      <button
                        type="button"
                        aria-expanded={rosterOpen}
                        className="mb-2 flex w-full cursor-pointer items-center justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-primary"
                        onClick={() => setRosterOpen((o) => !o)}
                      >
                        <span>
                          Plantilla presente en la sucursal ({selectedEp.castIds.length} personajes)
                        </span>
                        <span>{rosterOpen ? "▾" : "▸"}</span>
                      </button>
                      {rosterOpen && (
                        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                          {selectedEp.castIds.map((id) => {
                            const c = charById(id);
                            const first = c.name.split(" ")[0];
                            const role = selectedEp.roleOverrides?.[id] ?? c.role;
                            const costume = epEvent?.costumes[id];
                            const isStamford = STAMFORD_IDS.has(id);
                            const hasDeskSwap = Boolean(selectedEp.seatOverrides?.[id]);
                            return (
                              <div
                                key={id}
                                title={`${c.name} — ${role}`}
                                className={`flex items-center gap-1.5 rounded border px-1.5 py-1 ${
                                  isStamford || hasDeskSwap
                                    ? "border-primary/45 bg-mustard/15"
                                    : "border-border/70 bg-card/70"
                                }`}
                              >
                                <Portrait id={id} costume={costume} size={28} />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-[11px] font-bold leading-tight text-foreground">
                                    {first}
                                  </div>
                                  <div className="truncate text-[10px] leading-tight text-muted-foreground">
                                    {role}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="leading-relaxed">
                  Juega un día libre con la plantilla clásica (19 empleados), atiende llamadas desde{" "}
                  <b>tu mesa</b>, ayuda a tus compañeros cuando te lo pidan y escucha lo que hablan
                  entre ellos. La jornada termina a las <b>17:00</b>.
                </p>

                <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
                  <div>
                    <button
                      type="button"
                      aria-expanded={datePickOpen}
                      className="flex w-full cursor-pointer items-center justify-between font-display text-sm uppercase hover:text-primary"
                      onClick={() => setDatePickOpen((o) => !o)}
                    >
                      <span>¿Qué día es hoy?</span>
                      <span className="text-xs text-muted-foreground">
                        {datePickOpen ? "▾" : "▸"}
                      </span>
                    </button>
                    {datePickOpen && (
                      <>
                        <input
                          id="game-date"
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="mt-2 w-full rounded-md border-2 border-border bg-paper px-3 py-2 font-bold"
                        />
                        {parsedFree && (
                          <p className="mt-2 text-sm capitalize text-muted-foreground">
                            {formatLongDate(parsedFree)}
                          </p>
                        )}
                        <div className="mt-3 rounded-md border-2 border-dashed border-border p-3">
                          {evFree ? (
                            <>
                              <p className="font-display text-lg">
                                {evFree.emoji} {evFree.name}
                              </p>
                              <p className="text-sm">{evFree.description}</p>
                            </>
                          ) : (
                            <p className="text-sm">
                              Un día normal en Scranton. Ningún evento especial… de momento.
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      aria-expanded={specialDatesOpen}
                      className="flex w-full cursor-pointer items-center justify-between font-display text-sm uppercase hover:text-primary"
                      onClick={() => setSpecialDatesOpen((o) => !o)}
                    >
                      <span>Fechas especiales</span>
                      <span className="text-xs text-muted-foreground">
                        {specialDatesOpen ? "▾" : "▸"}
                      </span>
                    </button>
                    {specialDatesOpen && (
                      <>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {EVENTS.filter((e) => e.id !== "viernes").map((e) => (
                            <button
                              key={e.id}
                              type="button"
                              className="dm-btn justify-start text-left"
                              onClick={() => setDate(e.example(year))}
                            >
                              <span className="text-lg">{e.emoji}</span>
                              <span className="leading-tight">
                                {e.name}
                                <span className="block text-xs font-semibold text-muted-foreground">
                                  {e.dateLabel}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Los viernes son «viernes casual» 🌺.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
          <p className="text-xs text-muted-foreground md:text-sm">
            <span className="dm-kbd">WASD</span> moverte · <span className="dm-kbd">E</span>{" "}
            hablar/usar · <span className="dm-kbd">Shift</span> correr ·{" "}
            <span className="dm-kbd">J</span> misiones
          </p>
          {mode === "episodes" ? (
            <button
              type="button"
              className="dm-btn dm-btn-primary whitespace-nowrap px-6 py-2.5 text-sm md:text-base"
              onClick={() => onStart(selectedEp.dateISO, selectedEp.id)}
            >
              Jugar {selectedEp.epLabel} →
            </button>
          ) : (
            <button
              type="button"
              className="dm-btn dm-btn-primary whitespace-nowrap px-6 py-2.5 text-sm md:text-base"
              disabled={!date}
              onClick={() => onStart(date, null)}
            >
              Empezar día libre →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
