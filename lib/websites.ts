import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { hostTag, matchHost, suggestSubdomain, websiteHostnames } from "@/lib/domains";
import type { Prisma } from "@/generated/prisma/client";
import { type PageData, isEmptyPage, starterPage } from "@/lib/page/config";
import type { CustomFont } from "@/lib/page/fonts";
import { prisma } from "@/lib/prisma";

export const websiteTag = (id: string) => `website-${id}`;

/** Page data is plain JSON; this narrows it to the type Prisma expects. */
export const pageToJson = (page: PageData) => page as unknown as Prisma.InputJsonValue;

// The builder edits a single website per user: the first one they created.
export async function getUserWebsite(userId: string) {
  return prisma.website.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

/** Every user gets an unpublished starter website (their tenant), with a start page, on sign-up. */
export async function createWebsiteForUser(user: { id: string; email: string }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const subdomain = suggestSubdomain(user.email);
    const taken = await prisma.website.findUnique({ where: { subdomain } });
    if (taken) continue;

    return prisma.website.create({
      data: {
        userId: user.id,
        subdomain,
        title: "Min hemsida",
        pages: { create: { slug: "", title: "Startsida", draft: pageToJson(starterPage()) } },
      },
    });
  }
  throw new Error("Could not find a free subdomain");
}

export async function getOrCreateUserWebsite(user: { id: string; email: string }) {
  return (await getUserWebsite(user.id)) ?? createWebsiteForUser(user);
}

/** A website's pages in the editor's order, the start page first. */
export async function listPages(websiteId: string) {
  const pages = await prisma.page.findMany({
    where: { websiteId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, slug: true, title: true, draft: true },
  });
  return pages
    .map(({ draft, ...page }) => ({ ...page, hasDraft: draft !== null }))
    .sort((a, b) => Number(b.slug === "") - Number(a.slug === ""));
}

export type PageSummary = Awaited<ReturnType<typeof listPages>>[number];

/** The site-wide root props (its name and uploaded fonts) put into one page's data. */
export function withSiteRoot(data: PageData, website: { title: string; fonts: unknown }): PageData {
  const fonts = Array.isArray(website.fonts) ? (website.fonts as CustomFont[]) : [];
  return { ...data, root: { ...data.root, props: { ...data.root.props!, title: website.title, customFonts: fonts } } };
}

/** The page stored data or a draft as PageData, or null for none. */
export const storedPage = (value: unknown) => (isEmptyPage(value) ? null : (value as PageData));

/**
 * Looks up a published page for a request hostname (subdomain or custom
 * domain) and slug ("" for the start page), with every live page's slug
 * so links between pages can be resolved. Cached for visitors and tagged
 * both by hostname and by website, so publishing shows up immediately.
 */
export async function getPublishedPage(hostname: string, slug: string) {
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
    include: { pages: { select: { id: true, slug: true, title: true, data: true } } },
  });
  if (!website) return null;
  cacheTag(websiteTag(website.id));

  // Pages that have been published (a new page is live once the site is published again).
  const live = website.pages.filter((page) => storedPage(page.data));
  const page = live.find((p) => p.slug === slug);
  if (!page) return null;
  return {
    siteTitle: website.title,
    page: { title: page.title, slug: page.slug, data: page.data as unknown as PageData },
    slugs: Object.fromEntries(live.map((p) => [p.id, p.slug])),
  };
}

/** Expires cached public pages for a website on all of its hostnames. */
export function expireWebsiteCache(
  website: { id: string; subdomain: string; customDomain: string | null },
) {
  updateTag(websiteTag(website.id));
  for (const hostname of websiteHostnames(website)) updateTag(hostTag(hostname));
}
