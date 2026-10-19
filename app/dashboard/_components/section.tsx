import type { ReactNode } from "react";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
