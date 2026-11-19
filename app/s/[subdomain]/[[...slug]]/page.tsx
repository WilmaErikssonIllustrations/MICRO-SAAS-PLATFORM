import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PublishedSite,
  PublishedSiteSkeleton,
  publishedSiteMetadata,
} from "@/components/published-site";
import { subdomainHostname } from "@/lib/domains";

// Path routing (SITE_ROUTING="path"): sites live on ROOT_DOMAIN/s/<subdomain>
// (and their pages on .../s/<subdomain>/<slug>) instead of on their own
// subdomain. proxy.ts returns 404 here otherwise.

type Props = PageProps<"/s/[subdomain]/[[...slug]]">;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { subdomain, slug } = await props.params;
  return publishedSiteMetadata(subdomainHostname(subdomain.toLowerCase()), slug);
}

export default function PathSitePage(props: Props) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <Suspense fallback={<PublishedSiteSkeleton />}>
        <Site params={props.params} />
      </Suspense>
    </div>
  );
}

async function Site({ params }: Pick<Props, "params">) {
  const { subdomain, slug } = await params;
  const name = subdomain.toLowerCase();
  // Links between pages stay under /s/<subdomain>.
  return <PublishedSite hostname={subdomainHostname(name)} slug={slug} basePath={`/s/${name}`} />;
}
