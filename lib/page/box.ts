import type { CSSProperties } from "react";

// The box a block's background is drawn in: its size, inner spacing,
// corners, where it sits on the page and where the content sits inside it.
// Defaults give a full-width band, as blocks had before.

export const BOX_POSITIONS = { left: "Vänster", center: "Mitten", right: "Höger" } as const;
export const BOX_VALIGNS = { top: "Uppe", center: "Mitten", bottom: "Nere" } as const;

/** Width in pixels or percent of the screen width (the page is full width). */
export const WIDTH_UNITS = { px: "Pixlar", "%": "% av skärmbredden" } as const;
/** Height in pixels or percent of the screen height. */
export const HEIGHT_UNITS = { px: "Pixlar", vh: "% av skärmhöjden" } as const;

export type WidthUnit = keyof typeof WIDTH_UNITS;
export type HeightUnit = keyof typeof HEIGHT_UNITS;

export type Box = {
  /** 0 is the full width. */
  width: number;
  widthUnit: WidthUnit;
  /** Minimum height; 0 fits the content. */
  height: number;
  heightUnit: HeightUnit;
  padding: number;
  radius: number;
  /** Where a narrower box sits on the page. */
  position: keyof typeof BOX_POSITIONS;
  /** Where the content sits in a taller box. */
  valign: keyof typeof BOX_VALIGNS;
};

export const DEFAULT_BOX: Box = {
  width: 0,
  widthUnit: "px",
  height: 0,
  heightUnit: "px",
  padding: 0,
  radius: 0,
  position: "center",
  valign: "top",
};

/** Slider ranges; width and height depend on their unit. */
export const BOX_RANGES = {
  width: { px: { min: 0, max: 1600, step: 10 }, "%": { min: 0, max: 100, step: 1 } },
  height: { px: { min: 0, max: 1200, step: 10 }, vh: { min: 0, max: 200, step: 1 } },
  padding: { min: 0, max: 200, step: 4 },
  radius: { min: 0, max: 200, step: 2 },
} as const;

export const boxRange = (box: Box, key: "width" | "height" | "padding" | "radius") =>
  key === "width"
    ? BOX_RANGES.width[box.widthUnit]
    : key === "height"
      ? BOX_RANGES.height[box.heightUnit]
      : BOX_RANGES[key];

/**
 * A height for CSS. Screen-height units use svh: the height that stays
 * visible on phones even with the browser's address bar shown, so 100 %
 * really fits on the screen.
 */
export const cssHeight = (value: number, unit: HeightUnit | undefined) => (unit === "vh" ? `${value}svh` : value);

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
    width: box.width ? (box.widthUnit === "%" ? `${box.width}%` : box.width) : "100%",
    maxWidth: "100%",
    minHeight: box.height ? cssHeight(box.height, box.heightUnit) : undefined,
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
  if (typeof input.widthUnit === "string" && Object.hasOwn(WIDTH_UNITS, input.widthUnit)) {
    box.widthUnit = input.widthUnit as WidthUnit;
  }
  if (typeof input.heightUnit === "string" && Object.hasOwn(HEIGHT_UNITS, input.heightUnit)) {
    box.heightUnit = input.heightUnit as HeightUnit;
  }
  for (const key of ["width", "height", "padding", "radius"] as const) {
    const number = input[key];
    if (typeof number === "number" && Number.isFinite(number)) {
      const { min, max } = boxRange(box, key);
      box[key] = Math.round(Math.min(max, Math.max(min, number)));
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
