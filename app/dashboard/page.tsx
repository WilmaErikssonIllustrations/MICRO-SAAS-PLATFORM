import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/actions/auth";
import { requireUser } from "@/lib/current-user";
import { getCustomDomainTarget, getRootDomain, subdomainUrl } from "@/lib/domains";
import { getOrCreateUserWebsite } from "@/lib/websites";
import { PublishedLink } from "./_components/published-link";
import { SiteSettingsForm } from "./_components/site-settings-form";

export const metadata: Metadata = {
  title: "Dashboard – Website Builder",
};

export default function DashboardPage() {
  return (
    <div className="flex-1 bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-start justify-between gap-4 px-6 py-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Din hemsida</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Bygg sidan i editorn och välj var den ska synas.
            </p>
          </div>
          <Suspense>
            <AccountMenu />
          </Suspense>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <Suspense fallback={<Skeleton />}>
          <Overview />
        </Suspense>
      </main>
    </div>
  );
}

async function AccountMenu() {
  const user = await requireUser();

  return (
    <div className="flex shrink-0 items-center gap-3 text-sm">
      <span className="hidden text-zinc-600 sm:inline">{user.email}</span>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Logga ut
        </button>
      </form>
    </div>
  );
}

async function Overview() {
  const user = await requireUser();
  const website = await getOrCreateUserWebsite(user);

  const publicUrls = [subdomainUrl(website.subdomain)];
  if (website.customDomain) publicUrls.push(`https://${website.customDomain}`);

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{website.title}</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {website.published
                ? "Publicerad. Ändringar syns när du publicerar igen i editorn."
                : "Inte publicerad än. Öppna editorn och klicka på Publish."}
            </p>
          </div>
          <Link
            href="/dashboard/editor"
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700"
          >
            Redigera sidan
          </Link>
        </div>
        {website.published && <PublishedLink urls={publicUrls} />}
      </section>

      <SiteSettingsForm
        rootDomain={getRootDomain()}
        cnameTarget={getCustomDomainTarget()}
        subdomain={website.subdomain}
        customDomain={website.customDomain}
      />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Laddar">
      <div className="h-32 animate-pulse rounded-xl bg-zinc-200" />
      <div className="h-64 animate-pulse rounded-xl bg-zinc-200" />
    </div>
  );
}
