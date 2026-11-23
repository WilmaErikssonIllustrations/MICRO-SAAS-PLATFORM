import type { Metadata } from "next";
import { Suspense } from "react";
import { signOut } from "@/actions/auth";
import { requireUser } from "@/lib/current-user";
import {
  getCustomDomainTarget,
  getRootDomain,
  platformSiteUrl,
  usesPathRouting,
} from "@/lib/domains";
import { getOrCreateUserWebsite, listPages } from "@/lib/websites";
import { AuroraBackdrop, BrandLink } from "@/components/aurora-backdrop";
import { PublishedLink } from "./_components/published-link";
import { SiteSettingsForm } from "./_components/site-settings-form";

export const metadata: Metadata = {
  title: "Dashboard – Website Builder",
};

export default function DashboardPage() {
  return (
    // The front page's dark animated backdrop, with glass cards.
    <div className="relative isolate flex-1 bg-zinc-950 text-white">
      <AuroraBackdrop />
      <header className="border-b border-white/10 bg-zinc-950/40 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <BrandLink />
          <Suspense>
            <AccountMenu />
          </Suspense>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-6 pt-10">
        <h1 className="text-3xl font-bold tracking-tight">Din hemsida</h1>
        <p className="mt-2 text-zinc-400">Bygg sidan i editorn och välj var den ska synas.</p>
      </div>

      <main className="mx-auto max-w-3xl px-6 pt-8 pb-16">
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
      <span className="hidden text-zinc-400 sm:inline">{user.email}</span>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 font-medium text-zinc-200 hover:bg-white/10"
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
  const pages = await listPages(website.id);

  const publicUrls = [platformSiteUrl(website.subdomain)];
  if (website.customDomain) publicUrls.push(`https://${website.customDomain}`);

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 shadow-2xl shadow-black/30 backdrop-blur-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{website.title}</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {website.published
                ? "Publicerad. Ändringar syns när du publicerar igen i editorn."
                : "Inte publicerad än. Öppna editorn och klicka på Publicera."}
            </p>
            {pages.some((page) => page.hasDraft) && (
              <p className="mt-1 text-sm font-medium text-amber-300">
                Du har sparade ändringar som inte är publicerade.
              </p>
            )}
          </div>
          {/*
            A full page load on purpose, not <Link>. With Cache Components,
            Next.js keeps visited pages hidden with <Activity> instead of
            unmounting them; Puck's preview iframe breaks when such a hidden
            editor is shown again, and it would show stale page data.
          */}
          <a
            href="/dashboard/editor"
            className="rounded-lg px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20 transition hover:from-violet-400 hover:to-fuchsia-400"
          >
            Redigera webbplatsen
          </a>
        </div>
        {website.published && <PublishedLink urls={publicUrls} />}
      </section>

      <SiteSettingsForm
        addressPrefix={usesPathRouting() ? `${getRootDomain()}/s/` : ""}
        addressSuffix={usesPathRouting() ? "" : `.${getRootDomain()}`}
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
      <div className="h-32 animate-pulse rounded-2xl bg-white/5" />
      <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
    </div>
  );
}
