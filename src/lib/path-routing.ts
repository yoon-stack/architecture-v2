import { GRID, snapToGrid } from "@/store/constants";

interface BlockRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ElbowSegment {
  type: "H" | "V";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Determine if a dot id exits from the top or bottom of a block. */
export function isVerticalDot(dotId: string | null | undefined): boolean {
  return dotId != null && (dotId[0] === "t" || dotId[0] === "b");
}

/** Check if a dot is on the bottom edge. */
export function isBottomDot(dotId: string | null | undefined): boolean {
  return dotId != null && dotId[0] === "b";
}

/** Check if a dot is on the top edge. */
export function isTopDot(dotId: string | null | undefined): boolean {
  return dotId != null && dotId[0] === "t";
}

/** Check if a dot is on the left edge. */
export function isLeftDot(dotId: string | null | undefined): boolean {
  return dotId === "ml" || dotId === "l3" || dotId === "l7";
}

/** Check if a dot is on the right edge. */
export function isRightDot(dotId: string | null | undefined): boolean {
  return dotId === "mr" || dotId === "r3" || dotId === "r7";
}

/**
 * Check if a horizontal line segment at y between x1 and x2 intersects any block rect.
 */
export function hSegmentCrossesBlock(
  y: number,
  x1: number,
  x2: number,
  blocks: BlockRect[],
  margin?: number
): boolean {
  const lo = Math.min(x1, x2),
    hi = Math.max(x1, x2);
  const m = margin || 4;
  for (const b of blocks) {
    if (
      y > b.y + m &&
      y < b.y + b.h - m &&
      hi > b.x + m &&
      lo < b.x + b.w - m
    )
      return true;
  }
  return false;
}

/**
 * Check if a vertical line segment at x between y1 and y2 intersects any block rect.
 */
export function vSegmentCrossesBlock(
  x: number,
  y1: number,
  y2: number,
  blocks: BlockRect[],
  margin?: number
): boolean {
  const lo = Math.min(y1, y2),
    hi = Math.max(y1, y2);
  const m = margin || 4;
  for (const b of blocks) {
    if (
      x > b.x + m &&
      x < b.x + b.w - m &&
      hi > b.y + m &&
      lo < b.y + b.h - m
    )
      return true;
  }
  return false;
}

/**
 * Find a clear Y for a horizontal segment between two X coords,
 * starting from a preferred Y.
 */
export function findClearY(
  preferredY: number,
  sx: number,
  tx: number,
  blocks: BlockRect[],
  minY: number,
  maxY: number
): number {
  if (!hSegmentCrossesBlock(preferredY, sx, tx, blocks)) return preferredY;
  for (let offset = GRID; offset <= GRID * 12; offset += GRID) {
    const yUp = snapToGrid(preferredY - offset);
    const yDown = snapToGrid(preferredY + offset);
    if (yUp >= minY && !hSegmentCrossesBlock(yUp, sx, tx, blocks)) return yUp;
    if (yDown <= maxY && !hSegmentCrossesBlock(yDown, sx, tx, blocks))
      return yDown;
  }
  return preferredY; // fallback
}

/**
 * Find a clear X for a vertical segment between two Y coords,
 * starting from a preferred X.
 */
export function findClearX(
  preferredX: number,
  sy: number,
  ty: number,
  blocks: BlockRect[],
  minX: number,
  maxX: number
): number {
  if (!vSegmentCrossesBlock(preferredX, sy, ty, blocks)) return preferredX;
  for (let offset = GRID; offset <= GRID * 12; offset += GRID) {
    const xLeft = snapToGrid(preferredX - offset);
    const xRight = snapToGrid(preferredX + offset);
    if (xLeft >= minX && !vSegmentCrossesBlock(xLeft, sy, ty, blocks))
      return xLeft;
    if (xRight <= maxX && !vSegmentCrossesBlock(xRight, sy, ty, blocks))
      return xRight;
  }
  return preferredX; // fallback
}

/**
 * Smart orthogonal path that adapts routing based on dot direction.
 * For side dots: exits horizontally first.
 * For top/bottom dots: exits vertically first.
 * When one end is a pill (null dotId), adapts to the known dot's direction.
 * blockRects: array of {x,y,w,h} for leaf blocks to avoid crossing.
 */
export function smartElbowPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  sDotId: string | null | undefined,
  tDotId: string | null | undefined,
  midOverride: number | undefined,
  blockRects?: BlockRect[]
): string {
  const sVert = isVerticalDot(sDotId);
  const tVert = isVerticalDot(tDotId);
  const sKnown = sDotId != null;
  const tKnown = tDotId != null;
  const blocks = blockRects || [];
  const minBound = -2000,
    maxBound = 8000;

  // Helper: build a V-H-V path, checking that vertical legs don't cross blocks.
  function vhvPath(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    mid?: number
  ): string {
    const my =
      mid !== undefined
        ? mid
        : findClearY(
            snapToGrid((y1 + y2) / 2),
            x1,
            x2,
            blocks,
            minBound,
            maxBound
          );
    const v1Cross = vSegmentCrossesBlock(x1, y1, my, blocks);
    const v2Cross = vSegmentCrossesBlock(x2, my, y2, blocks);
    if (!v1Cross && !v2Cross) {
      return `M${x1},${y1} L${x1},${my} L${x2},${my} L${x2},${y2}`;
    }
    // Detour: find a clear X channel to route the vertical leg around blocks
    if (v1Cross) {
      const exitY = isBottomDot(sDotId)
        ? snapToGrid(y1 + GRID)
        : snapToGrid(y1 - GRID);
      const clearX = findClearX(
        snapToGrid(x1 - GRID * 2),
        exitY,
        my,
        blocks,
        minBound,
        maxBound
      );
      return `M${x1},${y1} L${x1},${exitY} L${clearX},${exitY} L${clearX},${my} L${x2},${my} L${x2},${y2}`;
    }
    if (v2Cross) {
      const entryY = isTopDot(tDotId)
        ? snapToGrid(y2 - GRID)
        : snapToGrid(y2 + GRID);
      const clearX = findClearX(
        snapToGrid(x2 + GRID * 2),
        my,
        entryY,
        blocks,
        minBound,
        maxBound
      );
      return `M${x1},${y1} L${x1},${my} L${clearX},${my} L${clearX},${entryY} L${x2},${entryY} L${x2},${y2}`;
    }
    return `M${x1},${y1} L${x1},${my} L${x2},${my} L${x2},${y2}`;
  }

  // Helper: build an H-V-H path, checking that horizontal legs don't cross blocks.
  function hvhPath(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    mid?: number
  ): string {
    const mx =
      mid !== undefined
        ? mid
        : findClearX(
            snapToGrid((x1 + x2) / 2),
            y1,
            y2,
            blocks,
            minBound,
            maxBound
          );
    const h1Cross = hSegmentCrossesBlock(y1, x1, mx, blocks);
    const h2Cross = hSegmentCrossesBlock(y2, mx, x2, blocks);
    if (!h1Cross && !h2Cross) {
      return `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`;
    }
    if (h1Cross) {
      const exitX = isRightDot(sDotId)
        ? snapToGrid(x1 + GRID)
        : snapToGrid(x1 - GRID);
      const clearY = findClearY(
        snapToGrid(y1 - GRID * 2),
        exitX,
        mx,
        blocks,
        minBound,
        maxBound
      );
      return `M${x1},${y1} L${exitX},${y1} L${exitX},${clearY} L${mx},${clearY} L${mx},${y2} L${x2},${y2}`;
    }
    if (h2Cross) {
      const entryX = isLeftDot(tDotId)
        ? snapToGrid(x2 - GRID)
        : snapToGrid(x2 + GRID);
      const clearY = findClearY(
        snapToGrid(y2 + GRID * 2),
        mx,
        entryX,
        blocks,
        minBound,
        maxBound
      );
      return `M${x1},${y1} L${mx},${y1} L${mx},${clearY} L${entryX},${clearY} L${entryX},${y2} L${x2},${y2}`;
    }
    return `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`;
  }

  // Source -> Pill (tDotId is null): route based on source dot direction
  if (sKnown && !tKnown) {
    if (sVert) {
      const mid = midOverride !== undefined ? midOverride : undefined;
      return vhvPath(sx, sy, tx, ty, mid);
    } else {
      const mid = midOverride !== undefined ? midOverride : undefined;
      return hvhPath(sx, sy, tx, ty, mid);
    }
  }

  // Pill -> Target (sDotId is null): route based on target dot direction
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
  // Mixed: source vertical, target horizontal -- L-shape
  if (sVert && !tVert) {
    if (
      !vSegmentCrossesBlock(sx, sy, ty, blocks) &&
      !hSegmentCrossesBlock(ty, sx, tx, blocks)
    ) {
      return `M${sx},${sy} L${sx},${ty} L${tx},${ty}`;
    }
    return vhvPath(sx, sy, tx, ty);
  }
  // Mixed: source horizontal, target vertical -- L-shape
  if (
    !vSegmentCrossesBlock(tx, sy, ty, blocks) &&
    !hSegmentCrossesBlock(sy, sx, tx, blocks)
  ) {
    return `M${sx},${sy} L${tx},${sy} L${tx},${ty}`;
  }
  return hvhPath(sx, sy, tx, ty);
}

/**
 * Round sharp corners in an M/L SVG path with quadratic bezier curves.
 */
export function roundPath(pathStr: string, r: number = 6): string {
  const parts = pathStr.match(/[ML][^ML]*/g);
  if (!parts || parts.length < 3) return pathStr;
  const pts = parts.map((p) => {
    const n = p
      .trim()
      .substring(1)
      .split(/[,\s]+/)
      .map(Number);
    return { x: n[0], y: n[1] };
  });
  if (pts.length < 3) return pathStr;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1],
      cur = pts[i],
      next = pts[i + 1];
    const dx1 = cur.x - prev.x,
      dy1 = cur.y - prev.y,
      len1 = Math.hypot(dx1, dy1);
    const dx2 = next.x - cur.x,
      dy2 = next.y - cur.y,
      len2 = Math.hypot(dx2, dy2);
    const cr = Math.min(r, len1 / 2, len2 / 2);
    if (cr < 1 || len1 < 1 || len2 < 1) {
      d += ` L${cur.x},${cur.y}`;
      continue;
    }
    const sx = cur.x - (dx1 / len1) * cr,
      sy = cur.y - (dy1 / len1) * cr;
    const ex = cur.x + (dx2 / len2) * cr,
      ey = cur.y + (dy2 / len2) * cr;
    d += ` L${sx},${sy} Q${cur.x},${cur.y} ${ex},${ey}`;
  }
  d += ` L${pts[pts.length - 1].x},${pts[pts.length - 1].y}`;
  return d;
}

/**
 * Legacy H-V-H path (used for preview lines where dot IDs are unknown).
 */
export function elbowPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  midX?: number
): string {
  const mx = midX !== undefined ? midX : (sx + tx) / 2;
  return roundPath(`M${sx},${sy} L${mx},${sy} L${mx},${ty} L${tx},${ty}`);
}

/**
 * Returns an array of SVG path segment descriptors for the elbow.
 */
export function elbowSegments(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  midX?: number
): ElbowSegment[] {
  const mx = midX !== undefined ? midX : (sx + tx) / 2;
  return [
    { type: "H", x1: sx, y1: sy, x2: mx, y2: sy },
    { type: "V", x1: mx, y1: sy, x2: mx, y2: ty },
    { type: "H", x1: mx, y1: ty, x2: tx, y2: ty },
  ];
}
