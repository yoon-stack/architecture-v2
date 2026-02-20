import { useState, useRef, useCallback, useEffect, useMemo } from "react";

const COLORS = { orange: "#f97316", blue: "#3b82f6", green: "#22c55e", yellow: "#eab308", gray: "#94a3b8" };
const GRID = 40;
const BW = 200, BH = 80, PAD = 40, HEADER_H = 40, PILL_H = 24, PILL_MIN_W = 80;
const INTER_BLOCK = 280, ROW_GAP = 120;
function snapToGrid(v) { return Math.round(v / GRID) * GRID; }

const hierarchy = [
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
function countIfacesBetween(idA, idB, ifaceList, parentMap) {
  // Collect all descendant IDs for each block
  const setA = new Set([idA, ...getDescendantIds(hierarchy, idA)]);
  const setB = new Set([idB, ...getDescendantIds(hierarchy, idB)]);
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

function layoutNode(node, ox, oy, expSet, out, ifaceList) {
  const hasKids = !!(node.children?.length);
  const isExp = hasKids && expSet.has(node.id);
  if (!hasKids || !isExp) {
    const w = snapToGrid(BW + (hasKids ? 22 : 0));
    out[node.id] = { ...node, x: snapToGrid(ox), y: snapToGrid(oy), w, h: BH, expanded: false, hasChildren: hasKids };
    return { w, h: BH };
  }
  const kids = node.children;
  const cols = computeOptimalColumns(kids.length);
  const cs = {}, tmp = {};
  for (const k of kids) cs[k.id] = layoutNode(k, 0, 0, expSet, tmp, ifaceList);
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
        maxIfaces = Math.max(maxIfaces, countIfacesBetween(a, b, ifaceList));
      }
    }
    // Also count diagonal interfaces (different rows same columns)
    for (let ri = 0; ri < rows.length; ri++) {
      for (let rj = 0; rj < rows.length; rj++) {
        if (ri === rj) continue;
        if (ci < rows[ri].length && ci + 1 < rows[rj].length) {
          maxIfaces = Math.max(maxIfaces, countIfacesBetween(rows[ri][ci].id, rows[rj][ci + 1].id, ifaceList));
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
        maxIfaces = Math.max(maxIfaces, countIfacesBetween(rows[ri][ci].id, rows[ri + 1][ci].id, ifaceList));
      }
    }
    rowGaps[ri] = gapForPillsVertical(maxIfaces);
  }

  // Place children at grid-snapped positions with dynamic gaps
  let cy = snapToGrid(oy + HEADER_H + innerPad);
  for (let ri = 0; ri < rows.length; ri++) {
    let cx = snapToGrid(ox + innerPad);
    for (let ci = 0; ci < rows[ri].length; ci++) {
      layoutNode(rows[ri][ci], cx, cy, expSet, out, ifaceList);
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

function computeLayout(expSet, ifaceList) {
  const out = {}; let cx = snapToGrid(GRID * 2);
  const startY = snapToGrid(GRID * 2);
  // Compute dynamic gaps between root-level systems
  for (let i = 0; i < hierarchy.length; i++) {
    const n = hierarchy[i];
    const r = layoutNode(n, cx, startY, expSet, out, ifaceList);
    if (i < hierarchy.length - 1) {
      const nxt = hierarchy[i + 1];
      const ic = countIfacesBetween(n.id, nxt.id, ifaceList);
      cx = snapToGrid(cx + r.w + gapForPills(ic));
    }
  }
  return out;
}

function getDots(b) {
  const { x, y, w, h } = b;
  return [
    { id: "tc", cx: x + w / 2, cy: y }, { id: "tl", cx: x + w * 0.25, cy: y }, { id: "tr", cx: x + w * 0.75, cy: y },
    { id: "ml", cx: x, cy: y + h / 2 }, { id: "mr", cx: x + w, cy: y + h / 2 },
    { id: "bc", cx: x + w / 2, cy: y + h }, { id: "bl", cx: x + w * 0.25, cy: y + h }, { id: "br", cx: x + w * 0.75, cy: y + h },
    { id: "l3", cx: x, cy: y + h * 0.3 }, { id: "r3", cx: x + w, cy: y + h * 0.3 },
    { id: "l7", cx: x, cy: y + h * 0.7 }, { id: "r7", cx: x + w, cy: y + h * 0.7 },
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
    const pw = Math.max(iface.name.length * 6.4 + 24, PILL_MIN_W);
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

// Legacy H-V-H path (used for preview lines where dot IDs are unknown)
function elbowPath(sx, sy, tx, ty, midX) {
  const mx = midX !== undefined ? midX : (sx + tx) / 2;
  return `M${sx},${sy} L${mx},${sy} L${mx},${ty} L${tx},${ty}`;
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
  const s = size, cx = x + s / 2, cy = y + s / 2, h = s * 0.45, w = s * 0.42;
  return <g>
    <polygon points={`${cx},${cy - h} ${cx + w},${cy - h * .35} ${cx},${cy + h * .15} ${cx - w},${cy - h * .35}`} fill={color + "30"} stroke={color} strokeWidth={1} strokeLinejoin="round" />
    <polygon points={`${cx},${cy + h * .15} ${cx + w},${cy - h * .35} ${cx + w},${cy + h * .35} ${cx},${cy + h}`} fill={color + "18"} stroke={color} strokeWidth={1} strokeLinejoin="round" />
    <polygon points={`${cx},${cy + h * .15} ${cx - w},${cy - h * .35} ${cx - w},${cy + h * .35} ${cx},${cy + h}`} fill={color + "22"} stroke={color} strokeWidth={1} strokeLinejoin="round" />
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
        {ni.length > 0 && <span style={{ fontSize: 10, color: "#94a3b8", background: "#f1f5f9", padding: "0 4px", borderRadius: 3 }}>{ni.length}</span>}
        {isHov && <>
          <span onClick={e => { e.stopPropagation(); onQuickAdd(node.id); }} title="Add interface from this system" style={{ fontSize: 14, color: "#2563eb", cursor: "pointer", lineHeight: 1, fontWeight: 700, width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, background: "#eff6ff" }}>+</span>
          <span onClick={e => { e.stopPropagation(); focusSys(node.id); }} title="Focus" style={{ fontSize: 12, color: "#94a3b8", cursor: "pointer" }}>⊚</span>
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
              <span style={{ color: selId === iface.id ? "#2563eb" : "#b0b8c4", fontSize: 12 }}>∞</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: selId === iface.id ? 600 : 400, color: selId === iface.id ? "#2563eb" : "#64748b" }}>{iface.name}</span>
              <span style={{ fontSize: 10, color: "#b0b8c4", background: "#f1f5f9", padding: "0 3px", borderRadius: 2 }}>{iface.id}</span>
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

function AIChatPanel({ onCollapse, width }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setMessages(prev => [...prev, { role: "user", content: text, time: new Date() }]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: "ai", content: "I'm Flow AI — this is a prototype response. I can help you analyze interfaces, requirements, and system architecture. Ask me anything about your project data.", time: new Date() }]);
    }, 1200);
  };

  return (
    <div style={{ width: width || 380, background: "#fff", borderLeft: "1px solid #e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0, fontFamily: "'AktivGrotesk','DM Sans',sans-serif", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>New Chat</span>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }} onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "transparent"} title="New chat" onClick={() => setMessages([])}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </button>
          <button style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }} onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "transparent"} title="Side by side">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
          </button>
          <button onClick={onCollapse} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }} onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "transparent"} title="Collapse panel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><line x1="6" y1="6" x2="6" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 30px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L14.5 8.5L20.5 9.3L16.2 13.4L17.3 19.3L12 16.5L6.7 19.3L7.8 13.4L3.5 9.3L9.5 8.5Z"/></svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Ask anything or write with AI</div>
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>Use Flow AI to write for you, or answer questions about your data inside your project</div>
          </div>
        ) : (
          <div style={{ padding: "16px 0" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ padding: "8px 20px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                {msg.role === "ai" ? (
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L14.5 8.5L20.5 9.3L16.2 13.4L17.3 19.3L12 16.5L6.7 19.3L7.8 13.4L3.5 9.3L9.5 8.5Z"/></svg>
                  </div>
                ) : (
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 700, color: "#fff", marginTop: 2 }}>Y</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: msg.role === "ai" ? "#6366f1" : "#0f172a", marginBottom: 3 }}>{msg.role === "ai" ? "Flow AI" : "You"}</div>
                  <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, wordBreak: "break-word" }}>{msg.content}</div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div style={{ padding: "8px 20px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L14.5 8.5L20.5 9.3L16.2 13.4L17.3 19.3L12 16.5L6.7 19.3L7.8 13.4L3.5 9.3L9.5 8.5Z"/></svg>
                </div>
                <div style={{ flex: 1, paddingTop: 6 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 1, 2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: 3, background: "#c7d2fe", animation: `pulse 1.2s ease-in-out ${j * 0.2}s infinite` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{ padding: "12px 16px 16px", borderTop: "1px solid #e2e8f0", flexShrink: 0 }}>
        <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Leave a comment or tag @flow"
            rows={2}
            style={{ width: "100%", padding: "12px 14px 8px", border: "none", background: "transparent", fontSize: 13, color: "#334155", resize: "none", outline: "none", fontFamily: "'AktivGrotesk','DM Sans',sans-serif", lineHeight: 1.5, boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 10px 8px" }}>
            <button style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }} onMouseEnter={e => e.currentTarget.style.color = "#475569"} onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"} title="Attach file">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <button onClick={handleSend} disabled={!input.trim()} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: input.trim() ? "#3b82f6" : "#e2e8f0", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? "#fff" : "#94a3b8"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }`}</style>
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
      style={{ width: width || 380, background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0, fontFamily: "'AktivGrotesk','DM Sans',sans-serif", overflow: "hidden", position: "relative", boxShadow: tabDragOver ? "inset 0 0 0 2px #3b82f6" : "none", transition: "box-shadow 0.2s" }}>
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

function ResizeHandle({ onMouseDown: onMD }) {
  return <div onMouseDown={onMD}
    style={{ width: 6, cursor: "col-resize", flexShrink: 0, zIndex: 15, position: "relative" }}
    onMouseEnter={e => { e.currentTarget.firstChild.style.opacity = "1"; }}
    onMouseLeave={e => { e.currentTarget.firstChild.style.opacity = "0"; }}>
    <div style={{ position: "absolute", inset: "0", width: 3, margin: "0 auto", background: "#3b82f6", borderRadius: 2, opacity: 0, transition: "opacity 0.15s", pointerEvents: "none" }} />
  </div>;
}

export default function SERMTool() {
  const [expanded, setExpanded] = useState(new Set(["launch-vehicle"]));
  const [ifaces, setIfaces] = useState(initIfaces);
  const [allRequirements, setAllRequirements] = useState(initRequirements);
  const [viewMode, setViewMode] = useState("architecture");
  const [selId, setSelId] = useState(null);
  const [hovId, setHovId] = useState(null);
  const [hovBlock, setHovBlock] = useState(null);
  const [selBlockId, setSelBlockId] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.6);
  const [dragging, setDragging] = useState(null);
  const [panning, setPanSt] = useState(false);
  const [dragOffsets, setDragOffsets] = useState({});
  const [sbExp, setSbExp] = useState(new Set(["launch-vehicle", "stage-1", "stage-2"]));
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
  const [sidebarWidth, setSidebarWidth] = useState(284);
  const [workbenchWidth, setWorkbenchWidth] = useState(380);
  const [chatWidth, setChatWidth] = useState(284);
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
  const parentMap = useMemo(() => buildParentMap(hierarchy, null), []);

  useEffect(() => { if (!canvasRef.current) return; const ro = new ResizeObserver(e => { for (const en of e) setViewSize({ w: en.contentRect.width, h: en.contentRect.height }); }); ro.observe(canvasRef.current); return () => ro.disconnect(); }, []);
  useEffect(() => { if (!selId) return; const iface = ifaces.find(i => i.id === selId); if (!iface) return; setSbExp(p => { const n = new Set(p); [iface.source, iface.target].forEach(s => { n.add(s); getAncestorIds(s, parentMap).forEach(a => n.add(a)); }); return n; }); }, [selId, ifaces, parentMap]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!resizingRef.current) return;
      const { type, startX, startWidth } = resizingRef.current;
      const delta = e.clientX - startX;
      if (type === "sidebar") setSidebarWidth(Math.max(180, Math.min(500, startWidth + delta)));
      else if (type === "workbench") setWorkbenchWidth(Math.max(260, Math.min(700, startWidth + delta)));
      else if (type === "chat") setChatWidth(Math.max(260, Math.min(700, startWidth - delta)));
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

  const startResize = useCallback((type, currentWidth, e) => {
    e.preventDefault();
    resizingRef.current = { type, startX: e.clientX, startWidth: currentWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const baseLayout = useMemo(() => computeLayout(expanded, ifaces), [expanded, ifaces]);

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

  const focusIds = useMemo(() => { if (!focusId) return null; const ids = new Set([focusId, ...getDescendantIds(hierarchy, focusId)]); revealed.forEach(id => ids.add(id)); return ids; }, [focusId, revealed]);


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
  const breadcrumb = useMemo(() => { if (!focusId) return null; const ch = [{ id: null, name: "All" }]; getAncestorIds(focusId, parentMap).reverse().forEach(a => { const n = findNode(hierarchy, a); if (n) ch.push({ id: a, name: n.name }); }); const fn = findNode(hierarchy, focusId); if (fn) ch.push({ id: focusId, name: fn.name }); return ch; }, [focusId, parentMap]);
  const connDots = useMemo(() => { const m = {}; for (const [ifId, da] of Object.entries(animDots)) { const iface = ifaces.find(i => i.id === ifId); if (!iface) continue; if (!m[iface.source]) m[iface.source] = []; m[iface.source].push({ ...da.s, ifaceId: ifId }); if (!m[iface.target]) m[iface.target] = []; m[iface.target].push({ ...da.t, ifaceId: ifId }); } return m; }, [animDots, ifaces]);

  const DRAG_THRESHOLD = 6;
  const DBLCLICK_MS = 400;
  const blockDownPos = useRef({ x: 0, y: 0 });
  const blockClickRef = useRef({ id: null, time: 0 });

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
  const handlePillDown = useCallback((e, ifId) => { e.stopPropagation(); setDraggingPill(ifId); setPillDragStart({ x: e.clientX, y: e.clientY, off: pillOffsets[ifId] || { dx: 0, dy: 0 } }); }, [pillOffsets]);
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
        if (tid) setModal({ mode: "drag", sourceId: connecting.sourceId, targetId: tid });
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
  const wbOpenTab = useCallback((type, id, parentIfaceId) => {
    setWorkbenchOpen(true);
    setWbTabs(prev => {
      const existing = prev.findIndex(t => t.type === type && t.id === id);
      if (existing >= 0) { setWbActiveTab(existing); return prev; }
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
    setFocusId(id); setRevealed(new Set());
    setCenterTrigger(c => c + 1);
  }, []);

  const containers = Object.values(visible).filter(s => s.expanded && s.hasChildren).sort((a, b) => getAncestorIds(a.id, parentMap).length - getAncestorIds(b.id, parentMap).length);
  const leaves = Object.values(visible).filter(s => !(s.expanded && s.hasChildren));
  const leafRects = useMemo(() => leaves.map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h })), [leaves]);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", margin: 0, padding: 0, fontFamily: "'AktivGrotesk','DM Sans',sans-serif", background: "#f1f5f9", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {/* Top bar */}
      <div style={{ height: 46, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: "linear-gradient(135deg,#3b82f6,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>S</span></div>
          <span style={{ color: "#fff", fontSize: 14.5, fontWeight: 700 }}>SERM Tool</span>
          <span style={{ background: "#22c55e20", color: "#4ade80", fontSize: 9.5, fontWeight: 600, padding: "2px 7px", borderRadius: 10, border: "1px solid #22c55e40" }}>v1.0</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#94a3b8", fontSize: 12.5 }}>Project: <span style={{ color: "#fff", fontWeight: 600 }}>Launch Vehicle Program</span></span>
        </div>
      </div>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: sidebarCollapsed ? 0 : sidebarWidth, background: "#fff", borderRight: sidebarCollapsed ? "none" : "1px solid #e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden", transition: resizingRef.current ? "none" : "width 0.2s ease", position: "relative" }}>
          <div style={{ padding: "12px 12px 0", minWidth: sidebarWidth }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <button onClick={() => setModal({ mode: "full" })} style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 6px rgba(37,99,235,0.25)" }}>+ New Interface</button>
              <button onClick={() => setSidebarCollapsed(true)} title="Collapse sidebar" style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#94a3b8" }} onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#475569"; }} onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#94a3b8"; }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"/><line x1="18" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {breadcrumb && <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "4px 4px 8px", flexWrap: "wrap" }}>
              {breadcrumb.map((b, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                {i > 0 && <span style={{ fontSize: 9, color: "#c0c8d4" }}>›</span>}
                <span onClick={() => { focusSys(b.id || null); }} style={{ fontSize: 10.5, color: i === breadcrumb.length - 1 ? "#2563eb" : "#64748b", fontWeight: i === breadcrumb.length - 1 ? 700 : 500, cursor: "pointer", padding: "1px 4px", borderRadius: 3, background: i === breadcrumb.length - 1 ? "#eff6ff" : "transparent" }}>{b.name}</span>
              </span>)}
            </div>}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "2px 6px", minWidth: sidebarWidth }}>
            <SidebarTree nodes={hierarchy} ifaces={ifaces} selId={selId} hovId={hovId} onSel={id => { wbOpenTab("interface", id); }} onHov={setHovId} sbExp={sbExp} togSb={togSb} focusSys={focusSys} hovSys={hovSys} setHovSys={setHovSys} onQuickAdd={sysId => setModal({ mode: "quick", sourceId: sysId })} allRequirements={allRequirements} sbIfaceExp={sbIfaceExp} togSbIface={togSbIface} />
          </div>
        </div>
        {sidebarCollapsed && <button onClick={() => setSidebarCollapsed(false)} title="Expand sidebar" style={{ position: "absolute", top: 60, left: 8, zIndex: 20, width: 28, height: 28, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }} onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#475569"; }} onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#94a3b8"; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 7 18 12 13 17"/><line x1="6" y1="6" x2="6" y2="18"/></svg>
        </button>}
        {!sidebarCollapsed && <ResizeHandle onMouseDown={e => startResize("sidebar", sidebarWidth, e)} />}
        {/* Workbench Panel */}
        {workbenchOpen && <Workbench
          tabs={wbTabs} activeTab={wbActiveTab} onSetActive={(i) => { setWbActiveTab(i); const t = wbTabs[i]; if (t?.type === "interface") setSelId(t.id); else setSelId(null); }} onCloseTab={wbCloseTab} onCloseAll={wbCloseAll}
          onOpenReqTab={(reqId, parentIfaceId) => wbOpenTab("requirement", reqId, parentIfaceId)}
          ifaces={ifaces} allSystems={positioned} allRequirements={allRequirements}
          onDrop={(data) => {
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
        {/* Center area: toggle + canvas/table */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 14, left: 18, zIndex: 10, display: "flex", alignItems: "center", gap: 8, background: "rgba(241,245,249,0.92)", padding: "3px", borderRadius: 7, backdropFilter: "blur(8px)", border: "1px solid #e2e8f0" }}>
            <button onClick={() => setViewMode("architecture")} style={{ padding: "5px 12px", borderRadius: 5, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: viewMode === "architecture" ? "#fff" : "transparent", color: viewMode === "architecture" ? "#0f172a" : "#94a3b8", transition: "all 0.15s", boxShadow: viewMode === "architecture" ? "0 1px 3px rgba(0,0,0,0.08)" : "none", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              Architecture
            </button>
            <button onClick={() => setViewMode("table")} style={{ padding: "5px 12px", borderRadius: 5, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: viewMode === "table" ? "#fff" : "transparent", color: viewMode === "table" ? "#0f172a" : "#94a3b8", transition: "all 0.15s", boxShadow: viewMode === "table" ? "0 1px 3px rgba(0,0,0,0.08)" : "none", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              Table
            </button>
            {focusId && <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500, paddingRight: 8 }}>(focused)</span>}
          </div>
          {viewMode === "table" && <div style={{ position: "absolute", inset: 0, top: 48, overflow: "auto" }}><TableView ifaces={ifaces} allSystems={positioned} allRequirements={allRequirements} /></div>}
          <div ref={canvasRef} style={{ position: "absolute", inset: 0, touchAction: "none", display: viewMode === "architecture" ? undefined : "none" }}>
          <div style={{ position: "absolute", bottom: 16, right: 16, zIndex: 10, display: "flex", alignItems: "center", gap: 2, background: "#fff", borderRadius: 7, boxShadow: "0 1px 6px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" }}>
            <button onClick={() => { const r = svgRef.current.getBoundingClientRect(); const cx = r.width / 2, cy = r.height / 2; const nz = Math.min(3, zoom + 0.15); const ratio = nz / zoom; setPan({ x: cx - (cx - pan.x) * ratio, y: cy - (cy - pan.y) * ratio }); setZoom(nz); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 15, color: "#475569" }}>+</button>
            <div style={{ width: 1, height: 18, background: "#e2e8f0" }} />
            <span style={{ padding: "0 6px", fontSize: 10.5, color: "#94a3b8", fontWeight: 500, minWidth: 32, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
            <div style={{ width: 1, height: 18, background: "#e2e8f0" }} />
            <button onClick={() => { const r = svgRef.current.getBoundingClientRect(); const cx = r.width / 2, cy = r.height / 2; const nz = Math.max(0.15, zoom - 0.15); const ratio = nz / zoom; setPan({ x: cx - (cx - pan.x) * ratio, y: cy - (cy - pan.y) * ratio }); setZoom(nz); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 15, color: "#475569" }}>−</button>
          </div>
          <div style={{ position: "absolute", top: 14, right: 18, zIndex: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <div ref={filterRef} style={{ position: "relative" }}>
              <button onClick={() => setFilterOpen(f => !f)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 7, border: `1px solid ${typeFilter.size > 0 ? "#2563eb" : "#e2e8f0"}`, background: typeFilter.size > 0 ? "#eff6ff" : "#fff", fontSize: 12, fontWeight: 600, color: typeFilter.size > 0 ? "#2563eb" : "#475569", cursor: "pointer", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", backdropFilter: "blur(8px)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
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
              <button onClick={() => { setViewsOpen(v => !v); setSaveViewModal(false); }} onMouseEnter={() => setViewsBtnHov(true)} onMouseLeave={() => setViewsBtnHov(false)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 7, border: `1px solid ${activeViewId ? "#2563eb" : "#e2e8f0"}`, background: activeViewId ? "#eff6ff" : "#fff", fontSize: 12, fontWeight: 600, color: activeViewId ? "#2563eb" : "#475569", cursor: "pointer", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", backdropFilter: "blur(8px)" }}>
                {activeViewId && viewModified && <span style={{ width: 6, height: 6, borderRadius: 3, background: "#2563eb", flexShrink: 0 }} />}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
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
            <button onClick={() => { setDragOffsets({}); setPillOffsets({}); setLineOffsets({}); setDotOverrides({}); rawDragAccum.current = {}; setCenterTrigger(c => c + 1); setActiveViewId(null); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", backdropFilter: "blur(8px)" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>Layout</button>
          </div>
          <MiniMap blocks={visible} pan={pan} zoom={zoom} vw={viewSize.w} vh={viewSize.h} />
          <div style={{ position: "absolute", bottom: 16, left: 18, zIndex: 10, fontSize: 10, color: "#94a3b8", background: "rgba(255,255,255,0.9)", padding: "3px 9px", borderRadius: 5, border: "1px solid #e8ebef" }}>Drag dots to connect · Drag pills to reposition</div>
          <svg ref={svgRef} width="100%" height="100%" onMouseDown={handleCanvasDown} style={{ background: "#f1f5f9", cursor: panning ? "grabbing" : connecting ? "crosshair" : "default" }}>
            <defs>
              <filter id="bs" x="-4%" y="-4%" width="108%" height="116%"><feDropShadow dx="0" dy="1" stdDeviation="2.5" floodOpacity="0.05" /></filter>
              <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x},${pan.y}) scale(${zoom})`}><circle cx={GRID / 2} cy={GRID / 2} r="1.2" fill="#b0b8c4" opacity="0.45" /></pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {containers.map(sys => { const isSB = selBlockId === sys.id; const isH = hovBlock === sys.id && !connecting; const allD = getDots(sys); const cD = connDots[sys.id] || []; const cIds = new Set(cD.map(d => d.id)); return <g key={sys.id} onMouseDown={e => handleBlockDown(e, sys.id)} onClick={e => handleBlockClick(e, sys.id)} onMouseEnter={() => setHovBlock(sys.id)} onMouseLeave={() => setHovBlock(null)} style={{ cursor: "grab", opacity: selId && !relIds.includes(sys.id) ? 0.2 : 1, transition: "opacity 0.15s" }}>
                <rect x={sys.x} y={sys.y} width={sys.w} height={sys.h} rx={10} fill={`${sys.color}06`} stroke={relIds.includes(sys.id) || isSB ? "#2563eb" : sys.color} strokeWidth={relIds.includes(sys.id) || isSB ? 2.5 : 1.5} strokeDasharray="7 3" />
                <rect x={sys.x} y={sys.y} width={sys.w} height={HEADER_H} rx={10} fill={`${sys.color}0d`} /><rect x={sys.x} y={sys.y + HEADER_H - 8} width={sys.w} height={8} fill={`${sys.color}0d`} />
                <CubeIcon x={sys.x + 10} y={sys.y + 10} size={18} color={sys.color} />
                <text x={sys.x + 34} y={sys.y + 26} fontSize={13} fontFamily="'AktivGrotesk','DM Sans',sans-serif" fontWeight={700} fill="#1e293b">{sys.name}</text>
                <text x={sys.x + sys.w - 12} y={sys.y + 26} textAnchor="end" fontSize={10} fill="#94a3b8">{sys.reqs}</text>
                {cD.map((d, i) => <circle key={"cd" + i} cx={d.cx} cy={d.cy} r={3.5} fill="#2563eb" stroke="#fff" strokeWidth={1.5} style={{ cursor: draggingDot ? "grabbing" : "grab" }} onMouseDown={e => {
                  e.stopPropagation(); e.preventDefault();
                  const ifaceObj = ifaces.find(iface => iface.id === d.ifaceId);
                  if (ifaceObj) setDraggingDot({ ifaceId: d.ifaceId, role: ifaceObj.source === sys.id ? "source" : "target", blockId: sys.id, currentDotId: d.id, snapDotId: d.id });
                }} />)}
                {isH && allD.filter(d => !cIds.has(d.id)).map((d, i) => <circle key={"hd" + i} cx={d.cx} cy={d.cy} r={3.5} fill="#93b4f0" stroke="#fff" strokeWidth={1.5} opacity={0.5} style={{ cursor: "crosshair" }} onMouseDown={e => handleDotDown(e, sys.id, d.cx, d.cy)} />)}
              </g>; })}

              {ifaces.map(iface => {
                const da = animDots[iface.id]; const pill = pills[iface.id];
                if (!da || !pill) return null;
                if (typeFilter.size > 0 && !typeFilter.has(iface.interfaceType)) return null;
                const pcx = pill.x + pill.w / 2, pcy = pill.y + pill.h / 2;
                const isAct = selId === iface.id || hovId === iface.id || blockRelIfaceIds.has(iface.id);
                const sDotId = da.s.id, tDotId = da.t.id;
                // Source→Pill path: source dot determines exit direction, pill is flexible endpoint
                const sPath = smartElbowPath(da.s.cx, da.s.cy, pcx, pcy, sDotId, null, undefined, leafRects);
                // Pill→Target path: pill is flexible start, target dot determines entry direction
                const tPath = smartElbowPath(pcx, pcy, da.t.cx, da.t.cy, null, tDotId, undefined, leafRects);
                return <g key={iface.id}>
                  <path d={sPath} fill="none" stroke="transparent" strokeWidth={14} onMouseDown={e => handlePillDown(e, iface.id)} onClick={() => { wbOpenTab("interface", iface.id); setSelBlockId(null); }} style={{ cursor: "grab" }} />
                  <path d={tPath} fill="none" stroke="transparent" strokeWidth={14} onMouseDown={e => handlePillDown(e, iface.id)} onClick={() => { wbOpenTab("interface", iface.id); setSelBlockId(null); }} style={{ cursor: "grab" }} />
                  <path d={sPath} fill="none" stroke={isAct ? "#2563eb" : "#cdd3db"} strokeWidth={isAct ? 3.5 : 2} />
                  <path d={tPath} fill="none" stroke={isAct ? "#2563eb" : "#cdd3db"} strokeWidth={isAct ? 3.5 : 2} />
                  <rect x={pill.x} y={pill.y} width={pill.w} height={pill.h} rx={12} fill={isAct ? "#2563eb" : draggingPill === iface.id ? "#e0e7ff" : "#fff"} stroke={isAct ? "#2563eb" : "#dde1e7"} strokeWidth={0.8} style={{ cursor: "grab" }} onMouseDown={e => handlePillDown(e, iface.id)} onClick={() => { wbOpenTab("interface", iface.id); setSelBlockId(null); }} />
                  <text x={pcx} y={pcy + 3.5} textAnchor="middle" fontSize={10} fontFamily="'AktivGrotesk','DM Sans',sans-serif" fontWeight={isAct ? 600 : 500} fill={isAct ? "#fff" : "#64748b"} style={{ pointerEvents: "none" }}>{iface.name}</text>
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
                  const toggleReveal = e => { e.stopPropagation(); setRevealed(p => { const n = new Set(p); if (n.has(outId)) n.delete(outId); else n.add(outId); return n; }); };
                  return <g key={"ext" + iface.id} onMouseEnter={() => setHovStub(iface.id)} onMouseLeave={() => setHovStub(null)}>
                    <path d={`M${sx},${sy} L${ex},${ey}`} fill="none" stroke="#b0b8c4" strokeWidth={1.5} strokeDasharray="4 3" />
                    <circle cx={sx} cy={sy} r={3.5} fill="#2563eb" stroke="#fff" strokeWidth={1.5} />
                    <rect x={boxX} y={boxY} width={boxW} height={boxH} rx={6} fill={isR ? "#eff6ff" : isHv ? "#f8fafc" : "#fff"} stroke={isR ? "#2563eb" : isHv ? "#93b4f0" : "#e2e8f0"} strokeWidth={isR ? 1.5 : 1} style={{ cursor: "pointer", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.06))" }} onClick={toggleReveal} />
                    <CubeIcon x={boxX + 6} y={boxY + (boxH - 13) / 2} size={13} color={extColor} />
                    <text x={boxX + 23} y={boxY + boxH / 2 + 3.5} fontSize={10} fontFamily="'AktivGrotesk','DM Sans',sans-serif" fontWeight={500} fill={isR ? "#2563eb" : "#475569"} style={{ pointerEvents: "none" }}>{truncName}</text>
                  </g>;
                });
              })()}

              {leaves.map(sys => {
                const dim = selId && !relIds.includes(sys.id);
                const isR = relIds.includes(sys.id); const isSB = selBlockId === sys.id; const isC = !sys.expanded && sys.hasChildren;
                const isH = hovBlock === sys.id && !connecting;
                const allD = getDots(sys); const cD = connDots[sys.id] || []; const cIds = new Set(cD.map(d => d.id));
                return <g key={sys.id} onMouseDown={e => handleBlockDown(e, sys.id)} onClick={e => handleBlockClick(e, sys.id)} onMouseEnter={() => setHovBlock(sys.id)} onMouseLeave={() => setHovBlock(null)} style={{ cursor: "grab", opacity: dim ? 0.2 : 1, transition: "opacity 0.15s" }}>
                  <rect x={sys.x} y={sys.y} width={sys.w} height={sys.h} rx={8} fill="#fff" stroke={isR || isSB ? "#2563eb" : isH ? "#93b4f0" : "#e2e8f0"} strokeWidth={isR || isSB ? 2.5 : 1} filter="url(#bs)" />
                  <CubeIcon x={sys.x + 10} y={sys.y + (sys.h - 17) / 2} size={17} color={sys.color} />
                  <text x={sys.x + 32} y={sys.y + sys.h / 2 + 4.5} fontSize={12.5} fontFamily="'AktivGrotesk','DM Sans',sans-serif" fontWeight={600} fill="#1e293b">{sys.name.length > 17 ? sys.name.slice(0, 17) + "..." : sys.name}</text>
                  {isC && <text x={sys.x + sys.w - 32} y={sys.y + sys.h / 2 + 4} fontSize={11} fill="#f59e0b" fontWeight={700}>▸</text>}
                  <rect x={sys.x + sys.w - 28} y={sys.y + (sys.h - 19) / 2} width={20} height={19} rx={9.5} fill={sys.reqs > 0 ? "#eff6ff" : "#f8fafc"} stroke={sys.reqs > 0 ? "#bfdbfe" : "#e8ebef"} strokeWidth={0.8} />
                  <text x={sys.x + sys.w - 18} y={sys.y + sys.h / 2 + 4} textAnchor="middle" fontSize={10} fontWeight={600} fill={sys.reqs > 0 ? "#2563eb" : "#b0b8c4"}>{sys.reqs}</text>
                  {cD.map((d, i) => <circle key={"cd" + i} cx={d.cx} cy={d.cy} r={3.5} fill="#2563eb" stroke="#fff" strokeWidth={1.5} style={{ cursor: draggingDot ? "grabbing" : "grab" }} onMouseDown={e => {
                    e.stopPropagation(); e.preventDefault();
                    const ifaceObj = ifaces.find(iface => iface.id === d.ifaceId);
                    if (ifaceObj) setDraggingDot({ ifaceId: d.ifaceId, role: ifaceObj.source === sys.id ? "source" : "target", blockId: sys.id, currentDotId: d.id, snapDotId: d.id });
                  }} />)}
                  {isH && allD.filter(d => !cIds.has(d.id)).map((d, i) => <circle key={"hd" + i} cx={d.cx} cy={d.cy} r={3.5} fill="#93b4f0" stroke="#fff" strokeWidth={1.5} opacity={0.5} style={{ cursor: "crosshair" }} onMouseDown={e => handleDotDown(e, sys.id, d.cx, d.cy)} />)}
                </g>;
              })}
              {connecting && <path d={elbowPath(connecting.startX, connecting.startY, connecting.currentX, connecting.currentY)} fill="none" stroke="#2563eb" strokeWidth={2} strokeDasharray="6 3" />}
              {draggingDot && visible[draggingDot.blockId] && (() => {
                const block = visible[draggingDot.blockId];
                const allDots = getDots(block);
                const snapDot = allDots.find(d => d.id === draggingDot.snapDotId);
                if (!snapDot) return null;
                return <>
                  {allDots.map(d => <circle key={"snap" + d.id} cx={d.cx} cy={d.cy} r={4} fill={d.id === draggingDot.snapDotId ? "#2563eb40" : "#e2e8f040"} stroke={d.id === draggingDot.snapDotId ? "#2563eb" : "#cbd5e1"} strokeWidth={d.id === draggingDot.snapDotId ? 2 : 1} />)}
                </>;
              })()}
            </g>
          </svg>
          </div>
        </div>
        {!chatCollapsed && <ResizeHandle onMouseDown={e => startResize("chat", chatWidth, e)} />}
        {!chatCollapsed && <AIChatPanel onCollapse={() => setChatCollapsed(true)} width={chatWidth} />}
        {chatCollapsed && <button onClick={() => setChatCollapsed(false)} title="Expand AI chat" style={{ position: "absolute", top: 60, right: 8, zIndex: 20, width: 28, height: 28, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }} onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#475569"; }} onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#94a3b8"; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 7 6 12 11 17"/><line x1="18" y1="6" x2="18" y2="18"/></svg>
        </button>}
      </div>
      {modal && <InterfaceModal mode={modal.mode} sourceId={modal.sourceId} targetId={modal.targetId} allSystems={positioned} allRequirements={allRequirements} onClose={() => setModal(null)} onCreate={handleCreate} onAddReq={r => setAllRequirements(p => [...p, r])} />}
    </div>
  );
}
