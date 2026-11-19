// Links between the pages of a website, and page addresses (slugs).
// Shared by the editor, the published site and lib/page/sanitize.ts.
//
// A button that goes to another page stores "page:<page id>", not the
// address: the address can change, and it depends on how the site is
// reached (its own hostname, or ROOT_DOMAIN/s/<subdomain>). The published
// site turns it into a URL with the page addresses passed as Puck metadata.
// "page:<page id>#<block id>" goes to one block on that page (every block
// is rendered with its id, see config.tsx).

const PAGE_LINK = "page:";

export const pageLink = (pageId: string, blockId?: string) =>
  `${PAGE_LINK}${pageId}${blockId ? `#${blockId}` : ""}`;

/** The page (and block, if any) of a "page:<id>[#<block id>]" link, or null for any other link. */
export function parsePageLink(href: string): { pageId: string; blockId: string | null } | null {
  if (!href.startsWith(PAGE_LINK)) return null;
  const [pageId, blockId] = href.slice(PAGE_LINK.length).split("#", 2);
  return { pageId, blockId: blockId || null };
}

/** The page id of a "page:<id>" link, or null for any other link. */
export function linkedPageId(href: string) {
  return parsePageLink(href)?.pageId ?? null;
}

/** A well-formed link to a page of the site (ids are cuid-like), maybe to one of its blocks. */
export const isPageLink = (href: string) => /^page:[A-Za-z0-9_-]{1,40}(?:#[A-Za-z0-9_-]{1,80})?$/.test(href);

/** Passed to Puck's Render as metadata: each page's URL, by page id. */
export type PageLinkMetadata = { pageHrefs?: Record<string, string> };

/** A link as it goes in the page's HTML: page links become URLs ("#" in the editor or if the page is gone). */
export function resolveHref(href: string, metadata: PageLinkMetadata | undefined) {
  const link = parsePageLink(href);
  if (!link) return href;
  const url = metadata?.pageHrefs?.[link.pageId];
  if (!url) return "#";
  return link.blockId ? `${url}#${link.blockId}` : url;
}

/** A page's URL path under the site's base ("" or "/s/<subdomain>"). */
export function pagePath(basePath: string, slug: string) {
  return slug ? `${basePath}/${slug}` : basePath || "/";
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_SLUG_LENGTH = 60;

/** A page address from a name: "Om oss & kontakt" -> "om-oss-kontakt". */
export function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/é/g, "e")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
}

/** An error message for a page address, or null when it's fine. */
export function validateSlug(slug: string): string | null {
  if (!slug) return "Skriv en adress, t.ex. om-oss.";
  if (slug.length > MAX_SLUG_LENGTH) return `Adressen får vara högst ${MAX_SLUG_LENGTH} tecken.`;
  if (!SLUG.test(slug)) return "Använd små bokstäver a–z, siffror och bindestreck.";
  return null;
}
