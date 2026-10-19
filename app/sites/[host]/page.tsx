import { Render } from "@puckeditor/core/rsc";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { type PageData, pageConfig } from "@/lib/page/config";
import { getPublishedWebsiteByHost } from "@/lib/websites";

// Reached only through proxy.ts, which rewrites tenant hostnames
// (<subdomain>.ROOT_DOMAIN or a custom domain) to /sites/<hostname>.

export async function generateMetadata(props: PageProps<"/sites/[host]">): Promise<Metadata> {
  const { host } = await props.params;
  const website = await getPublishedWebsiteByHost(decodeURIComponent(host));

  return { title: website?.title ?? "Sidan hittades inte" };
}

export default function SitePage(props: PageProps<"/sites/[host]">) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <Suspense fallback={<div className="h-[60vh] animate-pulse bg-zinc-200" />}>
        <Site params={props.params} />
      </Suspense>
    </div>
  );
}

async function Site({ params }: Pick<PageProps<"/sites/[host]">, "params">) {
  const { host } = await params;
  const website = await getPublishedWebsiteByHost(decodeURIComponent(host));

  if (!website) notFound();

  // Stored page data was sanitized against pageConfig when it was published.
  return <Render config={pageConfig} data={website.data as unknown as PageData} />;
}
