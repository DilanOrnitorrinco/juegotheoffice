import { useEffect, useState } from "react";

import type { Game } from "@/game/engine/game";
import type { UIState } from "@/game/engine/state";

const MEMORY_STATUS: Record<string, string> = {
  en_marcha: "En marcha",
  completada: "Completada ✓",
  recordada: "Recordada",
};

export function Journal({ ui, game }: { ui: UIState; game: Game }) {
  const [tab, setTab] = useState<"missions" | "gossip" | "chats" | "dundies">("missions");
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const [secActive, setSecActive] = useState(true);
  const [secGoal, setSecGoal] = useState(true);
  const [secEvents, setSecEvents] = useState(true);
  const [secAvail, setSecAvail] = useState(true);
  const [secDone, setSecDone] = useState(true);
  const [secLocked, setSecLocked] = useState(true);
  const [secMem, setSecMem] = useState(true);
  const [secHist, setSecHist] = useState(true);

  useEffect(() => {
    if (ui.journal) setOpen(true);
  }, [ui.journal]);

  if (!ui.journal) return null;
  const active = ui.missions.filter((m) => m.status === "active");
  const done = ui.missions.filter((m) => m.status === "done");
  const available = ui.missions.filter((m) => m.available);
  const locked = ui.missions.filter((m) => m.status === "locked" && !m.available);

  const activeRecord =
    ui.chatRecords.find((r) => r.id === selectedChar) ?? ui.chatRecords[0] ?? null;

  return (
    <div
      className={
        open
          ? "dm-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          : "pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3"
      }
      onClick={open ? game.toggleJournal : undefined}
    >
      <div
        className={`dm-modal dm-memo pointer-events-auto flex flex-col p-5 ${open ? "max-h-[88vh] w-full max-w-2xl" : "w-full max-w-md py-3"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-expanded={open}
            className="flex cursor-pointer items-center gap-2 text-left"
            onClick={() => setOpen((o) => !o)}
          >
            <h2 className="dm-stamp text-2xl text-primary">Cuaderno</h2>
            <span className="text-xs font-bold text-muted-foreground">{open ? "▾" : "▸"}</span>
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-expanded={open}
              className="dm-btn px-2 py-1 text-xs"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? "Plegar ▸" : "Desplegar ▾"}
            </button>
            <button type="button" className="dm-btn dm-btn-primary" onClick={game.toggleJournal}>
              Cerrar
            </button>
          </div>
        </div>
        {open && (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["missions", `📋 Misiones ${done.length}/${ui.missions.length}`],
                  ["gossip", `🗣️ Cotilleos ${ui.gossip.heard.length}/${ui.gossip.total}`],
                  ["chats", `💬 Chats (${ui.chatRecords.length})`],
                  ["dundies", `🏆 Dundies ${ui.dundies.found.length}/${ui.dundies.total}`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`dm-btn text-xs ${tab === id ? "dm-btn-accent" : ""}`}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex-1 overflow-auto pr-1">
              {tab === "missions" && (
                <div className="space-y-4">
                  <section className="rounded-md border border-border bg-mustard/15 p-3">
                    <button
                      type="button"
                      aria-expanded={secGoal}
                      className="flex w-full cursor-pointer items-center justify-between font-display text-sm uppercase text-primary"
                      onClick={() => setSecGoal((s) => !s)}
                    >
                      <span>
                        🎯 Objetivo Día {ui.dailyGoal.dayNumber} · {ui.dailyGoal.rankTitle}
                      </span>
                      <span className="text-xs text-muted-foreground">{secGoal ? "▾" : "▸"}</span>
                    </button>
                    {secGoal && (
                      <div className="mt-2 space-y-2 text-xs">
                        <div className="font-bold text-foreground">{ui.dailyGoal.headline}</div>
                        <p className="text-muted-foreground">{ui.dailyGoal.why}</p>
                        <div className="grid grid-cols-3 gap-2 pt-0.5 tabular-nums">
                          <div
                            className={`rounded border px-2 py-1 ${ui.dailyGoal.sales >= ui.dailyGoal.targetSales ? "border-success/50 bg-success/10 font-bold text-success" : "border-border bg-card/70"}`}
                          >
                            💼 Ventas: {ui.dailyGoal.sales}/{ui.dailyGoal.targetSales}
                          </div>
                          <div
                            className={`rounded border px-2 py-1 ${ui.dailyGoal.missionsDone >= ui.dailyGoal.targetMissions ? "border-success/50 bg-success/10 font-bold text-success" : "border-border bg-card/70"}`}
                          >
                            📋 Misiones: {ui.dailyGoal.missionsDone}/{ui.dailyGoal.targetMissions}
                          </div>
                          <div
                            className={`rounded border px-2 py-1 ${ui.dailyGoal.rep >= ui.dailyGoal.targetRep ? "border-success/50 bg-success/10 font-bold text-success" : "border-border bg-card/70"}`}
                          >
                            ★ Rep: {ui.dailyGoal.rep}/{ui.dailyGoal.targetRep}
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                  {ui.recentEvents.length > 0 && (
                    <section className="rounded-md border border-border bg-secondary/25 p-3">
                      <button
                        type="button"
                        aria-expanded={secEvents}
                        className="flex w-full cursor-pointer items-center justify-between font-display text-xs uppercase text-muted-foreground hover:text-primary"
                        onClick={() => setSecEvents((s) => !s)}
                      >
                        <span>📰 Acontecimientos recientes ({ui.recentEvents.length})</span>
                        <span>{secEvents ? "▾" : "▸"}</span>
                      </button>
                      {secEvents && (
                        <ul className="mt-1.5 space-y-1 text-xs text-foreground">
                          {ui.recentEvents.slice(0, 6).map((ev, i) => (
                            <li key={`${i}_${ev}`}>• {ev}</li>
                          ))}
                        </ul>
                      )}
                    </section>
                  )}
                  <section>
                    <button
                      type="button"
                      aria-expanded={secActive}
                      className="flex w-full cursor-pointer items-center justify-between font-display text-sm uppercase hover:text-primary"
                      onClick={() => setSecActive((s) => !s)}
                    >
                      <span>En curso ({active.length})</span>
                      <span className="text-xs text-muted-foreground">{secActive ? "▾" : "▸"}</span>
                    </button>
                    {secActive && (
                      <div className="mt-1">
                        {active.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            Ninguna. Solo puedes hacer misiones que alguien te haya pedido.
                          </p>
                        )}
                        {active.map((m) => (
                          <div key={m.id} className="border-b border-border/30 py-2 text-sm">
                            <b>● {m.title}</b>{" "}
                            {m.event && <span className="dm-chip bg-mustard text-xs">evento</span>}
                            <div className="text-muted-foreground">
                              {m.desc} · Encargo de {m.giver}
                            </div>
                            <div>
                              → {m.step} ({m.stepIndex + 1}/{m.steps})
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                  {available.length > 0 && (
                    <section>
                      <button
                        type="button"
                        aria-expanded={secAvail}
                        className="flex w-full cursor-pointer items-center justify-between font-display text-sm uppercase hover:text-primary"
                        onClick={() => setSecAvail((s) => !s)}
                      >
                        <span>Alguien necesita ayuda ({available.length})</span>
                        <span className="text-xs text-muted-foreground">
                          {secAvail ? "▾" : "▸"}
                        </span>
                      </button>
                      {secAvail && (
                        <div className="mt-1">
                          {available.map((m) => (
                            <div key={m.id} className="py-1 text-sm">
                              ❗ <b>{m.giver.split(" ")[0]}</b> tiene algo para ti. Ve a hablar con{" "}
                              {m.giver.split(" ")[0]}.
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  )}
                  <section>
                    <button
                      type="button"
                      aria-expanded={secDone}
                      className="flex w-full cursor-pointer items-center justify-between font-display text-sm uppercase hover:text-primary"
                      onClick={() => setSecDone((s) => !s)}
                    >
                      <span>Completadas ({done.length})</span>
                      <span className="text-xs text-muted-foreground">{secDone ? "▾" : "▸"}</span>
                    </button>
                    {secDone && (
                      <div className="mt-1">
                        {done.length === 0 && (
                          <p className="text-sm text-muted-foreground">Todavía ninguna.</p>
                        )}
                        {done.map((m) => (
                          <div key={m.id} className="py-1 text-sm text-success line-through">
                            ✓ {m.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                  <section>
                    <button
                      type="button"
                      aria-expanded={secLocked}
                      className="flex w-full cursor-pointer items-center justify-between font-display text-sm uppercase hover:text-primary"
                      onClick={() => setSecLocked((s) => !s)}
                    >
                      <span>Bloqueadas ({locked.length})</span>
                      <span className="text-xs text-muted-foreground">{secLocked ? "▾" : "▸"}</span>
                    </button>
                    {secLocked && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        🔒 {locked.length} encargos que nadie te ha pedido todavía. Ayuda a la
                        gente, vuelve más tarde o termina otras misiones para desbloquearlos.
                      </p>
                    )}
                  </section>
                </div>
              )}
              {tab === "gossip" && (
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    Cuando veas «···» sobre dos compañeros, acércate para escuchar lo que dicen.
                  </p>
                  {ui.gossip.heard.map((g, i) => (
                    <div key={i} className="py-1">
                      🗣️ {g.title}
                    </div>
                  ))}
                  {Array.from({
                    length: Math.max(0, ui.gossip.total - ui.gossip.heard.length),
                  }).map((_, i) => (
                    <div key={"x" + i} className="py-1 text-muted-foreground">
                      ??? — conversación sin escuchar
                    </div>
                  ))}
                </div>
              )}
              {tab === "chats" && (
                <div className="space-y-3 text-sm">
                  {ui.chatRecords.length === 0 ? (
                    <p className="text-muted-foreground">
                      Todavía no tienes conversaciones guardadas. Habla con alguien y elige «💬
                      Charlar libremente» para coordinar bromas, dar avisos o charlar.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {ui.chatRecords.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            className={`dm-btn px-2.5 py-1 text-xs ${activeRecord?.id === r.id ? "dm-btn-primary" : ""}`}
                            onClick={() => setSelectedChar(r.id)}
                          >
                            {r.name.split(" ")[0]} ({r.messages.length})
                          </button>
                        ))}
                      </div>
                      {activeRecord && (
                        <div className="space-y-3 rounded-md border border-border bg-secondary/25 p-3">
                          <div>
                            <div className="font-display text-base text-primary">
                              {activeRecord.name}
                            </div>
                            <div className="text-xs text-muted-foreground">{activeRecord.role}</div>
                          </div>
                          {activeRecord.memories.length > 0 && (
                            <div className="space-y-1">
                              <button
                                type="button"
                                aria-expanded={secMem}
                                className="flex w-full cursor-pointer items-center justify-between text-xs font-bold uppercase text-primary"
                                onClick={() => setSecMem((s) => !s)}
                              >
                                <span>🧠 Memoria de hoy ({activeRecord.memories.length})</span>
                                <span className="text-muted-foreground">{secMem ? "▾" : "▸"}</span>
                              </button>
                              {secMem &&
                                activeRecord.memories.map((m) => (
                                  <div
                                    key={m.id}
                                    className="rounded border border-border/70 bg-mustard/15 px-2.5 py-1 text-xs"
                                  >
                                    <span className="mr-1.5 font-mono text-[11px] text-muted-foreground">
                                      {m.atClock}
                                    </span>
                                    <span className="font-semibold">{m.summary}</span>
                                    <span className="ml-1.5 text-muted-foreground">
                                      ({MEMORY_STATUS[m.status] ?? m.status})
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              aria-expanded={secHist}
                              className="flex w-full cursor-pointer items-center justify-between text-xs font-bold uppercase text-muted-foreground hover:text-primary"
                              onClick={() => setSecHist((s) => !s)}
                            >
                              <span>Historial de chat ({activeRecord.messages.length})</span>
                              <span>{secHist ? "▾" : "▸"}</span>
                            </button>
                            {secHist &&
                              activeRecord.messages.map((m, i) => (
                                <div
                                  key={i}
                                  className={`rounded px-2.5 py-1.5 text-xs ${
                                    m.role === "note"
                                      ? "border border-mustard/60 bg-mustard/20 font-medium"
                                      : m.role === "user"
                                        ? "bg-primary/10"
                                        : "border border-border bg-card"
                                  }`}
                                >
                                  <span className="mr-1.5 font-mono text-[11px] text-muted-foreground">
                                    {m.clock}
                                  </span>
                                  {m.role !== "note" && (
                                    <b className="mr-1 text-primary">
                                      {m.role === "user"
                                        ? "Tú:"
                                        : `${activeRecord.name.split(" ")[0]}:`}
                                    </b>
                                  )}
                                  <span>{m.content}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {tab === "dundies" && (
                <p className="text-sm">
                  Michael ha escondido {ui.dundies.total} Dundies por la oficina. Has encontrado{" "}
                  {ui.dundies.found.length}. Brillan un poco: busca en rincones, bajo las ventanas y
                  en el almacén.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
