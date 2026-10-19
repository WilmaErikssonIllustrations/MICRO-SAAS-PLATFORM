"use client";

import Link from "next/link";
import { useState } from "react";

export function PublishedLink({ websiteId }: { websiteId: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/site/${websiteId}`;

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-medium text-zinc-800">Din publika länk</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Link
          href={path}
          target="_blank"
          className="break-all font-mono text-sm text-blue-600 underline underline-offset-2 hover:text-blue-800"
        >
          {path}
        </Link>
        <button
          type="button"
          onClick={copyLink}
          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
        >
          {copied ? "Kopierad!" : "Kopiera länk"}
        </button>
      </div>
    </div>
  );
}
