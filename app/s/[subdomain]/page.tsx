import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PublishedSite,
  PublishedSiteSkeleton,
  publishedSiteMetadata,
} from "@/components/published-site";
import { subdomainHostname } from "@/lib/domains";

// Path routing (SITE_ROUTING="path"): sites live on ROOT_DOMAIN/s/<subdomain>
// instead of on their own subdomain. proxy.ts returns 404 here otherwise.

export async function generateMetadata(props: PageProps<"/s/[subdomain]">): Promise<Metadata> {
  const { subdomain } = await props.params;
  return publishedSiteMetadata(subdomainHostname(subdomain.toLowerCase()));
}

export default function PathSitePage(props: PageProps<"/s/[subdomain]">) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <Suspense fallback={<PublishedSiteSkeleton />}>
        <Site params={props.params} />
      </Suspense>
    </div>
  );
}

async function Site({ params }: Pick<PageProps<"/s/[subdomain]">, "params">) {
  const { subdomain } = await params;
  return <PublishedSite hostname={subdomainHostname(subdomain.toLowerCase())} />;
}
