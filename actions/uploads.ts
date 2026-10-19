"use server";

import { requireUser } from "@/lib/current-user";
import { createUploadUrl, isStorageConfigured } from "@/lib/storage";
import { getOrCreateUserWebsite } from "@/lib/websites";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export type ImageUploadTicket =
  | { ok: true; uploadUrl: string; publicUrl: string }
  | { ok: false; message: string };

/** Hands out a presigned URL for uploading one image to the user's folder. */
export async function requestImageUpload(file: {
  contentType: string;
  size: number;
}): Promise<ImageUploadTicket> {
  const user = await requireUser();

  if (!isStorageConfigured()) {
    return { ok: false, message: "Bilduppladdning är inte konfigurerad på servern." };
  }
  const extension = IMAGE_TYPES[file.contentType];
  if (!extension) {
    return { ok: false, message: "Välj en bild i formatet JPG, PNG, WebP, GIF eller AVIF." };
  }
  if (!Number.isInteger(file.size) || file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: "Bilden får vara högst 5 MB." };
  }

  // Files are stored per tenant so a site's images live under its own prefix.
  const website = await getOrCreateUserWebsite(user);
  const key = `sites/${website.id}/${crypto.randomUUID()}.${extension}`;

  try {
    const { uploadUrl, publicUrl } = await createUploadUrl({
      key,
      contentType: file.contentType,
      size: file.size,
    });
    return { ok: true, uploadUrl, publicUrl };
  } catch (error) {
    console.error("Failed to create upload URL", error);
    return { ok: false, message: "Kunde inte förbereda uppladdningen. Försök igen." };
  }
}
