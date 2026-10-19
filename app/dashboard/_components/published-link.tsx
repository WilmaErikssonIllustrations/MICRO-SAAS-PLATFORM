"use client";

import { useState } from "react";

export function PublishedLink({ urls }: { urls: string[] }) {
  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-medium text-zinc-800">Din hemsida är publicerad på</p>
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
        className="break-all font-mono text-sm text-blue-600 underline underline-offset-2 hover:text-blue-800"
      >
        {url}
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
      >
        {copied ? "Kopierad!" : "Kopiera länk"}
      </button>
    </div>
  );
}
