// 5×7 dot-matrix numerals (DESIGN-BRIEF: hero numbers render as dot grids).
// Each digit is 7 row bitmasks over 5 columns, MSB = leftmost column.

const FONT: Record<string, number[]> = {
  '0': [14, 17, 19, 21, 25, 17, 14],
  '1': [4, 12, 4, 4, 4, 4, 14],
  '2': [14, 17, 1, 2, 4, 8, 31],
  '3': [31, 2, 4, 2, 1, 17, 14],
  '4': [2, 6, 10, 18, 31, 2, 2],
  '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14],
  '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 2, 12],
};

export interface Dot {
  cx: number;
  cy: number;
  on: boolean;
}

/** Dot grid for one digit; `grid` is the dot pitch in px. */
export function digitDots(ch: string, grid = 5.2): Dot[] | null {
  const rows = FONT[ch];
  if (!rows) return null;
  const dots: Dot[] = [];
  rows.forEach((mask, r) => {
    for (let c = 0; c < 5; c++) {
      dots.push({ cx: c * grid + 2, cy: r * grid + 2, on: (mask & (16 >> c)) !== 0 });
    }
  });
  return dots;
}

export const digitSize = (grid = 5.2): { w: number; h: number } => ({ w: 5 * grid, h: 7 * grid });
