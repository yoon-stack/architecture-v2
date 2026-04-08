import type {
  InterfaceDef,
  PositionedBlock,
  DotPosition,
  PillRect,
} from "@/store/types";
import { GRID, PILL_H, PILL_MIN_W } from "@/store/constants";

/**
 * Get the 18 connection dots for a positioned block:
 * 6 on top, 6 on bottom, 3 on left, 3 on right.
 */
export function getDots(b: PositionedBlock): DotPosition[] {
  const { x, y, w, h } = b;
  const tx = [0.08, 0.248, 0.416, 0.584, 0.752, 0.92];
  const sy = [0.25, 0.5, 0.75];
  return [
    ...tx.map((f, i) => ({ id: `t${i + 1}`, cx: x + w * f, cy: y })),
    ...tx.map((f, i) => ({ id: `b${i + 1}`, cx: x + w * f, cy: y + h })),
    ...sy.map((f, i) => ({ id: `l${i + 1}`, cx: x, cy: y + h * f })),
    ...sy.map((f, i) => ({ id: `r${i + 1}`, cx: x + w, cy: y + h * f })),
  ];
}

interface DotAssignment {
  s: DotPosition;
  t: DotPosition;
}

/**
 * For each interface, pick the best source and target dots based on proximity,
 * respecting manual overrides and avoiding already-used dots when possible.
 */
export function assignDots(
  ifaces: InterfaceDef[],
  vis: Record<string, PositionedBlock>,
  dotOverrides: Record<string, string> = {}
): Record<string, DotAssignment> {
  const used: Record<string, Set<string>> = {};
  const out: Record<string, DotAssignment> = {};

  for (const iface of ifaces) {
    const src = vis[iface.source],
      tgt = vis[iface.target];
    if (!src || !tgt) continue;

    const sd = getDots(src),
      td = getDots(tgt);
    const us = used[iface.source] || new Set<string>(),
      ut = used[iface.target] || new Set<string>();
    const tcx = tgt.x + tgt.w / 2,
      tcy = tgt.y + tgt.h / 2,
      scx = src.x + src.w / 2,
      scy = src.y + src.h / 2;

    // Check for manual overrides
    const srcOvr = dotOverrides[`${iface.id}_source`];
    const tgtOvr = dotOverrides[`${iface.id}_target`];

    let bs: DotPosition | null = null,
      bsd = Infinity;
    if (srcOvr) {
      bs = sd.find((d) => d.id === srcOvr) || null;
    }
    if (!bs) {
      for (const d of sd) {
        if (us.has(d.id)) continue;
        const di = Math.hypot(d.cx - tcx, d.cy - tcy);
        if (di < bsd) {
          bsd = di;
          bs = d;
        }
      }
    }
    if (!bs) {
      bsd = Infinity;
      for (const d of sd) {
        const di = Math.hypot(d.cx - tcx, d.cy - tcy);
        if (di < bsd) {
          bsd = di;
          bs = d;
        }
      }
    }

    let bt: DotPosition | null = null,
      btd = Infinity;
    if (tgtOvr) {
      bt = td.find((d) => d.id === tgtOvr) || null;
    }
    if (!bt) {
      for (const d of td) {
        if (ut.has(d.id)) continue;
        const di = Math.hypot(d.cx - scx, d.cy - scy);
        if (di < btd) {
          btd = di;
          bt = d;
        }
      }
    }
    if (!bt) {
      btd = Infinity;
      for (const d of td) {
        const di = Math.hypot(d.cx - scx, d.cy - scy);
        if (di < btd) {
          btd = di;
          bt = d;
        }
      }
    }

    us.add(bs!.id);
    ut.add(bt!.id);
    used[iface.source] = us;
    used[iface.target] = ut;
    out[iface.id] = { s: bs!, t: bt! };
  }
  return out;
}

/**
 * Compute pill (label) positions for each interface, placed at the midpoint
 * of the connection and nudged to avoid overlapping blocks or other pills.
 */
export function computePills(
  ifaces: InterfaceDef[],
  vis: Record<string, PositionedBlock>,
  dots: Record<string, { s: DotPosition; t: DotPosition }>,
  offsets: Record<string, { dx: number; dy: number }>
): Record<string, PillRect> {
  const pills: Record<string, PillRect> = {};
  const placed: PillRect[] = [];
  const blockRects = Object.values(vis)
    .filter((s) => !(s.expanded && s.hasChildren))
    .map((b) => ({ x: b.x - 8, y: b.y - 8, w: b.w + 16, h: b.h + 16 }));

  for (const iface of ifaces) {
    const da = dots[iface.id];
    const pw = Math.max(iface.name.length * 7.2 + 28, PILL_MIN_W);

    if (!da) {
      // Unconnected interface -- place at canvasPos if available
      if (iface.canvasPos) {
        const off = offsets[iface.id] || { dx: 0, dy: 0 };
        pills[iface.id] = {
          x: iface.canvasPos.x - pw / 2 + off.dx,
          y: iface.canvasPos.y - PILL_H / 2 + off.dy,
          w: pw,
          h: PILL_H,
        };
      }
      continue;
    }

    const sB = vis[iface.source],
      tB = vis[iface.target];
    const midX = (da.s.cx + da.t.cx) / 2,
      midY = (da.s.cy + da.t.cy) / 2;
    let bx = midX - pw / 2,
      by = midY - PILL_H / 2;

    // Clamp pill to stay between the two connected blocks
    if (sB && tB) {
      const dx = Math.abs(da.t.cx - da.s.cx),
        dy = Math.abs(da.t.cy - da.s.cy);
      if (dx >= dy) {
        // Horizontal connection: clamp X to gap between facing block edges
        const gapL = Math.min(sB.x + sB.w, tB.x + tB.w);
        const gapR = Math.max(sB.x, tB.x);
        if (gapR - gapL >= pw)
          bx = Math.max(gapL, Math.min(gapR - pw, bx));
      } else {
        // Vertical connection: clamp Y to gap between facing block edges
        const gapT = Math.min(sB.y + sB.h, tB.y + tB.h);
        const gapB = Math.max(sB.y, tB.y);
        if (gapB - gapT >= PILL_H)
          by = Math.max(gapT, Math.min(gapB - PILL_H, by));
      }
    }

    const off = offsets[iface.id] || { dx: 0, dy: 0 };
    let px = bx + off.dx,
      py = by + off.dy;

    // Re-clamp after applying user offset
    if (sB && tB) {
      const dx = Math.abs(da.t.cx - da.s.cx),
        dy = Math.abs(da.t.cy - da.s.cy);
      if (dx >= dy) {
        const gapL = Math.min(sB.x + sB.w, tB.x + tB.w);
        const gapR = Math.max(sB.x, tB.x);
        if (gapR - gapL >= pw)
          px = Math.max(gapL, Math.min(gapR - pw, px));
      } else {
        const gapT = Math.min(sB.y + sB.h, tB.y + tB.h);
        const gapB = Math.max(sB.y, tB.y);
        if (gapB - gapT >= PILL_H)
          py = Math.max(gapT, Math.min(gapB - PILL_H, py));
      }
    }

    const col = (x: number, y: number): boolean => {
      for (const br of blockRects)
        if (
          x + pw > br.x &&
          x < br.x + br.w &&
          y + PILL_H > br.y &&
          y < br.y + br.h
        )
          return true;
      for (const p of placed)
        if (
          x + pw + 4 > p.x &&
          x < p.x + p.w + 4 &&
          y + PILL_H + 4 > p.y &&
          y < p.y + p.h + 4
        )
          return true;
      return false;
    };

    if (col(px, py)) {
      // Stack vertically to resolve collisions while keeping pill between blocks
      let found = false;
      for (let s = 1; s <= 16 && !found; s++)
        for (const sg of [1, -1]) {
          const ty = py + sg * s * GRID;
          if (!col(px, ty)) {
            py = ty;
            found = true;
            break;
          }
        }
    }

    pills[iface.id] = { x: px, y: py, w: pw, h: PILL_H };
    placed.push({ x: px, y: py, w: pw, h: PILL_H });
  }
  return pills;
}
