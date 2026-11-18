import type { CSSProperties } from "react";

// Bold, italic and underline for a text element, like the B / I / U
// buttons in Canva. A missing value means the element's own look (e.g. a
// heading is bold unless bold is turned off).

export type TextStyle = { bold?: boolean; italic?: boolean; underline?: boolean };

export const DEFAULT_TEXT_STYLE: TextStyle = {};

const KEYS = ["bold", "italic", "underline"] as const;

/** Inline styles for the set values; nothing for the element's defaults. */
export function textStyleCss(value: TextStyle | undefined): CSSProperties {
  if (!value) return {};
  return {
    ...(value.bold !== undefined && { fontWeight: value.bold ? 700 : 400 }),
    ...(value.italic !== undefined && { fontStyle: value.italic ? "italic" : "normal" }),
    ...(value.underline !== undefined && {
      textDecorationLine: value.underline ? "underline" : "none",
      textDecorationThickness: "0.06em",
      textUnderlineOffset: "0.18em",
    }),
  };
}

/** Keeps only true/false for the known keys. */
export function sanitizeTextStyle(value: unknown): TextStyle {
  const input = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const result: TextStyle = {};
  for (const key of KEYS) if (typeof input[key] === "boolean") result[key] = input[key];
  return result;
}
