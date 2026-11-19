import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PublishedSite,
  PublishedSiteSkeleton,
  publishedSiteMetadata,
} from "@/components/published-site";

// Reached only through proxy.ts, which rewrites tenant hostnames
// (<subdomain>.ROOT_DOMAIN or a custom domain) to /sites/<hostname>, and
// their pages (/<slug>) to /sites/<hostname>/<slug>.

type Props = PageProps<"/sites/[host]/[[...slug]]">;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { host, slug } = await props.params;
  return publishedSiteMetadata(decodeURIComponent(host), slug);
}

export default function SitePage(props: Props) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <Suspense fallback={<PublishedSiteSkeleton />}>
        <Site params={props.params} />
      </Suspense>
    </div>
  );
}

async function Site({ params }: Pick<Props, "params">) {
  const { host, slug } = await params;
  // On its own hostname a site's pages are at /<slug>.
  return <PublishedSite hostname={decodeURIComponent(host)} slug={slug} basePath="" />;
}
