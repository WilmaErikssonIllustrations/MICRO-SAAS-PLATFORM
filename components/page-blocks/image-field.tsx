"use client";

import { FieldLabel } from "@puckeditor/core";
import { type ChangeEvent, useState } from "react";
import { requestImageUpload } from "@/actions/uploads";

type ImageFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
};

// Puck custom field: uploads the chosen image straight to S3 through a
// presigned URL and stores the resulting public URL as the field value.
export function ImageField({ label, value, onChange, readOnly }: ImageFieldProps) {
  const [status, setStatus] = useState<{ uploading: boolean; error: string | null }>({
    uploading: false,
    error: null,
  });

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setStatus({ uploading: true, error: null });
    const ticket = await requestImageUpload({ contentType: file.type, size: file.size });
    if (!ticket.ok) {
      setStatus({ uploading: false, error: ticket.message });
      return;
    }

    const response = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    }).catch(() => null);

    if (!response?.ok) {
      setStatus({ uploading: false, error: "Uppladdningen misslyckades. Försök igen." });
      return;
    }
    onChange(ticket.publicUrl);
    setStatus({ uploading: false, error: null });
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
              cursor: readOnly || status.uploading ? "default" : "pointer",
              background: "white",
            }}
          >
            {status.uploading ? "Laddar upp..." : value ? "Byt bild" : "Ladda upp bild"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              onChange={handleFile}
              disabled={readOnly || status.uploading}
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
        {status.error && (
          <p role="alert" style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>
            {status.error}
          </p>
        )}
      </div>
    </FieldLabel>
  );
}
