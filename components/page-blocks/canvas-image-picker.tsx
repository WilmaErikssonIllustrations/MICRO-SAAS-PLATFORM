"use client";

import { registerOverlayPortal, useGetPuck } from "@puckeditor/core";
import { type ChangeEvent, useEffect, useRef } from "react";
import { updateBlockProps } from "./update-block";
import { ACCEPTED_IMAGE_TYPES, useImageUpload } from "./use-image-upload";

type CanvasImagePickerProps = {
  componentId: string;
  propName: string;
  hasImage: boolean;
  /** Text on the button when there is no image yet. */
  emptyLabel?: string;
};

// Editor-only button rendered on top of an image in the canvas, so images
// can be changed by clicking them instead of going through the side panel.
export function CanvasImagePicker({
  componentId,
  propName,
  hasImage,
  emptyLabel = "Ladda upp bild",
}: CanvasImagePickerProps) {
  const getPuck = useGetPuck();
  const { upload, uploading, error } = useImageUpload();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lets the buttons receive clicks instead of starting a drag in Puck.
  useEffect(() => registerOverlayPortal(containerRef.current, { disableDrag: true }), []);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const url = await upload(file);
    if (url) setImage(url);
  }

  function setImage(url: string) {
    updateBlockProps(getPuck(), componentId, { [propName]: url });
  }

  const buttonClass =
    "rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-lg ring-1 ring-black/10 backdrop-blur transition hover:bg-white disabled:opacity-60";

  return (
    <div ref={containerRef} className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={buttonClass}
        disabled={uploading}
        onClick={(event) => {
          event.stopPropagation();
          inputRef.current?.click();
        }}
      >
        {uploading ? "Laddar upp..." : hasImage ? "Byt bild" : emptyLabel}
      </button>
      {hasImage && !uploading && (
        <button
          type="button"
          className={buttonClass}
          onClick={(event) => {
            event.stopPropagation();
            setImage("");
          }}
        >
          Ta bort
        </button>
      )}
      {error && (
        <span role="alert" className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white">
          {error}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
