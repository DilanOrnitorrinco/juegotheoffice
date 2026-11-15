import { useState } from "react";

import type { Game } from "@/game/engine/game";
import type { UIState } from "@/game/engine/state";

export function Journal({ ui, game }: { ui: UIState; game: Game }) {
  const [tab, setTab] = useState<"missions" | "gossip" | "dundies">("missions");
  if (!ui.journal) return null;
  const active = ui.missions.filter((m) => m.status === "active");
  const done = ui.missions.filter((m) => m.status === "done");
  const available = ui.missions.filter((m) => m.available);
  const locked = ui.missions.filter((m) => m.status === "locked" && !m.available);

  return (
    <div className="dm-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onClick={game.toggleJournal}>
      <div className="dm-modal dm-memo flex max-h-[88vh] w-full max-w-2xl flex-col p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="dm-stamp text-2xl text-primary">Cuaderno</h2>
          <button type="button" className="dm-btn dm-btn-primary" onClick={game.toggleJournal}>
            Cerrar
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          {(
            [
              ["missions", `📋 Misiones ${done.length}/${ui.missions.length}`],
              ["gossip", `🗣️ Cotilleos ${ui.gossip.heard.length}/${ui.gossip.total}`],
              ["dundies", `🏆 Dundies ${ui.dundies.found.length}/${ui.dundies.total}`],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className={`dm-btn text-xs ${tab === id ? "dm-btn-accent" : ""}`} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex-1 overflow-auto pr-1">
          {tab === "missions" && (
            <div className="space-y-4">
              <section>
                <h3 className="font-display text-sm uppercase">En curso</h3>
                {active.length === 0 && <p className="text-sm text-muted-foreground">Ninguna. Solo puedes hacer misiones que alguien te haya pedido.</p>}
                {active.map((m) => (
                  <div key={m.id} className="border-b border-border/30 py-2 text-sm">
                    <b>● {m.title}</b> {m.event && <span className="dm-chip bg-mustard text-xs">evento</span>}
                    <div className="text-muted-foreground">
                      {m.desc} · Encargo de {m.giver}
                    </div>
                    <div>
                      → {m.step} ({m.stepIndex + 1}/{m.steps})
                    </div>
                  </div>
                ))}
              </section>
              {available.length > 0 && (
                <section>
                  <h3 className="font-display text-sm uppercase">Alguien necesita ayuda</h3>
                  {available.map((m) => (
                    <div key={m.id} className="py-1 text-sm">
                      ❗ <b>{m.giver.split(" ")[0]}</b> tiene algo para ti. Ve a hablar con {m.giver.split(" ")[0]}.
                    </div>
                  ))}
                </section>
              )}
              <section>
                <h3 className="font-display text-sm uppercase">Completadas</h3>
                {done.length === 0 && <p className="text-sm text-muted-foreground">Todavía ninguna.</p>}
                {done.map((m) => (
                  <div key={m.id} className="py-1 text-sm text-success line-through">
                    ✓ {m.title}
                  </div>
                ))}
              </section>
              <section>
                <h3 className="font-display text-sm uppercase">Bloqueadas</h3>
                <p className="text-sm text-muted-foreground">
                  🔒 {locked.length} encargos que nadie te ha pedido todavía. Ayuda a la gente, vuelve más tarde o termina otras misiones para
                  desbloquearlos.
                </p>
              </section>
            </div>
          )}
          {tab === "gossip" && (
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">Cuando veas «···» sobre dos compañeros, acércate para escuchar lo que dicen.</p>
              {ui.gossip.heard.map((g, i) => (
                <div key={i} className="py-1">
                  🗣️ {g.title}
                </div>
              ))}
              {Array.from({ length: Math.max(0, ui.gossip.total - ui.gossip.heard.length) }).map((_, i) => (
                <div key={"x" + i} className="py-1 text-muted-foreground">
                  ??? — conversación sin escuchar
                </div>
              ))}
            </div>
          )}
          {tab === "dundies" && (
            <p className="text-sm">
              Michael ha escondido {ui.dundies.total} Dundies por la oficina. Has encontrado {ui.dundies.found.length}. Brillan un poco: busca en
              rincones, bajo las ventanas y en el almacén.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
