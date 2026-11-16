"use client";

import { useGetPuck } from "@puckeditor/core";
import type { ReactNode } from "react";

const ROOT_ZONE = "root:default-zone";

const blocks: Record<string, { label: string; hint: string; icon: ReactNode }> = {
  Hero: {
    label: "Hero",
    hint: "Stor rubrik med knapp",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 10h10M9 14h6" />
      </>
    ),
  },
  Heading: { label: "Rubrik", hint: "Ny sektion", icon: <path d="M6 5v14M18 5v14M6 12h12" /> },
  Text: { label: "Text", hint: "Stycken och listor", icon: <path d="M4 6h16M4 10h16M4 14h16M4 18h10" /> },
  Image: {
    label: "Bild",
    hint: "Ladda upp en bild",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="m21 16-5-5-9 9" />
      </>
    ),
  },
  Button: {
    label: "Knapp",
    hint: "Länk till något",
    icon: (
      <>
        <rect x="3" y="8" width="18" height="8" rx="4" />
        <path d="M9 12h6" />
      </>
    ),
  },
  Columns: {
    label: "Kolumner",
    hint: "Två block bredvid varandra",
    icon: (
      <>
        <rect x="3" y="4" width="8" height="16" rx="1.5" />
        <rect x="13" y="4" width="8" height="16" rx="1.5" />
      </>
    ),
  },
  Spacer: { label: "Mellanrum", hint: "Luft mellan block", icon: <path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4" /> },
};

// Puck drawer item override: a card that can be dragged onto the page, or
// clicked to add the block below the selected one (or last on the page).
export function BlockTile({ name }: { name: string; children: ReactNode }) {
  const getPuck = useGetPuck();
  const block = blocks[name] ?? { label: name, hint: "", icon: null };

  function addBlock() {
    const { appState, dispatch } = getPuck();
    const selected = appState.ui.itemSelector;
    const zone = selected?.zone ?? ROOT_ZONE;
    const index =
      selected?.zone !== undefined ? selected.index + 1 : appState.data.content.length;

    dispatch({ type: "insert", componentType: name, destinationIndex: index, destinationZone: zone });
    dispatch({ type: "setUi", ui: { itemSelector: { index, zone } } });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={addBlock}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          addBlock();
        }
      }}
      title="Klicka för att lägga till, eller dra in i sidan"
      className="mb-2 flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-white p-2.5 text-left shadow-xs transition hover:-translate-y-px hover:border-violet-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-violet-500"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {block.icon}
        </svg>
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="text-sm font-semibold text-zinc-900">{block.label}</span>
        {block.hint && <span className="truncate text-xs text-zinc-500">{block.hint}</span>}
      </span>
    </div>
  );
}
