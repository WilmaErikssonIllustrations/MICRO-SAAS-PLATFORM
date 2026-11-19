"use server";

import { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/current-user";
import type { PageData } from "@/lib/page/config";
import { slugify, validateSlug } from "@/lib/page/links";
import { sanitizePageData } from "@/lib/page/sanitize";
import { isPageTemplate, newPageData, withFreshIds } from "@/lib/page/templates";
import { prisma } from "@/lib/prisma";
import {
  expireWebsiteCache,
  getOrCreateUserWebsite,
  pageToJson,
  storedPage,
  withSiteRoot,
} from "@/lib/websites";

export type EditorActionResult = { ok: boolean; message: string };

const MAX_PAGE_TITLE = 60;
const MAX_PAGES = 50;

/** The user's website and one of its pages; never trusts the page id alone. */
async function ownedPage(pageId: unknown) {
  const user = await requireUser();
  const website = await getOrCreateUserWebsite(user);
  if (typeof pageId !== "string") return null;
  const page = await prisma.page.findFirst({ where: { id: pageId, websiteId: website.id } });
  return page ? { website, page } : null;
}

/** The site-wide root props (name, uploaded fonts) edited on any page, for the website. */
function siteRootOf(page: PageData) {
  const props = page.root.props!;
  return { title: props.title, fonts: props.customFonts as unknown as Prisma.InputJsonValue };
}

/** Saves the editor's page as a draft without changing the public site. */
export async function saveDraft(pageId: string, data: unknown): Promise<EditorActionResult> {
  try {
    const owned = await ownedPage(pageId);
    if (!owned) return { ok: false, message: "Sidan finns inte längre." };
    const page = sanitizePageData(data);

    await prisma.$transaction([
      prisma.page.update({ where: { id: owned.page.id }, data: { draft: pageToJson(page) } }),
      // The site's name and fonts are shared, so the other pages get them too.
      prisma.website.update({ where: { id: owned.website.id }, data: siteRootOf(page) }),
    ]);
    return { ok: true, message: "Sparat!" };
  } catch (error) {
    console.error("Failed to save draft", error);
    return { ok: false, message: "Kunde inte spara. Försök igen." };
  }
}

/** Saves the editor's page and publishes the whole website: every page's latest version. */
export async function publishSite(pageId: string, data: unknown): Promise<EditorActionResult> {
  try {
    const owned = await ownedPage(pageId);
    if (!owned) return { ok: false, message: "Sidan finns inte längre." };
    const current = sanitizePageData(data);
    const site = { ...siteRootOf(current) };
    const website = { title: site.title, fonts: site.fonts };

    const pages = await prisma.page.findMany({ where: { websiteId: owned.website.id } });
    await prisma.$transaction([
      ...pages.flatMap((page) => {
        const latest = page.id === owned.page.id ? current : (storedPage(page.draft) ?? storedPage(page.data));
        if (!latest) return [];
        return [
          prisma.page.update({
            where: { id: page.id },
            // The draft is now live, so there is nothing unpublished left.
            data: { data: pageToJson(withSiteRoot(latest, website)), draft: Prisma.DbNull },
          }),
        ];
      }),
      prisma.website.update({ where: { id: owned.website.id }, data: { ...site, published: true } }),
    ]);
    expireWebsiteCache(owned.website);

    return { ok: true, message: "Publicerad!" };
  } catch (error) {
    console.error("Failed to publish site", error);
    return { ok: false, message: "Kunde inte publicera. Försök igen." };
  }
}

/** A free address on the website, from `slug` (adding -2, -3... when taken). */
async function freeSlug(websiteId: string, slug: string, exceptPageId?: string) {
  const taken = new Set(
    (await prisma.page.findMany({ where: { websiteId, NOT: { id: exceptPageId } }, select: { slug: true } })).map(
      (page) => page.slug,
    ),
  );
  if (!taken.has(slug)) return slug;
  for (let n = 2; ; n++) if (!taken.has(`${slug}-${n}`)) return `${slug}-${n}`;
}

function cleanTitle(title: unknown) {
  return typeof title === "string" ? title.trim().slice(0, MAX_PAGE_TITLE) : "";
}

export type CreatePageResult = EditorActionResult & { pageId?: string };

/**
 * Adds a page: empty, a copy of a page (`copyOf`), or a template. It is a
 * draft until the site is published.
 */
export async function createPage(input: {
  title: string;
  template: string | null;
  copyOf: string | null;
}): Promise<CreatePageResult> {
  try {
    const user = await requireUser();
    const website = await getOrCreateUserWebsite(user);
    const title = cleanTitle(input.title);
    if (!title) return { ok: false, message: "Ge sidan ett namn." };

    const count = await prisma.page.count({ where: { websiteId: website.id } });
    if (count >= MAX_PAGES) return { ok: false, message: `En webbplats kan ha högst ${MAX_PAGES} sidor.` };

    let data: PageData;
    if (input.copyOf) {
      const source = await prisma.page.findFirst({ where: { id: input.copyOf, websiteId: website.id } });
      const content = source && (storedPage(source.draft) ?? storedPage(source.data));
      if (!content) return { ok: false, message: "Sidan att kopiera finns inte." };
      data = withFreshIds(content);
    } else {
      data = newPageData(isPageTemplate(input.template) ? input.template : null);
    }

    const page = await prisma.page.create({
      data: {
        websiteId: website.id,
        title,
        slug: await freeSlug(website.id, slugify(title) || "sida"),
        position: count,
        draft: pageToJson(sanitizePageData(withSiteRoot(data, website))),
      },
    });
    return { ok: true, message: "Sidan är skapad.", pageId: page.id };
  } catch (error) {
    console.error("Failed to create page", error);
    return { ok: false, message: "Kunde inte skapa sidan. Försök igen." };
  }
}

/** Renames a page and/or changes its address (the start page keeps "/"). */
export async function updatePage(pageId: string, input: { title: string; slug: string }): Promise<EditorActionResult> {
  try {
    const owned = await ownedPage(pageId);
    if (!owned) return { ok: false, message: "Sidan finns inte längre." };
    const title = cleanTitle(input.title);
    if (!title) return { ok: false, message: "Ge sidan ett namn." };

    const isStart = owned.page.slug === "";
    const slug = isStart ? "" : String(input.slug ?? "").trim().toLowerCase();
    if (!isStart) {
      const error = validateSlug(slug);
      if (error) return { ok: false, message: error };
      if ((await freeSlug(owned.website.id, slug, owned.page.id)) !== slug) {
        return { ok: false, message: "En annan sida har redan den adressen." };
      }
    }

    await prisma.page.update({ where: { id: owned.page.id }, data: { title, slug } });
    // Names and addresses apply right away, also on the public site.
    expireWebsiteCache(owned.website);
    return { ok: true, message: "Sparat!" };
  } catch (error) {
    console.error("Failed to update page", error);
    return { ok: false, message: "Kunde inte spara. Försök igen." };
  }
}

/** Deletes a page right away, also from the public site. The start page stays. */
export async function deletePage(pageId: string): Promise<EditorActionResult> {
  try {
    const owned = await ownedPage(pageId);
    if (!owned) return { ok: false, message: "Sidan finns inte längre." };
    if (owned.page.slug === "") return { ok: false, message: "Startsidan kan inte tas bort." };

    await prisma.page.delete({ where: { id: owned.page.id } });
    expireWebsiteCache(owned.website);
    return { ok: true, message: "Sidan är borttagen." };
  } catch (error) {
    console.error("Failed to delete page", error);
    return { ok: false, message: "Kunde inte ta bort sidan. Försök igen." };
  }
}
