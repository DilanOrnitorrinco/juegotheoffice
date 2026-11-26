import { useEffect, useRef } from "react";

import { CHAR_BY_ID } from "@/game/data/characters";
import { drawCharacter } from "@/game/engine/sprites";
import type { CostumeKind, Look } from "@/game/types";

export function Portrait({
  id,
  look,
  costume,
  size = 76,
  fullBody = false,
}: {
  id?: string | undefined;
  look?: Look | undefined;
  costume?: CostumeKind | undefined;
  size?: number;
  fullBody?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const resolvedLook = look ?? (id ? CHAR_BY_ID[id]?.look : undefined);
    if (!c || !resolvedLook) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size * dpr;
    c.height = size * dpr;
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, size, size);
    drawCharacter(g, {
      x: size / 2,
      y: fullBody ? size * 0.86 : size * 1.18,
      facing: "down",
      moving: false,
      walkT: 0,
      look: resolvedLook,
      costume,
      scale: fullBody ? size / 74 : size / 46,
    });
  }, [id, look, costume, size, fullBody]);
  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size }}
      className="rounded-md border-2 border-border bg-secondary"
    />
  );
}
