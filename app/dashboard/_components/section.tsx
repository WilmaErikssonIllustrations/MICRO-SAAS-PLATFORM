import type { ReactNode } from "react";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-6 rounded-2xl border border-white/10 bg-white/5 shadow-2xl shadow-black/30 backdrop-blur-xl p-6">
      <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
