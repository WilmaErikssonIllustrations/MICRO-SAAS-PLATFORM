"use client";

import { useSyncExternalStore } from "react";

// Which part of a block (e.g. the Hero's title, see `data-part` in
// components/page-blocks/blocks.tsx) was last clicked in the preview, so
// the side panel can show that part's settings.

export type ActivePart = { id: string; part: string };

export const PART_LABELS: Record<string, string> = { title: "Rubrik", subtitle: "Underrubrik", cta: "Knapp" };

let current: ActivePart | null = null;
const listeners = new Set<() => void>();

export function setActivePart(next: ActivePart | null) {
  if (current?.id === next?.id && current?.part === next?.part) return;
  current = next;
  listeners.forEach((listener) => listener());
}

export function useActivePart() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => null,
  );
}

/** The block and part under a click in the preview (part null if none). */
export function partAt(target: Element | null): { id: string | null; part: string | null } {
  const block = target?.closest("[data-puck-component]");
  const id = block?.getAttribute("data-puck-component") ?? null;
  const partElement = target?.closest("[data-part]");
  // Only a part of this block, not of a block nested inside it.
  const part =
    partElement && partElement.closest("[data-puck-component]") === block ? partElement.getAttribute("data-part") : null;
  return { id, part };
}
