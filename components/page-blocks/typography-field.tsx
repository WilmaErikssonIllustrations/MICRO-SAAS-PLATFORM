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
  { key: "size", label: "Storlek", format: (v: number) => `${v} %` },
  { key: "letterSpacing", label: "Teckenavstånd", format: (v: number) => (v === 0 ? "Standard" : `${v}`) },
  { key: "lineHeight", label: "Radavstånd", format: (v: number) => (v === 0 ? "Standard" : `${(v / 100).toFixed(2)}`) },
] as const;

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

// Sliders for text size, letter spacing and line height, plus the size in
// pixels when the block's normal size is known. Used in the side panel and
// in the right-click menu.
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
  // What's typed in the pixel box, until it's a usable size.
  const [pxDraft, setPxDraft] = useState<string | null>(null);

  function changePx(text: string) {
    setPxDraft(text);
    const px = Number(text);
    if (!basePx || !Number.isFinite(px) || px <= 0) return;
    const size = Math.round((px / basePx) * 100);
    const { min, max } = TYPOGRAPHY_RANGES.size;
    if (size >= min && size <= max) onChange({ ...typography, size });
  }

  return (
    <div className="grid gap-4 p-1 text-sm text-zinc-800">
      {SLIDERS.map(({ key, label, format }) => {
        const range = TYPOGRAPHY_RANGES[key];
        const current = typography[key];
        // Line height's "default" (0) sits below the slider; show it at 1.5.
        const sliderValue = key === "lineHeight" && current === 0 ? 150 : current;
        return (
          <div key={key}>
            <label className="block">
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
            {key === "size" && basePx && (
              <label className="mt-1.5 flex items-center gap-2 text-zinc-600">
                Storlek i pixlar
                <input
                  type="number"
                  inputMode="numeric"
                  min={toPx(range.min, basePx)}
                  max={toPx(range.max, basePx)}
                  value={pxDraft ?? toPx(current, basePx)}
                  onChange={(event) => changePx(event.target.value)}
                  onBlur={() => setPxDraft(null)}
                  className="h-8 w-20 rounded-lg border border-zinc-200 px-2 text-right tabular-nums focus:border-violet-500 focus:outline-none"
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
