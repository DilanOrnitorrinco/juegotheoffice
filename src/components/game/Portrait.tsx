import { useEffect, useRef } from "react";

import { CHAR_BY_ID } from "@/game/data/characters";
import { drawCharacter } from "@/game/engine/sprites";
import type { CostumeKind } from "@/game/types";

export function Portrait({ id, costume, size = 76 }: { id: string; costume?: CostumeKind; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const def = CHAR_BY_ID[id];
    if (!c || !def) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size * dpr;
    c.height = size * dpr;
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, size, size);
    drawCharacter(g, { x: size / 2, y: size * 1.18, facing: "down", moving: false, walkT: 0, look: def.look, costume, scale: size / 46 });
  }, [id, costume, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} className="rounded-md border-2 border-border bg-secondary" />;
}
