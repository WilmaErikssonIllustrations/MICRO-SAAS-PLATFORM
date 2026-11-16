"use client";

import { FieldLabel } from "@puckeditor/core";
import {
  BOX_POSITIONS,
  BOX_VALIGNS,
  type Box,
  boxRange,
  DEFAULT_BOX,
  HEIGHT_UNITS,
  isDefaultBox,
  WIDTH_UNITS,
  withBoxDefaults,
} from "@/lib/page/box";

const SLIDERS = [
  { key: "width", label: "Bredd", zero: "Hela bredden" },
  { key: "height", label: "Höjd", zero: "Automatisk" },
  { key: "padding", label: "Inre marginal", zero: "Ingen" },
  { key: "radius", label: "Rundade hörn", zero: "Inga" },
] as const;

/** "px", or "%" for the screen-relative units. */
const unitSymbol = (unit: string) => (unit === "px" ? "px" : "%");

/** Short summary for menus. */
export function boxSummary(value: Partial<Box> | undefined) {
  if (isDefaultBox(value)) return "Standard";
  const box = withBoxDefaults(value);
  if (box.height && box.heightUnit === "vh") return `${box.height} % höjd`;
  return box.width ? `${box.width} ${unitSymbol(box.widthUnit)}` : "Anpassad";
}

/** Width and height can be pixels or a share of the screen. */
const UNITS = {
  width: { prop: "widthUnit", options: WIDTH_UNITS },
  height: { prop: "heightUnit", options: HEIGHT_UNITS },
} as const;

// Controls for the box behind a block: size, spacing, corners and
// alignment. Used in the side panel and in the right-click menu.
export function BoxControls({
  value,
  onChange,
}: {
  value: Partial<Box> | undefined;
  onChange: (value: Box) => void;
}) {
  const box = withBoxDefaults(value);

  return (
    <div className="grid gap-4 p-1 text-sm text-zinc-800">
      {SLIDERS.map(({ key, label, zero }) => {
        const range = boxRange(box, key);
        const units = key === "width" || key === "height" ? UNITS[key] : null;
        const unit = units ? box[units.prop] : "px";
        return (
          <div key={key}>
            {units && (
              <Choice
                label={label}
                value={unit as string}
                options={units.options as Record<string, string>}
                // A screen share starts at 100 % (the whole screen); pixels at 0 (automatic).
                onChange={(next) => onChange({ ...box, [units.prop]: next, [key]: next === "px" ? 0 : 100 })}
              />
            )}
            <span className="mt-2 flex items-center justify-between font-medium">
              {units ? "" : label}
              <span className="flex items-center gap-1 font-normal text-zinc-500">
                {box[key] === 0 && <span>{zero}</span>}
                <input
                  type="number"
                  aria-label={`${label} (${unit})`}
                  min={range.min}
                  max={range.max}
                  value={box[key]}
                  onChange={(event) => {
                    const number = Number(event.target.value);
                    if (Number.isFinite(number) && number >= range.min && number <= range.max) {
                      onChange({ ...box, [key]: Math.round(number) });
                    }
                  }}
                  className="h-7 w-16 rounded-md border border-zinc-200 px-1.5 text-right text-zinc-800 tabular-nums focus:border-violet-500 focus:outline-none"
                />
                {unitSymbol(unit)}
              </span>
            </span>
            <input
              type="range"
              aria-label={label}
              min={range.min}
              max={range.max}
              step={range.step}
              value={box[key]}
              onChange={(event) => onChange({ ...box, [key]: Number(event.target.value) })}
              className="mt-2 w-full accent-violet-600"
            />
          </div>
        );
      })}
      <Choice label="Placering" value={box.position} options={BOX_POSITIONS} onChange={(position) => onChange({ ...box, position })} />
      <Choice label="Lodrät justering" value={box.valign} options={BOX_VALIGNS} onChange={(valign) => onChange({ ...box, valign })} />
      <button
        type="button"
        disabled={isDefaultBox(box)}
        onClick={() => onChange(DEFAULT_BOX)}
        className="justify-self-start rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-40"
      >
        Återställ till standard
      </button>
    </div>
  );
}

function Choice<K extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: K;
  options: Record<K, string>;
  onChange: (value: K) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 font-medium">{label}</p>
      <div
        style={{ gridTemplateColumns: `repeat(${Object.keys(options).length}, minmax(0, 1fr))` }}
        className="grid gap-1 rounded-lg bg-zinc-100 p-1"
      >
        {(Object.keys(options) as K[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            className={`rounded-md px-2 py-1 text-sm ${value === key ? "bg-white font-semibold text-violet-700 shadow-sm" : "text-zinc-600 hover:text-zinc-900"}`}
          >
            {options[key]}
          </button>
        ))}
      </div>
    </div>
  );
}

// Puck custom field wrapping the controls for the side panel.
export function BoxField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Partial<Box> | undefined;
  onChange: (value: Box) => void;
}) {
  return (
    <FieldLabel label={label} el="div">
      <BoxControls value={value} onChange={onChange} />
    </FieldLabel>
  );
}
