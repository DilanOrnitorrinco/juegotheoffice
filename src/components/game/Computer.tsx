import type { Game } from "@/game/engine/game";
import type { CallSnapshot, UIState } from "@/game/engine/state";
import { APPROACHES, APPROACH_INFO, MAX_INTEREST, STAGES } from "@/game/data/sales";

function Interest({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="crt-dim">INTERÉS</span>
      <span className="flex gap-0.5">
        {Array.from({ length: MAX_INTEREST }).map((_, i) => (
          <span key={i} className={`inline-block h-3 w-3 border border-crt-dim ${i < value ? (value >= 7 ? "bg-crt" : value >= 4 ? "bg-crt-amber" : "bg-crt-red") : ""}`} />
        ))}
      </span>
      <span className={value >= 7 ? "" : value >= 4 ? "crt-amber" : "crt-red"}>{value}/10</span>
    </div>
  );
}

/** 4-ary decision tree: one row per level, 4 nodes each; the path taken is highlighted. */
function Tree({ call, live }: { call: CallSnapshot; live: boolean }) {
  const W = 300;
  const rowH = 30;
  const xs = (i: number) => 30 + i * ((W - 60) / 3);
  const H = rowH * 5 + 30;
  const chosen = call.path.map((p) => APPROACHES.indexOf(p.approach));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Árbol de decisiones de la llamada">
      <circle cx={W / 2} cy={12} r={6} className="fill-crt" />
      {STAGES.map((_, lvl) => {
        const y = 12 + (lvl + 1) * rowH;
        const parentX = lvl === 0 ? W / 2 : xs(chosen[lvl - 1] ?? 0);
        const parentY = 12 + lvl * rowH;
        const reached = lvl <= chosen.length;
        const isCurrent = live && lvl === chosen.length;
        return (
          <g key={lvl}>
            {APPROACHES.map((a, i) => {
              const picked = chosen[lvl] === i;
              const showEdge = reached;
              return (
                <g key={a}>
                  {showEdge && (
                    <line
                      x1={parentX}
                      y1={parentY}
                      x2={xs(i)}
                      y2={y}
                      strokeWidth={picked ? 2.5 : 1}
                      className={picked ? "stroke-crt" : isCurrent ? "stroke-crt-dim" : "stroke-crt-dim opacity-30"}
                    />
                  )}
                  <circle
                    cx={xs(i)}
                    cy={y}
                    r={picked ? 7 : 5}
                    className={picked ? "fill-crt" : isCurrent ? "fill-crt-dim animate-pulse" : "fill-crt-bg stroke-crt-dim opacity-50"}
                  />
                </g>
              );
            })}
            <text x={W - 2} y={y + 4} textAnchor="end" className="fill-crt-dim" fontSize="9">
              {lvl + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Computer({ ui, game }: { ui: UIState; game: Game }) {
  const pc = ui.pc;
  if (!pc) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-3">
      <div className="crt-screen flex h-[min(640px,94vh)] w-[min(980px,97vw)] flex-col">
        <div className="relative z-10 flex items-center justify-between border-b-2 border-crt-dim px-4 py-2 text-lg tracking-wider">
          <span>▣ DUNDER MIFFLIN · TERMINAL DE VENTAS v3.0</span>
          <span>
            {ui.clock} · <span className="crt-amber">${ui.money}</span>
          </span>
        </div>
        <div className="relative z-10 flex-1 overflow-auto px-5 py-4 text-xl leading-snug">
          {pc.screen === "menu" && (
            <div className="space-y-2">
              <p className="crt-line text-2xl">▣ MENÚ PRINCIPAL</p>
              <p className="crt-line crt-dim">
                Ventas de hoy: <span className="crt-amber">${ui.pcStats.money}</span> · Ventas cerradas: {ui.pcStats.sales} · Llamadas: {ui.pcStats.calls}
              </p>
              <p className="crt-line crt-dim">Cada llamada es un árbol de 5 niveles con 4 opciones únicas en cada paso. Lo que eliges decide las siguientes 4.</p>
              <div className="max-w-lg space-y-2 pt-2">
                <button type="button" className="crt-btn" onClick={game.pcStartCall}>
                  [1] 📞 Atender siguiente llamada
                </button>
                <button type="button" className="crt-btn" onClick={() => void game.pcStartAiCall()}>
                  [2] 🤖 Llamada sorpresa (cliente inventado por IA)
                </button>
                <button type="button" className="crt-btn" onClick={game.pcMail}>
                  [3] ✉ Correo electrónico
                </button>
                <button type="button" className="crt-btn" onClick={game.pcSummary}>
                  [4] 📊 Resumen del día
                </button>
                <button type="button" className="crt-btn" onClick={game.closePC}>
                  [5] ⏻ Apagar pantalla
                </button>
              </div>
            </div>
          )}

          {(pc.screen === "call" || pc.screen === "result") && (
            <div className="grid gap-5 md:grid-cols-[1fr_300px]">
              <div className="min-w-0 space-y-2">
                <p className="crt-line text-2xl">
                  ☎ {pc.call.company} {pc.call.ai && <span className="crt-amber text-lg">[🤖 IA]</span>}
                </p>
                <p className="crt-dim">
                  Contacto: {pc.call.contact} · Busca: {pc.call.need} · Presupuesto aprox.: <span className="crt-amber">${pc.call.budget}</span>
                </p>
                <Interest value={pc.call.interest} />
                {pc.call.youLine && (
                  <div className="crt-line border-l-2 border-crt-dim pl-3">
                    <p className="crt-dim">TÚ: «{pc.call.youLine}»</p>
                    {pc.call.reaction && (
                      <p className={pc.call.lastDelta !== null && pc.call.lastDelta >= 2 ? "" : pc.call.lastDelta !== null && pc.call.lastDelta < 0 ? "crt-red" : "crt-amber"}>
                        {pc.call.contact.toUpperCase()}: «{pc.call.reaction}» ({pc.call.lastDelta !== null && pc.call.lastDelta > 0 ? "+" : ""}
                        {pc.call.lastDelta})
                      </p>
                    )}
                  </div>
                )}

                {pc.screen === "call" && pc.call.loading ? (
                  <p className="crt-line crt-amber animate-pulse pt-2">
                    {pc.call.stage === 0 ? "☎ Marcando… buscando un cliente nuevo" : `⏳ ${pc.call.contact} está pensando…`}
                  </p>
                ) : pc.screen === "call" ? (
                  <>
                    <p className="crt-line pt-1">
                      <span className="crt-dim">
                        NIVEL {pc.call.stage + 1}/5 · {(STAGES[pc.call.stage] ?? "").toUpperCase()}
                      </span>
                      <br />
                      {pc.call.contact.toUpperCase()}: «{pc.call.clientLine}»
                    </p>
                    <div className="space-y-1.5 pt-1">
                      {pc.call.options.map((o, i) => (
                        <button key={pc.call.stage + o.text} type="button" className="crt-btn crt-line" onClick={() => game.pcChooseOption(i)}>
                          [{i + 1}] {APPROACH_INFO[o.approach].icon} <span className="crt-dim">{APPROACH_INFO[o.approach].label.toUpperCase()}:</span> {o.text}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="crt-btn crt-red mt-2 max-w-xs" onClick={game.pcHangUp}>
                      ✕ Colgar
                    </button>
                  </>
                ) : (
                  <div className="crt-line space-y-2 pt-2">
                    {pc.hungUp ? (
                      <>
                        <p className="crt-red text-2xl">✕ EL CLIENTE HA COLGADO</p>
                        <p className="crt-red">«{pc.call.clientLine}»</p>
                      </>
                    ) : pc.outcome.kind === "none" ? (
                      <>
                        <p className="crt-red text-2xl">✕ SIN VENTA</p>
                        <p>«Me lo pensaré.» (Necesitas al menos 5 de interés al cerrar.)</p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl">
                          ✔ {pc.outcome.kind === "big" ? "¡VENTA ENORME!" : pc.outcome.kind === "sale" ? "VENTA CERRADA" : "VENTA PEQUEÑA"}
                        </p>
                        <p>
                          Ingreso: <span className="crt-amber text-2xl">+${pc.outcome.amount}</span>
                        </p>
                      </>
                    )}
                    <p className="crt-dim">Pista: escucha cómo saluda el cliente. No repitas el mismo enfoque tres veces seguidas.</p>
                    <div className="max-w-md space-y-1.5 pt-1">
                      <button type="button" className="crt-btn" onClick={game.pcStartCall}>
                        [1] 📞 Siguiente llamada
                      </button>
                      <button type="button" className="crt-btn" onClick={game.pcMenu}>
                        [2] ← Menú
                      </button>
                      <button type="button" className="crt-btn" onClick={game.closePC}>
                        [3] ⏻ Salir
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="crt-dim">ÁRBOL DE LA LLAMADA</p>
                <div className="border-2 border-crt-dim p-2">
                  <Tree call={pc.call} live={pc.screen === "call"} />
                </div>
                <ol className="space-y-0.5 text-lg">
                  {STAGES.map((s, i) => {
                    const step = pc.call.path[i];
                    return (
                      <li key={s} className={step ? "" : i === pc.call.stage && pc.screen === "call" ? "crt-amber" : "crt-dim"}>
                        {i + 1}. {s}
                        {step && ` → ${APPROACH_INFO[step.approach].icon} (${step.delta > 0 ? "+" : ""}${step.delta})`}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          )}

          {pc.screen === "mail" && (
            <div className="space-y-2">
              <p className="crt-line text-2xl">✉ BANDEJA DE ENTRADA</p>
              {pc.mails.map((m, i) => (
                <button key={m.id} type="button" className="crt-btn crt-line" onClick={() => game.pcReadMail(m.id)}>
                  [{i + 1}] {m.read ? "  " : "● "}
                  <span className="crt-dim">{m.from}:</span> {m.subject}
                </button>
              ))}
              <button type="button" className="crt-btn max-w-xs" onClick={game.pcMenu}>
                ← Volver
              </button>
            </div>
          )}

          {pc.screen === "mailRead" && (
            <div className="crt-line max-w-2xl space-y-3">
              <p className="crt-dim">DE: {pc.mail.from}</p>
              <p className="text-2xl">{pc.mail.subject}</p>
              <p>{pc.mail.body}</p>
              <button type="button" className="crt-btn max-w-xs" onClick={game.pcMail}>
                ← Bandeja
              </button>
            </div>
          )}

          {pc.screen === "summary" && (
            <div className="crt-line space-y-1">
              <p className="text-2xl">📊 RESUMEN DEL DÍA</p>
              <p>
                Ventas: <span className="crt-amber">${ui.pcStats.money}</span>
              </p>
              <p>Ventas cerradas: {ui.pcStats.sales}</p>
              <p>Llamadas atendidas: {ui.pcStats.calls}</p>
              <p>
                Misiones: {ui.pcStats.missionsDone}/{ui.pcStats.missionsTotal}
              </p>
              <p>Reputación: ★ {ui.pcStats.rep}</p>
              <button type="button" className="crt-btn mt-3 max-w-xs" onClick={game.pcMenu}>
                ← Volver
              </button>
            </div>
          )}
        </div>
        <div className="relative z-10 border-t border-crt-dim px-4 py-1.5 text-lg crt-dim">
          <span className="crt-cursor mr-2" />
          Usa el ratón o las teclas 1-9 · Esc para salir
        </div>
      </div>
    </div>
  );
}
