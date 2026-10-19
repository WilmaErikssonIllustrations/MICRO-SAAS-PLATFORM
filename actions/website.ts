"use server";

import { requireUser } from "@/lib/current-user";
import { sanitizePageData } from "@/lib/page/sanitize";
import { prisma } from "@/lib/prisma";
import { expireWebsiteCache, getOrCreateUserWebsite, pageToJson } from "@/lib/websites";

export type PublishResult = { ok: boolean; message: string };

/** Saves the page built in the editor and publishes it. */
export async function publishPage(data: unknown): Promise<PublishResult> {
  const user = await requireUser();

  try {
    // Look up the website by owner rather than trusting an id from the client.
    const website = await getOrCreateUserWebsite(user);
    const page = sanitizePageData(data);

    await prisma.website.update({
      where: { id: website.id },
      data: { data: pageToJson(page), title: page.root.props!.title, published: true },
    });
    expireWebsiteCache(website);

    return { ok: true, message: "Publicerad!" };
  } catch (error) {
    console.error("Failed to publish page", error);
    return { ok: false, message: "Kunde inte publicera. Försök igen." };
  }
}
