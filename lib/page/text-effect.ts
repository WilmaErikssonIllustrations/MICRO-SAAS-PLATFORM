import type { CSSProperties } from "react";

// Text effects, like Canva's "Effekter". "" keeps the element's own look
// (e.g. the soft shadow the Hero gives text on an image); "none" removes it.

export const TEXT_EFFECTS = [
  { label: "Standard", value: "" },
  { label: "Ingen", value: "none" },
  { label: "Skugga", value: "shadow" },
  { label: "Lyft", value: "lift" },
  { label: "Kontur", value: "hollow" },
  { label: "Neon", value: "neon" },
  { label: "Eko", value: "echo" },
] as const;

export type TextEffect = (typeof TEXT_EFFECTS)[number]["value"];

const CSS: Record<Exclude<TextEffect, "">, CSSProperties> = {
  none: { textShadow: "none" },
  shadow: { textShadow: "0 2px 6px rgb(0 0 0 / 0.45)" },
  lift: { textShadow: "0 8px 24px rgb(0 0 0 / 0.35)" },
  // Only the outline, in the text's color.
  hollow: { textShadow: "none", WebkitTextStroke: "0.035em currentColor", WebkitTextFillColor: "transparent" },
  neon: { textShadow: "0 0 4px currentColor, 0 0 12px currentColor, 0 0 28px currentColor" },
  echo: { textShadow: "0.05em 0.05em 0 rgb(0 0 0 / 0.3), 0.1em 0.1em 0 rgb(0 0 0 / 0.15)" },
};

/** Inline styles for an effect; nothing for "" (the element's default). */
export function textEffectCss(value: TextEffect | undefined): CSSProperties {
  return value ? (CSS[value] ?? {}) : {};
}
