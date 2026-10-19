import type { Metadata } from "next";
import { Suspense } from "react";
import { signOut } from "@/actions/auth";
import { requireUser } from "@/lib/current-user";
import { getUserWebsite } from "@/lib/websites";
import { WebsiteForm } from "./_components/website-form";

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
              Fyll i innehållet nedan och klicka på Spara &amp; Publicera.
            </p>
          </div>
          <Suspense>
            <AccountMenu />
          </Suspense>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <Suspense fallback={<FormSkeleton />}>
          <Builder />
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

async function Builder() {
  const user = await requireUser();
  const website = await getUserWebsite(user.id);

  return (
    <WebsiteForm
      websiteId={website?.id ?? null}
      initialValues={{
        title: website?.title ?? "",
        subtitle: website?.subtitle ?? "",
        ctaText: website?.ctaText ?? "",
        ctaLink: website?.ctaLink ?? "",
        content: website?.content ?? "",
        themeColor: website?.themeColor ?? "#2563eb",
      }}
    />
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Laddar formulär">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-zinc-200" />
          <div className="h-10 animate-pulse rounded-lg bg-zinc-200" />
        </div>
      ))}
    </div>
  );
}
