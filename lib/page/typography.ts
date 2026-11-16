import type { CSSProperties } from "react";

// Text size, letter spacing and line height for a block. The blocks size
// their text with CSS variables (--fs, --ls, --lh) and fall back to their
// own defaults, so the default values here mean "as designed".

export type Typography = {
  /** Percent of the block's normal text size. */
  size: number;
  /** Thousandths of an em, like in Canva; 0 means the block's default. */
  letterSpacing: number;
  /** Percent of the font size; 0 means the block's default. */
  lineHeight: number;
};

export const DEFAULT_TYPOGRAPHY: Typography = { size: 100, letterSpacing: 0, lineHeight: 0 };

export const TYPOGRAPHY_RANGES = {
  size: { min: 50, max: 300, step: 5 },
  letterSpacing: { min: -100, max: 500, step: 5 },
  lineHeight: { min: 80, max: 250, step: 5 },
} as const;

export function withTypographyDefaults(value: Partial<Typography> | undefined): Typography {
  return { ...DEFAULT_TYPOGRAPHY, ...value };
}

export const isDefaultTypography = (value: Partial<Typography> | undefined) => {
  const t = withTypographyDefaults(value);
  return t.size === 100 && t.letterSpacing === 0 && t.lineHeight === 0;
};

/** CSS variables for a block's wrapper; nothing is set for defaults. */
export function typographyVars(value: Partial<Typography> | undefined): CSSProperties {
  const t = withTypographyDefaults(value);
  return {
    ...(t.size !== 100 && { "--fs": t.size / 100 }),
    ...(t.letterSpacing !== 0 && { "--ls": `${t.letterSpacing / 1000}em` }),
    ...(t.lineHeight !== 0 && { "--lh": t.lineHeight / 100 }),
  } as CSSProperties;
}

/** Keeps only known settings within range; anything else gets the default. */
export function sanitizeTypography(value: unknown): Typography {
  const input = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const result = { ...DEFAULT_TYPOGRAPHY };
  for (const key of Object.keys(TYPOGRAPHY_RANGES) as (keyof Typography)[]) {
    const number = input[key];
    if (typeof number !== "number" || !Number.isFinite(number)) continue;
    // 0 is allowed for the two settings where it means "default".
    if (number === 0 && key !== "size") {
      result[key] = 0;
      continue;
    }
    const { min, max } = TYPOGRAPHY_RANGES[key];
    result[key] = Math.min(max, Math.max(min, Math.round(number)));
  }
  return result;
}
