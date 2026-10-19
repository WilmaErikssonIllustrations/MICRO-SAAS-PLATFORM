"use client";

import { FieldLabel } from "@puckeditor/core";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
};

// Puck custom field: a color picker kept in sync with a hex text input.
export function ColorField({ label, value, onChange, readOnly }: ColorFieldProps) {
  return (
    <FieldLabel label={label} el="div">
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="color"
          aria-label={label}
          value={HEX_COLOR.test(value) ? value : "#000000"}
          onChange={(event) => onChange(event.target.value)}
          disabled={readOnly}
          style={{ width: 44, height: 36, padding: 2, cursor: "pointer" }}
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          readOnly={readOnly}
          maxLength={7}
          style={{
            flex: 1,
            height: 36,
            padding: "0 10px",
            border: "1px solid #d4d4d8",
            borderRadius: 6,
            fontFamily: "monospace",
          }}
        />
      </div>
    </FieldLabel>
  );
}
