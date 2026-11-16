"use client";

import { useState } from "react";
import { requestFontUpload, requestImageUpload, type UploadTicket } from "@/actions/uploads";

export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif,image/avif";
export const ACCEPTED_FONT_TYPES = ".woff2,.woff,.ttf,.otf";

const FONT_TYPES: Record<string, string> = {
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
};

// Uploads a file straight to S3 through a presigned URL. `upload` resolves
// to the public URL, or null when it failed (see `error`).
function useUpload(
  request: (file: { contentType: string; size: number }) => Promise<UploadTicket>,
  contentTypeOf: (file: File) => string,
) {
  const [status, setStatus] = useState<{ uploading: boolean; error: string | null }>({
    uploading: false,
    error: null,
  });

  async function upload(file: File): Promise<string | null> {
    setStatus({ uploading: true, error: null });
    const contentType = contentTypeOf(file);
    const ticket = await request({ contentType, size: file.size });
    if (!ticket.ok) {
      setStatus({ uploading: false, error: ticket.message });
      return null;
    }

    const response = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    }).catch(() => null);

    if (!response?.ok) {
      setStatus({ uploading: false, error: "Uppladdningen misslyckades. Försök igen." });
      return null;
    }
    setStatus({ uploading: false, error: null });
    return ticket.publicUrl;
  }

  return { upload, ...status };
}

export function useImageUpload() {
  return useUpload(requestImageUpload, (file) => file.type);
}

// Browsers report font types inconsistently (often not at all), so go by
// the file extension.
export function useFontUpload() {
  return useUpload(requestFontUpload, (file) => FONT_TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? "");
}
