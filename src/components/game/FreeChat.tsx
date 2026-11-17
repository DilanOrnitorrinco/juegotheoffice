import { useEffect, useRef, useState } from "react";

import type { ChatMessage } from "@/game/ai";
import type { Game } from "@/game/engine/game";
import type { UIState } from "@/game/engine/state";
import type { CostumeKind } from "@/game/types";

import { Portrait } from "./Portrait";

/** Free-text chat with a character, answered in character by the AI. */
export function FreeChat({ ui, game, costume }: { ui: UIState; game: Game; costume?: CostumeKind | undefined }) {
  const chat = ui.chat;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const chatId = chat?.id ?? null;

  useEffect(() => {
    setMessages([]);
    setText("");
    setError(null);
    if (chatId) setTimeout(() => inputRef.current?.focus(), 30);
  }, [chatId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  if (!chat || !game.ai) return null;
  const first = chat.name.split(" ")[0];

  const send = async () => {
    const content = text.trim().slice(0, 500);
    if (!content || busy || !game.ai) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setText("");
    setBusy(true);
    setError(null);
    try {
      const reply = await game.ai.chat({
        characterId: chat.id,
        messages: next,
        eventName: ui.event?.name ?? null,
        clock: ui.clock,
      });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No te ha oído. Prueba otra vez.");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-3 z-40 flex justify-center px-3">
      <div className="dm-modal flex max-h-[70vh] w-full max-w-3xl flex-col p-4">
        <div className="flex items-start gap-3">
          <Portrait id={chat.id} costume={costume} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-display text-lg leading-none text-primary">{chat.name}</div>
                <div className="text-xs font-semibold text-muted-foreground">{chat.role} · charla libre</div>
              </div>
              <button type="button" className="dm-btn px-2 py-1 text-xs" onClick={game.closeChat}>
                Salir ✕
              </button>
            </div>
            <p className="mt-2 text-[15px] leading-snug text-muted-foreground">Escribe lo que quieras decirle a {first}. Te contestará a su manera.</p>
          </div>
        </div>

        <div ref={listRef} className="mt-3 min-h-[120px] flex-1 space-y-2 overflow-auto rounded-md border-2 border-border bg-secondary/40 p-3" aria-live="polite">
          {messages.length === 0 && <p className="text-sm text-muted-foreground">«{chat.intro}»</p>}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`toast-in max-w-[80%] rounded-lg border-2 px-3 py-1.5 text-[15px] leading-snug ${
                  m.role === "user" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-card-foreground"
                }`}
              >
                {m.role === "assistant" && <span className="mr-1 font-bold text-primary">{first}:</span>}
                {m.content}
              </div>
            </div>
          ))}
          {busy && <p className="animate-pulse text-sm text-muted-foreground">{first} está escribiendo…</p>}
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
            className="min-w-0 flex-1 rounded-md border-2 border-border bg-background px-3 py-2 text-[15px] outline-none focus:border-primary"
          />
          <button type="submit" className="dm-btn px-4 py-2" disabled={busy || !text.trim()}>
            Enviar
          </button>
        </form>
        <span className="mt-2 text-xs text-muted-foreground">El tiempo se detiene mientras hablas · Esc para salir</span>
      </div>
    </div>
  );
}
