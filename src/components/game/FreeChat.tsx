import { useEffect, useRef, useState } from "react";

import type { ChatMessage } from "@/game/ai";
import type { Game } from "@/game/engine/game";
import type { UIState } from "@/game/engine/state";
import type { CostumeKind } from "@/game/types";

import { Portrait } from "./Portrait";

const STATUS_LABELS: Record<string, string> = {
  en_marcha: "En marcha",
  completada: "Completada ✓",
  recordada: "Recordada",
};

/** Free-text chat with a character, persisted across sessions with character memory. */
export function FreeChat({
  ui,
  game,
  costume,
}: {
  ui: UIState;
  game: Game;
  costume?: CostumeKind | undefined;
}) {
  const chat = ui.chat;
  const [open, setOpen] = useState(true);
  const [memOpen, setMemOpen] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const chatId = chat?.id ?? null;
  const historyLen = chat?.history.length ?? 0;

  useEffect(() => {
    setText("");
    setError(null);
    if (chatId) {
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [chatId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [historyLen, busy, open]);

  if (!chat || !game.ai) return null;
  const first = chat.name.split(" ")[0];

  const send = async () => {
    const content = text.trim().slice(0, 500);
    if (!content || busy || !game.ai) return;

    if (game.isSecretChatTrigger(chat.id, content)) {
      game.appendChatMessage(chat.id, { role: "user", content });
      setText("");
      setError(null);
      inputRef.current?.focus();
      return;
    }

    const priorMsgs: ChatMessage[] = chat.history
      .filter(
        (e): e is { role: "user" | "assistant"; content: string; clock: string } =>
          e.role === "user" || e.role === "assistant",
      )
      .map((e) => ({ role: e.role, content: e.content }));
    const nextForAi: ChatMessage[] = [...priorMsgs, { role: "user" as const, content }].slice(-18);

    game.appendChatMessage(chat.id, { role: "user", content });
    setText("");
    setBusy(true);
    setError(null);
    try {
      const reply = await game.ai.chat({
        characterId: chat.id,
        messages: nextForAi,
        eventName: ui.event?.name ?? null,
        clock: ui.clock,
        memories: chat.memories
          .slice(-20)
          .map((m) =>
            `[${m.atClock} · ${STATUS_LABELS[m.status] ?? m.status}] ${m.summary}`.slice(0, 280),
          ),
        activeCharIds: ui.activeCharIds,
        episodeContext: ui.episodeContext,
        speakerRole: chat.role,
      });
      game.appendChatMessage(chat.id, { role: "assistant", content: reply });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No te ha oído. Prueba otra vez.");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

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
              <span className="font-display text-sm text-primary">💬 Chat con {chat.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                ({chat.history.length} mensajes)
              </span>
              <span className="ml-auto shrink-0 text-xs font-bold text-primary">Desplegar ▾</span>
            </button>
            <button
              type="button"
              className="dm-btn shrink-0 px-2 py-1 text-xs"
              onClick={game.closeChat}
            >
              Salir ✕
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <Portrait id={chat.id} costume={costume} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-lg leading-none text-primary">
                      {chat.name}
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground">
                      {chat.role} · charla libre y memoria de hoy
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      aria-expanded={open}
                      className="dm-btn px-2 py-1 text-xs"
                      onClick={() => setOpen(false)}
                      title="Plegar chat"
                    >
                      Plegar ▸
                    </button>
                    <button
                      type="button"
                      className="dm-btn px-2 py-1 text-xs"
                      onClick={game.closeChat}
                    >
                      Salir ✕
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 text-[14px] leading-snug text-muted-foreground">
                  {first} recordará todo lo que habléis durante el día.
                </p>
              </div>
            </div>

            {chat.memories.length > 0 && (
              <div className="mt-2.5 rounded-md border border-border/70 bg-mustard/15 px-2.5 py-1.5 text-xs">
                <button
                  type="button"
                  aria-expanded={memOpen}
                  className="flex w-full cursor-pointer items-center justify-between font-bold text-primary"
                  onClick={() => setMemOpen((o) => !o)}
                >
                  <span>🧠 Memoria ({chat.memories.length})</span>
                  <span className="text-muted-foreground">{memOpen ? "▾" : "▸"}</span>
                </button>
                {memOpen && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {chat.memories.slice(-3).map((m) => (
                      <span
                        key={m.id}
                        className={`rounded border px-1.5 py-0.5 ${
                          m.status === "completada"
                            ? "border-success/50 bg-success/15 text-foreground"
                            : m.status === "en_marcha"
                              ? "border-primary/50 bg-primary/10 font-semibold text-primary"
                              : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        {m.atClock} · {m.summary} ({STATUS_LABELS[m.status] ?? m.status})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div
              ref={listRef}
              className="mt-2.5 min-h-[140px] flex-1 space-y-2 overflow-auto rounded-md border-2 border-border bg-secondary/40 p-3"
              aria-live="polite"
            >
              {chat.history.length === 0 && (
                <p className="text-sm text-muted-foreground">«{chat.intro}»</p>
              )}
              {chat.history.map((m, i) =>
                m.role === "note" ? (
                  <div key={i} className="flex justify-center">
                    <div className="rounded border border-mustard/60 bg-mustard/20 px-2.5 py-1 text-xs font-medium text-foreground">
                      <span className="mr-1.5 font-mono text-[11px] text-muted-foreground">
                        {m.clock}
                      </span>
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div
                    key={i}
                    className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={`toast-in max-w-[80%] rounded-lg border-2 px-3 py-1.5 text-[15px] leading-snug ${
                        m.role === "user"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-card-foreground"
                      }`}
                    >
                      {m.role === "assistant" && (
                        <span className="mr-1 font-bold text-primary">{first}:</span>
                      )}
                      {m.content}
                      <span
                        className={`ml-2 text-[10px] ${
                          m.role === "user" ? "text-primary-foreground/75" : "text-muted-foreground"
                        }`}
                      >
                        {m.clock}
                      </span>
                    </div>
                  </div>
                ),
              )}
              {busy && (
                <p className="animate-pulse text-sm text-muted-foreground">
                  {first} está escribiendo…
                </p>
              )}
              {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
            </div>

            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <input
                ref={inputRef}
                value={text}
                maxLength={500}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") game.closeChat();
                }}
                placeholder={`Dile algo a ${first}…`}
                aria-label={`Mensaje para ${chat.name}`}
                className="min-w-0 flex-1 rounded-md border-2 border-border bg-card px-3 py-2 text-[15px] text-card-foreground outline-none focus:border-primary"
              />
              <button type="submit" className="dm-btn px-4 py-2" disabled={busy || !text.trim()}>
                Enviar
              </button>
            </form>
            <span className="mt-2 text-xs text-muted-foreground">
              El tiempo se detiene mientras hablas · Esc para salir
            </span>
          </>
        )}
      </div>
    </div>
  );
}
