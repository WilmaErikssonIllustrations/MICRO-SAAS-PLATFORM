"use client";

import { createUsePuck, FieldLabel } from "@puckeditor/core";
import { ColorField } from "./color-field";

const usePuck = createUsePuck();

// Puck custom field on Kolumner: a background color per column.
export function ColumnColorsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[] | undefined;
  onChange: (value: string[]) => void;
}) {
  const count = usePuck((s) => s.selectedItem?.props.count);
  const colors = Array.isArray(value) ? value : [];
  const columns = typeof count === "number" ? count : 2;

  return (
    <FieldLabel label={label} el="div">
      <div style={{ display: "grid", gap: 4 }}>
        {Array.from({ length: columns }, (_, index) => (
          <ColorField
            key={index}
            label={`Kolumn ${index + 1}`}
            value={colors[index] ?? ""}
            optional
            onChange={(color) => onChange(setColumnColor(colors, index, color))}
          />
        ))}
      </div>
    </FieldLabel>
  );
}

/** A copy of `colors` with column `index` set (filling gaps with ""). */
export function setColumnColor(colors: string[] | undefined, index: number, color: string) {
  const next = Array.from({ length: Math.max(colors?.length ?? 0, index + 1) }, (_, i) => colors?.[i] ?? "");
  next[index] = color;
  return next;
}
