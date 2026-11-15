import { useState, type RefObject } from "react";

import type { Game } from "@/game/engine/game";
import type { UIState } from "@/game/engine/state";

export function Hud({ ui, game, minimapRef }: { ui: UIState; game: Game; minimapRef: RefObject<HTMLCanvasElement | null> }) {
  const [help, setHelp] = useState(true);
  const active = ui.missions.filter((m) => m.status === "active");
  const done = ui.missions.filter((m) => m.status === "done").length;
  const energyTone = ui.energy < 20 ? "bg-destructive" : ui.energy < 50 ? "bg-mustard" : "bg-success";

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none">
      {/* top bar */}
      <div className="absolute left-3 right-3 top-3 flex flex-wrap items-start justify-between gap-2">
        <div className="dm-panel px-3 py-2">
          <div className="dm-stamp text-base leading-none text-primary">DUNDER MIFFLIN</div>
          <div className="mt-1 text-xs font-semibold capitalize text-muted-foreground">{ui.dateLabel}</div>
          {ui.event && (
            <div className="mt-1 dm-chip bg-mustard">
              {ui.event.emoji} {ui.event.name}
            </div>
          )}
        </div>

        <div className="dm-panel flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
          <span className="dm-chip font-display text-base">🕘 {ui.clock}</span>
          <span className="dm-chip">💰 ${ui.money}</span>
          <span className="dm-chip">★ {ui.rep}</span>
          <span className="dm-chip">
            📋 {done}/{ui.missions.length}
          </span>
          <span className="dm-chip">🗣️ {ui.gossip.heard.length}</span>
          <span className="dm-chip">🏆 {ui.dundies.found.length}/{ui.dundies.total}</span>
          <span className="flex items-center gap-1.5" title="Energía">
            ⚡
            <span className="block h-2.5 w-20 overflow-hidden rounded-full border border-border bg-muted">
              <span className={`block h-full ${energyTone} transition-all`} style={{ width: `${ui.energy}%` }} />
            </span>
          </span>
        </div>

        <div className="dm-panel pointer-events-auto w-72 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm uppercase">Agenda de hoy</span>
            <button type="button" className="dm-btn px-2 py-0.5 text-xs" onClick={game.toggleJournal}>
              Misiones <span className="dm-kbd">J</span>
            </button>
          </div>
          {active.length === 0 ? (
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              Sin encargos activos. Habla con tus compañeros: los que tienen <b className="text-ink">!</b> encima necesitan algo.
            </p>
          ) : (
            <ul className="mt-1 space-y-1.5">
              {active.slice(0, 4).map((m) => (
                <li key={m.id} className="text-xs leading-snug">
                  <b>{m.title}</b>
                  {m.event && " ✨"}
                  <span className="block text-muted-foreground">
                    → {m.step} <span className="opacity-70">({m.stepIndex + 1}/{m.steps})</span>
                  </span>
                </li>
              ))}
              {active.length > 4 && <li className="text-xs text-muted-foreground">+{active.length - 4} más…</li>}
            </ul>
          )}
          <button type="button" className="dm-btn dm-btn-primary mt-2 w-full py-1.5 text-xs" onClick={game.openPC}>
            💼 Abrir ordenador de ventas
          </button>
        </div>
      </div>

      {/* inventory */}
      {ui.inventory.length > 0 && (
        <div className="dm-panel pointer-events-auto absolute bottom-3 left-1/2 flex max-w-[60vw] -translate-x-1/2 flex-wrap items-center gap-1.5 px-2 py-1.5">
          <span className="px-1 font-display text-xs uppercase">Llevas</span>
          {ui.inventory.map((it) =>
            it.edible ? (
              <button key={it.id} type="button" className="dm-chip cursor-pointer hover:bg-mustard" onClick={() => game.eat(it.id)} title="Comer">
                {it.emoji} {it.name} ×{it.count} · comer
              </button>
            ) : (
              <span key={it.id} className="dm-chip">
                {it.emoji} {it.name}
                {it.count > 1 ? ` ×${it.count}` : ""}
              </span>
            ),
          )}
        </div>
      )}

      {/* help */}
      <div className="dm-panel pointer-events-auto absolute bottom-3 left-3 max-w-xs px-3 py-2 text-xs leading-relaxed">
        <button type="button" className="font-display uppercase" onClick={() => setHelp((h) => !h)}>
          Controles {help ? "▾" : "▸"}
        </button>
        {help && (
          <div className="mt-1">
            <span className="dm-kbd">WASD</span>/<span className="dm-kbd">↑↓←→</span> moverte · <span className="dm-kbd">Shift</span> correr
            <br />
            <span className="dm-kbd">E</span> hablar / usar · <span className="dm-kbd">1-9</span> elegir opción
            <br />
            <span className="dm-kbd">J</span> misiones · <span className="dm-kbd">Esc</span> pausa / cerrar
            <p className="mt-1 text-muted-foreground">
              Acércate a dos compañeros que hablen para escuchar su conversación. Busca los 🏆 escondidos. Café y máquinas = energía.
            </p>
          </div>
        )}
      </div>

      {/* minimap */}
      <div className="dm-panel absolute bottom-3 right-3 overflow-hidden p-1">
        <canvas ref={minimapRef} className="block h-[154px] w-[220px] rounded-sm" />
      </div>
    </div>
  );
}
