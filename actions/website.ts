"use server";

import { updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { type FieldErrors, validateWebsiteForm } from "@/lib/validation";
import { getUserWebsite, websiteTag } from "@/lib/websites";

export type SaveWebsiteState =
  | { status: "idle" }
  | { status: "error"; message: string; errors?: FieldErrors }
  | { status: "success"; message: string; websiteId: string };

export async function saveWebsite(
  _prevState: SaveWebsiteState,
  formData: FormData,
): Promise<SaveWebsiteState> {
  const user = await getCurrentUser();

  const result = validateWebsiteForm(formData);
  if (!result.success) {
    return {
      status: "error",
      message: "Kontrollera de markerade fälten.",
      errors: result.errors,
    };
  }

  const data = { ...result.data, published: true };

  try {
    // Look up the website by owner rather than trusting an id from the client.
    const existing = await getUserWebsite(user.id);
    const website = existing
      ? await prisma.website.update({ where: { id: existing.id }, data })
      : await prisma.website.create({ data: { ...data, userId: user.id } });

    updateTag(websiteTag(website.id));

    return {
      status: "success",
      message: "Din hemsida är sparad och publicerad!",
      websiteId: website.id,
    };
  } catch (error) {
    console.error("Failed to save website", error);
    return {
      status: "error",
      message: "Något gick fel när hemsidan skulle sparas. Försök igen.",
    };
  }
}
