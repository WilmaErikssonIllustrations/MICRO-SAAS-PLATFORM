import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/current-user";
import { platformSiteUrl } from "@/lib/domains";
import { starterPage } from "@/lib/page/config";
import { getOrCreateUserWebsite, listPages, storedPage, withSiteRoot } from "@/lib/websites";
import { prisma } from "@/lib/prisma";
import { PageEditor } from "./page-editor";

export const metadata: Metadata = { title: "Redigera sida – Website Builder" };

export default function EditorPage(props: PageProps<"/dashboard/editor">) {
  return (
    <Suspense fallback={<p className="p-8 text-zinc-500">Laddar editorn...</p>}>
      <Editor searchParams={props.searchParams} />
    </Suspense>
  );
}

// One page of the site at a time: ?page=<id>, or the start page.
async function Editor({ searchParams }: Pick<PageProps<"/dashboard/editor">, "searchParams">) {
  const user = await requireUser();
  const website = await getOrCreateUserWebsite(user);
  const { page: pageParam } = await searchParams;
  const pages = await listPages(website.id);

  const summary = (typeof pageParam === "string" && pages.find((p) => p.id === pageParam)) || pages[0];
  if (!summary) notFound();
  const page = await prisma.page.findUniqueOrThrow({ where: { id: summary.id } });

  // The site's name and fonts are shared by its pages, so they come from the website.
  const published = withSiteRoot(storedPage(page.data) ?? starterPage(website.title), website);
  // Continue from saved, unpublished edits when there are any.
  const draft = storedPage(page.draft);

  return (
    <PageEditor
      // A fresh editor for every page.
      key={page.id}
      pageId={page.id}
      pages={pages.map(({ id, title, slug }) => ({ id, title, slug }))}
      publishedData={published}
      draftData={draft && withSiteRoot(draft, website)}
      // Unpublished changes on the other pages count too: Publicera publishes them all.
      otherPagesUnpublished={pages.some((p) => p.id !== page.id && p.hasDraft)}
      neverPublished={!storedPage(page.data)}
      siteUrl={platformSiteUrl(website.subdomain)}
    />
  );
}
