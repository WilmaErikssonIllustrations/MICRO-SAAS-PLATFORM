"use client";

import { createUsePuck, FieldLabel } from "@puckeditor/core";
import { useState } from "react";
import {
  DEFAULT_TYPOGRAPHY,
  isDefaultTypography,
  TYPOGRAPHY_RANGES,
  type Typography,
  withTypographyDefaults,
} from "@/lib/page/typography";

const SLIDERS = [
  { key: "size", label: "Storlek" },
  { key: "letterSpacing", label: "Teckenavstånd" },
  { key: "lineHeight", label: "Radavstånd" },
] as const;

type Key = (typeof SLIDERS)[number]["key"];

/** The field metadata from typographyField() in lib/page/config.tsx. */
export type TypographyMetadata = { basePx?: number | Record<string, number>; baseProp?: string };

/** The block's normal text size in pixels, given its props. */
export function resolveBasePx(metadata: TypographyMetadata | undefined, props: Record<string, unknown> | undefined) {
  const base = metadata?.basePx;
  if (typeof base === "number") return base;
  if (!base || !metadata?.baseProp) return undefined;
  return base[String(props?.[metadata.baseProp])];
}

const usePuck = createUsePuck();

const toPx = (size: number, basePx: number) => Math.round((basePx * size) / 100);

/** Short summary for menus, e.g. "48 px" or "120 %". */
export function typographySummary(value: Partial<Typography> | undefined, basePx?: number) {
  if (isDefaultTypography(value)) return "Standard";
  const { size } = withTypographyDefaults(value);
  return basePx ? `${toPx(size, basePx)} px` : `${size} %`;
}

/**
 * Each setting in pixels, given the block's normal text size: the size,
 * letter spacing (stored in thousandths of an em, like Canva) and line
 * height (stored in % of the font size). 0 keeps meaning "Standard" for
 * the two spacings.
 */
function pixelUnits(basePx: number, size: number) {
  const fontPx = (basePx * size) / 100;
  return {
    size: { toPx: (v: number) => toPx(v, basePx), fromPx: (px: number) => Math.round((px / basePx) * 100) },
    letterSpacing: {
      toPx: (v: number) => Math.round((v / 1000) * fontPx * 10) / 10,
      fromPx: (px: number) => Math.round((px / fontPx) * 1000),
    },
    lineHeight: {
      toPx: (v: number) => Math.round((v / 100) * fontPx),
      fromPx: (px: number) => Math.round((px / fontPx) * 100),
    },
  } satisfies Record<Key, { toPx: (v: number) => number; fromPx: (px: number) => number }>;
}

/** Without a known text size: the stored units, as before. */
const relativeFormat: Record<Key, (v: number) => string> = {
  size: (v) => `${v} %`,
  letterSpacing: (v) => (v === 0 ? "Standard" : `${v}`),
  lineHeight: (v) => (v === 0 ? "Standard" : `${(v / 100).toFixed(2)}`),
};

// Sliders for text size, letter spacing and line height. When the block's
// normal size is known, each also shows and takes a value in pixels. Used
// in the side panel, the toolbar and the right-click menu.
export function TypographyControls({
  value,
  onChange,
  basePx,
}: {
  value: Partial<Typography> | undefined;
  onChange: (value: Typography) => void;
  basePx?: number;
}) {
  const typography = withTypographyDefaults(value);
  // What's typed in a pixel box, until it's a usable value.
  const [drafts, setDrafts] = useState<Partial<Record<Key, string>>>({});
  const units = basePx ? pixelUnits(basePx, typography.size) : null;

  function changePx(key: Key, text: string) {
    setDrafts((current) => ({ ...current, [key]: text }));
    const px = Number(text);
    if (!units || text.trim() === "" || !Number.isFinite(px) || (key === "size" && px <= 0)) return;
    const { min, max } = TYPOGRAPHY_RANGES[key];
    const next = units[key].fromPx(px);
    // 0 is "Standard" for the spacings; anything else must be in range.
    if (key !== "size" && next === 0) return onChange({ ...typography, [key]: 0 });
    if (next >= min && next <= max) onChange({ ...typography, [key]: next });
  }

  return (
    <div className="grid gap-4 p-1 text-sm text-zinc-800">
      {SLIDERS.map(({ key, label }) => {
        const range = TYPOGRAPHY_RANGES[key];
        const current = typography[key];
        // Line height's "default" (0) sits below the slider; show it at 1.5.
        const sliderValue = key === "lineHeight" && current === 0 ? 150 : current;
        const isDefault = key !== "size" && current === 0;
        const shown = units ? (isDefault ? "Standard" : `${units[key].toPx(current)} px`) : relativeFormat[key](current);
        return (
          <div key={key}>
            <label className="block">
              <span className="flex justify-between font-medium">
                {label}
                <span className="font-normal text-zinc-500 tabular-nums">{shown}</span>
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
            {units && (
              <label className="mt-1.5 flex items-center gap-2 text-zinc-600">
                <span className="flex-1">I pixlar</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step={key === "letterSpacing" ? 0.1 : 1}
                  aria-label={`${label} i pixlar`}
                  placeholder={isDefault ? "Standard" : undefined}
                  value={drafts[key] ?? (isDefault ? "" : units[key].toPx(current))}
                  onChange={(event) => changePx(key, event.target.value)}
                  onBlur={() => setDrafts((current) => ({ ...current, [key]: undefined }))}
                  className="h-8 w-24 rounded-lg border border-zinc-200 px-2 text-right tabular-nums focus:border-violet-500 focus:outline-none"
                />
                px
              </label>
            )}
          </div>
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
  metadata,
}: {
  label: string;
  value: Partial<Typography> | undefined;
  onChange: (value: Typography) => void;
  metadata?: TypographyMetadata;
}) {
  const props = usePuck((s) => s.selectedItem?.props);
  return (
    <FieldLabel label={label} el="div">
      <TypographyControls value={value} onChange={onChange} basePx={resolveBasePx(metadata, props)} />
    </FieldLabel>
  );
}
