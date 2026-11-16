"use client";

import { useState } from "react";
import { requestImageUpload } from "@/actions/uploads";

export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif,image/avif";

// Uploads an image straight to S3 through a presigned URL. `upload`
// resolves to the public URL, or null when it failed (see `error`).
export function useImageUpload() {
  const [status, setStatus] = useState<{ uploading: boolean; error: string | null }>({
    uploading: false,
    error: null,
  });

  async function upload(file: File): Promise<string | null> {
    setStatus({ uploading: true, error: null });
    const ticket = await requestImageUpload({ contentType: file.type, size: file.size });
    if (!ticket.ok) {
      setStatus({ uploading: false, error: ticket.message });
      return null;
    }

    const response = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
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
