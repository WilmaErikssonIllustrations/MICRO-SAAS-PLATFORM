"use client";

import { FieldLabel } from "@puckeditor/core";
import type { ChangeEvent } from "react";
import { ACCEPTED_IMAGE_TYPES, useImageUpload } from "./use-image-upload";

type ImageFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
};

// Puck custom field: uploads the chosen image and stores the resulting
// public URL as the field value.
export function ImageField({ label, value, onChange, readOnly }: ImageFieldProps) {
  const { upload, uploading, error } = useImageUpload();

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const url = await upload(file);
    if (url) onChange(url);
  }

  return (
    <FieldLabel label={label} el="div" readOnly={readOnly}>
      <div style={{ display: "grid", gap: 8 }}>
        {value && (
          // eslint-disable-next-line @next/next/no-img-element -- user uploads on S3
          <img
            src={value}
            alt=""
            style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 6 }}
          />
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
          <label
            style={{
              padding: "6px 12px",
              border: "1px solid #d4d4d8",
              borderRadius: 6,
              cursor: readOnly || uploading ? "default" : "pointer",
              background: "white",
            }}
          >
            {uploading ? "Laddar upp..." : value ? "Byt bild" : "Ladda upp bild"}
            <input
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              onChange={handleFile}
              disabled={readOnly || uploading}
              style={{ display: "none" }}
            />
          </label>
          {value && !readOnly && (
            <button
              type="button"
              onClick={() => onChange("")}
              style={{ background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }}
            >
              Ta bort
            </button>
          )}
        </div>
        {error && (
          <p role="alert" style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>
            {error}
          </p>
        )}
      </div>
    </FieldLabel>
  );
}
