"use server";

import { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/current-user";
import { sanitizePageData } from "@/lib/page/sanitize";
import { prisma } from "@/lib/prisma";
import { expireWebsiteCache, getOrCreateUserWebsite, pageToJson } from "@/lib/websites";

export type EditorActionResult = { ok: boolean; message: string };

/** Saves the editor's page as a draft without changing the public site. */
export async function saveDraft(data: unknown): Promise<EditorActionResult> {
  const user = await requireUser();

  try {
    // Look up the website by owner rather than trusting an id from the client.
    const website = await getOrCreateUserWebsite(user);
    const page = sanitizePageData(data);

    await prisma.website.update({
      where: { id: website.id },
      data: { draft: pageToJson(page) },
    });

    return { ok: true, message: "Sparat!" };
  } catch (error) {
    console.error("Failed to save draft", error);
    return { ok: false, message: "Kunde inte spara. Försök igen." };
  }
}

/** Saves the page built in the editor and publishes it. */
export async function publishPage(data: unknown): Promise<EditorActionResult> {
  const user = await requireUser();

  try {
    const website = await getOrCreateUserWebsite(user);
    const page = sanitizePageData(data);

    await prisma.website.update({
      where: { id: website.id },
      data: {
        data: pageToJson(page),
        // The draft is now live, so there is nothing unpublished left.
        draft: Prisma.DbNull,
        title: page.root.props!.title,
        published: true,
      },
    });
    expireWebsiteCache(website);

    return { ok: true, message: "Publicerad!" };
  } catch (error) {
    console.error("Failed to publish page", error);
    return { ok: false, message: "Kunde inte publicera. Försök igen." };
  }
}
