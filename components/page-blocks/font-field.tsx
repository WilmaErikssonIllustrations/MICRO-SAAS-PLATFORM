"use client";

import { createUsePuck, FieldLabel } from "@puckeditor/core";
import { type ChangeEvent, useState } from "react";
import {
  type CustomFont,
  customFontValue,
  fontFamily,
  fontLabel,
  fontNameFromFile,
  GOOGLE_FONTS,
} from "@/lib/page/fonts";
import { ACCEPTED_FONT_TYPES, useFontUpload } from "./use-upload";

const usePuck = createUsePuck();

const selectStyle = {
  width: "100%",
  height: 36,
  padding: "0 8px",
  border: "1px solid #d4d4d8",
  borderRadius: 8,
  background: "white",
  fontSize: 14,
};

/** The page's uploaded fonts, from the root props. */
export function useCustomFonts(): CustomFont[] {
  const fonts = usePuck((s) => s.appState.data.root.props?.customFonts);
  return Array.isArray(fonts) ? fonts : [];
}

// Puck custom field: pick a Google font or an uploaded one, with a preview.
export function FontField({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  const customFonts = useCustomFonts();

  return (
    <FieldLabel label={label} el="div">
      <div style={{ display: "grid", gap: 6 }}>
        <select
          value={value}
          disabled={readOnly}
          onChange={(event) => onChange(event.target.value)}
          style={selectStyle}
        >
          <option value="">Standard</option>
          {customFonts.length > 0 && (
            <optgroup label="Dina typsnitt">
              {customFonts.map((font) => (
                <option key={font.name} value={customFontValue(font.name)}>
                  {font.name}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Google Fonts">
            {GOOGLE_FONTS.map((font) => (
              <option key={font.name} value={font.name} style={{ fontFamily: fontFamily(font.name) }}>
                {font.name}
              </option>
            ))}
          </optgroup>
        </select>
        <p style={{ margin: 0, fontSize: 20, fontFamily: fontFamily(value) }}>Aa Bb Cc – {fontLabel(value)}</p>
      </div>
    </FieldLabel>
  );
}

// Puck custom field on the page: the fonts uploaded for this site.
export function FontListField({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: CustomFont[];
  onChange: (value: CustomFont[]) => void;
  readOnly?: boolean;
}) {
  const fonts = Array.isArray(value) ? value : [];
  const { upload, uploading, error } = useFontUpload();
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const url = await upload(file);
    if (!url) return;
    const name = fontNameFromFile(file.name, fonts.map((font) => font.name));
    onChange([...fonts, { name, url }]);
    setLastAdded(name);
  }

  return (
    <FieldLabel label={label} el="div" readOnly={readOnly}>
      <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
        {fonts.length === 0 && <p style={{ margin: 0, color: "#71717a" }}>Inga egna typsnitt än.</p>}
        {fonts.map((font) => (
          <div key={font.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: 1, fontSize: 16, fontFamily: fontFamily(customFontValue(font.name)) }}>
              {font.name}
            </span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onChange(fonts.filter((other) => other.name !== font.name))}
                style={{ background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }}
              >
                Ta bort
              </button>
            )}
          </div>
        ))}
        <label
          style={{
            padding: "6px 12px",
            border: "1px solid #d4d4d8",
            borderRadius: 6,
            cursor: readOnly || uploading ? "default" : "pointer",
            background: "white",
            justifySelf: "start",
          }}
        >
          {uploading ? "Laddar upp..." : "Ladda upp typsnitt"}
          <input
            type="file"
            accept={ACCEPTED_FONT_TYPES}
            onChange={handleFile}
            disabled={readOnly || uploading}
            style={{ display: "none" }}
          />
        </label>
        <p style={{ margin: 0, color: "#71717a" }}>WOFF2, WOFF, TTF eller OTF, högst 2 MB.</p>
        {lastAdded && !error && (
          <p style={{ margin: 0, color: "#15803d" }}>&quot;{lastAdded}&quot; finns nu i typsnittslistorna.</p>
        )}
        {error && (
          <p role="alert" style={{ margin: 0, color: "#dc2626" }}>
            {error}
          </p>
        )}
      </div>
    </FieldLabel>
  );
}
