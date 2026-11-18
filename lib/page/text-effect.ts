import type { CSSProperties } from "react";

// Text effects, like Canva's "Effekter". "" is no effect, the default.
// ("none" on pages saved briefly before that becomes "" when sanitized.)

export const TEXT_EFFECTS = [
  { label: "Ingen", value: "" },
  { label: "Skugga", value: "shadow" },
  { label: "Lyft", value: "lift" },
  { label: "Kontur", value: "hollow" },
  { label: "Neon", value: "neon" },
  { label: "Eko", value: "echo" },
] as const;

export type TextEffect = (typeof TEXT_EFFECTS)[number]["value"];

const CSS: Record<Exclude<TextEffect, "">, CSSProperties> = {
  shadow: { textShadow: "0 2px 6px rgb(0 0 0 / 0.45)" },
  lift: { textShadow: "0 8px 24px rgb(0 0 0 / 0.35)" },
  // Only the outline, in the text's color.
  hollow: { textShadow: "none", WebkitTextStroke: "0.035em currentColor", WebkitTextFillColor: "transparent" },
  neon: { textShadow: "0 0 4px currentColor, 0 0 12px currentColor, 0 0 28px currentColor" },
  echo: { textShadow: "0.05em 0.05em 0 rgb(0 0 0 / 0.3), 0.1em 0.1em 0 rgb(0 0 0 / 0.15)" },
};

/** Inline styles for an effect; nothing for "" (no effect). */
export function textEffectCss(value: TextEffect | undefined): CSSProperties {
  return value ? (CSS[value] ?? {}) : {};
}
