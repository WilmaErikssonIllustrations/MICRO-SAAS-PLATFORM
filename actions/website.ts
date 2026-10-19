"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { type FieldErrors, validateWebsiteForm } from "@/lib/validation";
import { expireWebsiteCache, getOrCreateUserWebsite } from "@/lib/websites";

export type SaveWebsiteState =
  | { status: "idle" }
  | { status: "error"; message: string; errors?: FieldErrors }
  | { status: "success"; message: string };

export async function saveWebsite(
  _prevState: SaveWebsiteState,
  formData: FormData,
): Promise<SaveWebsiteState> {
  const user = await requireUser();

  const result = validateWebsiteForm(formData);
  if (!result.success) {
    return {
      status: "error",
      message: "Kontrollera de markerade fälten.",
      errors: result.errors,
    };
  }

  try {
    // Look up the website by owner rather than trusting an id from the client.
    const existing = await getOrCreateUserWebsite(user);
    const website = await prisma.website.update({
      where: { id: existing.id },
      data: { ...result.data, published: true },
    });

    expireWebsiteCache(website);
    refresh();

    return { status: "success", message: "Din hemsida är sparad och publicerad!" };
  } catch (error) {
    console.error("Failed to save website", error);
    return {
      status: "error",
      message: "Något gick fel när hemsidan skulle sparas. Försök igen.",
    };
  }
}
