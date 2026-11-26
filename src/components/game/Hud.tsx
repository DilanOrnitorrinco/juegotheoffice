import { useState, type RefObject } from "react";

import type { Game } from "@/game/engine/game";
import type { UIState } from "@/game/engine/state";

export function Hud({
  ui,
  game,
  minimapRef,
}: {
  ui: UIState;
  game: Game;
  minimapRef: RefObject<HTMLCanvasElement | null>;
}) {
  const [brandOpen, setBrandOpen] = useState(true);
  const [statsOpen, setStatsOpen] = useState(true);
  const [agendaOpen, setAgendaOpen] = useState(true);
  const [invOpen, setInvOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(true);
  const [mapOpen, setMapOpen] = useState(true);

  if (ui.cinematic || ui.meetingCinema) return null;

  const active = ui.missions.filter((m) => m.status === "active");
  const done = ui.missions.filter((m) => m.status === "done").length;
  const energyTone =
    ui.energy < 20 ? "bg-destructive" : ui.energy < 50 ? "bg-mustard" : "bg-success";
  const modalOpen = Boolean(ui.dialog || ui.chat || ui.pc || ui.journal || ui.paused || ui.meeting);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none">
      {/* top bar */}
      <div className="absolute left-3 right-3 top-3 flex flex-wrap items-start justify-between gap-2">
        {/* Top-left: brand / episode / date */}
        {brandOpen ? (
          <div className="dm-panel pointer-events-auto px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="dm-stamp text-base leading-none text-primary">DUNDER MIFFLIN</div>
              <button
                type="button"
                aria-expanded={true}
                aria-label="Ocultar menú de episodio"
                title="Ocultar"
                className="flex h-5 w-5 cursor-pointer items-center justify-center rounded border border-border/60 bg-secondary/70 text-[11px] font-black text-primary hover:bg-mustard"
                onClick={() => setBrandOpen(false)}
              >
                ◂
              </button>
            </div>
            {ui.episode ? (
              <div className="mt-1 text-xs font-bold text-foreground">
                Día {ui.dayNumber} · {ui.episode.epLabel} · {ui.episode.title}{" "}
                <span className="font-semibold text-muted-foreground tabular-nums">
                  ({ui.episode.castCount} pers.)
                </span>
              </div>
            ) : (
              <div className="mt-1 text-xs font-semibold capitalize text-muted-foreground">
                Día {ui.dayNumber} · {ui.dateLabel}
              </div>
            )}
            <div className="mt-0.5 text-[11px] font-bold text-primary">
              Puesto: {ui.dailyGoal.rankTitle}
            </div>
            {ui.event && !modalOpen && (
              <div className="mt-1 dm-chip bg-mustard">
                {ui.event.emoji} {ui.event.name}
              </div>
            )}
            {ui.approachingNpc && !modalOpen && !ui.meetingNotice && (
              <div className="mt-1.5 max-w-[260px] rounded border border-sky-500/60 bg-sky-100/90 px-2 py-1 text-[11px] font-semibold text-sky-950">
                💬 <b>{ui.approachingNpc.name}</b> viene hacia ti ({ui.approachingNpc.reason})
              </div>
            )}
            {ui.activeOfficeEvent && !modalOpen && !ui.meetingNotice && (
              <div className="mt-1.5 max-w-[260px] rounded border border-amber-500/60 bg-amber-100/90 px-2 py-1 text-[11px] leading-snug text-amber-950">
                <div className="flex items-center justify-between gap-1 font-bold">
                  <span>🎬 En vivo · {ui.activeOfficeEvent.roomName}</span>
                  <span className="opacity-70">{ui.activeOfficeEvent.clockEnd}</span>
                </div>
                <div className="truncate font-semibold">{ui.activeOfficeEvent.title}</div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            aria-expanded={false}
            aria-label="Mostrar menú de episodio"
            title="Mostrar episodio y fecha"
            className="dm-panel pointer-events-auto flex h-7 w-7 cursor-pointer items-center justify-center text-xs font-black text-primary hover:bg-mustard"
            onClick={() => setBrandOpen(true)}
          >
            ▸
          </button>
        )}

        {/* Top-center: status bar + Pause button */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {statsOpen ? (
            <div className="dm-panel flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <span className="dm-chip font-display text-base">🕘 {ui.clock}</span>
              <span className="dm-chip">💰 ${ui.money}</span>
              <span className="dm-chip">★ {ui.rep}</span>
              <span className="dm-chip">
                📋 {done}/{ui.missions.length}
              </span>
              <span className="dm-chip">🗣️ {ui.gossip.heard.length}</span>
              <span className="dm-chip">
                🏆 {ui.dundies.found.length}/{ui.dundies.total}
              </span>
              <span className="flex items-center gap-1.5" title="Energía">
                ⚡
                <span className="block h-2.5 w-20 overflow-hidden rounded-full border border-border bg-muted">
                  <span
                    className={`block h-full ${energyTone} transition-all`}
                    style={{ width: `${ui.energy}%` }}
                  />
                </span>
              </span>
              <button
                type="button"
                aria-expanded={true}
                aria-label="Ocultar barra de estado"
                title="Ocultar"
                className="ml-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded border border-border/60 bg-secondary/70 text-[11px] font-black text-primary hover:bg-mustard"
                onClick={() => setStatsOpen(false)}
              >
                ▴
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-expanded={false}
              aria-label="Mostrar barra de estado"
              title="Mostrar hora y estadísticas"
              className="dm-panel flex h-7 w-7 cursor-pointer items-center justify-center text-xs font-black text-primary hover:bg-mustard"
              onClick={() => setStatsOpen(true)}
            >
              ▾
            </button>
          )}
          <button
            type="button"
            aria-label="Cambiar vista de cámara"
            title="Cambiar ángulo de cámara (V)"
            className="dm-btn px-3 py-2 text-xs font-bold shadow-sm"
            onClick={game.toggleCameraMode}
          >
            🎥{" "}
            {ui.cameraMode === "shoulder_right"
              ? "Hombro Der."
              : ui.cameraMode === "shoulder_left"
                ? "Hombro Izq."
                : "1.ª Pers."}{" "}
            <span className="dm-kbd ml-1">V</span>
          </button>
          <button
            type="button"
            aria-label="Pausa y aspecto"
            title="Pausa y personalización (Esc)"
            className="dm-btn px-3 py-2 text-xs font-bold shadow-sm"
            onClick={game.togglePause}
          >
            ⏸ Pausa
          </button>
        </div>

        {/* Top-right: agenda */}
        {!modalOpen &&
          (agendaOpen ? (
            <div className="dm-panel pointer-events-auto w-72 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm uppercase">Agenda de hoy</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="dm-btn px-2 py-0.5 text-xs"
                    onClick={game.toggleJournal}
                  >
                    Misiones <span className="dm-kbd">J</span>
                  </button>
                  <button
                    type="button"
                    aria-expanded={true}
                    aria-label="Ocultar agenda de hoy"
                    title="Ocultar"
                    className="flex h-5 w-5 cursor-pointer items-center justify-center rounded border border-border/60 bg-secondary/70 text-[11px] font-black text-primary hover:bg-mustard"
                    onClick={() => setAgendaOpen(false)}
                  >
                    ▸
                  </button>
                </div>
              </div>
              {/* Clear daily objective box */}
              <div
                className={`mt-1.5 rounded border px-2 py-1.5 text-[11px] leading-snug ${
                  ui.dailyGoal.allCompleted
                    ? "border-success/60 bg-success/15"
                    : "border-border/80 bg-mustard/20"
                }`}
              >
                <div className="flex items-center justify-between gap-1 font-bold text-foreground">
                  <span>🎯 Objetivo Día {ui.dailyGoal.dayNumber}</span>
                  <span className="tabular-nums">{ui.dailyGoal.completedCount}/3</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-muted-foreground">{ui.dailyGoal.why}</p>
                <div className="mt-1 flex flex-wrap gap-1 font-semibold">
                  <span
                    className={`rounded px-1.5 py-0.5 ${ui.dailyGoal.sales >= ui.dailyGoal.targetSales ? "bg-success/20 text-foreground" : "bg-card/80 text-muted-foreground"}`}
                  >
                    {ui.dailyGoal.sales >= ui.dailyGoal.targetSales ? "✓" : "○"} 💼{" "}
                    {ui.dailyGoal.sales}/{ui.dailyGoal.targetSales}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 ${ui.dailyGoal.missionsDone >= ui.dailyGoal.targetMissions ? "bg-success/20 text-foreground" : "bg-card/80 text-muted-foreground"}`}
                  >
                    {ui.dailyGoal.missionsDone >= ui.dailyGoal.targetMissions ? "✓" : "○"} 📋{" "}
                    {ui.dailyGoal.missionsDone}/{ui.dailyGoal.targetMissions}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 ${ui.dailyGoal.rep >= ui.dailyGoal.targetRep ? "bg-success/20 text-foreground" : "bg-card/80 text-muted-foreground"}`}
                  >
                    {ui.dailyGoal.rep >= ui.dailyGoal.targetRep ? "✓" : "○"} ★ {ui.dailyGoal.rep}/
                    {ui.dailyGoal.targetRep}
                  </span>
                </div>
              </div>
              {active.length === 0 ? (
                <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
                  Sin encargos activos. Habla con tus compañeros: los que tienen{" "}
                  <b className="text-ink">!</b> encima tienen algo nuevo hoy.
                </p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {active.slice(0, 4).map((m) => (
                    <li key={m.id} className="text-xs leading-snug">
                      <b>{m.title}</b>
                      {m.event && " ✨"}
                      <span className="block text-muted-foreground">
                        → {m.step}{" "}
                        <span className="opacity-70">
                          ({m.stepIndex + 1}/{m.steps})
                        </span>
                      </span>
                    </li>
                  ))}
                  {active.length > 4 && (
                    <li className="text-xs text-muted-foreground">+{active.length - 4} más…</li>
                  )}
                </ul>
              )}
              <button
                type="button"
                className="dm-btn dm-btn-primary mt-2 w-full py-1.5 text-xs"
                onClick={game.openPC}
              >
                💼 Abrir ordenador de ventas
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-expanded={false}
              aria-label="Mostrar agenda de hoy"
              title="Mostrar agenda de hoy"
              className="dm-panel pointer-events-auto flex h-7 w-7 cursor-pointer items-center justify-center text-xs font-black text-primary hover:bg-mustard"
              onClick={() => setAgendaOpen(true)}
            >
              ◂
            </button>
          ))}
      </div>

      {/* inventory */}
      {!modalOpen &&
        ui.inventory.length > 0 &&
        (invOpen ? (
          <div className="dm-panel pointer-events-auto absolute bottom-3 left-1/2 flex max-w-[60vw] -translate-x-1/2 flex-wrap items-center gap-1.5 px-2.5 py-1.5">
            <span className="px-1 font-display text-xs uppercase">Llevas</span>
            {ui.inventory.map((it) =>
              it.edible ? (
                <button
                  key={it.id}
                  type="button"
                  className="dm-chip cursor-pointer hover:bg-mustard"
                  onClick={() => game.eat(it.id)}
                  title="Comer"
                >
                  {it.emoji} {it.name} ×{it.count} · comer
                </button>
              ) : (
                <span key={it.id} className="dm-chip">
                  {it.emoji} {it.name}
                  {it.count > 1 ? ` ×${it.count}` : ""}
                </span>
              ),
            )}
            <button
              type="button"
              aria-expanded={true}
              aria-label="Ocultar inventario"
              title="Ocultar"
              className="ml-0.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded border border-border/60 bg-secondary/70 text-[11px] font-black text-primary hover:bg-mustard"
              onClick={() => setInvOpen(false)}
            >
              ▾
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-expanded={false}
            aria-label="Mostrar inventario"
            title="Mostrar inventario"
            className="dm-panel pointer-events-auto absolute bottom-3 left-1/2 flex h-7 w-7 -translate-x-1/2 cursor-pointer items-center justify-center text-xs font-black text-primary hover:bg-mustard"
            onClick={() => setInvOpen(true)}
          >
            ▴
          </button>
        ))}

      {/* help / controls */}
      {!modalOpen &&
        (helpOpen ? (
          <div className="dm-panel pointer-events-auto absolute bottom-3 left-3 max-w-xs px-3 py-2 text-xs leading-relaxed">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display uppercase">Controles</span>
              <button
                type="button"
                aria-expanded={true}
                aria-label="Ocultar controles"
                title="Ocultar"
                className="flex h-5 w-5 cursor-pointer items-center justify-center rounded border border-border/60 bg-secondary/70 text-[11px] font-black text-primary hover:bg-mustard"
                onClick={() => setHelpOpen(false)}
              >
                ◂
              </button>
            </div>
            <div className="mt-1">
              <span className="dm-kbd">WASD</span>/<span className="dm-kbd">↑↓←→</span> moverte ·{" "}
              <span className="dm-kbd">Shift</span> correr
              <br />
              <b>Mover ratón</b> mirar · <span className="dm-kbd">V</span> cámara · <b>Rueda</b>{" "}
              zoom
              <br />
              <span className="dm-kbd">E</span> hablar / usar · <span className="dm-kbd">H</span>{" "}
              levantar mano (reunión)
              <br />
              <span className="dm-kbd">1-9</span> elegir opción · <span className="dm-kbd">J</span>{" "}
              misiones · <span className="dm-kbd">Esc</span> pausa
              <p className="mt-1 text-muted-foreground">
                Acércate a dos compañeros o a los eventos del episodio. Mueve el ratón para mirar
                (doble clic captura el ratón); en la Sala de Reuniones puedes levantar la mano [H].
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            aria-expanded={false}
            aria-label="Mostrar controles"
            title="Mostrar controles"
            className="dm-panel pointer-events-auto absolute bottom-3 left-3 flex h-7 w-7 cursor-pointer items-center justify-center text-xs font-black text-primary hover:bg-mustard"
            onClick={() => setHelpOpen(true)}
          >
            ▸
          </button>
        ))}

      {/* minimap */}
      {!modalOpen && (
        <>
          {mapOpen ? (
            <div className="dm-panel pointer-events-auto absolute bottom-3 right-3 overflow-hidden p-1.5">
              <div className="flex items-center justify-between gap-2 px-1 py-0.5">
                <span className="font-display text-xs uppercase">
                  🗺️ {ui.floor === 1 ? "Planta Baja · Almacén" : "Planta 2 · Oficina"}
                </span>
                <button
                  type="button"
                  aria-expanded={true}
                  aria-label="Ocultar minimapa"
                  title="Ocultar"
                  className="flex h-5 w-5 cursor-pointer items-center justify-center rounded border border-border/60 bg-secondary/70 text-[11px] font-black text-primary hover:bg-mustard"
                  onClick={() => setMapOpen(false)}
                >
                  ▸
                </button>
              </div>
              <canvas ref={minimapRef} className="mt-1 block h-[154px] w-[220px] rounded-sm" />
            </div>
          ) : (
            <>
              <canvas ref={minimapRef} className="hidden" />
              <button
                type="button"
                aria-expanded={false}
                aria-label="Mostrar minimapa"
                title="Mostrar minimapa"
                className="dm-panel pointer-events-auto absolute bottom-3 right-3 flex h-7 w-7 cursor-pointer items-center justify-center text-xs font-black text-primary hover:bg-mustard"
                onClick={() => setMapOpen(true)}
              >
                ◂
              </button>
            </>
          )}
        </>
      )}
      {/* Pre-cinema Meeting Notice: Multi-step canon prelude -> Michael's call -> Waiting for everyone to sit */}
      {!modalOpen && ui.meetingNotice && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-30 flex justify-center px-3">
          <div className="dm-panel pointer-events-auto flex max-w-xl flex-col gap-1.5 border-2 border-amber-500 bg-card/95 px-4 py-2.5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display text-xs uppercase tracking-wide text-amber-800">
                {ui.meetingNotice.headline}
              </span>
              <div className="flex items-center gap-1.5">
                {ui.meetingNotice.stepLabel && (
                  <span className="dm-chip bg-amber-200/80 text-xs font-bold tabular-nums text-amber-950">
                    {ui.meetingNotice.stepLabel}
                  </span>
                )}
                <span className="dm-chip bg-mustard/60 text-xs font-bold tabular-nums">
                  🪑 {ui.meetingNotice.seatedCount}/{ui.meetingNotice.totalCount} · Tú:{" "}
                  {ui.meetingNotice.playerSeated ? "Sentado ✓" : "De pie"}
                </span>
              </div>
            </div>
            <p className="text-sm font-semibold leading-snug text-foreground">
              {ui.meetingNotice.phase === "trigger"
                ? ui.meetingNotice.callText
                : `«${ui.meetingNotice.callText}»`}
            </p>
            {ui.meetingNotice.replyText && (
              <p className="text-xs italic leading-snug text-muted-foreground">
                {ui.meetingNotice.replyText}
              </p>
            )}
            {!ui.meetingNotice.playerSeated && ui.meetingNotice.phase !== "trigger" && (
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  {ui.meetingNotice.inRoom
                    ? "Acércate a la silla iluminada en ámbar o pulsa [G]."
                    : "Ve a la Sala de Conferencias (arriba al centro) o pulsa [G]."}
                </span>
                <button
                  type="button"
                  className="dm-btn dm-btn-primary shrink-0 px-3 py-1 text-xs font-bold"
                  onClick={game.sitInMeetingSeat}
                >
                  🪑 Sentarme en mi silla <span className="dm-kbd ml-1">G</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conference Room spontaneous hand-raise button */}
      {!modalOpen && ui.inConferenceRoom && !ui.meetingNotice && (
        <div
          className={`pointer-events-auto absolute left-1/2 -translate-x-1/2 ${ui.inventory.length > 0 ? "bottom-16" : "bottom-4"}`}
        >
          <button
            type="button"
            className="dm-btn dm-btn-primary flex items-center gap-2 border-2 border-amber-400 px-4 py-2 text-sm font-bold shadow-lg"
            onClick={game.openMeeting}
          >
            <span>✋ Levantar la mano en la reunión</span>
            <span className="dm-kbd">H</span>
          </button>
        </div>
      )}
    </div>
  );
}
