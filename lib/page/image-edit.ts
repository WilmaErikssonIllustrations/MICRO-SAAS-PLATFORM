import type { CSSProperties } from "react";

// Non-destructive image edits: stored as settings next to the image URL and
// applied with CSS, so the original upload is kept and edits can be undone.
// Shared by the editor, the published page and lib/page/sanitize.ts.

export const IMAGE_FILTERS = {
  none: { label: "Inget", css: "" },
  grayscale: { label: "Svartvit", css: "grayscale(1)" },
  sepia: { label: "Sepia", css: "sepia(0.8)" },
  warm: { label: "Varm", css: "sepia(0.3) saturate(1.3) hue-rotate(-10deg)" },
  cool: { label: "Kall", css: "saturate(0.9) hue-rotate(15deg) brightness(1.05)" },
  fade: { label: "Blekt", css: "contrast(0.85) brightness(1.1) saturate(0.7)" },
  vivid: { label: "Livfull", css: "saturate(1.6) contrast(1.1)" },
} as const;

export const IMAGE_ASPECTS = {
  original: { label: "Original", ratio: undefined },
  "1:1": { label: "Kvadrat 1:1", ratio: "1 / 1" },
  "4:3": { label: "Liggande 4:3", ratio: "4 / 3" },
  "16:9": { label: "Bred 16:9", ratio: "16 / 9" },
  "3:4": { label: "Stående 3:4", ratio: "3 / 4" },
} as const;

export const IMAGE_RADII = {
  none: { label: "Inga", css: "0" },
  sm: { label: "Små", css: "0.75rem" },
  lg: { label: "Stora", css: "2rem" },
  full: { label: "Rund", css: "9999px" },
} as const;

export type ImageEdit = {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  filter: keyof typeof IMAGE_FILTERS;
  flipX: boolean;
  flipY: boolean;
  aspect: keyof typeof IMAGE_ASPECTS;
  focusX: number;
  focusY: number;
  /** Its own focus point on phones (below 640 px), instead of focusX/Y. */
  mobileFocus: boolean;
  mobileFocusX: number;
  mobileFocusY: number;
  zoom: number;
  radius: keyof typeof IMAGE_RADII;
};

export const DEFAULT_IMAGE_EDIT: ImageEdit = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  filter: "none",
  flipX: false,
  flipY: false,
  aspect: "original",
  focusX: 50,
  focusY: 50,
  mobileFocus: false,
  mobileFocusX: 50,
  mobileFocusY: 50,
  zoom: 100,
  radius: "sm",
};

/** Slider ranges, in percent (blur in px). */
export const IMAGE_RANGES = {
  brightness: { min: 50, max: 150 },
  contrast: { min: 50, max: 150 },
  saturation: { min: 0, max: 200 },
  blur: { min: 0, max: 10 },
  focusX: { min: 0, max: 100 },
  focusY: { min: 0, max: 100 },
  mobileFocusX: { min: 0, max: 100 },
  mobileFocusY: { min: 0, max: 100 },
  zoom: { min: 100, max: 300 },
} as const;

/** Fills in defaults for pages saved before a setting existed. */
export function withImageDefaults(edit: Partial<ImageEdit> | undefined): ImageEdit {
  return { ...DEFAULT_IMAGE_EDIT, ...edit };
}

/** CSS for the <img> element. */
export function imageEditStyle(value: Partial<ImageEdit> | undefined): CSSProperties {
  const edit = withImageDefaults(value);
  const filter = [
    IMAGE_FILTERS[edit.filter].css,
    edit.brightness !== 100 && `brightness(${edit.brightness / 100})`,
    edit.contrast !== 100 && `contrast(${edit.contrast / 100})`,
    edit.saturation !== 100 && `saturate(${edit.saturation / 100})`,
    edit.blur > 0 && `blur(${edit.blur}px)`,
  ]
    .filter(Boolean)
    .join(" ");
  const zoom = edit.zoom / 100;
  const transform = [
    (edit.flipX || edit.flipY) && `scale(${edit.flipX ? -1 : 1}, ${edit.flipY ? -1 : 1})`,
    zoom !== 1 && `scale(${zoom})`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    filter: filter || undefined,
    transform: transform || undefined,
    transformOrigin: `${edit.focusX}% ${edit.focusY}%`,
    objectPosition: `${edit.focusX}% ${edit.focusY}%`,
    // Read by MOBILE_FOCUS_CSS on phones.
    ...(edit.mobileFocus && { "--mobile-focus": `${edit.mobileFocusX}% ${edit.mobileFocusY}%` }),
  } as CSSProperties;
}

/**
 * Puts images with their own phone focus point (--mobile-focus, from
 * imageEditStyle) on it below 640 px, Tailwind's `sm`, where the Hero
 * switches to its phone layout. !important to win over the inline
 * desktop position. Added to every page by SiteRoot.
 */
export const MOBILE_FOCUS_CSS =
  '@media not all and (min-width:40rem){img[style*="--mobile-focus"]{object-position:var(--mobile-focus)!important;transform-origin:var(--mobile-focus)!important}}';

/** CSS for the box around the image: crop format and corners. */
export function imageFrameStyle(value: Partial<ImageEdit> | undefined): CSSProperties {
  const edit = withImageDefaults(value);
  return {
    aspectRatio: IMAGE_ASPECTS[edit.aspect].ratio,
    borderRadius: IMAGE_RADII[edit.radius].css,
  };
}

/** Keeps only known settings with valid values; anything else gets the default. */
export function sanitizeImageEdit(value: unknown): ImageEdit {
  const input = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const edit = { ...DEFAULT_IMAGE_EDIT };

  for (const [key, range] of Object.entries(IMAGE_RANGES) as [keyof typeof IMAGE_RANGES, { min: number; max: number }][]) {
    const number = input[key];
    if (typeof number === "number" && Number.isFinite(number)) {
      edit[key] = Math.min(range.max, Math.max(range.min, Math.round(number)));
    }
  }
  if (typeof input.flipX === "boolean") edit.flipX = input.flipX;
  if (typeof input.flipY === "boolean") edit.flipY = input.flipY;
  if (typeof input.mobileFocus === "boolean") edit.mobileFocus = input.mobileFocus;
  if (typeof input.filter === "string" && Object.hasOwn(IMAGE_FILTERS, input.filter)) {
    edit.filter = input.filter as ImageEdit["filter"];
  }
  if (typeof input.aspect === "string" && Object.hasOwn(IMAGE_ASPECTS, input.aspect)) {
    edit.aspect = input.aspect as ImageEdit["aspect"];
  }
  if (typeof input.radius === "string" && Object.hasOwn(IMAGE_RADII, input.radius)) {
    edit.radius = input.radius as ImageEdit["radius"];
  }
  return edit;
}
