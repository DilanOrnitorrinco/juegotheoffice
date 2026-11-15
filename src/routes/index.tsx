import { createFileRoute } from "@tanstack/react-router";

import { GameRoot } from "@/components/game/GameRoot";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Office: Scranton — Un día en Dunder Mifflin" },
      {
        name: "description",
        content: "Juego fan de The Office: vende papel por teléfono, ayuda a tus compañeros, escucha sus conversaciones y vive eventos como Halloween o Navidad.",
      },
      { property: "og:title", content: "The Office: Scranton — Un día en Dunder Mifflin" },
      {
        property: "og:description",
        content: "Vende papel, cumple encargos y cotillea en la oficina de Scranton. Eventos especiales según la fecha.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <GameRoot />;
}
