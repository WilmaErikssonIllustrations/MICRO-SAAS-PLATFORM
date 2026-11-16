"use client";

import { FieldLabel } from "@puckeditor/core";
import {
  DEFAULT_TYPOGRAPHY,
  isDefaultTypography,
  TYPOGRAPHY_RANGES,
  type Typography,
  withTypographyDefaults,
} from "@/lib/page/typography";

const SLIDERS = [
  { key: "size", label: "Storlek", format: (v: number) => `${v} %` },
  { key: "letterSpacing", label: "Teckenavstånd", format: (v: number) => (v === 0 ? "Standard" : `${v}`) },
  { key: "lineHeight", label: "Radavstånd", format: (v: number) => (v === 0 ? "Standard" : `${(v / 100).toFixed(2)}`) },
] as const;

/** Short summary for menus, e.g. "120 %". */
export function typographySummary(value: Partial<Typography> | undefined) {
  return isDefaultTypography(value) ? "Standard" : `${withTypographyDefaults(value).size} %`;
}

// Sliders for text size, letter spacing and line height. Used in the side
// panel and in the right-click menu.
export function TypographyControls({
  value,
  onChange,
}: {
  value: Partial<Typography> | undefined;
  onChange: (value: Typography) => void;
}) {
  const typography = withTypographyDefaults(value);

  return (
    <div className="grid gap-4 p-1 text-sm text-zinc-800">
      {SLIDERS.map(({ key, label, format }) => {
        const range = TYPOGRAPHY_RANGES[key];
        const current = typography[key];
        // Line height's "default" (0) sits below the slider; show it at 1.5.
        const sliderValue = key === "lineHeight" && current === 0 ? 150 : current;
        return (
          <label key={key} className="block">
            <span className="flex justify-between font-medium">
              {label}
              <span className="font-normal text-zinc-500 tabular-nums">{format(current)}</span>
            </span>
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={range.step}
              value={sliderValue}
              onChange={(event) => onChange({ ...typography, [key]: Number(event.target.value) })}
              className="mt-2 w-full accent-violet-600"
            />
          </label>
        );
      })}
      <button
        type="button"
        disabled={isDefaultTypography(typography)}
        onClick={() => onChange(DEFAULT_TYPOGRAPHY)}
        className="justify-self-start rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-40"
      >
        Återställ till standard
      </button>
    </div>
  );
}

// Puck custom field wrapping the controls for the side panel.
export function TypographyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Partial<Typography> | undefined;
  onChange: (value: Typography) => void;
}) {
  return (
    <FieldLabel label={label} el="div">
      <TypographyControls value={value} onChange={onChange} />
    </FieldLabel>
  );
}
