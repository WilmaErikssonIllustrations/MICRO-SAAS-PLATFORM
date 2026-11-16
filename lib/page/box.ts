import type { CSSProperties } from "react";

// The box a block's background is drawn in: its size, inner spacing,
// corners, where it sits on the page and where the content sits inside it.
// Defaults give a full-width band, as blocks had before.

export const BOX_POSITIONS = { left: "Vänster", center: "Mitten", right: "Höger" } as const;
export const BOX_VALIGNS = { top: "Uppe", center: "Mitten", bottom: "Nere" } as const;

export type Box = {
  /** Pixels; 0 is the full width. */
  width: number;
  /** Minimum height in pixels; 0 fits the content. */
  height: number;
  padding: number;
  radius: number;
  /** Where a narrower box sits on the page. */
  position: keyof typeof BOX_POSITIONS;
  /** Where the content sits in a taller box. */
  valign: keyof typeof BOX_VALIGNS;
};

export const DEFAULT_BOX: Box = { width: 0, height: 0, padding: 0, radius: 0, position: "center", valign: "top" };

export const BOX_RANGES = {
  width: { min: 0, max: 1600, step: 10 },
  height: { min: 0, max: 1200, step: 10 },
  padding: { min: 0, max: 200, step: 4 },
  radius: { min: 0, max: 200, step: 2 },
} as const;

export const withBoxDefaults = (value: Partial<Box> | undefined): Box => ({ ...DEFAULT_BOX, ...value });

export function isDefaultBox(value: Partial<Box> | undefined) {
  const box = withBoxDefaults(value);
  return (Object.keys(DEFAULT_BOX) as (keyof Box)[]).every((key) => box[key] === DEFAULT_BOX[key]);
}

const justify = { left: "flex-start", center: "center", right: "flex-end", top: "flex-start", bottom: "flex-end" };

/** The full-width row that places the box. */
export function boxRowStyle(value: Partial<Box> | undefined): CSSProperties {
  return { display: "flex", justifyContent: justify[withBoxDefaults(value).position] };
}

/** The box itself; the background goes on it. */
export function boxStyle(value: Partial<Box> | undefined): CSSProperties {
  const box = withBoxDefaults(value);
  return {
    width: box.width ? box.width : "100%",
    maxWidth: "100%",
    minHeight: box.height || undefined,
    padding: box.padding || undefined,
    borderRadius: box.radius || undefined,
    display: "flex",
    flexDirection: "column",
    justifyContent: justify[box.valign],
  };
}

/** Keeps only known settings within range; anything else gets the default. */
export function sanitizeBox(value: unknown): Box {
  const input = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const box = { ...DEFAULT_BOX };
  for (const key of Object.keys(BOX_RANGES) as (keyof typeof BOX_RANGES)[]) {
    const number = input[key];
    if (typeof number === "number" && Number.isFinite(number)) {
      box[key] = Math.round(Math.min(BOX_RANGES[key].max, Math.max(BOX_RANGES[key].min, number)));
    }
  }
  if (typeof input.position === "string" && Object.hasOwn(BOX_POSITIONS, input.position)) {
    box.position = input.position as Box["position"];
  }
  if (typeof input.valign === "string" && Object.hasOwn(BOX_VALIGNS, input.valign)) {
    box.valign = input.valign as Box["valign"];
  }
  return box;
}
