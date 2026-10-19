import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { hostTag, matchHost, suggestSubdomain, websiteHostnames } from "@/lib/domains";
import { prisma } from "@/lib/prisma";

export const websiteTag = (id: string) => `website-${id}`;

// The builder edits a single website per user: the first one they created.
export async function getUserWebsite(userId: string) {
  return prisma.website.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

/** Every user gets an unpublished starter website (their tenant) on sign-up. */
export async function createWebsiteForUser(user: { id: string; email: string }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const subdomain = suggestSubdomain(user.email);
    const taken = await prisma.website.findUnique({ where: { subdomain } });
    if (taken) continue;

    return prisma.website.create({
      data: { userId: user.id, subdomain, title: "Min hemsida", themeColor: "#2563eb" },
    });
  }
  throw new Error("Could not find a free subdomain");
}

export async function getOrCreateUserWebsite(user: { id: string; email: string }) {
  return (await getUserWebsite(user.id)) ?? createWebsiteForUser(user);
}

/**
 * Looks up the published website for a request hostname (subdomain or
 * custom domain). Cached for visitors and tagged both by hostname and by
 * website, so saving or re-pointing a site shows up immediately.
 */
export async function getPublishedWebsiteByHost(hostname: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(hostTag(hostname));

  const match = matchHost(hostname);
  if (match.kind === "platform") return null;

  const website = await prisma.website.findFirst({
    where:
      match.kind === "subdomain"
        ? { subdomain: match.subdomain, published: true }
        : { customDomain: match.domain, published: true },
  });

  if (website) cacheTag(websiteTag(website.id));
  return website;
}

/** Expires cached public pages for a website on all of its hostnames. */
export function expireWebsiteCache(
  website: { id: string; subdomain: string; customDomain: string | null },
) {
  updateTag(websiteTag(website.id));
  for (const hostname of websiteHostnames(website)) updateTag(hostTag(hostname));
}
