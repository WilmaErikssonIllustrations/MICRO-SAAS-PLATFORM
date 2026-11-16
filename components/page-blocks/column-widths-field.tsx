"use client";

import { FieldLabel } from "@puckeditor/core";

/** "60 % / 40 %" for dragged widths, or null when the columns are equal. */
export function columnWidthsSummary(value: number[] | undefined) {
  if (!Array.isArray(value) || value.length === 0) return null;
  const total = value.reduce((sum, width) => sum + width, 0);
  return value.map((width) => `${Math.round((width / total) * 100)} %`).join(" / ");
}

// Puck custom field: column widths are set by dragging between the columns
// on the page; this shows them and can make the columns equal again.
export function ColumnWidthsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number[] | undefined;
  onChange: (value: number[]) => void;
}) {
  const summary = columnWidthsSummary(value);
  return (
    <FieldLabel label={label} el="div">
      <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
        <p style={{ margin: 0 }}>{summary ?? "Lika breda"}</p>
        <p style={{ margin: 0, color: "#71717a" }}>Dra i avdelaren mellan kolumnerna för att ändra bredden.</p>
        {summary && (
          <button
            type="button"
            onClick={() => onChange([])}
            style={{
              justifySelf: "start",
              padding: "6px 12px",
              border: "1px solid #d4d4d8",
              borderRadius: 6,
              background: "white",
              cursor: "pointer",
            }}
          >
            Gör lika breda
          </button>
        )}
      </div>
    </FieldLabel>
  );
}
