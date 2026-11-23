"use client";

import { useState } from "react";

export function PublishedLink({ urls }: { urls: string[] }) {
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-medium text-zinc-200">Din hemsida är publicerad på</p>
      {urls.map((url) => (
        <LinkRow key={url} url={url} />
      ))}
    </div>
  );
}

function LinkRow({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="break-all font-mono text-sm text-violet-300 underline underline-offset-2 hover:text-violet-200"
      >
        {url}
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="rounded-md border border-white/15 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-white/10"
      >
        {copied ? "Kopierad!" : "Kopiera länk"}
      </button>
    </div>
  );
}
