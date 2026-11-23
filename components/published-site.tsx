import { Render } from "@puckeditor/core/rsc";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageConfig } from "@/lib/page/config";
import { type PageLinkMetadata, pagePath } from "@/lib/page/links";
import { getPublishedPage } from "@/lib/websites";

// Shared by the two public routes: /sites/[host]/[[...slug]] (subdomains
// and custom domains, via proxy.ts) and /s/[subdomain]/[[...slug]] (path
// routing). A site's pages are one level deep: /<slug>.

/** The page slug from the route's segments: "" for the start page, null if there is no such page. */
function pageSlug(segments: string[] | undefined) {
  if (!segments || segments.length === 0) return "";
  if (segments.length > 1) return null;
  // Next.js has already decoded the segment, so it's not decoded again:
  // "/100%25" arrives as "100%", which decodeURIComponent would throw on.
  // Slugs are a–z, 0–9 and "-" only, so nothing else can match a page.
  return segments[0].toLowerCase();
}

async function findPage(hostname: string, segments: string[] | undefined) {
  const slug = pageSlug(segments);
  return slug === null ? null : getPublishedPage(hostname, slug);
}

export async function publishedSiteMetadata(hostname: string, segments?: string[]): Promise<Metadata> {
  const found = await findPage(hostname, segments);
  if (!found) return { title: "Sidan hittades inte" };
  // The start page is the site; other pages are "Page – Site".
  return { title: found.page.slug ? `${found.page.title} – ${found.siteTitle}` : found.siteTitle };
}

export async function PublishedSite({
  hostname,
  slug,
  basePath,
}: {
  hostname: string;
  slug: string[] | undefined;
  /** Where the site's pages live: "" on its own hostname, "/s/<subdomain>" with path routing. */
  basePath: string;
}) {
  const found = await findPage(hostname, slug);
  if (!found) notFound();

  // Buttons that go to another page ("page:<id>") get its URL.
  const metadata: PageLinkMetadata = {
    pageHrefs: Object.fromEntries(Object.entries(found.slugs).map(([id, s]) => [id, pagePath(basePath, s)])),
  };
  // Stored page data was sanitized against pageConfig when it was published.
  return <Render config={pageConfig} data={found.page.data} metadata={metadata} />;
}

export function PublishedSiteSkeleton() {
  return <div className="h-[60vh] animate-pulse bg-zinc-200" />;
}

export function SiteNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-24 text-center text-zinc-900">
      <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Hemsidan finns inte</h1>
      <p className="mt-4 text-zinc-600">
        Adressen är inte kopplad till någon publicerad hemsida.
      </p>
    </main>
  );
}
