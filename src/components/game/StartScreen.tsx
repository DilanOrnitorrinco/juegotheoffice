import { useEffect, useMemo, useState } from "react";

import { EVENTS, eventForDate, formatLongDate, parseLocalDate } from "@/game/data/events";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function StartScreen({ onStart }: { onStart: (date: string) => void }) {
  const [date, setDate] = useState("");
  useEffect(() => setDate(todayISO()), []);
  const parsed = useMemo(() => (date ? parseLocalDate(date) : null), [date]);
  const ev = parsed ? eventForDate(parsed) : null;
  const year = parsed?.getFullYear() ?? 2026;

  return (
    <div className="dm-overlay fixed inset-0 z-50 flex items-center justify-center overflow-auto p-4">
      <div className="dm-modal dm-memo w-full max-w-3xl p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-type text-sm uppercase tracking-widest text-muted-foreground">Dunder Mifflin Paper Company · Scranton</p>
            <h1 className="dm-stamp mt-1 text-4xl leading-none text-primary md:text-5xl">THE OFFICE</h1>
            <p className="font-type mt-1 text-lg">Un día en la oficina</p>
          </div>
          <div className="rotate-3 rounded-md border-2 border-destructive px-3 py-1 font-type text-sm uppercase text-destructive">
            Juego fan · No oficial
          </div>
        </div>

        <p className="mt-5 leading-relaxed">
          Eres el nuevo ayudante de oficina. Atiende llamadas desde <b>tu mesa</b>, ayuda a tus compañeros cuando te lo pidan y
          escucha lo que hablan entre ellos. La jornada termina a las <b>17:00</b>.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-[1fr_1.2fr]">
          <div>
            <label htmlFor="game-date" className="font-display text-sm uppercase">
              ¿Qué día es hoy?
            </label>
            <input
              id="game-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 w-full rounded-md border-2 border-border bg-paper px-3 py-2 font-bold"
            />
            {parsed && <p className="mt-2 text-sm capitalize text-muted-foreground">{formatLongDate(parsed)}</p>}
            <div className="mt-3 rounded-md border-2 border-dashed border-border p-3">
              {ev ? (
                <>
                  <p className="font-display text-lg">
                    {ev.emoji} {ev.name}
                  </p>
                  <p className="text-sm">{ev.description}</p>
                </>
              ) : (
                <p className="text-sm">Un día normal en Scranton. Ningún evento especial… de momento.</p>
              )}
            </div>
          </div>
          <div>
            <p className="font-display text-sm uppercase">Fechas especiales</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {EVENTS.filter((e) => e.id !== "viernes").map((e) => (
                <button key={e.id} type="button" className="dm-btn justify-start text-left" onClick={() => setDate(e.example(year))}>
                  <span className="text-lg">{e.emoji}</span>
                  <span className="leading-tight">
                    {e.name}
                    <span className="block text-xs font-semibold text-muted-foreground">{e.dateLabel}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Los viernes son «viernes casual» 🌺.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="dm-kbd">WASD</span> moverte · <span className="dm-kbd">E</span> hablar/usar · <span className="dm-kbd">Shift</span> correr · <span className="dm-kbd">J</span> misiones
          </p>
          <button type="button" className="dm-btn dm-btn-primary px-6 py-3 text-base" disabled={!date} onClick={() => onStart(date)}>
            Empezar el día →
          </button>
        </div>
      </div>
    </div>
  );
}
