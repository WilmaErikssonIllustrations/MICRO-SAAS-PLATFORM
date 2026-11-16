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

const MAX_FONT_BYTES = 2 * 1024 * 1024;
// Browsers report font types inconsistently, so the client derives the
// type from the file extension (see components/page-blocks/use-upload.ts).
const FONT_TYPES: Record<string, string> = {
  "font/woff2": "woff2",
  "font/woff": "woff",
  "font/ttf": "ttf",
  "font/otf": "otf",
};

export type UploadTicket =
  | { ok: true; uploadUrl: string; publicUrl: string }
  | { ok: false; message: string };

/** Hands out a presigned URL for uploading one image to the user's folder. */
export async function requestImageUpload(file: { contentType: string; size: number }): Promise<UploadTicket> {
  const extension = IMAGE_TYPES[file.contentType];
  if (!extension) {
    return { ok: false, message: "Välj en bild i formatet JPG, PNG, WebP, GIF eller AVIF." };
  }
  if (!isValidSize(file.size, MAX_IMAGE_BYTES)) {
    return { ok: false, message: "Bilden får vara högst 5 MB." };
  }
  return createTicket("", extension, file);
}

/** Hands out a presigned URL for uploading one font file. */
export async function requestFontUpload(file: { contentType: string; size: number }): Promise<UploadTicket> {
  const extension = FONT_TYPES[file.contentType];
  if (!extension) {
    return { ok: false, message: "Välj ett typsnitt i formatet WOFF2, WOFF, TTF eller OTF." };
  }
  if (!isValidSize(file.size, MAX_FONT_BYTES)) {
    return { ok: false, message: "Typsnittsfilen får vara högst 2 MB." };
  }
  return createTicket("fonts/", extension, file);
}

function isValidSize(size: number, max: number) {
  return Number.isInteger(size) && size > 0 && size <= max;
}

async function createTicket(
  folder: string,
  extension: string,
  file: { contentType: string; size: number },
): Promise<UploadTicket> {
  const user = await requireUser();

  if (!isStorageConfigured()) {
    return { ok: false, message: "Uppladdning är inte konfigurerad på servern." };
  }

  // Files are stored per tenant so a site's files live under its own prefix.
  const website = await getOrCreateUserWebsite(user);
  const key = `sites/${website.id}/${folder}${crypto.randomUUID()}.${extension}`;

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
