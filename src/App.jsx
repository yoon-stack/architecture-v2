import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Sidebar from "./Sidebar";

const COLORS = { orange: "#f97316", blue: "#3b82f6", green: "#22c55e", yellow: "#eab308", gray: "#94a3b8" };
const GRID = 40;
const BW = 260, BH = 95, PAD = 40, HEADER_H = 40, PILL_H = 28, PILL_MIN_W = 80;
const INTER_BLOCK = 280, ROW_GAP = 120;
function snapToGrid(v) { return Math.round(v / GRID) * GRID; }

const initialHierarchy = [
  { id: "du42", name: "du42", reqs: 1, color: COLORS.yellow },
  { id: "ground-station", name: "Ground Station", reqs: 0, color: COLORS.yellow },
  {
    id: "launch-vehicle", name: "Launch Vehicle", reqs: 42, color: COLORS.orange,
    children: [
      {
        id: "stage-1", name: "Stage 1", reqs: 12, color: COLORS.blue,
        children: [
          { id: "s1-avionics", name: "Avionics", reqs: 3, color: COLORS.orange },
          { id: "s1-payload", name: "Payload", reqs: 1, color: COLORS.green },
          { id: "s1-propulsion", name: "Propulsion system", reqs: 4, color: COLORS.blue },
          { id: "s1-structures", name: "Structures", reqs: 1, color: COLORS.orange },
        ]
      },
      {
        id: "stage-2", name: "Stage 2", reqs: 20, color: COLORS.orange,
        children: [
          { id: "s2-avionics", name: "Avionics", reqs: 7, color: COLORS.green },
          { id: "s2-payload-fairing", name: "Payload fairing", reqs: 3, color: COLORS.orange },
          { id: "s2-propulsion", name: "Propulsion system", reqs: 6, color: COLORS.blue },
          { id: "s2-separation", name: "Separation system", reqs: 0, color: COLORS.blue },
          { id: "s2-structures", name: "Structures", reqs: 1, color: COLORS.orange },
          { id: "s2-attitude", name: "Attitude control", reqs: 0, color: COLORS.yellow },
          { id: "s2-navigation", name: "Navigation system", reqs: 0, color: COLORS.orange },
          { id: "s2-data-handling", name: "Data handling", reqs: 0, color: COLORS.blue },
        ]
      },
    ]
  },
  { id: "example", name: "Example", reqs: 0, color: COLORS.gray },
];

let _itemCounter = 0;

function buildParentMap(nodes, pid) { const m = {}; for (const n of nodes) { if (pid) m[n.id] = pid; if (n.children) Object.assign(m, buildParentMap(n.children, n.id)); } return m; }
function getDescendantIds(nodes, tid) { const ids = []; (function f(l) { for (const n of l) { if (n.id === tid && n.children) (function c(ch) { for (const x of ch) { ids.push(x.id); if (x.children) c(x.children); } })(n.children); if (n.children) f(n.children); } })(nodes); return ids; }
function getAncestorIds(id, pm) { const a = []; let c = pm[id]; while (c) { a.push(c); c = pm[c]; } return a; }
function findNode(nodes, id) { for (const n of nodes) { if (n.id === id) return n; if (n.children) { const f = findNode(n.children, id); if (f) return f; } } return null; }

function computeOptimalColumns(n) {
  if (n <= 2) return n;
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  return 4;
}

// Count interfaces between two sets of block IDs (including descendants)
function countIfacesBetween(idA, idB, ifaceList, parentMap, hier) {
  // Collect all descendant IDs for each block
  const setA = new Set([idA, ...getDescendantIds(hier, idA)]);
  const setB = new Set([idB, ...getDescendantIds(hier, idB)]);
  let count = 0;
  for (const iface of ifaceList) {
    if ((setA.has(iface.source) && setB.has(iface.target)) ||
        (setB.has(iface.source) && setA.has(iface.target))) count++;
  }
  return count;
}

// Compute the minimum gap needed to fit pills between two blocks
function gapForPills(ifaceCount) {
  if (ifaceCount === 0) return snapToGrid(GRID * 2); // minimum gap with no interfaces
  // Pill needs full width + collision padding (16px each side) + breathing room
  // Longest pill names are ~20 chars → ~152px. Add generous margin.
  const pillSpace = PILL_MIN_W + GRID * 4; // pill width + margin for collision padding
  return snapToGrid(Math.max(pillSpace, GRID * 6));
}

function gapForPillsVertical(ifaceCount) {
  if (ifaceCount === 0) return snapToGrid(GRID * 3);
  // Vertical gap: pill height + collision padding + clearance
  return snapToGrid(Math.max(PILL_H * 2 + GRID * 2, GRID * 4));
}

function layoutNode(node, ox, oy, expSet, out, ifaceList, hier) {
  const hasKids = !!(node.children?.length);
  const isExp = hasKids && expSet.has(node.id);
  if (!hasKids || !isExp) {
    const w = snapToGrid(BW);
    out[node.id] = { ...node, x: snapToGrid(ox), y: snapToGrid(oy), w, h: BH, expanded: false, hasChildren: hasKids };
    return { w, h: BH };
  }
  const kids = node.children;
  const cols = computeOptimalColumns(kids.length);
  const cs = {}, tmp = {};
  for (const k of kids) cs[k.id] = layoutNode(k, 0, 0, expSet, tmp, ifaceList, hier);
  const rows = [];
  for (let i = 0; i < kids.length; i += cols) rows.push(kids.slice(i, i + cols));
  const innerPad = PAD;

  // Compute column widths and row heights
  const colWidths = new Array(cols).fill(0);
  const rowHeights = new Array(rows.length).fill(0);
  for (let ri = 0; ri < rows.length; ri++) {
    for (let ci = 0; ci < rows[ri].length; ci++) {
      const sz = cs[rows[ri][ci].id];
      colWidths[ci] = Math.max(colWidths[ci], snapToGrid(sz.w));
      rowHeights[ri] = Math.max(rowHeights[ri], snapToGrid(sz.h));
    }
  }

  // Compute dynamic horizontal gaps per column (based on interfaces between adjacent columns)
  const colGaps = new Array(Math.max(0, cols - 1)).fill(0);
  for (let ci = 0; ci < cols - 1; ci++) {
    let maxIfaces = 0;
    for (let ri = 0; ri < rows.length; ri++) {
      if (ci < rows[ri].length - 1 && ci + 1 < rows[ri].length) {
        const a = rows[ri][ci].id, b = rows[ri][ci + 1].id;
        maxIfaces = Math.max(maxIfaces, countIfacesBetween(a, b, ifaceList, null, hier));
      }
    }
    // Also count diagonal interfaces (different rows same columns)
    for (let ri = 0; ri < rows.length; ri++) {
      for (let rj = 0; rj < rows.length; rj++) {
        if (ri === rj) continue;
        if (ci < rows[ri].length && ci + 1 < rows[rj].length) {
          maxIfaces = Math.max(maxIfaces, countIfacesBetween(rows[ri][ci].id, rows[rj][ci + 1].id, ifaceList, null, hier));
        }
      }
    }
    colGaps[ci] = gapForPills(maxIfaces);
  }

  // Compute dynamic vertical gaps per row
  const rowGaps = new Array(Math.max(0, rows.length - 1)).fill(0);
  for (let ri = 0; ri < rows.length - 1; ri++) {
    let maxIfaces = 0;
    for (let ci = 0; ci < rows[ri].length; ci++) {
      if (ri + 1 < rows.length && ci < rows[ri + 1].length) {
        maxIfaces = Math.max(maxIfaces, countIfacesBetween(rows[ri][ci].id, rows[ri + 1][ci].id, ifaceList, null, hier));
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
      cy = snapToGrid(cy + rowHeights[ri] + (rowGaps[ri] || gapForPillsVertical(0)));
    } else {
      cy = snapToGrid(cy + rowHeights[ri]);
    }
  }
  // Compute total width accounting for variable column gaps
  const totalGapX = colGaps.reduce((a, b) => a + b, 0);
  const totalW = snapToGrid(colWidths.reduce((a, b) => a + b, 0) + totalGapX + innerPad * 2);
  const totalH = snapToGrid(cy - oy + innerPad);
  out[node.id] = { ...node, x: snapToGrid(ox), y: snapToGrid(oy), w: totalW, h: totalH, expanded: true, hasChildren: true };
  return { w: totalW, h: totalH };
}

function computeLayout(hier, expSet, ifaceList) {
  const out = {}; let cx = snapToGrid(GRID * 2);
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

function getDots(b) {
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

function assignDots(ifaces, vis, dotOverrides = {}) {
  const used = {}, out = {};
  for (const iface of ifaces) {
    const src = vis[iface.source], tgt = vis[iface.target]; if (!src || !tgt) continue;
    const sd = getDots(src), td = getDots(tgt);
    const us = used[iface.source] || new Set(), ut = used[iface.target] || new Set();
    const tcx = tgt.x + tgt.w / 2, tcy = tgt.y + tgt.h / 2, scx = src.x + src.w / 2, scy = src.y + src.h / 2;

    // Check for manual overrides
    const srcOvr = dotOverrides[`${iface.id}_source`];
    const tgtOvr = dotOverrides[`${iface.id}_target`];

    let bs = null, bsd = Infinity;
    if (srcOvr) { bs = sd.find(d => d.id === srcOvr) || null; }
    if (!bs) { for (const d of sd) { if (us.has(d.id)) continue; const di = Math.hypot(d.cx - tcx, d.cy - tcy); if (di < bsd) { bsd = di; bs = d; } } }
    if (!bs) { bsd = Infinity; for (const d of sd) { const di = Math.hypot(d.cx - tcx, d.cy - tcy); if (di < bsd) { bsd = di; bs = d; } } }

    let bt = null, btd = Infinity;
    if (tgtOvr) { bt = td.find(d => d.id === tgtOvr) || null; }
    if (!bt) { for (const d of td) { if (ut.has(d.id)) continue; const di = Math.hypot(d.cx - scx, d.cy - scy); if (di < btd) { btd = di; bt = d; } } }
    if (!bt) { btd = Infinity; for (const d of td) { const di = Math.hypot(d.cx - scx, d.cy - scy); if (di < btd) { btd = di; bt = d; } } }

    us.add(bs.id); ut.add(bt.id); used[iface.source] = us; used[iface.target] = ut;
    out[iface.id] = { s: bs, t: bt };
  }
  return out;
}

function computePills(ifaces, vis, dots, offsets) {
  const pills = {}, placed = [];
  const blockRects = Object.values(vis).filter(s => !(s.expanded && s.hasChildren)).map(b => ({ x: b.x - 8, y: b.y - 8, w: b.w + 16, h: b.h + 16 }));
  for (const iface of ifaces) {
    const da = dots[iface.id]; if (!da) continue;
    const pw = Math.max(iface.name.length * 7.2 + 28, PILL_MIN_W);
    const sB = vis[iface.source], tB = vis[iface.target];

    const midX = (da.s.cx + da.t.cx) / 2, midY = (da.s.cy + da.t.cy) / 2;
    let bx = midX - pw / 2, by = midY - PILL_H / 2;

    // Clamp pill to stay between the two connected blocks
    if (sB && tB) {
      const dx = Math.abs(da.t.cx - da.s.cx), dy = Math.abs(da.t.cy - da.s.cy);
      if (dx >= dy) {
        // Horizontal connection: clamp X to gap between facing block edges
        const gapL = Math.min(sB.x + sB.w, tB.x + tB.w);
        const gapR = Math.max(sB.x, tB.x);
        if (gapR - gapL >= pw) bx = Math.max(gapL, Math.min(gapR - pw, bx));
      } else {
        // Vertical connection: clamp Y to gap between facing block edges
        const gapT = Math.min(sB.y + sB.h, tB.y + tB.h);
        const gapB = Math.max(sB.y, tB.y);
        if (gapB - gapT >= PILL_H) by = Math.max(gapT, Math.min(gapB - PILL_H, by));
      }
    }

    const off = offsets[iface.id] || { dx: 0, dy: 0 };
    let px = bx + off.dx, py = by + off.dy;

    // Re-clamp after applying user offset
    if (sB && tB) {
      const dx = Math.abs(da.t.cx - da.s.cx), dy = Math.abs(da.t.cy - da.s.cy);
      if (dx >= dy) {
        const gapL = Math.min(sB.x + sB.w, tB.x + tB.w);
        const gapR = Math.max(sB.x, tB.x);
        if (gapR - gapL >= pw) px = Math.max(gapL, Math.min(gapR - pw, px));
      } else {
        const gapT = Math.min(sB.y + sB.h, tB.y + tB.h);
        const gapB = Math.max(sB.y, tB.y);
        if (gapB - gapT >= PILL_H) py = Math.max(gapT, Math.min(gapB - PILL_H, py));
      }
    }

    const col = (x, y) => {
      for (const br of blockRects) if (x + pw > br.x && x < br.x + br.w && y + PILL_H > br.y && y < br.y + br.h) return true;
      for (const p of placed) if (x + pw + 4 > p.x && x < p.x + p.w + 4 && y + PILL_H + 4 > p.y && y < p.y + p.h + 4) return true;
      return false;
    };
    if (col(px, py)) {
      // Stack vertically (perpendicular to horizontal connections) to resolve collisions
      // while keeping the pill between the blocks
      let found = false;
      for (let s = 1; s <= 16 && !found; s++) for (const sg of [1, -1]) {
        const ty = py + sg * s * GRID;
        if (!col(px, ty)) { py = ty; found = true; break; }
      }
    }
    pills[iface.id] = { x: px, y: py, w: pw, h: PILL_H }; placed.push({ x: px, y: py, w: pw, h: PILL_H });
  }
  return pills;
}

// Determine if a dot id exits from the top or bottom of a block
function isVerticalDot(dotId) { return dotId && (dotId[0] === 't' || dotId[0] === 'b'); }
function isBottomDot(dotId) { return dotId && dotId[0] === 'b'; }
function isTopDot(dotId) { return dotId && dotId[0] === 't'; }
function isLeftDot(dotId) { return dotId === 'ml' || dotId === 'l3' || dotId === 'l7'; }
function isRightDot(dotId) { return dotId === 'mr' || dotId === 'r3' || dotId === 'r7'; }

// Check if a horizontal line segment at y between x1 and x2 intersects any block rect
function hSegmentCrossesBlock(y, x1, x2, blocks, margin) {
  const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
  const m = margin || 4;
  for (const b of blocks) {
    // Does the horizontal line at y cross through block b?
    if (y > b.y + m && y < b.y + b.h - m && hi > b.x + m && lo < b.x + b.w - m) return true;
  }
  return false;
}

// Check if a vertical line segment at x between y1 and y2 intersects any block rect
function vSegmentCrossesBlock(x, y1, y2, blocks, margin) {
  const lo = Math.min(y1, y2), hi = Math.max(y1, y2);
  const m = margin || 4;
  for (const b of blocks) {
    if (x > b.x + m && x < b.x + b.w - m && hi > b.y + m && lo < b.y + b.h - m) return true;
  }
  return false;
}

// Find a clear Y for a horizontal segment between two X coords, starting from a preferred Y
function findClearY(preferredY, sx, tx, blocks, minY, maxY) {
  if (!hSegmentCrossesBlock(preferredY, sx, tx, blocks)) return preferredY;
  // Search outward from preferred Y in grid increments
  for (let offset = GRID; offset <= GRID * 12; offset += GRID) {
    const yUp = snapToGrid(preferredY - offset);
    const yDown = snapToGrid(preferredY + offset);
    if (yUp >= minY && !hSegmentCrossesBlock(yUp, sx, tx, blocks)) return yUp;
    if (yDown <= maxY && !hSegmentCrossesBlock(yDown, sx, tx, blocks)) return yDown;
  }
  return preferredY; // fallback
}

// Find a clear X for a vertical segment between two Y coords, starting from a preferred X
function findClearX(preferredX, sy, ty, blocks, minX, maxX) {
  if (!vSegmentCrossesBlock(preferredX, sy, ty, blocks)) return preferredX;
  for (let offset = GRID; offset <= GRID * 12; offset += GRID) {
    const xLeft = snapToGrid(preferredX - offset);
    const xRight = snapToGrid(preferredX + offset);
    if (xLeft >= minX && !vSegmentCrossesBlock(xLeft, sy, ty, blocks)) return xLeft;
    if (xRight <= maxX && !vSegmentCrossesBlock(xRight, sy, ty, blocks)) return xRight;
  }
  return preferredX; // fallback
}

// Smart orthogonal path that adapts routing based on dot direction.
// For side dots (ml, mr, l3, r3): exits horizontally first
// For top/bottom dots (tc, tl, tr, bc, bl, br): exits vertically first
// When one end is a pill (null dotId), it adapts to the known dot's direction.
// blockRects: array of {x,y,w,h} for leaf blocks to avoid crossing
function smartElbowPath(sx, sy, tx, ty, sDotId, tDotId, midOverride, blockRects) {
  const sVert = isVerticalDot(sDotId);
  const tVert = isVerticalDot(tDotId);
  const sKnown = sDotId != null;
  const tKnown = tDotId != null;
  const blocks = blockRects || [];
  const minBound = -2000, maxBound = 8000;

  // Helper: build a V-H-V path, checking that vertical legs don't cross blocks.
  // If a vertical leg crosses a block, detour horizontally around it (5-segment path).
  function vhvPath(x1, y1, x2, y2, mid) {
    const my = mid !== undefined ? mid : findClearY(snapToGrid((y1 + y2) / 2), x1, x2, blocks, minBound, maxBound);
    const v1Cross = vSegmentCrossesBlock(x1, y1, my, blocks);
    const v2Cross = vSegmentCrossesBlock(x2, my, y2, blocks);
    if (!v1Cross && !v2Cross) {
      return `M${x1},${y1} L${x1},${my} L${x2},${my} L${x2},${y2}`;
    }
    // Detour: find a clear X channel to route the vertical leg around blocks
    if (v1Cross) {
      // Route: go short V from source, then H to clear channel, then V down, then H to target X, then V to target
      const exitY = isBottomDot(sDotId) ? snapToGrid(y1 + GRID) : snapToGrid(y1 - GRID);
      const clearX = findClearX(snapToGrid(x1 - GRID * 2), exitY, my, blocks, minBound, maxBound);
      return `M${x1},${y1} L${x1},${exitY} L${clearX},${exitY} L${clearX},${my} L${x2},${my} L${x2},${y2}`;
    }
    if (v2Cross) {
      const entryY = isTopDot(tDotId) ? snapToGrid(y2 - GRID) : snapToGrid(y2 + GRID);
      const clearX = findClearX(snapToGrid(x2 + GRID * 2), my, entryY, blocks, minBound, maxBound);
      return `M${x1},${y1} L${x1},${my} L${clearX},${my} L${clearX},${entryY} L${x2},${entryY} L${x2},${y2}`;
    }
    return `M${x1},${y1} L${x1},${my} L${x2},${my} L${x2},${y2}`;
  }

  // Helper: build an H-V-H path, checking that horizontal legs don't cross blocks.
  function hvhPath(x1, y1, x2, y2, mid) {
    const mx = mid !== undefined ? mid : findClearX(snapToGrid((x1 + x2) / 2), y1, y2, blocks, minBound, maxBound);
    const h1Cross = hSegmentCrossesBlock(y1, x1, mx, blocks);
    const h2Cross = hSegmentCrossesBlock(y2, mx, x2, blocks);
    if (!h1Cross && !h2Cross) {
      return `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`;
    }
    if (h1Cross) {
      const exitX = isRightDot(sDotId) ? snapToGrid(x1 + GRID) : snapToGrid(x1 - GRID);
      const clearY = findClearY(snapToGrid(y1 - GRID * 2), exitX, mx, blocks, minBound, maxBound);
      return `M${x1},${y1} L${exitX},${y1} L${exitX},${clearY} L${mx},${clearY} L${mx},${y2} L${x2},${y2}`;
    }
    if (h2Cross) {
      const entryX = isLeftDot(tDotId) ? snapToGrid(x2 - GRID) : snapToGrid(x2 + GRID);
      const clearY = findClearY(snapToGrid(y2 + GRID * 2), mx, entryX, blocks, minBound, maxBound);
      return `M${x1},${y1} L${mx},${y1} L${mx},${clearY} L${entryX},${clearY} L${entryX},${y2} L${x2},${y2}`;
    }
    return `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`;
  }

  // Source→Pill (tDotId is null): route based on source dot direction
  if (sKnown && !tKnown) {
    if (sVert) {
      const mid = midOverride !== undefined ? midOverride : undefined;
      return vhvPath(sx, sy, tx, ty, mid);
    } else {
      const mid = midOverride !== undefined ? midOverride : undefined;
      return hvhPath(sx, sy, tx, ty, mid);
    }
  }

  // Pill→Target (sDotId is null): route based on target dot direction
  if (!sKnown && tKnown) {
    if (tVert) {
      const mid = midOverride !== undefined ? midOverride : undefined;
      return vhvPath(sx, sy, tx, ty, mid);
    } else {
      const mid = midOverride !== undefined ? midOverride : undefined;
      return hvhPath(sx, sy, tx, ty, mid);
    }
  }

  // Both dots known: full block-to-block connection
  if (sVert && tVert) {
    const mid = midOverride !== undefined ? midOverride : undefined;
    return vhvPath(sx, sy, tx, ty, mid);
  }
  if (!sVert && !tVert) {
    const mid = midOverride !== undefined ? midOverride : undefined;
    return hvhPath(sx, sy, tx, ty, mid);
  }
  // Mixed: source vertical, target horizontal — L-shape
  if (sVert && !tVert) {
    if (!vSegmentCrossesBlock(sx, sy, ty, blocks) && !hSegmentCrossesBlock(ty, sx, tx, blocks)) {
      return `M${sx},${sy} L${sx},${ty} L${tx},${ty}`;
    }
    return vhvPath(sx, sy, tx, ty);
  }
  // Mixed: source horizontal, target vertical — L-shape
  if (!vSegmentCrossesBlock(tx, sy, ty, blocks) && !hSegmentCrossesBlock(sy, sx, tx, blocks)) {
    return `M${sx},${sy} L${tx},${sy} L${tx},${ty}`;
  }
  return hvhPath(sx, sy, tx, ty);
}

// Round sharp corners in an M/L SVG path with quadratic bezier curves
function roundPath(pathStr, r = 6) {
  const parts = pathStr.match(/[ML][^ML]*/g);
  if (!parts || parts.length < 3) return pathStr;
  const pts = parts.map(p => { const n = p.trim().substring(1).split(/[,\s]+/).map(Number); return { x: n[0], y: n[1] }; });
  if (pts.length < 3) return pathStr;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1], cur = pts[i], next = pts[i + 1];
    const dx1 = cur.x - prev.x, dy1 = cur.y - prev.y, len1 = Math.hypot(dx1, dy1);
    const dx2 = next.x - cur.x, dy2 = next.y - cur.y, len2 = Math.hypot(dx2, dy2);
    const cr = Math.min(r, len1 / 2, len2 / 2);
    if (cr < 1 || len1 < 1 || len2 < 1) { d += ` L${cur.x},${cur.y}`; continue; }
    const sx = cur.x - (dx1 / len1) * cr, sy = cur.y - (dy1 / len1) * cr;
    const ex = cur.x + (dx2 / len2) * cr, ey = cur.y + (dy2 / len2) * cr;
    d += ` L${sx},${sy} Q${cur.x},${cur.y} ${ex},${ey}`;
  }
  d += ` L${pts[pts.length - 1].x},${pts[pts.length - 1].y}`;
  return d;
}

// Legacy H-V-H path (used for preview lines where dot IDs are unknown)
function elbowPath(sx, sy, tx, ty, midX) {
  const mx = midX !== undefined ? midX : (sx + tx) / 2;
  return roundPath(`M${sx},${sy} L${mx},${sy} L${mx},${ty} L${tx},${ty}`);
}

// Returns an array of SVG path segment descriptors for the elbow:
function elbowSegments(sx, sy, tx, ty, midX) {
  const mx = midX !== undefined ? midX : (sx + tx) / 2;
  return [
    { type: 'H', x1: sx, y1: sy, x2: mx, y2: sy },
    { type: 'V', x1: mx, y1: sy, x2: mx, y2: ty },
    { type: 'H', x1: mx, y1: ty, x2: tx, y2: ty },
  ];
}

const CubeIcon = ({ x, y, size, color }) => {
  const scale = size / 24;
  return <g transform={`translate(${x},${y}) scale(${scale})`}>
    <path d="M12 17.7604L16.9883 14.8804V9.12036L12 6.24036L7.01172 9.12036V14.8804L12 17.7604ZM12 17.7604V12.3604M12 12.3604L7.32003 9.48036M12 12.3604L16.68 9.48036" fill="none" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
  </g>;
};

const SvgRequirementIcon = ({ x, y, size = 24 }) => {
  const s = size / 24;
  return <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M13.8002 9.25L11.8684 11.1818C11.6927 11.3575 11.4077 11.3575 11.232 11.1818L10.2002 10.15" stroke="#0084D1" strokeWidth={1.2} fill="none" />
    <path d="M7.5 15.55V7.58622C7.5 7.49738 7.5263 7.41053 7.57558 7.33661L8.26641 6.30036C8.34987 6.17517 8.49037 6.09998 8.64083 6.09998H16.05C16.2985 6.09998 16.5 6.30145 16.5 6.54998V14.2M7.5 15.55C7.5 15.55 8.10442 16.9 8.85 16.9C11.4001 16.9 14.8351 16.9 16.0508 16.9C16.2994 16.9 16.5 16.6985 16.5 16.45V14.2M7.5 15.55C7.5 15.55 8.10442 14.2 8.85 14.2C11.55 14.2 16.5 14.2 16.5 14.2" stroke="#0084D1" strokeWidth={1.2} fill="none" />
  </g>;
};

const SvgTestIcon = ({ x, y, size = 24 }) => {
  const s = size / 24;
  return <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M9.50023 6H10.7502M14.5002 6H13.2502M13.2502 6H12.0002H10.7502M13.2502 6V9.73205C13.2502 9.90759 13.2964 10.08 13.3842 10.2321L14.9823 13M10.7502 6L10.7502 9.73205C10.7502 9.90759 10.704 10.08 10.6163 10.2321L9.01818 13M14.9823 13L16.4257 15.5C16.6043 15.8094 16.6043 16.1906 16.4257 16.5L16.2889 16.7369C16.1103 17.0463 15.7801 17.2369 15.4229 17.2369H8.57758C8.22032 17.2369 7.89019 17.0463 7.71156 16.7369L7.57481 16.5C7.39618 16.1906 7.39618 15.8094 7.57481 15.5L9.01818 13M14.9823 13H9.01818" stroke="#009966" strokeWidth={1.2} fill="none" />
  </g>;
};

const SvgDocumentIcon = ({ x, y, size = 24 }) => {
  const s = size / 24;
  return <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M13.7996 6.23987V8.39987C13.7996 8.79751 14.1219 9.11987 14.5196 9.11987H16.6796M15.5996 7.31987C15.2791 7.03315 14.9466 6.69309 14.7367 6.47224C14.597 6.32527 14.404 6.23987 14.2012 6.23987H8.75939C7.96411 6.23987 7.3194 6.88457 7.31939 7.67986L7.31934 16.3198C7.31933 17.1151 7.96404 17.7598 8.75933 17.7598L15.2394 17.7599C16.0346 17.7599 16.6793 17.1152 16.6794 16.3199L16.6796 8.68657C16.6796 8.50246 16.6093 8.32549 16.4815 8.19295C16.2453 7.94786 15.8507 7.54458 15.5996 7.31987Z" stroke="#000" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </g>;
};

const SvgDesignValueIcon = ({ x, y, size = 24 }) => {
  const s = size / 24;
  return <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M15.5 9V7.73607C15.5 7.58082 15.4639 7.42771 15.3944 7.28885L15.2764 7.05279C15.107 6.714 14.7607 6.5 14.382 6.5H9.55902C9.21641 6.5 8.90322 6.69357 8.75 7C8.59678 7.30643 8.62985 7.67313 8.83541 7.94721L11.0755 10.934C11.3299 11.2732 11.3427 11.7359 11.1075 12.0887L8.80033 15.5495C8.61461 15.8281 8.5924 16.1848 8.74213 16.4843C8.90017 16.8003 9.22322 17 9.57661 17H14.382C14.7607 17 15.107 16.786 15.2764 16.4472L15.3944 16.2111C15.4639 16.0723 15.5 15.9192 15.5 15.7639V14.5" stroke="#D5000A" strokeWidth={1.2} strokeLinejoin="round" fill="none" />
  </g>;
};

const initRequirements = [
  { id: "REQ-62", label: "First stage thermal" },
  { id: "REQ-67", label: "Baseline structural" },
  { id: "REQ-78", label: "Avionics comms" },
  { id: "REQ-101", label: "Navigation accuracy" },
  { id: "REQ-110", label: "Propulsion safety" },
];

const initIfaces = [
  { id: "INT-1", source: "stage-1", target: "ground-station", name: "Stage 1 → Ground Stn", desc: "Telemetry downlink from Stage 1 to Ground Station", interfaceType: "Signal", requirements: [
    { id: "REQ-78", tests: [{ name: "Telemetry link budget test", status: "pass" }, { name: "End-to-end signal path verification", status: "pass" }] },
  ], dateCreated: "2024-12-08", dateLastUpdated: "2025-08-10", verificationStatus: "success", maturityLevel: "verified", owner: "Yoon Bae", team: "Yoon flow test", progress: 85 },
  { id: "INT-2", source: "ground-station", target: "stage-2", name: "Ground Stn → Stage 2", desc: "Command uplink to Stage 2", interfaceType: "Signal", requirements: [], dateCreated: "2025-03-26", dateLastUpdated: "2025-10-14", verificationStatus: "unknown", maturityLevel: "defined", owner: "", team: "Yoon flow test", progress: 40 },
  { id: "INT-3", source: "s1-avionics", target: "s1-propulsion", name: "Avionics → Propulsion", desc: "Engine control commands and thrust vector data", interfaceType: "Mechanical", requirements: [
    { id: "REQ-110", tests: [{ name: "Thrust vector control loop test", status: "pass" }, { name: "Engine start sequence validation", status: "pass" }] },
  ], dateCreated: "2025-05-12", dateLastUpdated: "2025-08-10", verificationStatus: "success", maturityLevel: "verified", owner: "Yoon Bae", team: "Propulsion team", progress: 100 },
  { id: "INT-5", source: "example", target: "stage-2", name: "Example → Stage 2", desc: "", interfaceType: "", requirements: [], dateCreated: "2024-12-02", dateLastUpdated: "2025-08-10", verificationStatus: "unknown", maturityLevel: "concept", owner: "", team: "", progress: 0 },
  { id: "INT-6", source: "s1-propulsion", target: "s1-structures", name: "Propulsion → Structures", desc: "Thrust load transfer interface", interfaceType: "Mechanical", requirements: [
    { id: "REQ-62", tests: [{ name: "Static fire load measurement", status: "fail" }] },
    { id: "REQ-67", tests: [{ name: "Structural margin analysis", status: "pending" }] },
  ], dateCreated: "2024-11-15", dateLastUpdated: "2025-07-22", verificationStatus: "fail", maturityLevel: "defined", owner: "Yoon Bae", team: "Structures team", progress: 55 },
  { id: "INT-7", source: "s2-avionics", target: "s2-propulsion", name: "S2 Avio → S2 Propulsion", desc: "Flight computer to engine controller", interfaceType: "Electrical", requirements: [
    { id: "REQ-78", tests: [{ name: "Electrical continuity test", status: "pass" }, { name: "Command latency benchmark", status: "pass" }] },
  ], dateCreated: "2025-01-10", dateLastUpdated: "2025-06-18", verificationStatus: "success", maturityLevel: "verified", owner: "Yoon Bae", team: "Avionics team", progress: 90 },
  { id: "INT-8", source: "s2-propulsion", target: "s2-structures", name: "S2 Propulsion → Structures", desc: "Upper stage thrust loads", interfaceType: "Mechanical", requirements: [
    { id: "REQ-67", tests: [] },
  ], dateCreated: "2025-02-05", dateLastUpdated: "2025-09-03", verificationStatus: "unknown", maturityLevel: "defined", owner: "", team: "Structures team", progress: 30 },
  { id: "INT-9", source: "s1-avionics", target: "s1-payload", name: "Avionics → Payload", desc: "Payload telemetry relay", interfaceType: "Signal", requirements: [], dateCreated: "2025-04-20", dateLastUpdated: "2025-04-20", verificationStatus: "unknown", maturityLevel: "concept", owner: "", team: "", progress: 10 },
  { id: "INT-10", source: "s2-avionics", target: "s2-navigation", name: "S2 Avio → Navigation", desc: "Inertial navigation data feed", interfaceType: "Signal", requirements: [
    { id: "REQ-101", tests: [{ name: "INS drift rate validation", status: "pass" }] },
  ], dateCreated: "2025-03-14", dateLastUpdated: "2025-08-29", verificationStatus: "success", maturityLevel: "verified", owner: "Yoon Bae", team: "Navigation team", progress: 75 },
  { id: "INT-11", source: "s2-navigation", target: "s2-attitude", name: "Navigation → Attitude Ctrl", desc: "Attitude correction commands from nav system", interfaceType: "Signal", requirements: [
    { id: "REQ-101", tests: [{ name: "Attitude loop response test", status: "fail" }] },
  ], dateCreated: "2025-05-01", dateLastUpdated: "2025-10-07", verificationStatus: "fail", maturityLevel: "concept", owner: "", team: "GNC team", progress: 20 },
  { id: "INT-12", source: "s2-avionics", target: "s2-data-handling", name: "S2 Avio → Data Handling", desc: "Onboard data bus interface", interfaceType: "Electrical", requirements: [
    { id: "REQ-78", tests: [{ name: "Bus throughput stress test", status: "pending" }] },
  ], dateCreated: "2025-06-12", dateLastUpdated: "2025-06-12", verificationStatus: "unknown", maturityLevel: "defined", owner: "Yoon Bae", team: "Avionics team", progress: 50 },
  { id: "INT-13", source: "s2-separation", target: "s2-structures", name: "Separation → Structures", desc: "Stage separation mechanism mounting", interfaceType: "Mechanical", requirements: [
    { id: "REQ-67", tests: [{ name: "Separation shock test", status: "pass" }] },
    { id: "REQ-110", tests: [{ name: "Bolt cutter pyro validation", status: "pass" }] },
  ], dateCreated: "2025-01-28", dateLastUpdated: "2025-07-15", verificationStatus: "success", maturityLevel: "defined", owner: "Yoon Bae", team: "Structures team", progress: 65 },
  { id: "INT-14", source: "s2-payload-fairing", target: "s2-structures", name: "Fairing → Structures", desc: "Fairing attachment points", interfaceType: "Mechanical", requirements: [
    { id: "REQ-62", tests: [] },
  ], dateCreated: "2025-03-05", dateLastUpdated: "2025-09-20", verificationStatus: "unknown", maturityLevel: "concept", owner: "", team: "Structures team", progress: 15 },
  { id: "INT-24", source: "stage-1", target: "stage-2", name: "Stage 1 → Stage 2", desc: "Inter-stage structural and electrical interface", interfaceType: "Mechanical", requirements: [
    { id: "REQ-78", tests: [{ name: "Inter-stage separation test", status: "pass" }] },
    { id: "REQ-67", tests: [{ name: "Structural load path analysis", status: "pass" }] },
  ], dateCreated: "2024-12-08", dateLastUpdated: "2025-08-10", verificationStatus: "success", maturityLevel: "verified", owner: "Yoon Bae", team: "Integration team", progress: 95 },
  { id: "INT-25", source: "stage-2", target: "stage-1", name: "Stage 2 → Stage 1", desc: "Staging separation signal", interfaceType: "Signal", requirements: [
    { id: "REQ-110", tests: [{ name: "Staging signal timing test", status: "fail" }] },
  ], dateCreated: "2025-03-26", dateLastUpdated: "2025-10-14", verificationStatus: "fail", maturityLevel: "defined", owner: "", team: "Integration team", progress: 35 },
  { id: "INT-30", source: "s1-avionics", target: "s2-avionics", name: "S1 Avio → S2 Avio", desc: "Cross-stage avionics data link", interfaceType: "Signal", requirements: [
    { id: "REQ-78", tests: [] },
  ], dateCreated: "2025-05-28", dateLastUpdated: "2025-05-28", verificationStatus: "unknown", maturityLevel: "concept", owner: "", team: "Avionics team", progress: 5 },
  { id: "INT-31", source: "du42", target: "ground-station", name: "du42 → Ground Stn", desc: "External data uplink", interfaceType: "Electrical", requirements: [
    { id: "REQ-67", tests: [{ name: "Uplink bandwidth test", status: "pass" }, { name: "Protocol compliance check", status: "pass" }] },
  ], dateCreated: "2025-02-19", dateLastUpdated: "2025-05-18", verificationStatus: "success", maturityLevel: "verified", owner: "Yoon Bae", team: "Ground ops", progress: 80 },
];

function MiniMap({ blocks, pan, zoom, vw, vh }) {
  const arr = Object.values(blocks); if (!arr.length) return null;
  let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
  for (const b of arr) { mnX = Math.min(mnX, b.x); mnY = Math.min(mnY, b.y); mxX = Math.max(mxX, b.x + b.w); mxY = Math.max(mxY, b.y + b.h); }
  mnX -= 60; mnY -= 60; mxX += 60; mxY += 60;
  const ww = mxX - mnX, hh = mxY - mnY, mw = 150, mh = Math.min(mw * hh / ww, 100), sc = mw / ww;
  return <div style={{ position: "absolute", bottom: 56, right: 16, zIndex: 10, background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: 3 }}>
    <svg width={mw} height={mh}>
      {arr.map(b => <rect key={b.id} x={(b.x - mnX) * sc} y={(b.y - mnY) * sc} width={Math.max(b.w * sc, 2)} height={Math.max(b.h * sc, 2)} rx={1} fill={b.expanded && b.hasChildren ? "none" : (b.color || "#94a3b8") + "40"} stroke={b.color || "#94a3b8"} strokeWidth={0.5} />)}
      <rect x={(-pan.x / zoom - mnX) * sc} y={(-pan.y / zoom - mnY) * sc} width={(vw / zoom) * sc} height={(vh / zoom) * sc} rx={1} fill="rgba(37,99,235,0.08)" stroke="#2563eb" strokeWidth={1} />
    </svg>
  </div>;
}

function ReqIcon({ size = 12 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" style={{ flexShrink: 0 }}><rect x="2" y="1" width="12" height="14" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.2"/><line x1="5" y1="5" x2="11" y2="5" stroke="#3b82f6" strokeWidth="1.2"/><line x1="5" y1="8" x2="11" y2="8" stroke="#3b82f6" strokeWidth="1.2"/><line x1="5" y1="11" x2="9" y2="11" stroke="#3b82f6" strokeWidth="1.2"/></svg>;
}
function TestIcon({ status, size = 11 }) {
  const c = status === "pass" ? { fill: "#dcfce7", stroke: "#16a34a" } : status === "fail" ? { fill: "#fee2e2", stroke: "#dc2626" } : { fill: "#fef9c3", stroke: "#ca8a04" };
  return <svg width={size} height={size} viewBox="0 0 16 16" style={{ flexShrink: 0 }}><path d="M6.5 2h3v4l2.5 5.5a1 1 0 01-.9 1.5H4.9a1 1 0 01-.9-1.5L6.5 6V2z" fill={c.fill} stroke={c.stroke} strokeWidth="1" strokeLinejoin="round"/><line x1="5.5" y1="1.5" x2="10.5" y2="1.5" stroke={c.stroke} strokeWidth="1.2" strokeLinecap="round"/></svg>;
}

function SidebarTree({ nodes, ifaces, selId, hovId, onSel, onHov, sbExp, togSb, focusSys, hovSys, setHovSys, onQuickAdd, allRequirements, sbIfaceExp, togSbIface, d = 0 }) {
  return nodes.map(node => {
    const ni = ifaces.filter(i => i.source === node.id || i.target === node.id);
    const hk = !!(node.children?.length); const isO = sbExp.has(node.id); const hc = ni.length > 0 || hk;
    const isHov = hovSys === node.id;
    return <div key={node.id}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: `5px 8px 5px ${8 + d * 14}px`, borderRadius: 5, fontSize: 11.5, color: "#334155", fontWeight: 600, userSelect: "none", background: isHov ? "#f8fafc" : "transparent", cursor: hc ? "pointer" : "default" }}
        onClick={() => { if (hc) togSb(node.id); }} onMouseEnter={() => setHovSys(node.id)} onMouseLeave={() => setHovSys(null)}>
        {hc ? <span style={{ fontSize: 8, color: "#94a3b8", width: 10, textAlign: "center", display: "inline-block", transition: "transform 0.15s", transform: isO ? "rotate(90deg)" : "none" }}>▶</span> : <span style={{ width: 10 }} />}
        <svg width="13" height="13" viewBox="0 0 16 16"><polygon points="8,2 13,5.5 8,8 3,5.5" fill={COLORS.orange + "40"} stroke={COLORS.orange} strokeWidth="1" /><polygon points="8,8 13,5.5 13,10.5 8,14" fill={COLORS.orange + "25"} stroke={COLORS.orange} strokeWidth="1" /><polygon points="8,8 3,5.5 3,10.5 8,14" fill={COLORS.orange + "30"} stroke={COLORS.orange} strokeWidth="1" /></svg>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
        {isHov && <>
          <span onClick={e => { e.stopPropagation(); onQuickAdd(node.id); }} title="Add interface from this system" style={{ fontSize: 16, color: "#2563eb", cursor: "pointer", lineHeight: 1, fontWeight: 700, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, background: "#eff6ff" }}>+</span>
          <span onClick={e => { e.stopPropagation(); focusSys(node.id); }} title="Focus" style={{ fontSize: 15, color: "#94a3b8", cursor: "pointer", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, background: "#f1f5f9" }}>⊚</span>
        </>}
      </div>
      {isO && <div>
        {ni.map(iface => {
          const reqs = iface.requirements || [];
          const hasReqs = reqs.length > 0;
          const ifaceKey = iface.id + "_" + node.id;
          const isIfaceOpen = sbIfaceExp.has(ifaceKey);
          return <div key={iface.id + node.id}>
            <div draggable onDragStart={e => { e.dataTransfer.setData("application/json", JSON.stringify({ type: "interface", id: iface.id })); e.dataTransfer.effectAllowed = "copy"; }}
              onClick={e => { e.stopPropagation(); onSel(iface.id); if (hasReqs) togSbIface(ifaceKey); }} onMouseEnter={() => onHov(iface.id)} onMouseLeave={() => onHov(null)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: `4px 8px 4px ${20 + d * 14}px`, cursor: "pointer", borderRadius: 5, fontSize: 11.5, marginBottom: 1, background: selId === iface.id ? "#eff6ff" : hovId === iface.id ? "#f8fafc" : "transparent", border: selId === iface.id ? "1px solid #bfdbfe" : "1px solid transparent" }}>
              {hasReqs ? <span style={{ fontSize: 7, color: "#94a3b8", width: 8, textAlign: "center", display: "inline-block", transition: "transform 0.15s", transform: isIfaceOpen ? "rotate(90deg)" : "none" }}>▶</span> : <span style={{ width: 8 }} />}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><line x1="9" y1="12" x2="15" y2="12"/></svg>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: selId === iface.id ? 600 : 400, color: selId === iface.id ? "#2563eb" : "#1e293b" }}>{iface.name}</span>
            </div>
            {isIfaceOpen && hasReqs && <div>
              {reqs.map(rq => {
                const ref = allRequirements.find(r => r.id === rq.id);
                const tests = rq.tests || [];
                const reqStatus = getReqStatus(tests);
                return <div key={rq.id}>
                  <div draggable onDragStart={e => { e.dataTransfer.setData("application/json", JSON.stringify({ type: "requirement", id: rq.id, parentIfaceId: iface.id })); e.dataTransfer.effectAllowed = "copy"; }}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: `3px 8px 3px ${34 + d * 14}px`, borderRadius: 4, fontSize: 11.5, marginBottom: 1, cursor: "grab" }}>
                    <ReqIcon size={12} />
                    <span style={{ fontWeight: 600, color: "#2563eb", fontSize: 11.5, flexShrink: 0 }}>{rq.id}</span>
                    <span style={{ color: "#64748b", fontSize: 11.5, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ref?.label || ""}</span>
                    <VerifyIcon status={reqStatus} size={13} />
                  </div>
                  {tests.map((t, ti) => (
                    <div key={ti} style={{ display: "flex", alignItems: "center", gap: 5, padding: `2px 8px 2px ${46 + d * 14}px`, fontSize: 11.5, marginBottom: 1 }}>
                      <TestIcon status={t.status} size={11} />
                      <span style={{ color: t.status === "pass" ? "#166534" : t.status === "fail" ? "#991b1b" : "#92400e", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                      <VerifyIcon status={t.status} size={12} />
                    </div>
                  ))}
                </div>;
              })}
            </div>}
          </div>;
        })}
        {hk && node.children && <SidebarTree nodes={node.children} ifaces={ifaces} selId={selId} hovId={hovId} onSel={onSel} onHov={onHov} sbExp={sbExp} togSb={togSb} focusSys={focusSys} hovSys={hovSys} setHovSys={setHovSys} onQuickAdd={onQuickAdd} allRequirements={allRequirements} sbIfaceExp={sbIfaceExp} togSbIface={togSbIface} d={d + 1} />}
      </div>}
    </div>;
  });
}

function InterfaceModal({ mode, sourceId, targetId, allSystems, allRequirements, onClose, onCreate, onAddReq }) {
  const [src, setSrc] = useState(sourceId || "");
  const [tgt, setTgt] = useState(targetId || "");
  const [nm, setNm] = useState("");
  const [desc, setDesc] = useState("");
  const [selReqs, setSelReqs] = useState([]);
  const [reqDropOpen, setReqDropOpen] = useState(false);
  const [newReqText, setNewReqText] = useState("");
  const reqDropRef = useRef(null);
  const opts = Object.values(allSystems).filter(s => !s.expanded || !s.hasChildren);
  useEffect(() => { if (src && tgt) setNm(`${allSystems[src]?.name || src} → ${allSystems[tgt]?.name || tgt}`); }, [src, tgt, allSystems]);
  useEffect(() => {
    if (!reqDropOpen) return;
    const handler = (e) => { if (reqDropRef.current && !reqDropRef.current.contains(e.target)) setReqDropOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [reqDropOpen]);
  const is = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12.5, background: "#f8fafc", outline: "none", boxSizing: "border-box" };
  const canCreate = src && tgt && nm.trim();
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
    <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 440, boxShadow: "0 20px 40px rgba(0,0,0,0.15)", fontFamily: "'AktivGrotesk','DM Sans',sans-serif", maxHeight: "85vh", overflowY: "auto" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>New Interface</h3>
      {mode === "quick" && <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>From: <strong>{allSystems[src]?.name || src}</strong></p>}
      {mode === "drag" && <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}><strong>{allSystems[src]?.name}</strong> → <strong>{allSystems[tgt]?.name}</strong></p>}
      {mode === "full" && <>
        <label style={{ display: "block", marginBottom: 5, marginTop: 12, fontSize: 11.5, fontWeight: 600, color: "#475569" }}>Source</label>
        <select value={src} onChange={e => setSrc(e.target.value)} style={{ ...is, marginBottom: 14 }}><option value="">Select source...</option>{opts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </>}
      {(mode === "full" || mode === "quick") && <>
        <label style={{ display: "block", marginBottom: 5, fontSize: 11.5, fontWeight: 600, color: "#475569" }}>Target</label>
        <select value={tgt} onChange={e => setTgt(e.target.value)} style={{ ...is, marginBottom: 14 }}><option value="">Select target...</option>{opts.filter(s => s.id !== src).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </>}
      {(canCreate || mode === "drag") && <>
        <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0 14px" }} />
        <label style={{ display: "block", marginBottom: 5, fontSize: 11.5, fontWeight: 600, color: "#475569" }}>Interface Name</label>
        <input value={nm} onChange={e => setNm(e.target.value)} style={{ ...is, marginBottom: 14 }} />
        <label style={{ display: "block", marginBottom: 5, fontSize: 11.5, fontWeight: 600, color: "#475569" }}>Description</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ ...is, marginBottom: 14, resize: "vertical", fontFamily: "inherit" }} placeholder="Describe the interface purpose, data flows, constraints..." />
        <label style={{ display: "block", marginBottom: 5, fontSize: 11.5, fontWeight: 600, color: "#475569" }}>Requirements</label>
        <div ref={reqDropRef} style={{ position: "relative", marginBottom: 14 }}>
          <div onClick={() => setReqDropOpen(!reqDropOpen)} style={{ ...is, minHeight: 38, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", cursor: "pointer", padding: "6px 11px" }}>
            {selReqs.length === 0 && <span style={{ color: "#94a3b8", fontSize: 12 }}>Select requirements...</span>}
            {selReqs.map(rId => {
              const r = allRequirements.find(x => x.id === rId);
              return <span key={rId} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#eff6ff", color: "#2563eb", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, border: "1px solid #bfdbfe" }}>
                {r ? `${r.id} ${r.label}` : rId}
                <span onClick={e => { e.stopPropagation(); setSelReqs(p => p.filter(x => x !== rId)); }} style={{ cursor: "pointer", fontSize: 13, lineHeight: 1, color: "#6b9cf7" }}>×</span>
              </span>;
            })}
          </div>
          {reqDropOpen && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 10, maxHeight: 180, overflowY: "auto", marginTop: 4 }}>
            {allRequirements.filter(r => !selReqs.includes(r.id)).map(r =>
              <div key={r.id} onClick={() => { setSelReqs(p => [...p, r.id]); }} style={{ padding: "8px 12px", fontSize: 12, cursor: "pointer", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 6, alignItems: "center" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <span style={{ fontWeight: 600, color: "#334155" }}>{r.id}</span>
                <span style={{ color: "#64748b" }}>{r.label}</span>
              </div>
            )}
            <div style={{ padding: "8px 12px", borderTop: allRequirements.length > 0 ? "1px solid #e2e8f0" : "none", display: "flex", gap: 6, alignItems: "center" }}>
              <input value={newReqText} onChange={e => setNewReqText(e.target.value)} placeholder="New requirement..." onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Enter" && newReqText.trim()) { const nextNum = Math.max(0, ...allRequirements.map(r => parseInt(r.id.split("-")[1]) || 0)) + 1; const newId = `REQ-${nextNum}`; onAddReq({ id: newId, label: newReqText.trim() }); setSelReqs(p => [...p, newId]); setNewReqText(""); } }} style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 11.5, outline: "none" }} />
              <button onClick={e => { e.stopPropagation(); if (!newReqText.trim()) return; const nextNum = Math.max(0, ...allRequirements.map(r => parseInt(r.id.split("-")[1]) || 0)) + 1; const newId = `REQ-${nextNum}`; onAddReq({ id: newId, label: newReqText.trim() }); setSelReqs(p => [...p, newId]); setNewReqText(""); }} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add</button>
            </div>
          </div>}
        </div>
      </>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: "#475569" }}>Cancel</button>
        {(canCreate || (mode === "drag" && nm.trim())) && <button onClick={() => onCreate(src, tgt, nm.trim(), desc, selReqs)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Create Interface</button>}
      </div>
    </div>
  </div>;
}

function VerifyIcon({ status, size = 16 }) {
  const cfg = { pass: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: "✓" }, fail: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: "✕" }, pending: { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", icon: "○" } };
  const c = cfg[status] || cfg.pending;
  return <span style={{ width: size, height: size, borderRadius: size / 2, background: c.bg, border: `1.5px solid ${c.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.55, fontWeight: 700, color: c.color, flexShrink: 0, lineHeight: 1 }}>{c.icon}</span>;
}

function getReqStatus(tests) {
  if (!tests || tests.length === 0) return "pending";
  if (tests.some(t => t.status === "fail")) return "fail";
  if (tests.every(t => t.status === "pass")) return "pass";
  return "pending";
}

function AgentsPanel({ open, onClose, chats, activeChatId, onSelectChat, onNewChat, onDeleteChat, onArchiveChat }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpenId) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenId(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpenId]);

  return (
    <div style={{
      width: open ? 200 : 0,
      background: "#f7f7f7",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      overflow: "hidden",
      transition: "width 0.3s ease",
      paddingTop: open ? 10 : 0,
      paddingRight: open ? 10 : 0,
      paddingBottom: open ? 20 : 0,
      paddingLeft: 0,
      boxSizing: "border-box",
      fontFamily: "'AktivGrotesk','DM Sans',sans-serif",
    }}>
      {/* Top-right close icon */}
      <div style={{ display: "flex", justifyContent: "flex-end", flexShrink: 0, marginBottom: 10 }}>
        <div onClick={onClose} style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#151414" }} title="Close Agents panel">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5.08789 8.728C5.08789 7.77365 5.86154 7 6.81589 7H17.1839C18.1382 7 18.9119 7.77365 18.9119 8.728V14.776C18.9119 15.7303 18.1382 16.504 17.1839 16.504H6.81589C5.86154 16.504 5.08789 15.7303 5.08789 14.776V8.728Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 8H15C14.4477 8 14 8.44772 14 9V14.5C14 15.0523 14.4477 15.5 15 15.5H17C17.5523 15.5 18 15.0523 18 14.5V9C18 8.44772 17.5523 8 17 8Z" fill="currentColor" fillOpacity="0.7"/></svg>
        </div>
      </div>

      {/* New Agent + Search buttons */}
      <div style={{ flexShrink: 0, marginBottom: 20, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div onClick={onNewChat} style={{
          background: "#fbfbfb",
          border: "1px solid #e4e4e4",
          borderRadius: 6,
          padding: "8px 14px",
          fontSize: 12,
          fontWeight: 500,
          color: "#151414",
          cursor: "pointer",
          fontFamily: "'AktivGrotesk','DM Sans',sans-serif",
          whiteSpace: "nowrap",
          textAlign: "center",
        }}>
          New Agent
        </div>
        <div style={{
          border: "1px solid #e4e4e4",
          borderRadius: 6,
          padding: "8px 14px",
          fontSize: 12,
          fontWeight: 500,
          color: "#c1c1c1",
          cursor: "pointer",
          fontFamily: "'AktivGrotesk','DM Sans',sans-serif",
          whiteSpace: "nowrap",
        }}>
          Search Agents...
        </div>
      </div>

      {/* Agents header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8, flexShrink: 0, minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#b4b3b3", whiteSpace: "nowrap" }}>Agents</span>
      </div>

      {/* Chat items list */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        {chats.map(chat => {
          const isHovered = hoveredId === chat.id || menuOpenId === chat.id;
          const isActive = chat.id === activeChatId;
          return (
          <div key={chat.id} onClick={() => onSelectChat(chat.id)} style={{
            background: isActive ? "#e4e4e4" : isHovered ? "#eaeaea" : "transparent",
            borderRadius: 6,
            padding: "0 6px",
            cursor: "pointer",
            minWidth: 0,
            position: "relative",
          }}
          onMouseEnter={() => setHoveredId(chat.id)}
          onMouseLeave={() => { if (menuOpenId !== chat.id) setHoveredId(null); }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: "8px 3px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 15 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chat.name}</span>
                {isHovered ? (
                  <div onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === chat.id ? null : chat.id); }} style={{ width: 16, height: 15, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginLeft: 4 }} title="More options">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M7.59971 10.0008C7.59971 10.6635 7.06245 11.2008 6.39971 11.2008C5.73697 11.2008 5.19971 10.6635 5.19971 10.0008C5.19971 9.33804 5.73697 8.80078 6.39971 8.80078C7.06245 8.80078 7.59971 9.33804 7.59971 10.0008Z" fill="black"/>
                      <path d="M11.1997 10.0008C11.1997 10.6635 10.6624 11.2008 9.99971 11.2008C9.33697 11.2008 8.79971 10.6635 8.79971 10.0008C8.79971 9.33804 9.33697 8.80078 9.99971 8.80078C10.6624 8.80078 11.1997 9.33804 11.1997 10.0008Z" fill="black"/>
                      <path d="M14.7997 10.0008C14.7997 10.6635 14.2624 11.2008 13.5997 11.2008C12.937 11.2008 12.3997 10.6635 12.3997 10.0008C12.3997 9.33804 12.937 8.80078 13.5997 8.80078C14.2624 8.80078 14.7997 9.33804 14.7997 10.0008Z" fill="black"/>
                    </svg>
                  </div>
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 400, color: "#aba8a8", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 8, lineHeight: "15px" }}>{chat.timeAgo}</span>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: 400, color: "#aba8a8", whiteSpace: "nowrap" }}>{chat.date}</span>
            </div>
            {/* Context menu */}
            {menuOpenId === chat.id && (
              <div ref={menuRef} onClick={e => e.stopPropagation()} style={{
                position: "absolute",
                top: "100%",
                right: 0,
                zIndex: 100,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                padding: 2,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                fontFamily: "'AktivGrotesk','DM Sans',sans-serif",
              }}>
                <div onClick={() => { onDeleteChat(chat.id); setMenuOpenId(null); }} style={{ display: "flex", alignItems: "center", padding: "2px 6px 2px 2px", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#151414", borderRadius: 6, whiteSpace: "nowrap" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#eaeaea"; e.currentTarget.style.color = "#dc0916"; e.currentTarget.querySelector("svg path").setAttribute("stroke", "#dc0916"); }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#151414"; e.currentTarget.querySelector("svg path").setAttribute("stroke", "black"); }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M7.19995 8.50586H16.8M10.8 14.8588V11.047M13.2 14.8588V11.047M14.4 17.4H9.59995C8.93721 17.4 8.39995 16.8311 8.39995 16.1294V9.14115C8.39995 8.79029 8.66858 8.50586 8.99995 8.50586H15C15.3313 8.50586 15.6 8.79029 15.6 9.14115V16.1294C15.6 16.8311 15.0627 17.4 14.4 17.4ZM10.8 8.50586H13.2C13.5313 8.50586 13.8 8.22143 13.8 7.87056V7.23527C13.8 6.88441 13.5313 6.59998 13.2 6.59998H10.8C10.4686 6.59998 10.2 6.88441 10.2 7.23527V7.87056C10.2 8.22143 10.4686 8.50586 10.8 8.50586Z" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Delete
                </div>
                <div onClick={() => { if (onArchiveChat) onArchiveChat(chat.id); setMenuOpenId(null); }} style={{ display: "flex", alignItems: "center", padding: "2px 6px 2px 2px", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#151414", borderRadius: 6, whiteSpace: "nowrap" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#eaeaea"; e.currentTarget.style.color = "#1dc6dd"; e.currentTarget.querySelector("svg path").setAttribute("stroke", "#1dc6dd"); }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#151414"; e.currentTarget.querySelector("svg path").setAttribute("stroke", "black"); }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M6.6001 12.6849V15.4278C6.6001 16.1852 7.20451 16.7992 7.9501 16.7992H16.0501C16.7957 16.7992 17.4001 16.1852 17.4001 15.4278V12.6849M6.6001 12.6849L8.2966 8.08911C8.4942 7.55383 8.99791 7.19922 9.56065 7.19922H14.4395C15.0023 7.19922 15.506 7.55383 15.7036 8.08911L17.4001 12.6849M6.6001 12.6849H9.3001L10.2001 13.6449H13.8001L14.7001 12.6849H17.4001" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Archive
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

function AIChatPanel({ onCollapse, onToggleAgents, width, collapsed, messages, onSendMessage, chatName, agentsPanelOpen, onNewChat, chatList, activeChatId, onSelectChat, onRenameChat }) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingChatName, setEditingChatName] = useState("");
  const editInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);
  useEffect(() => { if (!collapsed) inputRef.current?.focus(); }, [collapsed]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSendMessage({ role: "user", content: text, time: new Date() });
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      onSendMessage({ role: "ai", content: "I'm Flow AI — this is a prototype response. I can help you analyze interfaces, requirements, and system architecture. Ask me anything about your project data.", time: new Date() });
    }, 1200);
  };

  return (
    <div style={{ width: collapsed ? 0 : (width || 284), background: "#f7f7f7", display: "flex", flexDirection: "column", flexShrink: 0, fontFamily: "'AktivGrotesk','DM Sans',sans-serif", overflow: "hidden", transition: "width 0.3s ease", padding: collapsed ? 0 : 10, boxSizing: "border-box" }}>
      <div style={{ background: "#fff", borderRadius: 12, flex: 1, display: "flex", flexDirection: "column", gap: 24, padding: 10, minHeight: 0, minWidth: 0, overflow: "hidden", border: "1px solid #e4e4e4" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Flow AI Logo Mark */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M1.69327 0.0195446C0.836829 0.133976 0.266695 0.997389 0.0526239 2.50435C-0.0258018 3.05639-0.0145023 4.732 0.0727462 5.49769C0.281709 7.33066 0.687356 9.28568 1.22323 11.0424C1.53688 12.0704 1.52218 12.0021 1.46702 12.1747C0.757062 14.3951 0.297188 16.492 0.0719723 18.5357C-0.0145539 19.3211-0.0250794 20.9583 0.0528303 21.5089C0.233003 22.7819 0.648452 23.5671 1.30723 23.8795C1.53368 23.9869 1.6021 24 1.9416 24C2.56292 24 3.11747 23.764 3.90528 23.1642C4.28075 22.8783 5.26865 21.9146 5.79333 21.3224L6.18995 20.8747L6.80079 21.4836C8.14089 22.8196 9.32424 23.5338 10.8178 23.9082C11.0429 23.9646 11.2766 23.9786 12 23.9792C12.8633 23.9799 12.9204 23.975 13.3424 23.8651C14.7414 23.5009 15.9142 22.7742 17.2241 21.4597C17.5518 21.1309 17.8231 20.8674 17.8271 20.874C17.9077 21.0069 18.748 21.9127 19.1989 22.3526C20.4287 23.5529 21.2093 24 22.075 24C22.4225 24 22.4678 23.9901 22.7329 23.8572C23.3723 23.5364 23.7674 22.7726 23.9474 21.5089C24.0169 21.0211 24.0177 19.368 23.9487 18.7165C23.7318 16.6669 23.2893 14.5582 22.6575 12.5634C22.5704 12.2882 22.4991 12.0376 22.4991 12.0066C22.4991 11.9756 22.5704 11.7251 22.6575 11.4498C23.2893 9.455 23.7318 7.34639 23.9487 5.29676C24.0177 4.64524 24.0169 2.99213 23.9474 2.50435C23.7722 1.27426 23.3633 0.469719 22.7577 0.163671C22.501 0.033978 22.3478 0.00257644 21.9918 0.00671503C21.2319 0.015613 20.3328 0.546904 19.2018 1.65548C18.7794 2.06944 17.884 3.03569 17.8275 3.13849C17.8241 3.14469 17.5439 2.87346 17.2048 2.53565C16.3368 1.67089 15.622 1.13044 14.781 0.702928C13.7991 0.203867 13.0118 0.00676676 12 0.00676676C11.3265 0.00676676 10.81 0.089435 10.1828 0.297554C9.00697 0.687719 7.94921 1.38595 6.80079 2.53001L6.18995 3.13859L5.79374 2.6909C5.27696 2.10694 4.28395 1.13893 3.90446 0.849124C3.4401 0.494499 2.98177 0.235682 2.61616 0.121561C2.22986 0.00102447 2.01218-0.0230828 1.69327 0.0195446ZM2.62421 1.00199C2.81088 1.0919 3.15291 1.3083 3.38437 1.4829C3.85544 1.8383 4.73773 2.70311 5.3008 3.36145L5.67301 3.79662L5.57632 3.92394C4.21966 5.70994 2.97099 8.05673 2.00258 10.6405C1.96616 10.7378 1.98303 10.784 1.76457 9.9881C1.39917 8.65667 1.0847 7.06419 0.912571 5.67306C0.857777 5.23059 0.841214 4.8052 0.841627 3.85032C0.842143 2.70492 0.849521 2.57109 0.933416 2.18532C1.03362 1.72474 1.24413 1.22304 1.41274 1.04312C1.6813 0.756471 2.08591 0.742762 2.62421 1.00199ZM12.8164 0.879439C13.7795 1.0484 14.7691 1.52547 15.7355 2.28682C16.0831 2.56069 17.2495 3.71825 17.2495 3.78938C17.2495 3.81675 17.1262 3.99538 16.9755 4.18627C15.9693 5.46096 14.6799 7.27971 12.89 9.94935L12.0065 11.2671L11.7494 10.8936C11.608 10.6881 11.1525 10.0138 10.7373 9.39499C9.35478 7.33475 8.16225 5.65304 7.22522 4.44219C6.96409 4.10474 6.75048 3.80909 6.75048 3.78514C6.75048 3.70961 7.99735 2.49116 8.35336 2.21874C9.29772 1.49619 10.236 1.04979 11.1703 0.878456C11.5764 0.804013 12.389 0.804479 12.8164 0.879439ZM22.3501 0.872145C22.7387 1.03893 23.0167 1.67477 23.1399 2.6789C23.1955 3.13176 23.1955 4.47659 23.14 5.09904C23.0723 5.858 22.9462 6.76254 22.7958 7.56687C22.6616 8.28481 22.2558 9.99146 22.1046 10.4738L22.0309 10.7089L21.7796 10.0731C20.8259 7.6603 19.6527 5.52128 18.3632 3.84354C18.3151 3.78105 18.9032 3.09627 19.634 2.36374C20.4147 1.58103 21.0895 1.08435 21.6571 0.874524C21.8451 0.804996 22.1908 0.803858 22.3501 0.872145ZM7.02497 5.53012C8.14558 7.03119 9.34534 8.75956 11.2279 11.5848L11.5091 12.0066L10.494 13.5219C9.33146 15.2573 8.6117 16.3023 7.82956 17.3906C7.12827 18.3662 6.26074 19.5097 6.20924 19.5263C6.13799 19.5493 5.39367 18.4548 4.83881 17.5111C3.98598 16.0606 2.98554 13.8478 2.46777 12.2666L2.38187 12.0043L2.51854 11.6036C3.31905 9.25749 4.57335 6.73222 5.80097 4.99542C6.09568 4.57845 6.19082 4.4692 6.23525 4.49672C6.25398 4.50836 6.60937 4.97338 7.02497 5.53012ZM18.1359 4.90545C19.408 6.7032 20.595 9.06814 21.4574 11.523L21.6263 12.0036L21.5359 12.2663C20.8059 14.3896 19.7008 16.7257 18.6747 18.3147C18.3601 18.8019 17.8367 19.5392 17.805 19.5397C17.7698 19.5403 17.0106 18.5493 16.3587 17.6517C15.6356 16.6562 14.7226 15.3337 13.5015 13.5133L12.4909 12.0066L12.772 11.5848C13.5036 10.4871 15.0335 8.23443 15.5008 7.56687C16.4482 6.21345 17.745 4.47251 17.805 4.47354C17.8191 4.4738 17.968 4.66816 18.1359 4.90545ZM14.3965 16.2857C15.3856 17.7147 16.3265 19.007 16.975 19.827C17.126 20.0179 17.2495 20.1949 17.2495 20.2203C17.2495 20.3002 16.2057 21.3432 15.7869 21.6816C13.2427 23.738 10.6263 23.7097 8.11292 21.5987C7.71641 21.2657 6.75048 20.2891 6.75048 20.2213C6.75048 20.1999 6.93716 19.9429 7.16526 19.6503C8.04765 18.5186 9.29106 16.7708 10.6164 14.799C11.01 14.2134 11.4838 13.5119 11.6693 13.2401L12.0065 12.746L12.9304 14.1241C13.4385 14.882 14.0982 15.8547 14.3965 16.2857ZM2.23678 13.9782C3.15694 16.2774 4.21269 18.2396 5.38644 19.832L5.67564 20.2243L5.27133 20.6831C4.06064 22.0571 3.13119 22.8497 2.43233 23.104C2.14262 23.2095 1.79207 23.2251 1.62919 23.1397C1.33844 22.9874 1.07948 22.4992 0.933416 21.828C0.849521 21.4422 0.842143 21.3083 0.841627 20.1629C0.841214 19.208 0.857777 18.7826 0.912571 18.3402C1.01979 17.4738 1.20228 16.4048 1.38225 15.5886C1.54147 14.8667 1.94681 13.3041 1.9691 13.3264C1.97545 13.3328 2.09592 13.6261 2.23678 13.9782ZM22.4176 14.7388C22.9378 16.835 23.1823 18.575 23.1831 20.1861C23.1838 21.6462 22.9969 22.5125 22.5826 22.969C22.4299 23.1372 22.2889 23.1964 22.0411 23.1964C21.6291 23.1964 21.0888 22.9248 20.4153 22.3791C19.7558 21.8447 18.2893 20.2658 18.3632 20.1697C19.653 18.4916 20.8087 16.3854 21.7797 13.9432L22.0321 13.3083L22.1052 13.5414C22.1454 13.6696 22.286 14.2084 22.4176 14.7388Z" fill="black"/>
            </svg>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#151414", whiteSpace: "nowrap" }}>Flow AI Agent</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* AI star icon — fold/unfold chat */}
            <div onClick={onCollapse} style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Collapse AI chat">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M11.3348 6.70351C11.5634 6.08581 12.4371 6.08581 12.6656 6.70351L13.8033 9.77799C13.8752 9.97219 14.0283 10.1253 14.2225 10.1972L17.297 11.3348C17.9147 11.5634 17.9147 12.4371 17.297 12.6656L14.2225 13.8033C14.0283 13.8752 13.8752 14.0283 13.8033 14.2225L12.6656 17.297C12.4371 17.9147 11.5634 17.9147 11.3348 17.297L10.1972 14.2225C10.1253 14.0283 9.97219 13.8752 9.77799 13.8033L6.70351 12.6656C6.08581 12.4371 6.08581 11.5634 6.70351 11.3348L9.77799 10.1972C9.97219 10.1253 10.1253 9.97219 10.1972 9.77799L11.3348 6.70351Z" stroke="#151414" strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
            </div>
            {/* Desktop expand icon — toggles Agents panel (hidden when agents panel is open) */}
            {!agentsPanelOpen && <div onClick={onToggleAgents} style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#151414" }} title="Toggle Agents panel">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5.08789 8.728C5.08789 7.77365 5.86154 7 6.81589 7H17.1839C18.1382 7 18.9119 7.77365 18.9119 8.728V14.776C18.9119 15.7303 18.1382 16.504 17.1839 16.504H6.81589C5.86154 16.504 5.08789 15.7303 5.08789 14.776V8.728Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 8H15C14.4477 8 14 8.44772 14 9V14.5C14 15.0523 14.4477 15.5 15 15.5H17C17.5523 15.5 18 15.0523 18 14.5V9C18 8.44772 17.5523 8 17 8Z" fill="currentColor" fillOpacity="0.7"/></svg>
            </div>}
          </div>
        </div>

        {/* Content area — changes layout based on whether messages exist */}
        {messages.length === 0 ? (
          /* NEW CHAT: input on top, empty space below */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minHeight: 0, minWidth: 0 }}>
            {/* Chat tabs + plus icon */}
            <div style={{ display: "flex", alignItems: "center", flexShrink: 0, width: "100%" }}>
              <div className="chat-tabs-scroll" style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, minWidth: 0, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none" }}>
                {chatList && chatList.map(chat => (
                  editingChatId === chat.id ? (
                    <input key={chat.id} ref={editInputRef} value={editingChatName} onChange={e => setEditingChatName(e.target.value)}
                      onBlur={() => { const name = editingChatName.trim() || chat.name; if (onRenameChat) onRenameChat(chat.id, name); setEditingChatId(null); }}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); const name = editingChatName.trim() || chat.name; if (onRenameChat) onRenameChat(chat.id, name); setEditingChatId(null); } if (e.key === "Escape") setEditingChatId(null); }}
                      onClick={e => e.stopPropagation()}
                      style={{ background: "#eaeaea", borderRadius: 6, padding: "3px 7px", fontSize: 12, fontWeight: 500, color: "#151414", fontFamily: "'AktivGrotesk','DM Sans',sans-serif", whiteSpace: "nowrap", flexShrink: 0, maxWidth: 120, border: "1px solid #2709DC", outline: "none", width: 80 }}
                    />
                  ) : (
                    <div key={chat.id} onClick={() => onSelectChat && onSelectChat(chat.id)} onDoubleClick={(e) => { e.stopPropagation(); setEditingChatId(chat.id); setEditingChatName(chat.name); setTimeout(() => editInputRef.current?.select(), 0); }} style={{ background: chat.id === activeChatId ? "#eaeaea" : "#fff", borderRadius: 6, padding: "4px 8px", fontSize: 12, fontWeight: 500, color: "#151414", fontFamily: "'AktivGrotesk','DM Sans',sans-serif", whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
                      {chat.name}
                    </div>
                  )
                ))}
              </div>
              <div onClick={() => onNewChat && onNewChat()} style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 8.40002V15.6M8.40002 12H15.6" stroke="#151414" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            {/* Input area — 140px */}
            <div style={{ border: "1px solid #e4e4e4", borderRadius: 6, display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, maxHeight: 140, flexShrink: 0, overflow: "hidden" }}>
              <textarea
                className="ai-chat-input"
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Plan, leave comment, or tag @flow"
                rows={2}
                style={{ width: "100%", padding: "7px 8px 4px", border: "none", background: "transparent", fontSize: 12, fontWeight: 400, color: "#151414", resize: "none", outline: "none", fontFamily: "'AktivGrotesk','DM Sans',sans-serif", lineHeight: 1.5, boxSizing: "border-box", flex: 1 }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 8px 7px" }}>
                <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M16.174 11.7034L11.9467 15.9307C10.7962 17.0812 9.07061 17.2171 7.89752 16.044C6.74694 14.8934 6.89648 13.2266 8.06957 12.0535L12.8215 7.30159C13.5487 6.57432 14.7196 6.57431 15.4468 7.30158C16.1741 8.02885 16.1741 9.19969 15.4468 9.92696L10.6115 14.7623C10.249 15.1248 9.66131 15.1248 9.29882 14.7623C8.93633 14.3998 8.93633 13.8121 9.29882 13.4496L13.6095 9.1389" stroke="#C1C1C1" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div onClick={handleSend} style={{ width: 24, height: 24, cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect width="24" height="24" rx="6" fill="#E4E4E4"/>
                    <path d="M7.7998 11.1992L11.9998 7.19922M11.9998 7.19922L16.1998 11.1992M11.9998 7.19922V16.7992" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            {/* Empty space below */}
            <div style={{ flex: 1 }} />
          </div>
        ) : (
          /* HAS MESSAGES: messages on top, input at bottom */
          <>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minHeight: 0, minWidth: 0, overflowY: "auto" }}>
              {/* Chat tabs + plus icon */}
              <div style={{ display: "flex", alignItems: "center", flexShrink: 0, width: "100%" }}>
                <div className="chat-tabs-scroll" style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, minWidth: 0, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none" }}>
                  {chatList && chatList.map(chat => (
                    editingChatId === chat.id ? (
                      <input key={chat.id} ref={editInputRef} value={editingChatName} onChange={e => setEditingChatName(e.target.value)}
                        onBlur={() => { const name = editingChatName.trim() || chat.name; if (onRenameChat) onRenameChat(chat.id, name); setEditingChatId(null); }}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); const name = editingChatName.trim() || chat.name; if (onRenameChat) onRenameChat(chat.id, name); setEditingChatId(null); } if (e.key === "Escape") setEditingChatId(null); }}
                        onClick={e => e.stopPropagation()}
                        style={{ background: "#eaeaea", borderRadius: 6, padding: "3px 7px", fontSize: 12, fontWeight: 500, color: "#151414", fontFamily: "'AktivGrotesk','DM Sans',sans-serif", whiteSpace: "nowrap", flexShrink: 0, maxWidth: 120, border: "1px solid #2709DC", outline: "none", width: 80 }}
                      />
                    ) : (
                      <div key={chat.id} onClick={() => onSelectChat && onSelectChat(chat.id)} onDoubleClick={(e) => { e.stopPropagation(); setEditingChatId(chat.id); setEditingChatName(chat.name); setTimeout(() => editInputRef.current?.select(), 0); }} style={{ background: chat.id === activeChatId ? "#eaeaea" : "#fff", borderRadius: 6, padding: "4px 8px", fontSize: 12, fontWeight: 500, color: "#151414", fontFamily: "'AktivGrotesk','DM Sans',sans-serif", whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
                        {chat.name}
                      </div>
                    )
                  ))}
                </div>
                <div onClick={() => onNewChat && onNewChat()} style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 8.40002V15.6M8.40002 12H15.6" stroke="#151414" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
              {/* Messages */}
              {messages.map((msg, i) => (
                msg.role === "user" ? (
                  <div key={i} style={{ border: "1px solid #e4e4e4", borderRadius: 6, padding: "7px 8px", maxHeight: 140, overflow: "auto", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#151414", lineHeight: 1.5, wordBreak: "break-word" }}>{msg.content}</div>
                  </div>
                ) : (
                  <div key={i} style={{ padding: "0 4px", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#000", lineHeight: "17px", wordBreak: "break-word" }}>{msg.content}</div>
                  </div>
                )
              ))}
              {isTyping && (
                <div style={{ padding: "0 4px", flexShrink: 0 }}>
                  <div style={{ display: "flex", gap: 4, paddingTop: 4 }}>
                    {[0, 1, 2].map(j => <div key={j} style={{ width: 5, height: 5, borderRadius: 3, background: "#c1c1c1", animation: `pulse 1.2s ease-in-out ${j * 0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            {/* Bottom input — 100px max */}
            <div style={{ border: "1px solid #e4e4e4", borderRadius: 6, display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, maxHeight: 100, flexShrink: 0, overflow: "hidden" }}>
              <textarea
                className="ai-chat-input"
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Plan, leave comment, or tag @flow"
                rows={1}
                style={{ width: "100%", padding: "7px 8px 4px", border: "none", background: "transparent", fontSize: 12, fontWeight: 400, color: "#151414", resize: "none", outline: "none", fontFamily: "'AktivGrotesk','DM Sans',sans-serif", lineHeight: 1.5, boxSizing: "border-box", flex: 1 }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 8px 7px" }}>
                <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M16.174 11.7034L11.9467 15.9307C10.7962 17.0812 9.07061 17.2171 7.89752 16.044C6.74694 14.8934 6.89648 13.2266 8.06957 12.0535L12.8215 7.30159C13.5487 6.57432 14.7196 6.57431 15.4468 7.30158C16.1741 8.02885 16.1741 9.19969 15.4468 9.92696L10.6115 14.7623C10.249 15.1248 9.66131 15.1248 9.29882 14.7623C8.93633 14.3998 8.93633 13.8121 9.29882 13.4496L13.6095 9.1389" stroke="#C1C1C1" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div onClick={handleSend} style={{ width: 24, height: 24, cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect width="24" height="24" rx="6" fill="#E4E4E4"/>
                    <path d="M7.7998 11.1992L11.9998 7.19922M11.9998 7.19922L16.1998 11.1992M11.9998 7.19922V16.7992" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes pulse { 0%,100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } } .ai-chat-input::placeholder { color: #C1C1C1; opacity: 1; font-weight: 500; } .chat-tabs-scroll::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

function Workbench({ tabs, activeTab, onSetActive, onCloseTab, onCloseAll, onOpenReqTab, ifaces, allSystems, allRequirements, onDrop, tabDragOver, setTabDragOver, width }) {
  const current = tabs[activeTab];

  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setTabDragOver(true); };
  const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setTabDragOver(false); };
  const handleDrop = (e) => { e.preventDefault(); setTabDragOver(false); const data = e.dataTransfer.getData("application/json"); if (data) { try { onDrop(JSON.parse(data), activeTab); } catch {} } };

  const fieldRow = (label, value) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 500, minWidth: 80 }}>{label}</span>
      <span style={{ fontSize: 12, color: "#1e293b", fontWeight: 500, textAlign: "right", flex: 1 }}>{value}</span>
    </div>
  );

  const progressRing = (pct) => {
    const r = 14, c = 2 * Math.PI * r, offset = c - (pct / 100) * c;
    const color = pct >= 80 ? "#16a34a" : pct >= 40 ? "#f59e0b" : "#94a3b8";
    return <svg width="36" height="36" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
      <circle cx="18" cy="18" r={r} fill="none" stroke="#f1f5f9" strokeWidth="3" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 18 18)" />
      <text x="18" y="19" textAnchor="middle" dominantBaseline="middle" fontSize="8.5" fontWeight="700" fill={color}>{pct}%</text>
    </svg>;
  };

  const systemBadge = (sysId) => {
    const sys = allSystems[sysId]; const name = sys?.name || sysId; const color = sys?.color || "#94a3b8";
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: color + "12", border: `1px solid ${color}30`, padding: "3px 9px", borderRadius: 10, fontSize: 11.5, fontWeight: 500, color: "#334155" }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: color }} />{name}
    </span>;
  };

  const maturityBadge = (level) => {
    const cfg = { verified: { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" }, defined: { bg: "#dbeafe", color: "#1e40af", border: "#bfdbfe" }, concept: { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" } };
    const c = cfg[level] || cfg.concept;
    return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 10, background: c.bg, color: c.color, border: `1px solid ${c.border}`, textTransform: "capitalize" }}>{level || "—"}</span>;
  };

  const typeBadge = (t) => {
    if (!t) return <span style={{ color: "#c0c8d4" }}>—</span>;
    const cfg = { Electrical: { bg: "#fef3c7", color: "#92400e" }, Mechanical: { bg: "#dcfce7", color: "#166534" }, Signal: { bg: "#fce7f3", color: "#9d174d" } };
    const c = cfg[t] || { bg: "#f1f5f9", color: "#475569" };
    return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 10, background: c.bg, color: c.color }}>{t}</span>;
  };

  const tabLabel = (tab) => {
    if (tab.type === "interface") { const iface = ifaces.find(i => i.id === tab.id); return iface ? iface.name : tab.id; }
    if (tab.type === "requirement") { const ref = allRequirements.find(r => r.id === tab.id); return ref ? `${tab.id} ${ref.label}` : tab.id; }
    return tab.id;
  };
  const tabShortLabel = (tab) => {
    if (tab.type === "interface") return tab.id;
    return tab.id;
  };
  const tabIcon = (tab) => {
    if (tab.type === "interface") return <span style={{ color: "#64748b", fontSize: 12, lineHeight: 1 }}>∞</span>;
    return <ReqIcon size={10} />;
  };

  // --- Interface content ---
  const renderInterface = (tab) => {
    const iface = ifaces.find(i => i.id === tab.id);
    if (!iface) return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#c0c8d4", fontSize: 13 }}>Interface not found</div>;
    const reqs = iface.requirements || [];
    return <>
      <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#2563eb", background: "#eff6ff", padding: "1px 6px", borderRadius: 4, border: "1px solid #bfdbfe" }}>{iface.id}</span>
          <VerifyIcon status={iface.verificationStatus === "success" ? "pass" : iface.verificationStatus === "fail" ? "fail" : "pending"} size={14} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{iface.name}</div>
        {iface.desc && <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 3, lineHeight: 1.4 }}>{iface.desc}</div>}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {progressRing(iface.progress)}
            <div>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>Progress</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{iface.progress}%</div>
            </div>
          </div>
          <div style={{ width: 1, height: 28, background: "#e2e8f0" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <VerifyIcon status={iface.verificationStatus === "success" ? "pass" : iface.verificationStatus === "fail" ? "fail" : "pending"} size={20} />
            <div>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>Verification</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", textTransform: "capitalize" }}>{iface.verificationStatus}</div>
            </div>
          </div>
        </div>
        {fieldRow("Maturity", maturityBadge(iface.maturityLevel))}
        {fieldRow("Type", typeBadge(iface.interfaceType))}
        {fieldRow("Owner", iface.owner || <span style={{ color: "#c0c8d4" }}>—</span>)}
        {fieldRow("Team", iface.team || <span style={{ color: "#c0c8d4" }}>—</span>)}
        {fieldRow("Source", systemBadge(iface.source))}
        {fieldRow("Target", systemBadge(iface.target))}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Requirements ({reqs.length})</div>
          {reqs.length === 0 && <div style={{ fontSize: 12, color: "#c0c8d4", padding: "6px 0" }}>No requirements linked</div>}
          {reqs.map(rq => {
            const ref = allRequirements.find(r => r.id === rq.id);
            const tests = rq.tests || [];
            const reqStatus = getReqStatus(tests);
            return <div key={rq.id} style={{ marginBottom: 2 }}>
              <div onClick={() => onOpenReqTab(rq.id, iface.id)}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 7, cursor: "pointer", background: "#f8fafc", border: "1px solid #f1f5f9", marginBottom: 3 }}
                onMouseEnter={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#bfdbfe"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#f1f5f9"; }}>
                <ReqIcon size={13} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#2563eb", flexShrink: 0 }}>{rq.id}</span>
                <span style={{ fontSize: 11.5, color: "#475569", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ref?.label || ""}</span>
                <VerifyIcon status={reqStatus} size={14} />
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#b0b8c4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
              {tests.map((t, ti) => (
                <div key={ti} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px 3px 28px", fontSize: 11 }}>
                  <TestIcon status={t.status} size={11} />
                  <span style={{ color: t.status === "pass" ? "#166534" : t.status === "fail" ? "#991b1b" : "#92400e", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                  <VerifyIcon status={t.status} size={12} />
                </div>
              ))}
            </div>;
          })}
        </div>
      </div>
    </>;
  };

  // --- Requirement content ---
  const renderRequirement = (tab) => {
    const parentIface = ifaces.find(i => i.id === tab.parentIfaceId);
    const reqData = parentIface?.requirements?.find(r => r.id === tab.id);
    const ref = allRequirements.find(r => r.id === tab.id);
    const tests = reqData?.tests || [];
    const reqStatus = getReqStatus(tests);
    return <>
      <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <ReqIcon size={14} />
          <span style={{ fontSize: 10, fontWeight: 600, color: "#2563eb", background: "#eff6ff", padding: "1px 6px", borderRadius: 4, border: "1px solid #bfdbfe" }}>{tab.id}</span>
          <VerifyIcon status={reqStatus} size={14} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{ref?.label || "Requirement"}</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
          <VerifyIcon status={reqStatus} size={20} />
          <div>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>Verification Status</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", textTransform: "capitalize" }}>{reqStatus}</div>
          </div>
        </div>
        {parentIface && fieldRow("Interface", <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500 }}>
          <span style={{ color: "#2563eb" }}>∞</span> {parentIface.name} <span style={{ color: "#94a3b8", fontSize: 10 }}>({parentIface.id})</span>
        </span>)}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Tests ({tests.length})</div>
          {tests.length === 0 && <div style={{ fontSize: 12, color: "#c0c8d4", padding: "6px 0" }}>No tests defined</div>}
          {tests.map((t, ti) => (
            <div key={ti} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 12px", borderRadius: 7, background: "#f8fafc", border: "1px solid #f1f5f9", marginBottom: 3 }}>
              <TestIcon status={t.status} size={13} />
              <span style={{ fontSize: 12, color: t.status === "pass" ? "#166534" : t.status === "fail" ? "#991b1b" : "#92400e", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{t.name}</span>
              <VerifyIcon status={t.status} size={14} />
            </div>
          ))}
        </div>
      </div>
    </>;
  };

  // --- Main render ---
  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      style={{ width: width || 380, background: "#fff", borderLeft: "1px solid #e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0, fontFamily: "'AktivGrotesk','DM Sans',sans-serif", overflow: "hidden", position: "relative", boxShadow: tabDragOver ? "inset 0 0 0 2px #3b82f6" : "none", transition: "box-shadow 0.2s" }}>
      {tabDragOver && <div style={{ position: "absolute", inset: 0, background: "rgba(59,130,246,0.05)", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ background: "#eff6ff", border: "2px dashed #3b82f6", borderRadius: 10, padding: "14px 22px", fontSize: 12.5, fontWeight: 600, color: "#2563eb" }}>Drop to add</div>
      </div>}

      {/* Tab bar — Cursor-style */}
      <div style={{ display: "flex", alignItems: "stretch", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", flexShrink: 0, minHeight: 35 }}>
        <div style={{ display: "flex", flex: 1, overflow: "hidden", alignItems: "stretch" }}>
          {tabs.map((tab, i) => {
            const isActive = i === activeTab;
            return <div key={tab.type + "-" + tab.id} onClick={() => onSetActive(i)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 3px 0 10px", minWidth: 0, maxWidth: 150, cursor: "pointer", fontSize: 11, fontWeight: isActive ? 600 : 400,
                color: isActive ? "#0f172a" : "#64748b",
                background: isActive ? "#fff" : "transparent",
                borderRight: "1px solid #e2e8f0",
                borderBottom: isActive ? "none" : "1px solid #e2e8f0",
                borderTop: isActive ? "2px solid #2563eb" : "2px solid transparent",
                marginBottom: isActive ? -1 : 0,
                position: "relative", flexShrink: 1, userSelect: "none", transition: "background 0.1s" }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f8fafc"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
              {tabIcon(tab)}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{tabShortLabel(tab)}</span>
              <span onClick={e => { e.stopPropagation(); onCloseTab(i); }}
                style={{ width: 18, height: 18, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#94a3b8", fontSize: 13, lineHeight: 1, cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}>×</span>
            </div>;
          })}
        </div>
        {/* Collapse panel button */}
        <button onClick={onCloseAll} title="Close panel"
          style={{ width: 34, flexShrink: 0, border: "none", borderLeft: "1px solid #e2e8f0", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#e8ebef"; e.currentTarget.style.color = "#475569"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"/><line x1="18" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Active tab content */}
      {current?.type === "interface" && renderInterface(current)}
      {current?.type === "requirement" && renderRequirement(current)}

      {/* Empty state */}
      {!current && <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="9"/></svg>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 4 }}>No tabs open</div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4 }}>Click an interface or drag items here</div>
      </div>}
    </div>
  );
}

function TableView({ ifaces, allSystems, allRequirements }) {
  const [sortCol, setSortCol] = useState("dateCreated");
  const [sortDir, setSortDir] = useState("desc");
  const columns = [
    { key: "name", label: "NAME" },
    { key: "id", label: "ID" },
    { key: "interfaceType", label: "INTERFACE TYPE" },
    { key: "source", label: "SOURCE SYSTEM" },
    { key: "target", label: "TARGET SYSTEMS" },
    { key: "requirements", label: "REQUIREMENTS" },
    { key: "dateCreated", label: "DATE CREATED" },
    { key: "dateLastUpdated", label: "DATE LAST UPD." },
  ];
  const toggleSort = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const sorted = useMemo(() => {
    const list = [...ifaces];
    if (!sortCol) return list;
    list.sort((a, b) => {
      let va, vb;
      if (sortCol === "source") { va = allSystems[a.source]?.name || a.source; vb = allSystems[b.source]?.name || b.source; }
      else if (sortCol === "target") { va = allSystems[a.target]?.name || a.target; vb = allSystems[b.target]?.name || b.target; }
      else if (sortCol === "requirements") { va = (a.requirements || []).length; vb = (b.requirements || []).length; }
      else { va = a[sortCol] || ""; vb = b[sortCol] || ""; }
      const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [ifaces, sortCol, sortDir, allSystems]);

  const formatDate = (d) => { if (!d) return "\u2014"; const dt = new Date(d); const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`; };

  const sysColor = (id) => allSystems[id]?.color || "#94a3b8";

  return <div style={{ flex: 1, overflow: "auto", background: "#fff" }}>
    <div style={{ padding: "10px 16px", fontSize: 11.5, color: "#64748b", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", fontWeight: 500 }}>Showing {ifaces.length} interface{ifaces.length !== 1 ? "s" : ""}</div>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'AktivGrotesk','DM Sans',sans-serif" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
          {columns.map(col => <th key={col.key} onClick={() => toggleSort(col.key)} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#64748b", letterSpacing: "0.5px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
            {col.label} {sortCol === col.key ? <span style={{ color: "#2563eb" }}>{sortDir === "desc" ? "▼" : "▲"}</span> : <span style={{ color: "#d0d5dd" }}>⇅</span>}
          </th>)}
        </tr>
      </thead>
      <tbody>
        {sorted.map(iface => <tr key={iface.id} style={{ borderBottom: "1px solid #f1f5f9" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
          <td style={{ padding: "14px 16px", fontWeight: 600, color: "#1e293b", maxWidth: 220 }}>{iface.name}</td>
          <td style={{ padding: "14px 16px", color: "#64748b" }}>{iface.id}</td>
          <td style={{ padding: "14px 16px" }}>
            {iface.interfaceType ? <span style={{ background: iface.interfaceType === "Electrical" ? "#fef3c7" : iface.interfaceType === "Mechanical" ? "#dcfce7" : iface.interfaceType === "Signal" ? "#fce7f3" : "#f1f5f9", color: iface.interfaceType === "Electrical" ? "#92400e" : iface.interfaceType === "Mechanical" ? "#166534" : iface.interfaceType === "Signal" ? "#9d174d" : "#475569", fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 12 }}>{iface.interfaceType}</span> : <span style={{ color: "#c0c8d4" }}>&mdash;</span>}
          </td>
          <td style={{ padding: "14px 16px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: sysColor(iface.source) + "15", border: `1px solid ${sysColor(iface.source)}40`, padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 500, color: "#334155" }}>{allSystems[iface.source]?.name || iface.source}</span>
          </td>
          <td style={{ padding: "14px 16px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: sysColor(iface.target) + "15", border: `1px solid ${sysColor(iface.target)}40`, padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 500, color: "#334155" }}>{allSystems[iface.target]?.name || iface.target}</span>
          </td>
          <td style={{ padding: "14px 16px" }}>
            {(iface.requirements || []).length > 0 ? (iface.requirements || []).map(rq => {
              const rId = typeof rq === "string" ? rq : rq.id;
              const r = allRequirements.find(x => x.id === rId);
              return <span key={rId} style={{ display: "inline-block", background: "#dbeafe", color: "#1e40af", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 10, marginRight: 4 }}>{r ? `${r.id} ${r.label}` : rId}</span>;
            }) : <span style={{ color: "#c0c8d4" }}>&mdash;</span>}
          </td>
          <td style={{ padding: "14px 16px", color: "#475569", whiteSpace: "nowrap" }}>{formatDate(iface.dateCreated)}</td>
          <td style={{ padding: "14px 16px", color: "#475569", whiteSpace: "nowrap" }}>{formatDate(iface.dateLastUpdated)}</td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}

function ResizeHandle({ onMouseDown: onMD, zIndex = 15 }) {
  return <div onMouseDown={onMD}
    style={{ width: 6, cursor: "col-resize", flexShrink: 0, zIndex, position: "relative", background: "transparent", marginLeft: -3, marginRight: -3 }}
    onMouseEnter={e => { e.currentTarget.firstChild.style.opacity = "1"; }}
    onMouseLeave={e => { e.currentTarget.firstChild.style.opacity = "0"; }}>
    <div style={{ position: "absolute", inset: "0", width: 3, margin: "0 auto", background: "#3b82f6", borderRadius: 2, opacity: 0, transition: "opacity 0.15s", pointerEvents: "none" }} />
  </div>;
}

// ═══════════════════════════════════════════════════════
//  DETAIL VIEW
// ═══════════════════════════════════════════════════════

function DVInterfaceIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M11.9811 15.4162V17.8598M9.88654 7.38712V6.33984M14.0756 7.38712V6.33984M16.1702 9.83075H7.79199M8.83927 9.83075H15.1229V12.6235C15.1229 14.1659 13.8726 15.4162 12.3302 15.4162H11.632C10.0896 15.4162 8.83927 14.1659 8.83927 12.6235V9.83075Z" stroke="#6E6E6E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DVPackageIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 17.7604L16.9883 14.8804V9.12036L12 6.24036L7.01172 9.12036V14.8804L12 17.7604ZM12 17.7604V12.3604M12 12.3604L7.32003 9.48036M12 12.3604L16.68 9.48036" stroke="#f97316" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DVRequirementIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13.8002 9.25L11.8684 11.1818C11.6927 11.3575 11.4077 11.3575 11.232 11.1818L10.2002 10.15" stroke="#0084D1" strokeWidth="1.2" fill="none" />
      <path d="M7.5 15.55V7.58622C7.5 7.49738 7.5263 7.41053 7.57558 7.33661L8.26641 6.30036C8.34987 6.17517 8.49037 6.09998 8.64083 6.09998H16.05C16.2985 6.09998 16.5 6.30145 16.5 6.54998V14.2M7.5 15.55C7.5 15.55 8.10442 16.9 8.85 16.9C11.4001 16.9 14.8351 16.9 16.0508 16.9C16.2994 16.9 16.5 16.6985 16.5 16.45V14.2M7.5 15.55C7.5 15.55 8.10442 14.2 8.85 14.2C11.55 14.2 16.5 14.2 16.5 14.2" stroke="#0084D1" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

function DVArrowIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12H19M19 12L14 7M19 12L14 17" stroke="#151414" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DVUserIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <rect x="0.625" y="0.625" width="28.75" height="28.75" rx="14.375" stroke="#8A8A8A" strokeWidth="1.25" strokeDasharray="2.5 2.5"/>
      <path d="M15 16.167C16.779 16.167 18.3529 16.5069 19.4541 17.0234C20.6145 17.5678 20.9998 18.1709 21 18.583C21 19.1052 20.7159 19.676 19.793 20.1572C18.8449 20.6514 17.294 21 15 21C12.706 21 11.1551 20.6514 10.207 20.1572C9.28408 19.676 9 19.1052 9 18.583C9.00025 18.1709 9.38547 17.5678 10.5459 17.0234C11.6471 16.5069 13.221 16.167 15 16.167ZM15 9C16.1129 9 17.1131 10.0844 17.1133 11.2568C17.1133 12.3936 16.147 13.4062 15 13.4062C13.853 13.4062 12.8867 12.3936 12.8867 11.2568C12.8869 10.0844 13.8871 9 15 9Z" stroke="#8A8A8A" strokeWidth="1.5"/>
    </svg>
  );
}

function DetailView({ tabs, activeTab, onSetActive, onCloseTab, ifaces, allSystems, allRequirements, width }) {
  const [hoveredTab, setHoveredTab] = useState(null);
  const FONT = "'AktivGrotesk','DM Sans',sans-serif";

  const activeIfaceId = tabs[activeTab];
  const activeIface = activeIfaceId ? ifaces.find(i => i.id === activeIfaceId) : null;

  return (
    <div style={{
      width: width || 380,
      minWidth: 330,
      background: "#F4F4F4",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      height: "100%",
    }}>
      {/* Tab bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        background: "#F4F4F4",
        borderRight: "1px solid #E4E4E4",
        flexShrink: 0,
      }}>
        {tabs.map((tabId, i) => {
          const isActive = i === activeTab;
          const isHovered = hoveredTab === i;
          return (
            <div
              key={tabId}
              onClick={() => onSetActive(i)}
              onMouseEnter={() => setHoveredTab(i)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                paddingLeft: 4,
                paddingRight: isActive ? 2 : 10,
                paddingTop: 2,
                paddingBottom: 2,
                borderRadius: 6,
                background: isActive ? "#fff" : "#E4E4E4",
                border: "none",
                boxShadow: isActive ? "inset 0 0 0 1px #E4E4E4" : "none",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <DVInterfaceIcon size={24} />
              <span style={{
                fontFamily: FONT,
                fontSize: 12,
                fontWeight: 500,
                color: isActive ? "#000" : "rgba(0,0,0,0.9)",
                whiteSpace: "nowrap",
              }}>
                {tabId}
              </span>
              {isActive && (
                <div
                  onClick={e => { e.stopPropagation(); onCloseTab(i); }}
                  style={{
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    opacity: isHovered ? 1 : 0,
                    transition: "opacity 0.15s",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M15 9L9 15M9 9L15 15" stroke="#151414" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Content area */}
      <div style={{
        flex: 1,
        background: "#fff",
        borderTopLeftRadius: 12,
        borderLeft: "1px solid #E4E4E4",
        borderRight: "1px solid #E4E4E4",
        borderTop: "1px solid #E4E4E4",
        overflow: "auto",
        padding: "12px 0",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}>
        {activeIface && (
          <>
            {/* ID + Title */}
            <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <DVInterfaceIcon size={24} />
                <span style={{ fontFamily: FONT, fontSize: 12, color: "#000" }}>{activeIface.id}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 500, color: "#000" }}>{activeIface.name}</span>
                {activeIface.desc && (
                  <span style={{ fontFamily: FONT, fontSize: 12, color: "#000", lineHeight: "17px" }}>{activeIface.desc}</span>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "#EAEAEA", width: "100%" }} />

            {/* Detail section */}
            <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: "#000" }}>Detail</span>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Direction */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: "#000", whiteSpace: "nowrap" }}>Direction</span>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{
                      flex: 1, display: "flex", alignItems: "center",
                      padding: "2px 6px 2px 4px", borderRadius: 6,
                      border: "1px solid #E4E4E4", background: "#fff",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                        <DVPackageIcon size={24} />
                        <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: "#151414", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {allSystems[activeIface.source]?.name || activeIface.source}
                        </span>
                      </div>
                    </div>
                    <DVArrowIcon size={24} />
                    <div style={{
                      flex: 1, display: "flex", alignItems: "center",
                      padding: "2px 6px 2px 4px", borderRadius: 6,
                      border: "1px solid #E4E4E4", background: "#fff",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                        <DVPackageIcon size={24} />
                        <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: "#151414", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {allSystems[activeIface.target]?.name || activeIface.target}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Type */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: "#000", whiteSpace: "nowrap" }}>Type</span>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 0, padding: activeIface.interfaceType ? "2px 12px 2px 4px" : "4px 12px 4px 4px", borderRadius: 6, border: activeIface.interfaceType ? "1px solid #E4E4E4" : "1px dashed #C1C1C1", background: "#fff", maxWidth: 160 }}>
                      {activeIface.interfaceType ? (() => {
                        const typeColor = { Signal: "#ec4899", Mechanical: "#22c55e", Electrical: "#f59e0b" }[activeIface.interfaceType] || "black";
                        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M11.6305 7.353C11.8345 7.14893 12.1654 7.14893 12.3694 7.353L16.6469 11.6305C16.851 11.8345 16.851 12.1654 16.6469 12.3694L12.3694 16.6469C12.1654 16.851 11.8345 16.851 11.6305 16.6469L7.353 12.3694C7.14893 12.1654 7.14893 11.8345 7.353 11.6305L11.6305 7.353Z" stroke={typeColor} strokeWidth="1.2"/></svg>;
                      })() : <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M7.68023 17.7605H16.3202C17.1155 17.7605 17.7602 17.1158 17.7602 16.3205V7.68048C17.7602 6.88519 17.1155 6.24048 16.3202 6.24048H7.68023C6.88494 6.24048 6.24023 6.88519 6.24023 7.68048V16.3205C6.24023 17.1158 6.88494 17.7605 7.68023 17.7605Z" stroke="#C1C1C1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: activeIface.interfaceType ? "#151414" : "#C1C1C1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {activeIface.interfaceType || "Type"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Maturity */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: "#000", whiteSpace: "nowrap" }}>Maturity</span>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 0, padding: activeIface.maturityLevel ? "2px 12px 2px 4px" : "4px 12px 4px 4px", borderRadius: 6, border: activeIface.maturityLevel ? "1px solid #E4E4E4" : "1px dashed #C1C1C1", background: "#fff", maxWidth: 160 }}>
                      {activeIface.maturityLevel ? (() => {
                        const ml = activeIface.maturityLevel?.toLowerCase();
                        if (ml === "verified") return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M13.8002 10.7999L11.1154 13.1999L10.2002 12.3818M16.8002 8.99994L16.8002 15C16.8002 15.9941 15.9943 16.8 15.0002 16.8H9.0002C8.00608 16.8 7.2002 15.9941 7.2002 15V8.99994C7.2002 8.00583 8.00608 7.19995 9.0002 7.19995H15.0002C15.9943 7.19995 16.8002 8.00583 16.8002 8.99994Z" stroke="#00A469" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
                        if (ml === "defined") return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M10.7399 17.7598H7.85992C7.06462 17.7598 6.41992 17.1151 6.41992 16.3198L6.41998 7.67986C6.41998 6.88457 7.06469 6.23987 7.85998 6.23987H14.3401C15.1354 6.23987 15.7801 6.88458 15.7801 7.67987V11.6399M12.9001 15.7199L14.2201 17.0399L17.5801 13.4399" stroke="#1046D0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
                        if (ml === "in progress" || ml === "progress") return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><g opacity="0.9"><path d="M15.3756 12C15.3756 13.6602 14.1769 15.0404 12.5977 15.3223C12.2715 15.3806 12.0006 15.1063 12.0006 14.775V9.22498C12.0006 8.8936 12.2715 8.6194 12.5977 8.67764C14.1769 8.95956 15.3756 10.3398 15.3756 12Z" stroke="#DCAE09" strokeWidth="1.2"/><path fillRule="evenodd" clipRule="evenodd" d="M17.4006 12C17.4006 14.9823 14.9829 17.4 12.0006 17.4C9.01825 17.4 6.60059 14.9823 6.60059 12C6.60059 9.01764 9.01825 6.59998 12.0006 6.59998C14.9829 6.59998 17.4006 9.01764 17.4006 12Z" stroke="#DCAE09" strokeWidth="1.2"/></g></svg>;
                        return null;
                      })() : <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M7.68023 17.7605H16.3202C17.1155 17.7605 17.7602 17.1158 17.7602 16.3205V7.68048C17.7602 6.88519 17.1155 6.24048 16.3202 6.24048H7.68023C6.88494 6.24048 6.24023 6.88519 6.24023 7.68048V16.3205C6.24023 17.1158 6.88494 17.7605 7.68023 17.7605Z" stroke="#C1C1C1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: activeIface.maturityLevel ? "#151414" : "#C1C1C1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "capitalize" }}>
                        {activeIface.maturityLevel || "Maturity"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Owner */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: "#000", whiteSpace: "nowrap" }}>Owner</span>
                  <DVUserIcon size={30} />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "#EAEAEA", width: "100%" }} />

            {/* Requirement section */}
            <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: "#000" }}>Requirement</span>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(activeIface.requirements || []).map(req => {
                  const reqId = typeof req === "string" ? req : req.id;
                  const reqData = allRequirements.find(r => r.id === reqId);
                  return (
                    <div key={reqId} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "4px 6px 4px 4px", borderRadius: 6,
                      border: "1px solid #E4E4E4", background: "#fff",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <DVRequirementIcon size={24} />
                          <span style={{ fontFamily: FONT, fontSize: 12, color: "#8A8A8A" }}>{reqId}</span>
                        </div>
                        <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: "#151414" }}>
                          {reqData?.label || "Requirement"}
                        </span>
                      </div>
                      <div style={{
                        border: "0.833px dashed #8A8A8A",
                        borderRadius: 13.333,
                        display: "flex",
                        alignItems: "center",
                      }}>
                        <DVUserIcon size={20} />
                      </div>
                    </div>
                  );
                })}

                {/* Add requirement */}
                <div style={{
                  display: "flex", alignItems: "center",
                  padding: "8px 12px", borderRadius: 6,
                  border: "1px dashed #8A8A8A", cursor: "pointer",
                }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: "#8A8A8A" }}>Add requirement</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SERMTool() {
  const [hierarchy, setHierarchy] = useState(initialHierarchy);
  const [expanded, setExpanded] = useState(new Set());
  const [ifaces, setIfaces] = useState(initIfaces);
  const [allRequirements, setAllRequirements] = useState(initRequirements);
  const [viewMode, setViewMode] = useState("architecture");
  const [selId, setSelId] = useState(null);
  const [hovId, setHovId] = useState(null);
  const [hovBlock, setHovBlock] = useState(null);
  const [hovCursor, setHovCursor] = useState(null);
  const [selBlockId, setSelBlockId] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.0);
  const [dragging, setDragging] = useState(null);
  const [panning, setPanSt] = useState(false);
  const [dragOffsets, setDragOffsets] = useState({});
  const [sbExp, setSbExp] = useState(new Set());
  const [sbIfaceExp, setSbIfaceExp] = useState(new Set());
  const [connecting, setConnecting] = useState(null);
  const [modal, setModal] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const [revealed, setRevealed] = useState(new Set());
  const [hovSys, setHovSys] = useState(null);
  const [hovStub, setHovStub] = useState(null);
  const [pillOffsets, setPillOffsets] = useState({});
  const [draggingPill, setDraggingPill] = useState(null);
  const [pillDragStart, setPillDragStart] = useState(null);
  const [lineOffsets, setLineOffsets] = useState({});
  const [draggingLine, setDraggingLine] = useState(null);
  const [lineDragStart, setLineDragStart] = useState(null);
  const [viewSize, setViewSize] = useState({ w: 900, h: 600 });
  const [viewStates, setViewStates] = useState({});
  const [dotOverrides, setDotOverrides] = useState({});
  const [draggingDot, setDraggingDot] = useState(null);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [wbTabs, setWbTabs] = useState([]);
  const [wbActiveTab, setWbActiveTab] = useState(0);
  const [tabDragOver, setTabDragOver] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [agentsPanelOpen, setAgentsPanelOpen] = useState(false);
  const [chatList, setChatList] = useState([
    { id: "c1", name: "PDR changes", timeAgo: "now", date: "20 Jan 2026, 11:28", messages: [
      { role: "user", content: "What changed in the latest PDR review?", time: new Date("2026-01-20T11:20:00") },
      { role: "ai", content: "The latest PDR review updated three interface definitions: du42 → Ground Station now uses Signal type instead of Mechanical, the Stage 1 → Stage 2 link added two new requirements (REQ-80, REQ-81), and the Avionics → Propulsion interface maturity was promoted from Defined to Verified.", time: new Date("2026-01-20T11:21:00") },
      { role: "user", content: "Are there any conflicts with the propulsion branch?", time: new Date("2026-01-20T11:24:00") },
      { role: "ai", content: "Yes — the pdr-propulsion-main branch modified the same Avionics → Propulsion interface. It kept the maturity at Defined and added a different requirement (REQ-85). You'll need to resolve the maturity conflict and decide whether to keep both REQ-81 and REQ-85 or merge them.", time: new Date("2026-01-20T11:25:00") },
    ] },
    { id: "c2", name: "Missing requirements", timeAgo: "1h", date: "20 Jan 2026, 11:28", messages: [
      { role: "user", content: "Which interfaces are missing requirements?", time: new Date("2026-01-20T10:30:00") },
      { role: "ai", content: "I found 3 interfaces with no requirements assigned:\n\n1. Ground Stn → Stage 2 — no requirements\n2. S1 Avio → S2 Avio — no requirements\n3. Avionics → Payload — no requirements\n\nAll other interfaces have at least one requirement linked.", time: new Date("2026-01-20T10:31:00") },
      { role: "user", content: "Can you suggest requirements for Ground Stn → Stage 2?", time: new Date("2026-01-20T10:33:00") },
      { role: "ai", content: "Based on the system architecture, here are suggested requirements for Ground Stn → Stage 2:\n\n• REQ-90: Ground station shall transmit telemetry commands to Stage 2 with latency < 200ms\n• REQ-91: Communication link shall maintain signal integrity at distances up to 500km\n• REQ-92: Stage 2 shall acknowledge all ground commands within 1 second\n\nWould you like me to add any of these?", time: new Date("2026-01-20T10:35:00") },
    ] },
  ]);
  const [activeChatId, setActiveChatId] = useState("c1");
  const chatIdCounter = useRef(3);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [workbenchWidth, setWorkbenchWidth] = useState(380);
  const [chatWidth, setChatWidth] = useState(284);
  const [detailTabs, setDetailTabs] = useState([]);
  const [detailActiveTab, setDetailActiveTab] = useState(0);
  const [detailWidth, setDetailWidth] = useState(380);
  const [typeFilter, setTypeFilter] = useState(new Set()); // empty = show all
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const [savedViews, setSavedViews] = useState([]);
  const [activeViewId, setActiveViewId] = useState(null);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [saveViewModal, setSaveViewModal] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const viewsRef = useRef(null);
  const [viewModified, setViewModified] = useState(false);
  const [viewsBtnHov, setViewsBtnHov] = useState(false);
  const resizingRef = useRef(null);

  const panRef = useRef({}); const dragRef = useRef({}); const svgRef = useRef(null); const canvasRef = useRef(null);
  const zoomRef = useRef(zoom); zoomRef.current = zoom;
  const panValRef = useRef(pan); panValRef.current = pan;
  const dragOffsetsRef = useRef(dragOffsets); dragOffsetsRef.current = dragOffsets;
  const pillOffsetsRef = useRef(pillOffsets); pillOffsetsRef.current = pillOffsets;
  const lineOffsetsRef = useRef(lineOffsets); lineOffsetsRef.current = lineOffsets;
  const focusIdRef = useRef(focusId); focusIdRef.current = focusId;
  const viewStatesRef = useRef(viewStates); viewStatesRef.current = viewStates;
  const dotOverridesRef = useRef(dotOverrides); dotOverridesRef.current = dotOverrides;
  const initialCentered = useRef(false);
  const rawDragAccum = useRef({});
  const expandedRef = useRef(expanded); expandedRef.current = expanded;
  const [centerTrigger, setCenterTrigger] = useState(0);
  const parentMap = useMemo(() => buildParentMap(hierarchy, null), [hierarchy]);

  useEffect(() => { if (!canvasRef.current) return; const ro = new ResizeObserver(e => { for (const en of e) setViewSize({ w: en.contentRect.width, h: en.contentRect.height }); }); ro.observe(canvasRef.current); return () => ro.disconnect(); }, []);
  useEffect(() => { if (!selId) return; const iface = ifaces.find(i => i.id === selId); if (!iface) return; setSbExp(p => { const n = new Set(p); [iface.source, iface.target].forEach(s => { n.add(s); getAncestorIds(s, parentMap).forEach(a => n.add(a)); }); return n; }); }, [selId, ifaces, parentMap]);
  useEffect(() => { if (!selBlockId) return; setSbExp(p => { const n = new Set(p); getAncestorIds(selBlockId, parentMap).forEach(a => n.add(a)); return n; }); }, [selBlockId, parentMap]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!resizingRef.current) return;
      const { type, startX, startWidth } = resizingRef.current;
      const delta = e.clientX - startX;
      if (type === "sidebar") setSidebarWidth(Math.max(180, Math.min(500, startWidth + delta)));
      else if (type === "workbench") setWorkbenchWidth(Math.max(260, Math.min(700, startWidth + delta)));
      else if (type === "chat") setChatWidth(Math.max(260, Math.min(700, startWidth - delta)));
      else if (type === "detail") setDetailWidth(Math.max(330, Math.min(600, startWidth + delta)));
    };
    const onMouseUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, []);

  const activeChat = chatList.find(c => c.id === activeChatId);
  const activeChatMessages = activeChat ? activeChat.messages : [];
  const activeChatName = activeChat ? activeChat.name : "New chat";

  const handleChatSendMessage = useCallback((msg) => {
    setChatList(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, msg] } : c));
  }, [activeChatId]);

  const handleSelectChat = useCallback((chatId) => {
    setActiveChatId(chatId);
  }, []);

  const handleNewChat = useCallback(() => {
    const newId = "c" + chatIdCounter.current++;
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + ", " + now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setChatList(prev => [{ id: newId, name: "New chat", timeAgo: "now", date: dateStr, messages: [] }, ...prev]);
    setActiveChatId(newId);
  }, []);

  const handleDeleteChat = useCallback((chatId) => {
    setChatList(prev => {
      const remaining = prev.filter(c => c.id !== chatId);
      if (chatId === activeChatId && remaining.length > 0) {
        setActiveChatId(remaining[0].id);
      } else if (remaining.length === 0) {
        const newId = "c" + chatIdCounter.current++;
        const now = new Date();
        const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + ", " + now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        const newChat = { id: newId, name: "New chat", timeAgo: "now", date: dateStr, messages: [] };
        setActiveChatId(newId);
        return [newChat];
      }
      return remaining;
    });
  }, [activeChatId]);

  const handleRenameChat = useCallback((chatId, newName) => {
    setChatList(prev => prev.map(c => c.id === chatId ? { ...c, name: newName } : c));
  }, []);

  const startResize = useCallback((type, currentWidth, e) => {
    e.preventDefault();
    resizingRef.current = { type, startX: e.clientX, startWidth: currentWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const baseLayout = useMemo(() => computeLayout(hierarchy, expanded, ifaces), [hierarchy, expanded, ifaces]);

  const positioned = useMemo(() => {
    const p = {};
    for (const [id, sys] of Object.entries(baseLayout)) { const off = dragOffsets[id] || { dx: 0, dy: 0 }; p[id] = { ...sys, x: sys.x + off.dx, y: sys.y + off.dy }; }
    const parents = Object.keys(p).filter(id => p[id].expanded && p[id].hasChildren);
    parents.sort((a, b) => getAncestorIds(b, parentMap).length - getAncestorIds(a, parentMap).length);
    for (const pid of parents) {
      const par = p[pid]; const cids = (par.children || []).map(c => c.id); if (!cids.length) continue;
      let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
      for (const cid of cids) { const c = p[cid]; if (!c) continue; mnX = Math.min(mnX, c.x); mnY = Math.min(mnY, c.y); mxX = Math.max(mxX, c.x + c.w); mxY = Math.max(mxY, c.y + c.h); }
      p[pid] = { ...par, x: snapToGrid(mnX - PAD), y: snapToGrid(mnY - HEADER_H - PAD), w: snapToGrid(mxX - mnX + PAD * 2), h: snapToGrid(mxY - mnY + HEADER_H + PAD * 2 + GRID) };
    }
    return p;
  }, [baseLayout, dragOffsets, parentMap]);

  const focusIds = useMemo(() => {
    if (!focusId) return null;
    const ids = new Set([focusId, ...getDescendantIds(hierarchy, focusId)]);
    getAncestorIds(focusId, parentMap).forEach(a => ids.add(a));
    revealed.forEach(id => {
      ids.add(id);
      getDescendantIds(hierarchy, id).forEach(d => ids.add(d));
      getAncestorIds(id, parentMap).forEach(a => ids.add(a));
    });
    return ids;
  }, [focusId, revealed, parentMap, hierarchy]);


  const visible = useMemo(() => {
    const v = {};
    for (const [id, sys] of Object.entries(positioned)) {
      let ok = true, pid = parentMap[id];
      while (pid) { if (!expanded.has(pid)) { ok = false; break; } pid = parentMap[pid]; }
      if (!ok) continue;
      if (focusIds && !focusIds.has(id)) continue;
      v[id] = sys;
    }
    return v;
  }, [positioned, expanded, parentMap, focusIds]);

  // Center content in viewport on load and focus change
  const lastCenterTrigger = useRef(0);
  useEffect(() => {
    const triggerChanged = centerTrigger !== lastCenterTrigger.current;
    if (initialCentered.current && !triggerChanged) return;
    if (viewSize.w <= 0 || viewSize.h <= 0) return;
    const blocks = Object.values(visible);
    if (blocks.length === 0) return;
    let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
    for (const b of blocks) { mnX = Math.min(mnX, b.x); mnY = Math.min(mnY, b.y); mxX = Math.max(mxX, b.x + b.w); mxY = Math.max(mxY, b.y + b.h); }
    const contentCX = (mnX + mxX) / 2, contentCY = (mnY + mxY) / 2;
    const z = zoomRef.current;
    setPan({ x: viewSize.w / 2 - contentCX * z, y: viewSize.h / 2 - contentCY * z });
    initialCentered.current = true;
    lastCenterTrigger.current = centerTrigger;
  }, [visible, viewSize, centerTrigger]);

  const dotAssign = useMemo(() => assignDots(ifaces, visible, dotOverrides), [ifaces, visible, dotOverrides]);
  const prevDotsRef = useRef(dotAssign);
  const animFrameRef = useRef(null);
  const [animDots, setAnimDots] = useState(dotAssign);
  useEffect(() => {
    const prev = prevDotsRef.current;
    const next = dotAssign;
    prevDotsRef.current = next;
    // Check if any dots actually changed position (not just same object)
    let changed = false;
    for (const id of Object.keys(next)) {
      if (!prev[id] || prev[id].s.id !== next[id].s.id || prev[id].t.id !== next[id].t.id) { changed = true; break; }
    }
    if (!changed) { setAnimDots(next); return; }
    // Animate from prev to next over 200ms
    const start = performance.now();
    const duration = 200;
    const animate = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOut
      const interp = {};
      for (const [id, nd] of Object.entries(next)) {
        const pd = prev[id];
        if (pd) {
          interp[id] = {
            s: { id: nd.s.id, cx: pd.s.cx + (nd.s.cx - pd.s.cx) * ease, cy: pd.s.cy + (nd.s.cy - pd.s.cy) * ease },
            t: { id: nd.t.id, cx: pd.t.cx + (nd.t.cx - pd.t.cx) * ease, cy: pd.t.cy + (nd.t.cy - pd.t.cy) * ease },
          };
        } else {
          interp[id] = nd;
        }
      }
      setAnimDots(interp);
      if (t < 1) animFrameRef.current = requestAnimationFrame(animate);
    };
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [dotAssign]);
  const pills = useMemo(() => computePills(ifaces, visible, animDots, pillOffsets), [ifaces, visible, animDots, pillOffsets]);
  const selIface = ifaces.find(i => i.id === selId);
  const relIds = selIface ? [selIface.source, selIface.target] : [];
  const blockRelIfaceIds = useMemo(() => { if (!selBlockId) return new Set(); return new Set(ifaces.filter(i => i.source === selBlockId || i.target === selBlockId).map(i => i.id)); }, [selBlockId, ifaces]);
  const externalIfaces = useMemo(() => { if (!focusIds) return []; return ifaces.filter(i => { const s = focusIds.has(i.source), t = focusIds.has(i.target); return (s && !t) || (!s && t); }); }, [focusIds, ifaces]);
  const breadcrumb = useMemo(() => { if (!focusId) return null; const ch = [{ id: null, name: "All" }]; getAncestorIds(focusId, parentMap).reverse().forEach(a => { const n = findNode(hierarchy, a); if (n) ch.push({ id: a, name: n.name }); }); const fn = findNode(hierarchy, focusId); if (fn) ch.push({ id: focusId, name: fn.name }); return ch; }, [focusId, parentMap, hierarchy]);
  const connDots = useMemo(() => { const m = {}; for (const [ifId, da] of Object.entries(animDots)) { const iface = ifaces.find(i => i.id === ifId); if (!iface) continue; if (!m[iface.source]) m[iface.source] = []; m[iface.source].push({ ...da.s, ifaceId: ifId }); if (!m[iface.target]) m[iface.target] = []; m[iface.target].push({ ...da.t, ifaceId: ifId }); } return m; }, [animDots, ifaces]);

  const DRAG_THRESHOLD = 6;
  const DBLCLICK_MS = 400;
  const blockDownPos = useRef({ x: 0, y: 0 });
  const blockClickRef = useRef({ id: null, time: 0 });
  const pillDownPos = useRef({ x: 0, y: 0 });
  const pillClickRef = useRef({ id: null, time: 0 });
  const [editingIfaceId, setEditingIfaceId] = useState(null);

  const handleBlockDown = useCallback((e, id) => {
    e.stopPropagation();
    setDragging(id);
    dragRef.current = { x: e.clientX, y: e.clientY };
    blockDownPos.current = { x: e.clientX, y: e.clientY };
  }, []);
  const handleBlockClick = useCallback((e, id) => {
    e.stopPropagation();
    const dist = Math.hypot(e.clientX - blockDownPos.current.x, e.clientY - blockDownPos.current.y);
    if (dist > DRAG_THRESHOLD) return;
    const now = Date.now();
    const prev = blockClickRef.current;
    if (prev.id === id && now - prev.time < DBLCLICK_MS) {
      blockClickRef.current = { id: null, time: 0 };
      const node = findNode(hierarchy, id);
      if (node?.children?.length) {
        setExpanded(exp => { const n = new Set(exp); if (n.has(id)) n.delete(id); else n.add(id); return n; });
        setCenterTrigger(c => c + 1);
      }
      return;
    }
    blockClickRef.current = { id, time: now };
    setSelBlockId(prev2 => prev2 === id ? null : id);
    setSelId(null);
  }, []);
  const handleCanvasDown = useCallback((e) => { if (!dragging && !connecting && !draggingPill && !draggingLine) { setPanSt(true); panRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; setSelId(null); setSelBlockId(null); } }, [pan, dragging, connecting, draggingPill, draggingLine]);
  const handleDotDown = useCallback((e, sysId, cx, cy) => { e.stopPropagation(); e.preventDefault(); const r = svgRef.current.getBoundingClientRect(); setConnecting({ sourceId: sysId, startX: cx, startY: cy, currentX: (e.clientX - r.left - pan.x) / zoom, currentY: (e.clientY - r.top - pan.y) / zoom }); }, [pan, zoom]);
  const handlePillDown = useCallback((e, ifId) => { e.stopPropagation(); setDraggingPill(ifId); setPillDragStart({ x: e.clientX, y: e.clientY, off: pillOffsets[ifId] || { dx: 0, dy: 0 } }); pillDownPos.current = { x: e.clientX, y: e.clientY }; }, [pillOffsets]);
  // Detail view tab management
  const openDetailTab = useCallback((ifaceId) => {
    setDetailTabs(prev => {
      const existing = prev.indexOf(ifaceId);
      if (existing >= 0) { setDetailActiveTab(existing); return prev; }
      const next = [...prev, ifaceId];
      setDetailActiveTab(next.length - 1);
      return next;
    });
    setSelId(ifaceId);
  }, []);
  const closeDetailTab = useCallback((index) => {
    setDetailTabs(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) { setDetailActiveTab(0); setSelId(null); return next; }
      setDetailActiveTab(a => {
        const newA = index < a ? a - 1 : a >= next.length ? next.length - 1 : a;
        setSelId(next[newA] || null);
        return newA;
      });
      return next;
    });
  }, []);
  const pillClickTimer = useRef(null);
  const handlePillClick = useCallback((e, ifId) => {
    const dist = Math.hypot(e.clientX - pillDownPos.current.x, e.clientY - pillDownPos.current.y);
    if (dist > DRAG_THRESHOLD) return;
    if (pillClickTimer.current) { clearTimeout(pillClickTimer.current); pillClickTimer.current = null; }
    pillClickTimer.current = setTimeout(() => { pillClickTimer.current = null; openDetailTab(ifId); setSelBlockId(null); }, DBLCLICK_MS);
  }, [openDetailTab]);
  const handlePillDblClick = useCallback((e, ifId) => {
    e.stopPropagation();
    if (pillClickTimer.current) { clearTimeout(pillClickTimer.current); pillClickTimer.current = null; }
    setEditingIfaceId(ifId);
  }, []);
  const handleRenameIface = useCallback((id, newName) => {
    if (newName.trim()) setIfaces(prev => prev.map(i => i.id === id ? { ...i, name: newName.trim() } : i));
    setEditingIfaceId(null);
  }, []);
  // Handle dragging the vertical middle segment of a connector line
  const handleLineDown = useCallback((e, ifId, currentMidX) => {
    e.stopPropagation();
    setDraggingLine(ifId);
    setLineDragStart({ x: e.clientX, startMidX: currentMidX });
  }, []);

  // Wheel handler ref — always points to latest logic
  const wheelHandlerRef = useRef(null);
  wheelHandlerRef.current = (e) => {
    e.preventDefault();
    const p = panValRef.current;
    const isPinch = e.ctrlKey || e.metaKey;
    if (isPinch) {
      const r = svgRef.current.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      const delta = -e.deltaY * 0.01;
      const z = zoomRef.current;
      const newZoom = Math.max(0.15, Math.min(3, z * (1 + delta)));
      const ratio = newZoom / z;
      setZoom(newZoom);
      setPan({ x: cx - (cx - p.x) * ratio, y: cy - (cy - p.y) * ratio });
    } else {
      setPan({ x: p.x - e.deltaX, y: p.y - e.deltaY });
    }
  };
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e) => wheelHandlerRef.current(e);
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Prevent Safari trackpad pinch gestures on the whole page
  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    document.addEventListener("gesturestart", prevent, { passive: false });
    document.addEventListener("gesturechange", prevent, { passive: false });
    return () => { document.removeEventListener("gesturestart", prevent); document.removeEventListener("gesturechange", prevent); };
  }, []);

  // Close filter dropdown on click outside
  useEffect(() => {
    if (!filterOpen) return;
    const handleClick = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filterOpen]);

  // Close views dropdown on click outside
  useEffect(() => {
    if (!viewsOpen) return;
    const handleClick = (e) => { if (viewsRef.current && !viewsRef.current.contains(e.target)) setViewsOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [viewsOpen]);

  useEffect(() => {
    const onMove = (e) => {
      if (dragging) {
        const dx = (e.clientX - dragRef.current.x) / zoom, dy = (e.clientY - dragRef.current.y) / zoom;
        dragRef.current = { x: e.clientX, y: e.clientY };
        // Accumulate raw delta, snap to grid, compute step delta
        const acc = rawDragAccum.current;
        if (!acc.raw) acc.raw = { dx: 0, dy: 0 };
        if (!acc.lastSnap) acc.lastSnap = { dx: 0, dy: 0 };
        acc.raw.dx += dx; acc.raw.dy += dy;
        const snappedDx = snapToGrid(acc.raw.dx);
        const snappedDy = snapToGrid(acc.raw.dy);
        const stepDx = snappedDx - acc.lastSnap.dx;
        const stepDy = snappedDy - acc.lastSnap.dy;
        if (stepDx !== 0 || stepDy !== 0) {
          acc.lastSnap = { dx: snappedDx, dy: snappedDy };
          const desc = getDescendantIds(hierarchy, dragging);
          setDragOffsets(prev => {
            const n = { ...prev };
            for (const m of [dragging, ...desc]) { const o = n[m] || { dx: 0, dy: 0 }; n[m] = { dx: o.dx + stepDx, dy: o.dy + stepDy }; }
            return n;
          });
        }
      }
      if (draggingPill && pillDragStart) {
        const dx = (e.clientX - pillDragStart.x) / zoom, dy = (e.clientY - pillDragStart.y) / zoom;
        const sdx = Math.round((pillDragStart.off.dx + dx) / GRID) * GRID;
        const sdy = Math.round((pillDragStart.off.dy + dy) / GRID) * GRID;
        setPillOffsets(prev => ({ ...prev, [draggingPill]: { dx: sdx, dy: sdy } }));
      }
      if (draggingLine && lineDragStart) {
        const dx = (e.clientX - lineDragStart.x) / zoom;
        const newMidX = snapToGrid(lineDragStart.startMidX + dx);
        setLineOffsets(prev => ({ ...prev, [draggingLine]: newMidX }));
      }
      if (draggingDot) {
        const r = svgRef.current.getBoundingClientRect();
        const mx = (e.clientX - r.left - pan.x) / zoom, my = (e.clientY - r.top - pan.y) / zoom;
        const block = visible[draggingDot.blockId];
        if (block) {
          const allDots = getDots(block);
          let nearest = null, minDist = Infinity;
          for (const dot of allDots) { const dist = Math.hypot(dot.cx - mx, dot.cy - my); if (dist < minDist) { minDist = dist; nearest = dot; } }
          if (nearest) setDraggingDot(prev => ({ ...prev, snapDotId: nearest.id }));
        }
      }
      if (panning) setPan({ x: panRef.current.px + e.clientX - panRef.current.x, y: panRef.current.py + e.clientY - panRef.current.y });
      if (connecting) { const r = svgRef.current.getBoundingClientRect(); setConnecting(p => ({ ...p, currentX: (e.clientX - r.left - pan.x) / zoom, currentY: (e.clientY - r.top - pan.y) / zoom })); }
    };
    const onUp = (e) => {
      if (draggingDot) {
        const key = `${draggingDot.ifaceId}_${draggingDot.role}`;
        setDotOverrides(prev => ({ ...prev, [key]: draggingDot.snapDotId }));
        setDraggingDot(null);
      }
      if (connecting) {
        const r = svgRef.current.getBoundingClientRect(); const mx = (e.clientX - r.left - pan.x) / zoom, my = (e.clientY - r.top - pan.y) / zoom;
        let tid = null;
        for (const [id, sys] of Object.entries(visible)) { if (id === connecting.sourceId) continue; if (mx >= sys.x && mx <= sys.x + sys.w && my >= sys.y && my <= sys.y + sys.h) if (!tid || sys.w * sys.h < visible[tid].w * visible[tid].h) tid = id; }
        if (tid) {
          const srcId = connecting.sourceId;
          let nid;
          setIfaces(p => {
            const mx2 = Math.max(0, ...p.map(i => parseInt(i.id.split("-")[1]) || 0));
            nid = `INT-${mx2 + 1}`;
            const now = new Date().toISOString().split("T")[0];
            return [...p, {
              id: nid, source: srcId, target: tid,
              name: nid, desc: "", interfaceType: "",
              requirements: [], verificationStatus: "unknown",
              maturityLevel: "", owner: "", team: "",
              progress: 0, dateCreated: now, dateLastUpdated: now
            }];
          });
          setTimeout(() => {
            if (nid) openDetailTab(nid);
            setSbExp(p => { const n = new Set(p); n.add(srcId); n.add(tid); return n; });
          }, 0);
        }
        setConnecting(null);
      }
      if (dragging) { rawDragAccum.current = {}; if (activeViewId) setViewModified(true); }
      if (draggingPill && activeViewId) setViewModified(true);
      if (draggingLine && activeViewId) setViewModified(true);
      if (draggingDot && activeViewId) setViewModified(true);
      setDragging(null); setPanSt(false); setDraggingPill(null); setPillDragStart(null); setDraggingLine(null); setLineDragStart(null);
    };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, panning, connecting, draggingPill, pillDragStart, draggingDot, draggingLine, lineDragStart, zoom, pan, visible, activeViewId]);

  const handleCreate = (src, tgt, name, desc, requirements) => {
    const mx = Math.max(0, ...ifaces.map(i => parseInt(i.id.split("-")[1]) || 0));
    const nid = `INT-${mx + 1}`;
    const now = new Date().toISOString().split("T")[0];
    const reqs = (requirements || []).map(rId => ({ id: rId, tests: [] }));
    setIfaces(p => [...p, { id: nid, source: src, target: tgt, name, desc: desc || "", interfaceType: "", requirements: reqs, verificationStatus: "unknown", maturityLevel: "concept", owner: "", team: "", progress: 0, dateCreated: now, dateLastUpdated: now }]);
    setModal(null); setSelId(nid);
    // Auto expand sidebar for new interface
    setSbExp(p => { const n = new Set(p); n.add(src); n.add(tgt); getAncestorIds(src, parentMap).forEach(a => n.add(a)); getAncestorIds(tgt, parentMap).forEach(a => n.add(a)); return n; });
  };

  const [editingItemId, setEditingItemId] = useState(null);
  const handleAddItem = useCallback(() => {
    const id = `sys-${Date.now()}-${++_itemCounter}`;
    setHierarchy(prev => [{ id, name: "New item", reqs: 0, color: COLORS.gray, children: [] }, ...prev]);
    setEditingItemId(id);
  }, []);
  const handleRenameItem = useCallback((id, newName) => {
    setHierarchy(prev => {
      const rename = (nodes) => nodes.map(n => n.id === id ? { ...n, name: newName } : n.children ? { ...n, children: rename(n.children) } : n);
      return rename(prev);
    });
    setEditingItemId(null);
  }, []);

  const wbOpenTab = useCallback((type, id, parentIfaceId) => {
    setWorkbenchOpen(true);
    setWbTabs(prev => {
      const existing = prev.findIndex(t => t.type === type && t.id === id);
      if (existing >= 0) { setWbActiveTab(existing); return prev; }
      if (type === "interface") {
        // Replace existing interface tab instead of adding a new one
        const ifaceIdx = prev.findIndex(t => t.type === "interface");
        if (ifaceIdx >= 0) {
          const next = [...prev];
          next[ifaceIdx] = { type, id, parentIfaceId };
          setWbActiveTab(ifaceIdx);
          return next;
        }
      }
      const next = [...prev, { type, id, parentIfaceId }];
      setWbActiveTab(next.length - 1);
      return next;
    });
    if (type === "interface") setSelId(id);
  }, []);
  const wbCloseTab = useCallback((idx) => {
    setWbTabs(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) { setWbActiveTab(0); setWorkbenchOpen(false); setSelId(null); return next; }
      setWbActiveTab(a => a >= next.length ? next.length - 1 : a > idx ? a - 1 : a === idx ? Math.min(idx, next.length - 1) : a);
      return next;
    });
  }, []);
  const wbCloseAll = useCallback(() => { setWorkbenchOpen(false); setWbTabs([]); setWbActiveTab(0); setSelId(null); }, []);

  const togSb = useCallback((id) => { setSbExp(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }, []);
  const togSbIface = useCallback((key) => { setSbIfaceExp(p => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n; }); }, []);
  const handleSaveView = useCallback((name) => {
    const id = "view-" + Date.now();
    const snapshot = {
      id, name,
      dragOffsets: { ...dragOffsetsRef.current },
      pillOffsets: { ...pillOffsetsRef.current },
      lineOffsets: { ...lineOffsetsRef.current },
      dotOverrides: { ...dotOverridesRef.current },
      pan: { ...panValRef.current },
      zoom: zoomRef.current,
      expanded: [...expandedRef.current],
      focusId: focusIdRef.current,
      revealed: [...(focusIdRef.current ? revealed : [])],
      typeFilter: [...typeFilter],
      createdAt: Date.now(),
    };
    setSavedViews(prev => [...prev, snapshot]);
    setActiveViewId(id);
    setViewModified(false);
  }, [revealed, typeFilter]);

  const handleLoadView = useCallback((view) => {
    setDragOffsets(view.dragOffsets || {});
    setPillOffsets(view.pillOffsets || {});
    setLineOffsets(view.lineOffsets || {});
    setDotOverrides(view.dotOverrides || {});
    setPan(view.pan || { x: 0, y: 0 });
    setZoom(view.zoom || 0.6);
    setExpanded(new Set(view.expanded || ["launch-vehicle"]));
    setFocusId(view.focusId || null);
    setRevealed(new Set(view.revealed || []));
    setTypeFilter(new Set(view.typeFilter || []));
    rawDragAccum.current = {};
    setActiveViewId(view.id);
    setViewModified(false);
    initialCentered.current = true;
  }, []);

  const handleUpdateView = useCallback(() => {
    if (!activeViewId) return;
    setSavedViews(prev => prev.map(v => {
      if (v.id !== activeViewId) return v;
      return {
        ...v,
        dragOffsets: { ...dragOffsetsRef.current },
        pillOffsets: { ...pillOffsetsRef.current },
        lineOffsets: { ...lineOffsetsRef.current },
        dotOverrides: { ...dotOverridesRef.current },
        pan: { ...panValRef.current },
        zoom: zoomRef.current,
        expanded: [...expandedRef.current],
        focusId: focusIdRef.current,
        revealed: [...(focusIdRef.current ? revealed : [])],
        typeFilter: [...typeFilter],
      };
    }));
    setViewModified(false);
  }, [activeViewId, revealed, typeFilter]);

  const handleDeleteView = useCallback((viewId) => {
    setSavedViews(prev => prev.filter(v => v.id !== viewId));
    if (activeViewId === viewId) { setActiveViewId(null); setViewModified(false); }
  }, [activeViewId]);

  const focusSys = useCallback((id) => {
    const currentKey = focusIdRef.current || "__all__";
    setViewStates(prev => ({ ...prev, [currentKey]: { dragOffsets: dragOffsetsRef.current, pillOffsets: pillOffsetsRef.current, dotOverrides: dotOverridesRef.current, lineOffsets: lineOffsetsRef.current } }));
    const targetKey = id || "__all__";
    const saved = viewStatesRef.current[targetKey];
    setDragOffsets(saved ? saved.dragOffsets : {});
    setPillOffsets(saved ? saved.pillOffsets : {});
    setDotOverrides(saved ? saved.dotOverrides || {} : {});
    setLineOffsets(saved ? saved.lineOffsets || {} : {});
    if (id) {
      setExpanded(prev => {
        const n = new Set(prev);
        n.add(id);
        getAncestorIds(id, parentMap).forEach(a => n.add(a));
        return n;
      });
    }
    setFocusId(id); setRevealed(new Set());
    setCenterTrigger(c => c + 1);
  }, [parentMap]);

  const panAnimRef = useRef(null);
  const panToBlock = useCallback((id) => {
    const block = visible[id];
    if (!block) return;
    const z = zoomRef.current;
    const cur = panValRef.current;
    const cx = block.x + block.w / 2;
    const cy = block.y + block.h / 2;
    const screenX = cx * z + cur.x;
    const screenY = cy * z + cur.y;
    const margin = 80;
    const inView = screenX > margin && screenX < viewSize.w - margin
               && screenY > margin && screenY < viewSize.h - margin;
    if (inView) return;
    const targetPan = { x: viewSize.w / 2 - cx * z, y: viewSize.h / 2 - cy * z };
    const startPan = { ...cur };
    const start = performance.now();
    const duration = 300;
    if (panAnimRef.current) cancelAnimationFrame(panAnimRef.current);
    const animate = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const p = { x: startPan.x + (targetPan.x - startPan.x) * ease, y: startPan.y + (targetPan.y - startPan.y) * ease };
      setPan(p);
      if (t < 1) panAnimRef.current = requestAnimationFrame(animate);
      else panAnimRef.current = null;
    };
    panAnimRef.current = requestAnimationFrame(animate);
  }, [visible, viewSize]);

  const containers = Object.values(visible).filter(s => s.expanded && s.hasChildren).sort((a, b) => getAncestorIds(a.id, parentMap).length - getAncestorIds(b.id, parentMap).length);
  const leaves = Object.values(visible).filter(s => !(s.expanded && s.hasChildren));
  const leafRects = useMemo(() => leaves.map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h })), [leaves]);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", margin: 0, padding: 0, fontFamily: "'AktivGrotesk','DM Sans',sans-serif", background: "#f1f5f9", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <Sidebar
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          sidebarWidth={sidebarWidth}
          hierarchy={hierarchy}
          ifaces={ifaces}
          selId={selId}
          selBlockId={selBlockId}
          hovId={hovId}
          onSel={id => { openDetailTab(id); setSelBlockId(null); }}
          onSelBlock={id => { setSelBlockId(prev => { const next = prev === id ? null : id; if (next) panToBlock(next); return next; }); setSelId(null); }}
          onHov={setHovId}
          sbExp={sbExp}
          togSb={togSb}
          focusSys={focusSys}
          hovSys={hovSys}
          setHovSys={setHovSys}
          onQuickAdd={sysId => setModal({ mode: "quick", sourceId: sysId })}
          allRequirements={allRequirements}
          sbIfaceExp={sbIfaceExp}
          togSbIface={togSbIface}
          setModal={setModal}
          resizingRef={resizingRef}
          focusId={focusId}
          breadcrumb={breadcrumb}
          onAddItem={handleAddItem}
          editingItemId={editingItemId}
          onRenameItem={handleRenameItem}
        />
        {!sidebarCollapsed && <ResizeHandle onMouseDown={e => startResize("sidebar", sidebarWidth, e)} zIndex={20} />}
        {/* Workbench Panel — left of canvas */}
        {workbenchOpen && <Workbench
          tabs={wbTabs} activeTab={wbActiveTab} onSetActive={(i) => { setWbActiveTab(i); const t = wbTabs[i]; if (t?.type === "interface") setSelId(t.id); else setSelId(null); }} onCloseTab={wbCloseTab} onCloseAll={wbCloseAll}
          onOpenReqTab={(reqId, parentIfaceId) => wbOpenTab("requirement", reqId, parentIfaceId)}
          ifaces={ifaces} allSystems={positioned} allRequirements={allRequirements}
          onDrop={(data) => {
            if (data.type === "interface") {
              setWbTabs(prev => {
                const existing = prev.findIndex(t => t.type === "interface" && t.id === data.id);
                if (existing >= 0) { setWbActiveTab(existing); return prev; }
                const next = [...prev, { type: "interface", id: data.id }];
                setWbActiveTab(next.length - 1);
                return next;
              });
              setSelId(data.id);
              return;
            }
            const current = wbTabs[wbActiveTab];
            if (current?.type === "interface" && data.type === "requirement") {
              setIfaces(prev => prev.map(i => {
                if (i.id !== current.id) return i;
                if (i.requirements.some(r => r.id === data.id)) return i;
                return { ...i, requirements: [...i.requirements, { id: data.id, tests: [] }], dateLastUpdated: new Date().toISOString().split("T")[0] };
              }));
            }
          }}
          tabDragOver={tabDragOver} setTabDragOver={setTabDragOver}
          width={workbenchWidth}
        />}
        {workbenchOpen && <ResizeHandle onMouseDown={e => startResize("workbench", workbenchWidth, e)} />}
        {!workbenchOpen && <div
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setTabDragOver(true); }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setTabDragOver(false); }}
          onDrop={e => { e.preventDefault(); setTabDragOver(false); const raw = e.dataTransfer.getData("application/json"); if (!raw) return; try { const data = JSON.parse(raw); if (data.type === "interface") { setWorkbenchOpen(true); setWbTabs(prev => { const existing = prev.findIndex(t => t.type === "interface" && t.id === data.id); if (existing >= 0) { setWbActiveTab(existing); return prev; } const next = [...prev, { type: "interface", id: data.id }]; setWbActiveTab(next.length - 1); return next; }); setSelId(data.id); } } catch {} }}
          style={{ width: tabDragOver ? 40 : 6, background: tabDragOver ? "#dbeafe" : "transparent", borderRight: tabDragOver ? "2px dashed #3b82f6" : "none", transition: "all 0.15s", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "default", marginLeft: tabDragOver ? 0 : -3, marginRight: tabDragOver ? 0 : -3, position: "relative", zIndex: 15 }}>
          {tabDragOver && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
        </div>}
        {/* Center area: toggle + canvas/table */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", background: "#F7F7F7" }}>
          <div style={{ width: detailTabs.length > 0 ? Math.max(330, detailWidth) : 0, flexShrink: 0, overflow: "hidden", transition: "width 0.25s ease", display: "flex" }}>
            {detailTabs.length > 0 && <DetailView
              tabs={detailTabs}
              activeTab={detailActiveTab}
              onSetActive={(i) => { setDetailActiveTab(i); setSelId(detailTabs[i]); }}
              onCloseTab={closeDetailTab}
              ifaces={ifaces}
              allSystems={positioned}
              allRequirements={allRequirements}
              width={detailWidth}
            />}
          </div>
          {detailTabs.length > 0 && <ResizeHandle onMouseDown={e => startResize("detail", detailWidth, e)} />}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#F7F7F7", flexShrink: 0 }}>
            {sidebarCollapsed && <div onClick={() => setSidebarCollapsed(false)} style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#151414", flexShrink: 0 }} title="Expand sidebar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5.08789 8.728C5.08789 7.77365 5.86154 7 6.81589 7H17.1839C18.1382 7 18.9119 7.77365 18.9119 8.728V14.776C18.9119 15.7303 18.1382 16.504 17.1839 16.504H6.81589C5.86154 16.504 5.08789 15.7303 5.08789 14.776V8.728Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/><path d="M8.5 8H7C6.44772 8 6 8.44772 6 9V14.5C6 15.0523 6.44772 15.5 7 15.5H8.5C9.05228 15.5 9.5 15.0523 9.5 14.5V9C9.5 8.44772 9.05228 8 8.5 8Z" fill="currentColor" fillOpacity="0.7"/></svg>
            </div>}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#E4E4E4", borderRadius: 6 }}>
              <button onClick={() => setViewMode("architecture")} style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 4, paddingRight: 10, paddingTop: 2, paddingBottom: 2, borderRadius: 6, border: "none", boxShadow: viewMode === "architecture" ? "inset 0 0 0 1px #E4E4E4" : "none", fontSize: 12, fontWeight: 500, cursor: "pointer", background: viewMode === "architecture" ? "#fff" : "transparent", color: viewMode === "architecture" ? "#000" : "rgba(0,0,0,0.9)", transition: "all 0.15s" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M8.54375 12.0005C8.54375 12.6367 8.02798 13.1525 7.39175 13.1525C6.75551 13.1525 6.23975 12.6367 6.23975 12.0005C6.23975 11.3642 6.75551 10.8485 7.39175 10.8485C8.02798 10.8485 8.54375 11.3642 8.54375 12.0005ZM8.54375 12.0005H15.4557M15.4557 12.0005C15.4557 12.6367 15.9715 13.1525 16.6077 13.1525C17.244 13.1525 17.7597 12.6367 17.7597 12.0005C17.7597 11.3642 17.244 10.8485 16.6077 10.8485C15.9715 10.8485 15.4557 11.3642 15.4557 12.0005ZM15.4557 7.39248C15.4557 8.02871 15.9715 8.54448 16.6077 8.54448C17.244 8.54448 17.7597 8.02871 17.7597 7.39248C17.7597 6.75625 17.244 6.24048 16.6077 6.24048C15.9715 6.24048 15.4557 6.75625 15.4557 7.39248ZM15.4557 7.39248H12.1437C11.8256 7.39248 11.5677 7.65036 11.5677 7.96848V16.0325C11.5677 16.3506 11.8256 16.6085 12.1437 16.6085H15.4557M15.4557 16.6085C15.4557 17.2447 15.9715 17.7605 16.6077 17.7605C17.244 17.7605 17.7597 17.2447 17.7597 16.6085C17.7597 15.9722 17.244 15.4565 16.6077 15.4565C15.9715 15.4565 15.4557 15.9722 15.4557 16.6085Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                Architecture
              </button>
              <button onClick={() => setViewMode("table")} style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 4, paddingRight: 10, paddingTop: 2, paddingBottom: 2, borderRadius: 6, border: "none", boxShadow: viewMode === "table" ? "inset 0 0 0 1px #E4E4E4" : "none", fontSize: 12, fontWeight: 500, cursor: "pointer", background: viewMode === "table" ? "#fff" : "transparent", color: viewMode === "table" ? "#000" : "rgba(0,0,0,0.9)", transition: "all 0.15s" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M10.7997 6.24048C10.7997 5.90911 10.5311 5.64048 10.1997 5.64048C9.86838 5.64048 9.59975 5.90911 9.59975 6.24048H10.1997H10.7997ZM9.59975 17.7605C9.59975 18.0918 9.86838 18.3605 10.1997 18.3605C10.5311 18.3605 10.7997 18.0918 10.7997 17.7605H10.1997H9.59975ZM8.39975 6.24048V6.84048H15.5997V6.24048V5.64048H8.39975V6.24048ZM17.7597 8.40048H17.1597V15.6005H17.7597H18.3597V8.40048H17.7597ZM15.5997 17.7605V17.1605H8.39975V17.7605V18.3605H15.5997V17.7605ZM6.23975 15.6005H6.83975V8.40048H6.23975H5.63975V15.6005H6.23975ZM8.39975 17.7605V17.1605C7.53818 17.1605 6.83975 16.462 6.83975 15.6005H6.23975H5.63975C5.63975 17.1248 6.87544 18.3605 8.39975 18.3605V17.7605ZM17.7597 15.6005H17.1597C17.1597 16.462 16.4613 17.1605 15.5997 17.1605V17.7605V18.3605C17.1241 18.3605 18.3597 17.1248 18.3597 15.6005H17.7597ZM15.5997 6.24048V6.84048C16.4613 6.84048 17.1597 7.53891 17.1597 8.40048H17.7597H18.3597C18.3597 6.87617 17.1241 5.64048 15.5997 5.64048V6.24048ZM8.39975 6.24048V5.64048C6.87544 5.64048 5.63975 6.87617 5.63975 8.40048H6.23975H6.83975C6.83975 7.53891 7.53818 6.84048 8.39975 6.84048V6.24048ZM10.1997 6.24048H9.59975V17.7605H10.1997H10.7997V6.24048H10.1997ZM6.59975 10.2005V10.8005H17.3997V10.2005V9.60048H6.59975V10.2005Z" fill="currentColor"/></svg>
                Table
              </button>
            </div>
            {focusId && <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500, paddingLeft: 12 }}>(focused)</span>}
            <div style={{ flex: 1 }} />
            {chatCollapsed && <div onClick={() => setChatCollapsed(false)} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", flexShrink: 0, background: "#2709dc", borderRadius: 6, padding: "2px 10px 2px 4px" }} title="Expand AI chat">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M11.3348 6.70351C11.5634 6.08581 12.4371 6.08581 12.6656 6.70351L13.8033 9.77799C13.8752 9.97219 14.0283 10.1253 14.2225 10.1972L17.297 11.3348C17.9147 11.5634 17.9147 12.4371 17.297 12.6656L14.2225 13.8033C14.0283 13.8752 13.8752 14.0283 13.8033 14.2225L12.6656 17.297C12.4371 17.9147 11.5634 17.9147 11.3348 17.297L10.1972 14.2225C10.1253 14.0283 9.97219 13.8752 9.77799 13.8033L6.70351 12.6656C6.08581 12.4371 6.08581 11.5634 6.70351 11.3348L9.77799 10.1972C9.97219 10.1253 10.1253 9.97219 10.1972 9.77799L11.3348 6.70351Z" stroke="#ffffff" strokeWidth="1.2" strokeLinejoin="round"/></svg>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#ffffff", fontFamily: "'AktivGrotesk','DM Sans',sans-serif", whiteSpace: "nowrap" }}>Flow Agent</span>
            </div>}
          </div>
          {viewMode === "table" && <div style={{ flex: 1, overflow: "auto" }}><TableView ifaces={ifaces} allSystems={positioned} allRequirements={allRequirements} /></div>}
          <div ref={canvasRef} style={{ flex: 1, touchAction: "none", display: viewMode === "architecture" ? undefined : "none" }}>
            <div style={{ position: "relative", width: "100%", height: "100%", borderTopLeftRadius: detailTabs.length > 0 ? 0 : 12, borderTopRightRadius: !chatCollapsed ? 12 : 0, overflow: "hidden", background: detailTabs.length > 0 ? "#fbfbfb" : "#ffffff", border: "none", borderTop: "1px solid #e4e4e4", borderLeft: detailTabs.length > 0 ? "none" : "1px solid #e4e4e4", borderRight: !chatCollapsed ? "1px solid #e4e4e4" : "none" }}>
          <div style={{ position: "absolute", bottom: 16, right: 16, zIndex: 10, display: "flex", alignItems: "center", gap: 2, background: "#fff", borderRadius: 7, boxShadow: "0 1px 6px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" }}>
            <button onClick={() => { const r = svgRef.current.getBoundingClientRect(); const cx = r.width / 2, cy = r.height / 2; const nz = Math.min(3, zoom + 0.15); const ratio = nz / zoom; setPan({ x: cx - (cx - pan.x) * ratio, y: cy - (cy - pan.y) * ratio }); setZoom(nz); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 15, color: "#475569" }}>+</button>
            <div style={{ width: 1, height: 18, background: "#e2e8f0" }} />
            <span style={{ padding: "0 6px", fontSize: 10.5, color: "#94a3b8", fontWeight: 500, minWidth: 32, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
            <div style={{ width: 1, height: 18, background: "#e2e8f0" }} />
            <button onClick={() => { const r = svgRef.current.getBoundingClientRect(); const cx = r.width / 2, cy = r.height / 2; const nz = Math.max(0.15, zoom - 0.15); const ratio = nz / zoom; setPan({ x: cx - (cx - pan.x) * ratio, y: cy - (cy - pan.y) * ratio }); setZoom(nz); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 15, color: "#475569" }}>−</button>
          </div>
          <div style={{ position: "absolute", top: 0, right: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, padding: "12px 10px" }}>
            {typeFilter.size > 0 && [...typeFilter].map(t => {
              const dotColor = { Signal: "#ec4899", Mechanical: "#22c55e", Electrical: "#f59e0b" }[t];
              return <span key={t} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: "#fff", border: "1px solid #e2e8f0", fontSize: 11, fontWeight: 600, color: "#475569", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                {t}
              </span>;
            })}
            <div ref={filterRef} style={{ position: "relative" }}>
              <button onClick={() => setFilterOpen(f => !f)} style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 4, paddingRight: 10, paddingTop: 2, paddingBottom: 2, borderRadius: 6, border: "none", boxShadow: `inset 0 0 0 1px ${typeFilter.size > 0 ? "#2563eb" : "#e4e4e4"}`, background: typeFilter.size > 0 ? "#eff6ff" : "#fff", fontSize: 12, fontWeight: 500, color: typeFilter.size > 0 ? "#2563eb" : "#000", cursor: "pointer" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M8.67663 12H15.3228M7.19971 9H16.7997M10.892 15H13.1074" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Filter
              </button>
              {filterOpen && <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.10)", padding: "8px 0", minWidth: 180, zIndex: 20 }}>
                <div style={{ padding: "4px 14px 8px", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Interface Type</div>
                {["Signal", "Mechanical", "Electrical"].map(t => {
                  const active = typeFilter.has(t);
                  const cfg = { Signal: { bg: "#fce7f3", color: "#9d174d", dot: "#ec4899" }, Mechanical: { bg: "#dcfce7", color: "#166534", dot: "#22c55e" }, Electrical: { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" } };
                  const c = cfg[t];
                  return <button key={t} onClick={() => { setTypeFilter(prev => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n; }); setActiveViewId(null); setViewModified(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 14px", border: "none", background: active ? "#f8fafc" : "transparent", cursor: "pointer", fontSize: 12.5, fontWeight: 500, color: "#334155", textAlign: "left" }} onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = active ? "#f8fafc" : "transparent"}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, border: active ? "none" : "1.5px solid #cbd5e1", background: active ? "#2563eb" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {active && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </span>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: c.dot, flexShrink: 0 }} />
                    <span>{t}</span>
                  </button>;
                })}
                {typeFilter.size > 0 && <>
                  <div style={{ height: 1, background: "#e2e8f0", margin: "4px 0" }} />
                  <button onClick={() => { setTypeFilter(new Set()); setActiveViewId(null); setViewModified(false); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "7px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#64748b" }} onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    Clear filter
                  </button>
                </>}
              </div>}
            </div>
            <div ref={viewsRef} style={{ position: "relative" }}>
              <button onClick={() => { setViewsOpen(v => !v); setSaveViewModal(false); }} onMouseEnter={() => setViewsBtnHov(true)} onMouseLeave={() => setViewsBtnHov(false)} style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 4, paddingRight: 10, paddingTop: 2, paddingBottom: 2, borderRadius: 6, border: "none", boxShadow: `inset 0 0 0 1px ${activeViewId ? "#2563eb" : "#e4e4e4"}`, background: activeViewId ? "#eff6ff" : "#fff", fontSize: 12, fontWeight: 500, color: activeViewId ? "#2563eb" : "#000", cursor: "pointer" }}>
                {activeViewId && viewModified && <span style={{ width: 6, height: 6, borderRadius: 3, background: "#2563eb", flexShrink: 0 }} />}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M16.2001 6.6001C16.8628 6.6001 17.4001 7.13 17.4001 7.78366L17.4001 9.80405C17.4001 10.4577 16.8628 10.9876 16.2001 10.9876H14.4001C13.7374 10.9876 13.2001 10.4577 13.2001 9.80405L13.2001 7.78366C13.2001 7.13 13.7374 6.6001 14.4001 6.6001L16.2001 6.6001Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M7.8001 6.6001C7.13736 6.6001 6.6001 7.13 6.6001 7.78366L6.6001 9.80405C6.6001 10.4577 7.13736 10.9876 7.8001 10.9876H9.6001C10.2628 10.9876 10.8001 10.4577 10.8001 9.80405L10.8001 7.78366C10.8001 7.13 10.2628 6.6001 9.6001 6.6001L7.8001 6.6001Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16.2001 13.0126C16.8628 13.0126 17.4001 13.5425 17.4001 14.1962V16.2165C17.4001 16.8702 16.8628 17.4001 16.2001 17.4001H14.4001C13.7374 17.4001 13.2001 16.8702 13.2001 16.2165L13.2001 14.1962C13.2001 13.5425 13.7374 13.0126 14.4001 13.0126H16.2001Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M7.8001 13.0126C7.13736 13.0126 6.6001 13.5425 6.6001 14.1962L6.6001 16.2165C6.6001 16.8702 7.13736 17.4001 7.8001 17.4001H9.6001C10.2628 17.4001 10.8001 16.8702 10.8001 16.2165L10.8001 14.1962C10.8001 13.5425 10.2628 13.0126 9.6001 13.0126H7.8001Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Views
                {activeViewId && viewModified && viewsBtnHov && <span onClick={e => { e.stopPropagation(); handleUpdateView(); }} title="Save changes to view" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 4, background: "#dbeafe", cursor: "pointer", flexShrink: 0, marginLeft: -2 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                </span>}
              </button>
              {viewsOpen && <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.10)", padding: "8px 0", minWidth: 220, zIndex: 20 }}>
                {!saveViewModal ? <>
                  <button onClick={() => { setSaveViewModal(true); setSaveViewName(""); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#2563eb", textAlign: "left" }} onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Save current view
                  </button>
                  {savedViews.length > 0 && <>
                    <div style={{ height: 1, background: "#e2e8f0", margin: "4px 0" }} />
                    <div style={{ padding: "4px 14px 6px", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>My Views</div>
                    {savedViews.map(v => <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 6px 0 0" }}>
                      <button onClick={() => { handleLoadView(v); setViewsOpen(false); }} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "7px 8px 7px 14px", border: "none", background: activeViewId === v.id ? "#eff6ff" : "transparent", cursor: "pointer", fontSize: 12.5, fontWeight: 500, color: activeViewId === v.id ? "#2563eb" : "#334155", textAlign: "left", borderRadius: 0 }} onMouseEnter={e => { if (activeViewId !== v.id) e.currentTarget.style.background = "#f1f5f9"; }} onMouseLeave={e => { if (activeViewId !== v.id) e.currentTarget.style.background = "transparent"; }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill={activeViewId === v.id ? "#2563eb" : "none"} stroke={activeViewId === v.id ? "#2563eb" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</span>
                        {v.typeFilter?.length > 0 && <span style={{ fontSize: 9, fontWeight: 600, color: "#94a3b8", background: "#f1f5f9", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>F</span>}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteView(v.id); }} style={{ width: 24, height: 24, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#cbd5e1", borderRadius: 4, flexShrink: 0 }} onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "#fef2f2"; }} onMouseLeave={e => { e.currentTarget.style.color = "#cbd5e1"; e.currentTarget.style.background = "transparent"; }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>)}
                  </>}
                  {activeViewId && <>
                    <div style={{ height: 1, background: "#e2e8f0", margin: "4px 0" }} />
                    <button onClick={() => { setActiveViewId(null); setViewModified(false); setDragOffsets({}); setPillOffsets({}); setLineOffsets({}); setDotOverrides({}); setTypeFilter(new Set()); setFocusId(null); setRevealed(new Set()); setExpanded(new Set(["launch-vehicle"])); rawDragAccum.current = {}; setCenterTrigger(c => c + 1); setViewsOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "7px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#64748b" }} onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      Deselect view
                    </button>
                  </>}
                </> : <div style={{ padding: "8px 14px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Save current view</div>
                  <input autoFocus value={saveViewName} onChange={e => setSaveViewName(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && saveViewName.trim()) { handleSaveView(saveViewName.trim()); setSaveViewModal(false); setViewsOpen(false); } if (e.key === "Escape") setSaveViewModal(false); }} placeholder="View name..." style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} onFocus={e => e.currentTarget.style.borderColor = "#2563eb"} onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"} />
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button onClick={() => setSaveViewModal(false)} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 500, color: "#64748b", cursor: "pointer" }}>Cancel</button>
                    <button disabled={!saveViewName.trim()} onClick={() => { handleSaveView(saveViewName.trim()); setSaveViewModal(false); setViewsOpen(false); }} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", background: saveViewName.trim() ? "#2563eb" : "#94a3b8", fontSize: 12, fontWeight: 600, color: "#fff", cursor: saveViewName.trim() ? "pointer" : "default", opacity: saveViewName.trim() ? 1 : 0.6 }}>Save</button>
                  </div>
                </div>}
              </div>}
            </div>
            <button onClick={() => { setDragOffsets({}); setPillOffsets({}); setLineOffsets({}); setDotOverrides({}); rawDragAccum.current = {}; setCenterTrigger(c => c + 1); setActiveViewId(null); }} style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 4, paddingRight: 10, paddingTop: 2, paddingBottom: 2, borderRadius: 6, border: "none", boxShadow: "inset 0 0 0 1px #e4e4e4", background: "#fff", fontSize: 12, fontWeight: 500, color: "#000", cursor: "pointer" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M10.0797 6.24048H7.51975C6.81282 6.24048 6.23975 6.81355 6.23975 7.52048V10.0805M10.0797 17.7605H7.51975C6.81282 17.7605 6.23975 17.1874 6.23975 16.4805V13.9205M13.9197 6.24048H16.4797C17.1867 6.24048 17.7597 6.81355 17.7597 7.52048V10.0805M17.7597 13.9205V16.4805C17.7597 17.1874 17.1867 17.7605 16.4797 17.7605H13.9197" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>Clean</button>
          </div>
          <MiniMap blocks={visible} pan={pan} zoom={zoom} vw={viewSize.w} vh={viewSize.h} />

          <svg ref={svgRef} width="100%" height="100%" onMouseDown={handleCanvasDown} style={{ background: "#ffffff", cursor: panning ? "grabbing" : connecting ? "crosshair" : "default" }}>
            <defs>
              <filter id="bs" x="-4%" y="-4%" width="108%" height="116%"><feDropShadow dx="0" dy="1" stdDeviation="2.5" floodOpacity="0.05" /></filter>
              <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x},${pan.y}) scale(${zoom})`}><circle cx={GRID / 2} cy={GRID / 2} r="1.2" fill="#8a8a8a" opacity="0.6" /></pattern>
            </defs>
            <rect width="100%" height="100%" fill="#ffffff" /><rect width="100%" height="100%" fill="url(#grid)" />
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {containers.map(sys => { const isSB = selBlockId === sys.id; const allD = getDots(sys); const cD = connDots[sys.id] || []; const cIds = new Set(cD.map(d => d.id)); return <g key={sys.id} onMouseDown={e => handleBlockDown(e, sys.id)} onClick={e => handleBlockClick(e, sys.id)} onMouseEnter={() => setHovBlock(sys.id)} onMouseLeave={() => { setHovBlock(null); setHovCursor(null); }} onMouseMove={e => { if (!connecting && !draggingDot) { const r = svgRef.current.getBoundingClientRect(); setHovCursor({ x: (e.clientX - r.left - pan.x) / zoom, y: (e.clientY - r.top - pan.y) / zoom }); } }} style={{ cursor: "grab", opacity: selId && !relIds.includes(sys.id) ? 0.5 : 1, transition: "opacity 0.15s" }}>
                <rect x={sys.x} y={sys.y} width={sys.w} height={sys.h} rx={12} fill={relIds.includes(sys.id) || isSB ? "rgba(39,9,220,0.05)" : "rgba(249,115,22,0.05)"} stroke={relIds.includes(sys.id) || isSB ? "#2709dc" : "#F97316"} strokeWidth={1.5} />
                <CubeIcon x={sys.x + 6} y={sys.y + 6} size={24} color="#FF7701" />
                <text x={sys.x + 30} y={sys.y + 24} fontSize={12} fontFamily="'AktivGrotesk','DM Sans',sans-serif" fontWeight={500} fill="#000">{sys.name}</text>
                {cD.map((d, i) => <circle key={"cd" + i} cx={d.cx} cy={d.cy} r={6} fill="#fff" stroke="#c1c1c1" strokeWidth={1.5} style={{ cursor: draggingDot ? "grabbing" : "grab" }} onMouseDown={e => {
                  e.stopPropagation(); e.preventDefault();
                  const ifaceObj = ifaces.find(iface => iface.id === d.ifaceId);
                  if (ifaceObj) setDraggingDot({ ifaceId: d.ifaceId, role: ifaceObj.source === sys.id ? "source" : "target", blockId: sys.id, currentDotId: d.id, snapDotId: d.id });
                }} />)}
                {(connecting || draggingDot) && allD.filter(d => !cIds.has(d.id)).map((d, i) => <circle key={"ad" + i} cx={d.cx} cy={d.cy} r={6} fill="#fff" stroke="#c1c1c1" strokeWidth={1.5} style={{ cursor: "crosshair" }} onMouseDown={e => handleDotDown(e, sys.id, d.cx, d.cy)} />)}
                {!connecting && !draggingDot && hovBlock === sys.id && hovCursor && (() => { const avail = allD.filter(d => !cIds.has(d.id)); if (!avail.length) return null; let best = avail[0], bestD = Infinity; for (const d of avail) { const dist = Math.hypot(d.cx - hovCursor.x, d.cy - hovCursor.y); if (dist < bestD) { bestD = dist; best = d; } } return <circle key="hd-closest" cx={best.cx} cy={best.cy} r={6} fill="#fff" stroke="#c1c1c1" strokeWidth={1.5} style={{ cursor: "crosshair" }} onMouseDown={e => handleDotDown(e, sys.id, best.cx, best.cy)} />; })()}
              </g>; })}

              {ifaces.map(iface => {
                const da = animDots[iface.id]; const pill = pills[iface.id];
                if (!da || !pill) return null;
                if (typeFilter.size > 0 && !typeFilter.has(iface.interfaceType)) return null;
                const pcx = pill.x + pill.w / 2, pcy = pill.y + pill.h / 2;
                const isAct = selId === iface.id || hovId === iface.id || blockRelIfaceIds.has(iface.id);
                const sDotId = da.s.id, tDotId = da.t.id;
                // Source→Pill path: source dot determines exit direction, pill is flexible endpoint
                const sPath = roundPath(smartElbowPath(da.s.cx, da.s.cy, pcx, pcy, sDotId, null, undefined, leafRects));
                // Pill→Target path: pill is flexible start, target dot determines entry direction
                const tPath = roundPath(smartElbowPath(pcx, pcy, da.t.cx, da.t.cy, null, tDotId, undefined, leafRects));
                const dimIface = selId && selId !== iface.id;
                return <g key={iface.id} style={{ opacity: dimIface ? 0.5 : 1, transition: "opacity 0.15s" }}>
                  <path d={sPath} fill="none" stroke="transparent" strokeWidth={14} onMouseDown={e => handlePillDown(e, iface.id)} onClick={e => handlePillClick(e, iface.id)} style={{ cursor: "grab" }} />
                  <path d={tPath} fill="none" stroke="transparent" strokeWidth={14} onMouseDown={e => handlePillDown(e, iface.id)} onClick={e => handlePillClick(e, iface.id)} style={{ cursor: "grab" }} />
                  <path d={sPath} fill="none" stroke={isAct ? "#2709dc" : "#c1c1c1"} strokeWidth={1.5} />
                  <path d={tPath} fill="none" stroke={isAct ? "#2709dc" : "#c1c1c1"} strokeWidth={1.5} />
                  <rect x={pill.x} y={pill.y} width={pill.w} height={pill.h} rx={pill.h / 2} fill="#ffffff" stroke={isAct ? "#2709dc" : "#c1c1c1"} strokeWidth={1.5} style={{ cursor: "grab" }} onMouseDown={e => handlePillDown(e, iface.id)} onClick={e => handlePillClick(e, iface.id)} onDoubleClick={e => handlePillDblClick(e, iface.id)} />
                  {editingIfaceId === iface.id ? (
                    <foreignObject x={pill.x + 4} y={pill.y + 1} width={pill.w - 8} height={pill.h - 2}>
                      <input
                        xmlns="http://www.w3.org/1999/xhtml"
                        autoFocus
                        defaultValue={iface.name}
                        onFocus={e => e.target.select()}
                        onBlur={e => handleRenameIface(iface.id, e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") { e.target.value = iface.name; e.target.blur(); } }}
                        onMouseDown={e => e.stopPropagation()}
                        style={{ width: "100%", height: "100%", border: "none", outline: "none", background: "transparent", textAlign: "center", fontSize: 12, fontFamily: "'AktivGrotesk','DM Sans',sans-serif", fontWeight: 400, color: "#000", padding: 0 }}
                      />
                    </foreignObject>
                  ) : (
                    <text x={pcx} y={pcy + 4.5} textAnchor="middle" fontSize={12} fontFamily="'AktivGrotesk','DM Sans',sans-serif" fontWeight={400} fill="#000" style={{ pointerEvents: "none" }}>{iface.name}</text>
                  )}
                </g>;
              })}

              {(() => {
                const extByBlock = {};
                for (const iface of externalIfaces) {
                  const inId = focusIds?.has(iface.source) ? iface.source : iface.target;
                  if (!extByBlock[inId]) extByBlock[inId] = [];
                  extByBlock[inId].push(iface);
                }
                const fb = focusId && visible[focusId];
                // Closest exit side per internal block
                const blockSide = {};
                for (const [inId, group] of Object.entries(extByBlock)) {
                  const b = visible[inId];
                  if (!b || !fb) { blockSide[inId] = "left"; continue; }
                  const dL = b.x - fb.x;
                  const dR = (fb.x + fb.w) - (b.x + b.w);
                  const dT = b.y - fb.y;
                  const dB = (fb.y + fb.h) - (b.y + b.h);
                  const m = Math.min(dL, dR, dT, dB);
                  blockSide[inId] = m === dR ? "right" : m === dT ? "top" : m === dB ? "bottom" : "left";
                }
                return externalIfaces.map(iface => {
                  if (typeFilter.size > 0 && !typeFilter.has(iface.interfaceType)) return null;
                  const inId = focusIds?.has(iface.source) ? iface.source : iface.target;
                  const outId = inId === iface.source ? iface.target : iface.source;
                  const inB = visible[inId]; if (!inB) return null;
                  const group = extByBlock[inId] || [];
                  const idx = group.indexOf(iface);
                  const side = blockSide[inId] || "left";
                  const extSys = positioned[outId];
                  const extName = extSys?.name || outId;
                  const truncName = extName.length > 14 ? extName.slice(0, 13) + "\u2026" : extName;
                  const boxH = 26, boxW = Math.max(truncName.length * 6.5 + 32, 64);
                  const extColor = extSys?.color || "#94a3b8";
                  const outerGap = 20;
                  let sx, sy, ex, ey, boxX, boxY;
                  if (side === "left") {
                    sy = inB.y + inB.h * 0.3 + idx * 34;
                    sx = inB.x;
                    ex = (fb ? fb.x : sx) - outerGap;
                    ey = sy;
                    boxX = ex - boxW; boxY = sy - boxH / 2;
                  } else if (side === "right") {
                    sy = inB.y + inB.h * 0.3 + idx * 34;
                    sx = inB.x + inB.w;
                    ex = (fb ? fb.x + fb.w : sx) + outerGap;
                    ey = sy;
                    boxX = ex; boxY = sy - boxH / 2;
                  } else if (side === "top") {
                    sx = inB.x + inB.w * 0.3 + idx * (boxW + 10);
                    sy = inB.y;
                    ex = sx;
                    ey = (fb ? fb.y : sy) - outerGap;
                    boxX = sx - boxW / 2; boxY = ey - boxH;
                  } else {
                    sx = inB.x + inB.w * 0.3 + idx * (boxW + 10);
                    sy = inB.y + inB.h;
                    ex = sx;
                    ey = (fb ? fb.y + fb.h : sy) + outerGap;
                    boxX = sx - boxW / 2; boxY = ey;
                  }
                  const isHv = hovStub === iface.id; const isR = revealed.has(outId);
                  const toggleReveal = e => {
                    e.stopPropagation();
                    setRevealed(p => { const n = new Set(p); if (n.has(outId)) n.delete(outId); else n.add(outId); return n; });
                    const ancestors = getAncestorIds(outId, parentMap);
                    if (ancestors.length > 0) {
                      setExpanded(prev => { const n = new Set(prev); ancestors.forEach(a => n.add(a)); return n; });
                    }
                  };
                  return <g key={"ext" + iface.id} onMouseEnter={() => setHovStub(iface.id)} onMouseLeave={() => setHovStub(null)}>
                    <path d={`M${sx},${sy} L${ex},${ey}`} fill="none" stroke="#b0b8c4" strokeWidth={1.5} strokeDasharray="4 3" />
                    <circle cx={sx} cy={sy} r={3.5} fill="#2563eb" stroke="#fff" strokeWidth={1.5} />
                    <rect x={boxX} y={boxY} width={boxW} height={boxH} rx={6} fill={isR ? "#eff6ff" : isHv ? "#f8fafc" : "#fff"} stroke={isR ? "#2563eb" : isHv ? "#93b4f0" : "#e2e8f0"} strokeWidth={isR ? 1.5 : 1} style={{ cursor: "pointer", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.06))" }} onClick={toggleReveal} />
                    <CubeIcon x={boxX + 6} y={boxY + (boxH - 13) / 2} size={13} color="#FF7701" />
                    <text x={boxX + 23} y={boxY + boxH / 2 + 3.5} fontSize={10} fontFamily="'AktivGrotesk','DM Sans',sans-serif" fontWeight={500} fill={isR ? "#2563eb" : "#475569"} style={{ pointerEvents: "none" }}>{truncName}</text>
                  </g>;
                });
              })()}

              {leaves.map(sys => {
                const dim = selId && !relIds.includes(sys.id);
                const isR = relIds.includes(sys.id); const isSB = selBlockId === sys.id; const isC = !sys.expanded && sys.hasChildren;
                const isH = hovBlock === sys.id && !connecting;
                const allD = getDots(sys); const cD = connDots[sys.id] || []; const cIds = new Set(cD.map(d => d.id));
                return <g key={sys.id} onMouseDown={e => handleBlockDown(e, sys.id)} onClick={e => handleBlockClick(e, sys.id)} onMouseEnter={() => setHovBlock(sys.id)} onMouseLeave={() => { setHovBlock(null); setHovCursor(null); }} onMouseMove={e => { if (!connecting && !draggingDot) { const r = svgRef.current.getBoundingClientRect(); setHovCursor({ x: (e.clientX - r.left - pan.x) / zoom, y: (e.clientY - r.top - pan.y) / zoom }); } }} style={{ cursor: "grab", opacity: dim ? 0.5 : 1, transition: "opacity 0.15s" }}>
                  <rect x={sys.x} y={sys.y} width={sys.w} height={sys.h} rx={8} fill={isR || isSB ? "rgba(39,9,220,0.05)" : "#fff"} stroke={isR || isSB ? "#2709dc" : isH ? "#93b4f0" : "#c1c1c1"} strokeWidth={1.5} filter="url(#bs)" />
                  <CubeIcon x={sys.x + 10} y={sys.y + 10} size={24} color="#FF7701" />
                  <text x={sys.x + 38} y={sys.y + 26} fontSize={12} fontFamily="'AktivGrotesk','DM Sans',sans-serif" fontWeight={500} fill="#000">{sys.name.length > 20 ? sys.name.slice(0, 20) + "..." : sys.name}</text>
                  {isC && (() => { const cnt = sys.children?.length || 0; const lbl = `${cnt} Sub System${cnt !== 1 ? "s" : ""}`; if (zoom < 0.8) { const bW = lbl.length * 6.2 + 12; const bH = 21; const bx = sys.x + sys.w - bW - 12; const by = sys.y + sys.h - bH - 12; return <><rect x={bx} y={by} width={bW} height={bH} rx={4} fill="#f2f2f2" /><text x={bx + bW / 2} y={by + bH / 2 + 4} textAnchor="middle" fontSize={12} fontFamily="'AktivGrotesk','DM Sans',sans-serif" fontWeight={400} fill="#8a8a8a">{lbl}</text></>; } return <text x={sys.x + 18} y={sys.y + sys.h - 16} fontSize={12} fontFamily="'AktivGrotesk','DM Sans',sans-serif" fontWeight={400} fill="#8a8a8a">{lbl}</text>; })()}
                  {zoom >= 0.8 && (() => {
                    const descIds = new Set([sys.id, ...getDescendantIds(hierarchy, sys.id)]);
                    const sysIfaces = ifaces.filter(i => descIds.has(i.source) || descIds.has(i.target));
                    const hasReqs = sysIfaces.some(i => i.requirements && i.requirements.length > 0);
                    const hasTests = sysIfaces.some(i => i.requirements && i.requirements.some(r => r.tests && r.tests.length > 0));
                    const hasDoc = sysIfaces.some(i => i.documents && i.documents.length > 0);
                    const hasDesignVal = sysIfaces.some(i => i.designValues && i.designValues.length > 0);
                    const activeIcons = [];
                    if (hasReqs) activeIcons.push("req");
                    if (hasTests) activeIcons.push("test");
                    if (hasDoc) activeIcons.push("doc");
                    if (hasDesignVal) activeIcons.push("dv");
                    if (activeIcons.length === 0) return null;
                    const iconSize = 24; const iconGap = 4; const groupW = iconSize * activeIcons.length + iconGap * (activeIcons.length - 1); const gx = sys.x + sys.w - groupW - 12; const gy = sys.y + sys.h - iconSize - 10;
                    return <>{activeIcons.map((icon, i) => { const ix = gx + i * (iconSize + iconGap); return <g key={icon}><rect x={ix} y={gy} width={iconSize} height={iconSize} rx={4} fill="none" stroke="#c1c1c1" strokeWidth={1} />{icon === "req" && <SvgRequirementIcon x={ix} y={gy} size={iconSize} />}{icon === "test" && <SvgTestIcon x={ix} y={gy} size={iconSize} />}{icon === "doc" && <SvgDocumentIcon x={ix} y={gy} size={iconSize} />}{icon === "dv" && <SvgDesignValueIcon x={ix} y={gy} size={iconSize} />}</g>; })}</>;
                  })()}
                  {cD.map((d, i) => <circle key={"cd" + i} cx={d.cx} cy={d.cy} r={6} fill="#fff" stroke={isSB ? "#2709dc" : "#c1c1c1"} strokeWidth={1.5} style={{ cursor: draggingDot ? "grabbing" : "grab" }} onMouseDown={e => {
                    e.stopPropagation(); e.preventDefault();
                    const ifaceObj = ifaces.find(iface => iface.id === d.ifaceId);
                    if (ifaceObj) setDraggingDot({ ifaceId: d.ifaceId, role: ifaceObj.source === sys.id ? "source" : "target", blockId: sys.id, currentDotId: d.id, snapDotId: d.id });
                  }} />)}
                  {(connecting || draggingDot) && allD.filter(d => !cIds.has(d.id)).map((d, i) => <circle key={"ad" + i} cx={d.cx} cy={d.cy} r={6} fill="#fff" stroke="#c1c1c1" strokeWidth={1.5} style={{ cursor: "crosshair" }} onMouseDown={e => handleDotDown(e, sys.id, d.cx, d.cy)} />)}
                  {!connecting && !draggingDot && hovBlock === sys.id && hovCursor && (() => { const avail = allD.filter(d => !cIds.has(d.id)); if (!avail.length) return null; let best = avail[0], bestD = Infinity; for (const d of avail) { const dist = Math.hypot(d.cx - hovCursor.x, d.cy - hovCursor.y); if (dist < bestD) { bestD = dist; best = d; } } return <circle key="hd-closest" cx={best.cx} cy={best.cy} r={6} fill="#fff" stroke="#c1c1c1" strokeWidth={1.5} style={{ cursor: "crosshair" }} onMouseDown={e => handleDotDown(e, sys.id, best.cx, best.cy)} />; })()}
                </g>;
              })}
              {connecting && <path d={elbowPath(connecting.startX, connecting.startY, connecting.currentX, connecting.currentY)} fill="none" stroke="#c1c1c1" strokeWidth={1.5} />}
              {draggingDot && visible[draggingDot.blockId] && (() => {
                const block = visible[draggingDot.blockId];
                const allDots = getDots(block);
                const snapDot = allDots.find(d => d.id === draggingDot.snapDotId);
                if (!snapDot) return null;
                return <>
                  {allDots.map(d => <circle key={"snap" + d.id} cx={d.cx} cy={d.cy} r={6} fill={d.id === draggingDot.snapDotId ? "#fff" : "#fff"} stroke={d.id === draggingDot.snapDotId ? "#2563eb" : "#d5d5d5"} strokeWidth={d.id === draggingDot.snapDotId ? 2 : 1} />)}
                </>;
              })()}
            </g>
          </svg>
            </div>
          </div>
          </div>
        </div>
        {!chatCollapsed && <ResizeHandle onMouseDown={e => startResize("chat", chatWidth, e)} />}
        <AIChatPanel onCollapse={() => { setChatCollapsed(true); if (agentsPanelOpen) setAgentsPanelOpen(false); }} onToggleAgents={() => setAgentsPanelOpen(prev => !prev)} width={chatWidth} collapsed={chatCollapsed} messages={activeChatMessages} onSendMessage={handleChatSendMessage} chatName={activeChatName} agentsPanelOpen={agentsPanelOpen} onNewChat={handleNewChat} chatList={chatList} activeChatId={activeChatId} onSelectChat={handleSelectChat} onRenameChat={handleRenameChat} />
        <AgentsPanel open={agentsPanelOpen} onClose={() => setAgentsPanelOpen(false)} chats={chatList} activeChatId={activeChatId} onSelectChat={handleSelectChat} onNewChat={handleNewChat} onDeleteChat={handleDeleteChat} />
      </div>
      {modal && <InterfaceModal mode={modal.mode} sourceId={modal.sourceId} targetId={modal.targetId} allSystems={positioned} allRequirements={allRequirements} onClose={() => setModal(null)} onCreate={handleCreate} onAddReq={r => setAllRequirements(p => [...p, r])} />}
    </div>
  );
}
