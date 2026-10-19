"use client";

import { useState } from "react";
import { FormField, fieldProps } from "./form-field";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

type ThemeColorFieldProps = {
  defaultValue: string;
  error?: string;
};

// A color picker and a hex text input kept in sync. Only the text input
// has a name, so it is the value that gets submitted.
export function ThemeColorField({ defaultValue, error }: ThemeColorFieldProps) {
  const [color, setColor] = useState(defaultValue);
  const pickerValue = HEX_COLOR.test(color) ? color : "#000000";

  return (
    <FormField
      id="themeColor"
      label="Temafärg"
      hint="Används för knappar och accenter."
      error={error}
    >
      <div className="flex items-center gap-3">
        <input
          type="color"
          aria-label="Välj temafärg"
          value={pickerValue}
          onChange={(event) => setColor(event.target.value)}
          className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
        />
        <input
          {...fieldProps("themeColor", error)}
          type="text"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          placeholder="#2563eb"
          maxLength={7}
          required
        />
      </div>
    </FormField>
  );
}
