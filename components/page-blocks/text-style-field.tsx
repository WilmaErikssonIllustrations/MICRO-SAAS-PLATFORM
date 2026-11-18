"use client";

import { FieldLabel } from "@puckeditor/core";
import type { TextStyle } from "@/lib/page/text-style";

const OPTIONS = [
  { key: "bold", label: "Fetstil" },
  { key: "italic", label: "Kursiv" },
  { key: "underline", label: "Understruken" },
] as const;

// Puck custom field for bold / italic / underline (Puck's own panel, e.g.
// on phones; the editor toolbar has B / I / U buttons for the same thing).
export function TextStyleField({
  label,
  value,
  onChange,
  defaultBold,
}: {
  label: string;
  value: TextStyle | undefined;
  onChange: (value: TextStyle) => void;
  defaultBold?: boolean;
}) {
  const current = { bold: defaultBold ?? false, italic: false, underline: false, ...value };
  return (
    <FieldLabel label={label}>
      <div style={{ display: "flex", gap: 12 }}>
        {OPTIONS.map(({ key, label: optionLabel }) => (
          <label key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={current[key]}
              onChange={(event) => onChange({ ...value, [key]: event.target.checked })}
            />
            {optionLabel}
          </label>
        ))}
      </div>
    </FieldLabel>
  );
}
