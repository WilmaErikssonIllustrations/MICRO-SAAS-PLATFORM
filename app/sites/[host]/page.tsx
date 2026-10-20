import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PublishedSite,
  PublishedSiteSkeleton,
  publishedSiteMetadata,
} from "@/components/published-site";

// Reached only through proxy.ts, which rewrites tenant hostnames
// (<subdomain>.ROOT_DOMAIN or a custom domain) to /sites/<hostname>.

export async function generateMetadata(props: PageProps<"/sites/[host]">): Promise<Metadata> {
  const { host } = await props.params;
  return publishedSiteMetadata(decodeURIComponent(host));
}

export default function SitePage(props: PageProps<"/sites/[host]">) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <Suspense fallback={<PublishedSiteSkeleton />}>
        <Site params={props.params} />
      </Suspense>
    </div>
  );
}

async function Site({ params }: Pick<PageProps<"/sites/[host]">, "params">) {
  const { host } = await params;
  return <PublishedSite hostname={decodeURIComponent(host)} />;
}
