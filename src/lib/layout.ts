import type { SystemNode, InterfaceDef, PositionedBlock } from "@/store/types";
import {
  GRID,
  BW,
  BH,
  PAD,
  HEADER_H,
  PILL_H,
  PILL_MIN_W,
  snapToGrid,
} from "@/store/constants";
import { getDescendantIds } from "./hierarchy-utils";

/**
 * Choose the optimal number of grid columns for n children.
 */
export function computeOptimalColumns(n: number): number {
  if (n <= 2) return n;
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  return 4;
}

/**
 * Count interfaces that connect blocks idA and idB (including their descendants).
 */
export function countIfacesBetween(
  idA: string,
  idB: string,
  ifaceList: InterfaceDef[],
  parentMap: Record<string, string> | null,
  hier: SystemNode[]
): number {
  const setA = new Set([idA, ...getDescendantIds(hier, idA)]);
  const setB = new Set([idB, ...getDescendantIds(hier, idB)]);
  let count = 0;
  for (const iface of ifaceList) {
    if (
      (setA.has(iface.source) && setB.has(iface.target)) ||
      (setB.has(iface.source) && setA.has(iface.target))
    )
      count++;
  }
  return count;
}

/**
 * Compute the minimum horizontal gap needed to fit pills between two blocks.
 */
export function gapForPills(ifaceCount: number): number {
  if (ifaceCount === 0) return snapToGrid(GRID * 2);
  const pillSpace = PILL_MIN_W + GRID * 4;
  return snapToGrid(Math.max(pillSpace, GRID * 6));
}

/**
 * Compute the minimum vertical gap needed to fit pills between two rows.
 */
export function gapForPillsVertical(ifaceCount: number): number {
  if (ifaceCount === 0) return snapToGrid(GRID * 3);
  return snapToGrid(Math.max(PILL_H * 2 + GRID * 2, GRID * 4));
}

interface LayoutSize {
  w: number;
  h: number;
}

/**
 * Recursively lay out a single node and its children.
 */
export function layoutNode(
  node: SystemNode,
  ox: number,
  oy: number,
  expSet: Set<string>,
  out: Record<string, PositionedBlock>,
  ifaceList: InterfaceDef[],
  hier: SystemNode[]
): LayoutSize {
  const hasKids = !!(node.children?.length);
  const isExp = hasKids && expSet.has(node.id);
  if (!hasKids || !isExp) {
    const w = snapToGrid(BW);
    out[node.id] = {
      ...node,
      x: snapToGrid(ox),
      y: snapToGrid(oy),
      w,
      h: BH,
      expanded: false,
      hasChildren: hasKids,
    };
    return { w, h: BH };
  }

  const kids = node.children!;
  const cols = computeOptimalColumns(kids.length);
  const cs: Record<string, LayoutSize> = {};
  const tmp: Record<string, PositionedBlock> = {};
  for (const k of kids)
    cs[k.id] = layoutNode(k, 0, 0, expSet, tmp, ifaceList, hier);

  const rows: SystemNode[][] = [];
  for (let i = 0; i < kids.length; i += cols)
    rows.push(kids.slice(i, i + cols));

  const innerPad = PAD;

  // Compute column widths and row heights
  const colWidths = new Array(cols).fill(0) as number[];
  const rowHeights = new Array(rows.length).fill(0) as number[];
  for (let ri = 0; ri < rows.length; ri++) {
    for (let ci = 0; ci < rows[ri].length; ci++) {
      const sz = cs[rows[ri][ci].id];
      colWidths[ci] = Math.max(colWidths[ci], snapToGrid(sz.w));
      rowHeights[ri] = Math.max(rowHeights[ri], snapToGrid(sz.h));
    }
  }

  // Compute dynamic horizontal gaps per column (based on interfaces between adjacent columns)
  const colGaps = new Array(Math.max(0, cols - 1)).fill(0) as number[];
  for (let ci = 0; ci < cols - 1; ci++) {
    let maxIfaces = 0;
    for (let ri = 0; ri < rows.length; ri++) {
      if (ci < rows[ri].length - 1 && ci + 1 < rows[ri].length) {
        const a = rows[ri][ci].id,
          b = rows[ri][ci + 1].id;
        maxIfaces = Math.max(
          maxIfaces,
          countIfacesBetween(a, b, ifaceList, null, hier)
        );
      }
    }
    // Also count diagonal interfaces (different rows same columns)
    for (let ri = 0; ri < rows.length; ri++) {
      for (let rj = 0; rj < rows.length; rj++) {
        if (ri === rj) continue;
        if (ci < rows[ri].length && ci + 1 < rows[rj].length) {
          maxIfaces = Math.max(
            maxIfaces,
            countIfacesBetween(
              rows[ri][ci].id,
              rows[rj][ci + 1].id,
              ifaceList,
              null,
              hier
            )
          );
        }
      }
    }
    colGaps[ci] = gapForPills(maxIfaces);
  }

  // Compute dynamic vertical gaps per row
  const rowGaps = new Array(Math.max(0, rows.length - 1)).fill(0) as number[];
  for (let ri = 0; ri < rows.length - 1; ri++) {
    let maxIfaces = 0;
    for (let ci = 0; ci < rows[ri].length; ci++) {
      if (ri + 1 < rows.length && ci < rows[ri + 1].length) {
        maxIfaces = Math.max(
          maxIfaces,
          countIfacesBetween(
            rows[ri][ci].id,
            rows[ri + 1][ci].id,
            ifaceList,
            null,
            hier
          )
        );
      }
    }
    rowGaps[ri] = gapForPillsVertical(maxIfaces);
  }

  // Place children at grid-snapped positions with dynamic gaps
  let cy = snapToGrid(oy + HEADER_H + innerPad);
  for (let ri = 0; ri < rows.length; ri++) {
    let cx = snapToGrid(ox + innerPad);
    for (let ci = 0; ci < rows[ri].length; ci++) {
      layoutNode(rows[ri][ci], cx, cy, expSet, out, ifaceList, hier);
      if (ci < rows[ri].length - 1) {
        cx = snapToGrid(cx + colWidths[ci] + (colGaps[ci] || gapForPills(0)));
      }
    }
    if (ri < rows.length - 1) {
      cy = snapToGrid(
        cy + rowHeights[ri] + (rowGaps[ri] || gapForPillsVertical(0))
      );
    } else {
      cy = snapToGrid(cy + rowHeights[ri]);
    }
  }

  // Compute total width accounting for variable column gaps
  const totalGapX = colGaps.reduce((a, b) => a + b, 0);
  const totalW = snapToGrid(
    colWidths.reduce((a, b) => a + b, 0) + totalGapX + innerPad * 2
  );
  const totalH = snapToGrid(cy - oy + innerPad);
  out[node.id] = {
    ...node,
    x: snapToGrid(ox),
    y: snapToGrid(oy),
    w: totalW,
    h: totalH,
    expanded: true,
    hasChildren: true,
  };
  return { w: totalW, h: totalH };
}

/**
 * Compute the full layout for all root-level nodes.
 */
export function computeLayout(
  hier: SystemNode[],
  expSet: Set<string>,
  ifaceList: InterfaceDef[]
): Record<string, PositionedBlock> {
  const out: Record<string, PositionedBlock> = {};
  let cx = snapToGrid(GRID * 2);
  const startY = snapToGrid(GRID * 2);

  // Compute dynamic gaps between root-level systems
  for (let i = 0; i < hier.length; i++) {
    const n = hier[i];
    const r = layoutNode(n, cx, startY, expSet, out, ifaceList, hier);
    if (i < hier.length - 1) {
      const nxt = hier[i + 1];
      const ic = countIfacesBetween(n.id, nxt.id, ifaceList, null, hier);
      cx = snapToGrid(cx + r.w + gapForPills(ic));
    }
  }
  return out;
}
