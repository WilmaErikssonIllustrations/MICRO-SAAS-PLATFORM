import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/current-user";
import { platformSiteUrl } from "@/lib/domains";
import { type PageData, isEmptyPage, starterPage } from "@/lib/page/config";
import { getOrCreateUserWebsite } from "@/lib/websites";
import { PageEditor } from "./page-editor";

export const metadata: Metadata = { title: "Redigera sida – Website Builder" };

export default function EditorPage() {
  return (
    <Suspense fallback={<p className="p-8 text-zinc-500">Laddar editorn...</p>}>
      <Editor />
    </Suspense>
  );
}

async function Editor() {
  const user = await requireUser();
  const website = await getOrCreateUserWebsite(user);

  const published = isEmptyPage(website.data)
    ? starterPage(website.title)
    : (website.data as unknown as PageData);
  // Continue from saved, unpublished edits when there are any.
  const draft = isEmptyPage(website.draft) ? null : (website.draft as unknown as PageData);

  return (
    <PageEditor
      publishedData={published}
      draftData={draft}
      siteUrl={platformSiteUrl(website.subdomain)}
    />
  );
}
