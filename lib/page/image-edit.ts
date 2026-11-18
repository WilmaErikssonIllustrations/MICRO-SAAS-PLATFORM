import type { CSSProperties } from "react";

// Non-destructive image edits: stored as settings next to the image URL and
// applied with CSS, so the original upload is kept and edits can be undone.
// Shared by the editor, the published page and lib/page/sanitize.ts.
//
// The settings are for all screens. A computer, tablet or phone can change
// any of them for itself (`desktop` / `tablet` / `phone`: only what
// differs); everything it doesn't change follows the settings for all.

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

/** One device's image settings. */
export type ImageSettings = {
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
  zoom: number;
  radius: keyof typeof IMAGE_RADII;
};

/** The settings for all screens, plus what a computer, tablet or phone changes for itself. */
export type ImageEdit = ImageSettings & {
  desktop?: Partial<ImageSettings>;
  tablet?: Partial<ImageSettings>;
  phone?: Partial<ImageSettings>;
};

/** "all" is every screen: the shared settings. */
export type ImageDevice = "all" | "desktop" | "tablet" | "phone";
type OwnDevice = Exclude<ImageDevice, "all">;
const OWN_DEVICES: OwnDevice[] = ["desktop", "tablet", "phone"];

export const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
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
  zoom: 100,
  radius: "sm",
};

export const DEFAULT_IMAGE_EDIT: ImageEdit = DEFAULT_IMAGE_SETTINGS;

/** Slider ranges, in percent (blur in px). */
export const IMAGE_RANGES = {
  brightness: { min: 50, max: 150 },
  contrast: { min: 50, max: 150 },
  saturation: { min: 0, max: 200 },
  blur: { min: 0, max: 10 },
  focusX: { min: 0, max: 100 },
  focusY: { min: 0, max: 100 },
  zoom: { min: 100, max: 300 },
} as const;

/** Pages saved with the earlier phone/tablet-only focus point. */
type LegacyFocus = {
  mobileFocus?: boolean;
  mobileFocusX?: number;
  mobileFocusY?: number;
  tabletFocus?: boolean;
  tabletFocusX?: number;
  tabletFocusY?: number;
};

/** Fills in defaults for pages saved before a setting existed. */
export function withImageDefaults(edit: Partial<ImageEdit> | undefined): ImageEdit {
  const {
    mobileFocus,
    mobileFocusX,
    mobileFocusY,
    tabletFocus,
    tabletFocusX,
    tabletFocusY,
    ...rest
  } = (edit ?? {}) as Partial<ImageEdit> & LegacyFocus;
  const result: ImageEdit = { ...DEFAULT_IMAGE_SETTINGS, ...rest };
  // The earlier own focus points become the devices' own settings.
  if (tabletFocus && !result.tablet) result.tablet = { focusX: tabletFocusX ?? 50, focusY: tabletFocusY ?? 50 };
  if (mobileFocus && !result.phone) result.phone = { focusX: mobileFocusX ?? 50, focusY: mobileFocusY ?? 50 };
  return result;
}

/** The settings a device uses: its own changes over the settings for all. */
export function deviceSettings(value: Partial<ImageEdit> | undefined, device: ImageDevice): ImageSettings {
  const { desktop, tablet, phone, ...base } = withImageDefaults(value);
  const own = { all: undefined, desktop, tablet, phone }[device];
  return { ...base, ...own };
}

/** Whether a computer, tablet or phone has settings of its own. */
export function hasDeviceSettings(value: Partial<ImageEdit> | undefined, device: ImageDevice) {
  if (device === "all") return false;
  const own = withImageDefaults(value)[device];
  return Boolean(own && Object.keys(own).length > 0);
}

/** The edit after changing settings for all screens, or for one device only. */
export function changeForDevice(value: Partial<ImageEdit> | undefined, device: ImageDevice, patch: Partial<ImageSettings>): ImageEdit {
  const edit = withImageDefaults(value);
  if (device === "all") return { ...edit, ...patch };
  return { ...edit, [device]: { ...edit[device], ...patch } };
}

/** The edit after a device's settings go back: the defaults for all, or a device following all again. */
export function resetDevice(value: Partial<ImageEdit> | undefined, device: ImageDevice): ImageEdit {
  const edit = withImageDefaults(value);
  if (device === "all") return { ...edit, ...DEFAULT_IMAGE_SETTINGS };
  const rest = { ...edit };
  delete rest[device];
  return rest;
}

/** filter, transform and position for one device's settings. */
function imageCss(settings: ImageSettings) {
  const filter = [
    IMAGE_FILTERS[settings.filter].css,
    settings.brightness !== 100 && `brightness(${settings.brightness / 100})`,
    settings.contrast !== 100 && `contrast(${settings.contrast / 100})`,
    settings.saturation !== 100 && `saturate(${settings.saturation / 100})`,
    settings.blur > 0 && `blur(${settings.blur}px)`,
  ]
    .filter(Boolean)
    .join(" ");
  const zoom = settings.zoom / 100;
  const transform = [
    (settings.flipX || settings.flipY) && `scale(${settings.flipX ? -1 : 1}, ${settings.flipY ? -1 : 1})`,
    zoom !== 1 && `scale(${zoom})`,
  ]
    .filter(Boolean)
    .join(" ");
  const position = `${settings.focusX}% ${settings.focusY}%`;
  return { filter, transform, position };
}

const cropped = (settings: ImageSettings) => settings.aspect !== "original";

/**
 * CSS for the <img> element: the settings for all inline, and each
 * computer's, tablet's or phone's own as variables that DEVICE_IMAGE_CSS
 * applies at its width. `sizedByFormat`: the image is h-full when cropped to a format,
 * else h-auto (Bild), so a device's own format sets its height too.
 */
export function imageEditStyle(value: Partial<ImageEdit> | undefined, sizedByFormat = false): CSSProperties {
  const edit = withImageDefaults(value);
  const css = imageCss(edit);
  const style: Record<string, string | undefined> = {
    filter: css.filter || undefined,
    transform: css.transform || undefined,
    transformOrigin: css.position,
    objectPosition: css.position,
  };
  for (const device of OWN_DEVICES) {
    if (!hasDeviceSettings(edit, device)) continue;
    const settings = deviceSettings(edit, device);
    const own = imageCss(settings);
    style[`--${device}-img-filter`] = own.filter || "none";
    style[`--${device}-img-transform`] = own.transform || "none";
    style[`--${device}-img-position`] = own.position;
    if (sizedByFormat) style[`--${device}-img-height`] = cropped(settings) ? "100%" : "auto";
  }
  return style as CSSProperties;
}

/** CSS for the box around the image: crop format and corners (a device's own as variables). */
export function imageFrameStyle(value: Partial<ImageEdit> | undefined): CSSProperties {
  const edit = withImageDefaults(value);
  const style: Record<string, string | undefined> = {
    aspectRatio: IMAGE_ASPECTS[edit.aspect].ratio,
    borderRadius: IMAGE_RADII[edit.radius].css,
  };
  for (const device of OWN_DEVICES) {
    if (!hasDeviceSettings(edit, device)) continue;
    const settings = deviceSettings(edit, device);
    style[`--${device}-frame-aspect`] = IMAGE_ASPECTS[settings.aspect].ratio ?? "auto";
    style[`--${device}-frame-radius`] = IMAGE_RADII[settings.radius].css;
  }
  return style as CSSProperties;
}

/**
 * Where each device's own settings apply: phones below 640 px (`sm`, where
 * the Hero switches to its phone layout), tablets up to 1024 px (`lg`),
 * computers from there.
 */
const DEVICE_MEDIA: Record<OwnDevice, string> = {
  phone: "not all and (min-width:40rem)",
  tablet: "(min-width:40rem) and (not (min-width:64rem))",
  desktop: "(min-width:64rem)",
};

/**
 * Applies a device's own settings (the variables from imageEditStyle /
 * imageFrameStyle) at its width. !important to win over the inline
 * settings for all. Added to every page by SiteRoot.
 */
export const DEVICE_IMAGE_CSS = OWN_DEVICES.map((device) => {
  const v = (name: string) => `var(--${device}-${name})!important`;
  return (
    `@media ${DEVICE_MEDIA[device]}{` +
    `img[style*="--${device}-img-filter"]{filter:${v("img-filter")};transform:${v("img-transform")};` +
    `transform-origin:${v("img-position")};object-position:${v("img-position")}}` +
    `img[style*="--${device}-img-height"]{height:${v("img-height")}}` +
    `[style*="--${device}-frame-aspect"]{aspect-ratio:${v("frame-aspect")};border-radius:${v("frame-radius")}}` +
    "}"
  );
}).join("\n");

/** Keeps known settings with valid values; `partial` keeps only those given (a device's own). */
function sanitizeSettings(input: Record<string, unknown>, partial: boolean): Partial<ImageSettings> {
  const settings: Partial<ImageSettings> = partial ? {} : { ...DEFAULT_IMAGE_SETTINGS };
  for (const [key, range] of Object.entries(IMAGE_RANGES) as [keyof typeof IMAGE_RANGES, { min: number; max: number }][]) {
    const number = input[key];
    if (typeof number === "number" && Number.isFinite(number)) {
      settings[key] = Math.min(range.max, Math.max(range.min, Math.round(number)));
    }
  }
  if (typeof input.flipX === "boolean") settings.flipX = input.flipX;
  if (typeof input.flipY === "boolean") settings.flipY = input.flipY;
  if (typeof input.filter === "string" && Object.hasOwn(IMAGE_FILTERS, input.filter)) {
    settings.filter = input.filter as ImageSettings["filter"];
  }
  if (typeof input.aspect === "string" && Object.hasOwn(IMAGE_ASPECTS, input.aspect)) {
    settings.aspect = input.aspect as ImageSettings["aspect"];
  }
  if (typeof input.radius === "string" && Object.hasOwn(IMAGE_RADII, input.radius)) {
    settings.radius = input.radius as ImageSettings["radius"];
  }
  return settings;
}

const asRecord = (value: unknown) => (value && typeof value === "object" ? value : {}) as Record<string, unknown>;

/** Keeps only known settings with valid values; anything else gets the default. */
export function sanitizeImageEdit(value: unknown): ImageEdit {
  const input = withImageDefaults(asRecord(value) as Partial<ImageEdit>) as unknown as Record<string, unknown>;
  const edit = sanitizeSettings(input, false) as ImageEdit;
  for (const device of OWN_DEVICES) {
    const own = sanitizeSettings(asRecord(input[device]), true);
    if (Object.keys(own).length > 0) edit[device] = own;
  }
  return edit;
}
