"use client";

import { FieldLabel, useGetPuck, usePuck } from "@puckeditor/core";
import { useImageEditor } from "./image-editor-context";

type ImageEditFieldProps = {
  label: string;
  imageProp: string;
  editProp: string;
  background: boolean;
};

// Puck custom field: opens the image editor for the selected block.
export function ImageEditField({ label, imageProp, editProp, background }: ImageEditFieldProps) {
  const editor = useImageEditor();
  const getPuck = useGetPuck();
  const hasImage = Boolean(usePuck().selectedItem?.props[imageProp]);

  return (
    <FieldLabel label={label} el="div">
      <button
        type="button"
        disabled={!hasImage || !editor}
        onClick={() => {
          const blockId = getPuck().selectedItem?.props.id;
          if (blockId) editor?.open({ blockId, imageProp, editProp, background });
        }}
        style={{
          width: "100%",
          padding: "8px 12px",
          border: "1px solid #d4d4d8",
          borderRadius: 8,
          background: "white",
          fontSize: 14,
          fontWeight: 600,
          cursor: hasImage ? "pointer" : "default",
          opacity: hasImage ? 1 : 0.5,
        }}
      >
        {hasImage ? "Redigera bild..." : "Ladda upp en bild först"}
      </button>
    </FieldLabel>
  );
}
