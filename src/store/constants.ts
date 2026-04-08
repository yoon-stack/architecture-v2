// ── Layout constants and colour palette ──

export const COLORS = {
  orange: "#f97316",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  gray: "#94a3b8",
} as const;

export const GRID = 40;
export const BW = 260;
export const BH = 95;
export const PAD = 40;
export const HEADER_H = 40;
export const PILL_H = 28;
export const PILL_MIN_W = 80;
export const INTER_BLOCK = 280;
export const ROW_GAP = 120;

/** Snap a value to the nearest grid line */
export function snapToGrid(v: number): number {
  return Math.round(v / GRID) * GRID;
}
