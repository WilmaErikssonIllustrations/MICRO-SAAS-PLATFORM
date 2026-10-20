import { Render } from "@puckeditor/core/rsc";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { type PageData, pageConfig } from "@/lib/page/config";
import { getPublishedWebsiteByHost } from "@/lib/websites";

// Shared by the two public routes: /sites/[host] (subdomains and custom
// domains, via proxy.ts) and /s/[subdomain] (path routing).

export async function publishedSiteMetadata(hostname: string): Promise<Metadata> {
  const website = await getPublishedWebsiteByHost(hostname);
  return { title: website?.title ?? "Sidan hittades inte" };
}

export async function PublishedSite({ hostname }: { hostname: string }) {
  const website = await getPublishedWebsiteByHost(hostname);
  if (!website) notFound();

  // Stored page data was sanitized against pageConfig when it was published.
  return <Render config={pageConfig} data={website.data as unknown as PageData} />;
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
