<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- The game is a canvas engine in `src/game/` (data in `data/`, logic in `engine/game.ts`, drawing in `engine/render.ts`/`sprites.ts`) and React only renders overlays from `game.getSnapshot()` via `useSyncExternalStore` — keeps the 60fps loop out of React.
- All game content (characters, missions, conversations, sales tree, events) lives as typed data in `src/game/data/`; add content there, not in engine code — keeps the engine generic.
- NPCs move only along A* paths over a grid built from walls + furniture (`engine/pathfinding.ts`); new furniture must be added to `FURNITURE` so collisions and paths stay correct.
- AI (Pollinations) calls live only in `src/lib/ai.functions.ts` server functions reading `POLLINATIONS_API_KEY`; the engine talks to them through the `GameAi` interface in `src/game/ai.ts` injected by GameRoot, and always falls back to the static content — keeps the key server-side and the game playable when the AI fails.
