// Fonts for published pages: a curated set of Google Fonts plus fonts the
// user uploads. A font value is "" (the default font), a Google font name,
// or "custom:<name>" for an uploaded font listed in the page's customFonts.

export const GOOGLE_FONTS = [
  { name: "Inter", fallback: "sans-serif" },
  { name: "Roboto", fallback: "sans-serif" },
  { name: "Open Sans", fallback: "sans-serif" },
  { name: "Lato", fallback: "sans-serif" },
  { name: "Montserrat", fallback: "sans-serif" },
  { name: "Poppins", fallback: "sans-serif" },
  { name: "Nunito", fallback: "sans-serif" },
  { name: "Raleway", fallback: "sans-serif" },
  { name: "DM Sans", fallback: "sans-serif" },
  { name: "Space Grotesk", fallback: "sans-serif" },
  { name: "Oswald", fallback: "sans-serif" },
  { name: "Bebas Neue", fallback: "sans-serif" },
  { name: "Archivo Black", fallback: "sans-serif" },
  { name: "Playfair Display", fallback: "serif" },
  { name: "Merriweather", fallback: "serif" },
  { name: "Lora", fallback: "serif" },
  { name: "Libre Baskerville", fallback: "serif" },
  { name: "Pacifico", fallback: "cursive" },
  { name: "Dancing Script", fallback: "cursive" },
  { name: "Caveat", fallback: "cursive" },
] as const;

export type CustomFont = { name: string; url: string };

const CUSTOM_PREFIX = "custom:";
const FONT_NAME = /^[\p{L}\p{N} _-]{1,40}$/u;

export const isValidFontName = (name: string) => FONT_NAME.test(name.trim());

export const customFontValue = (name: string) => `${CUSTOM_PREFIX}${name}`;

const googleFont = (value: string) => GOOGLE_FONTS.find((font) => font.name === value);

/** True for "", a known Google font, or a well-formed custom font value. */
export function isFontValue(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value === "" || googleFont(value)) return true;
  return value.startsWith(CUSTOM_PREFIX) && isValidFontName(value.slice(CUSTOM_PREFIX.length));
}

/** Human-readable name for a font value. */
export function fontLabel(value: string) {
  if (!value) return "Standard";
  return value.startsWith(CUSTOM_PREFIX) ? value.slice(CUSTOM_PREFIX.length) : value;
}

// Uploaded fonts get their own family names, so they can't clash with
// Google fonts or the platform's fonts.
const customFamily = (name: string) => `"uf-${name}"`;

/** CSS font-family for a font value, or undefined for the default font. */
export function fontFamily(value: string | undefined) {
  if (!value) return undefined;
  if (value.startsWith(CUSTOM_PREFIX)) return `${customFamily(value.slice(CUSTOM_PREFIX.length))}, sans-serif`;
  const font = googleFont(value);
  return font ? `"${font.name}", ${font.fallback}` : undefined;
}

/** Stylesheet URL that loads these Google fonts, or null if none are used. */
export function googleFontsUrl(values: (string | undefined)[]) {
  const names = [...new Set(values)].filter((value): value is string => !!value && !!googleFont(value));
  if (names.length === 0) return null;
  const families = names.map((name) => `family=${name.replaceAll(" ", "+")}:wght@400;600;700`);
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

/** @font-face rules for uploaded fonts. URLs are validated on save. */
export function customFontFaces(fonts: CustomFont[] | undefined) {
  return (fonts ?? [])
    .map(
      (font) =>
        `@font-face{font-family:${customFamily(font.name)};src:url(${JSON.stringify(font.url)});font-display:swap;}`,
    )
    .join("\n");
}

/** CSS that loads the given fonts; used by the page and by blocks with their own font. */
export function fontCss(values: (string | undefined)[], customFonts?: CustomFont[]) {
  const url = googleFontsUrl(values);
  return [url && `@import url(${JSON.stringify(url)});`, customFontFaces(customFonts)].filter(Boolean).join("\n");
}

/** A safe, unique font name from an uploaded file name ("Brand-Bold.woff2" -> "Brand-Bold"). */
export function fontNameFromFile(fileName: string, taken: string[]) {
  const base =
    fileName
      .replace(/\.[^.]+$/, "")
      .replace(/[^\p{L}\p{N} _-]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 36) || "Typsnitt";
  let name = base;
  for (let n = 2; taken.includes(name); n++) name = `${base} ${n}`;
  return name;
}
