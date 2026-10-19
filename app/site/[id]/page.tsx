import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ContentSection } from "@/components/site/content-section";
import { Hero } from "@/components/site/hero";
import { SiteFooter } from "@/components/site/site-footer";
import { getPublishedWebsite } from "@/lib/websites";

export async function generateMetadata(props: PageProps<"/site/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const website = await getPublishedWebsite(id);

  if (!website) return { title: "Sidan hittades inte" };
  return {
    title: website.title,
    description: website.subtitle ?? undefined,
  };
}

export default function SitePage(props: PageProps<"/site/[id]">) {
  return (
    <div className="flex flex-1 flex-col bg-white text-zinc-900">
      <Suspense fallback={<SiteSkeleton />}>
        <Site params={props.params} />
      </Suspense>
    </div>
  );
}

async function Site({ params }: Pick<PageProps<"/site/[id]">, "params">) {
  const { id } = await params;
  const website = await getPublishedWebsite(id);

  if (!website) notFound();

  return (
    <>
      <main className="flex-1">
        <Hero
          title={website.title}
          subtitle={website.subtitle}
          ctaText={website.ctaText}
          ctaLink={website.ctaLink}
          themeColor={website.themeColor}
        />
        {website.content && (
          <ContentSection content={website.content} themeColor={website.themeColor} />
        )}
      </main>
      <SiteFooter title={website.title} />
    </>
  );
}

function SiteSkeleton() {
  return (
    <div className="flex-1" aria-busy="true">
      <div className="h-[60vh] animate-pulse bg-zinc-200" />
      <div className="mx-auto max-w-3xl space-y-4 px-6 py-20">
        <div className="h-8 w-40 animate-pulse rounded bg-zinc-200" />
        <div className="h-4 animate-pulse rounded bg-zinc-200" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-200" />
      </div>
    </div>
  );
}
