"use client";

import { blocksPlugin, outlinePlugin, type Plugin, useGetPuck } from "@puckeditor/core";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { pageConfig } from "@/lib/page/config";
import { addBlock, BLOCKS, BlockIcon } from "./block-tile";

// The icons in Puck's left rail, without text labels (names show as
// tooltips). The "blocks" item becomes a plus that opens a dropdown of
// everything that can be added, instead of a side panel.

export const sideRailPlugins: Plugin[] = [
  { ...blocksPlugin(), label: "", icon: <AddBlockButton /> },
  {
    ...outlinePlugin(),
    label: "",
    icon: (
      <span title="Struktur" className="block size-full">
        <RailIcon>
          <path d="M12.8 2.2a2 2 0 0 0-1.6 0L2.6 6.1a1 1 0 0 0 0 1.8l8.6 3.9a2 2 0 0 0 1.6 0l8.6-3.9a1 1 0 0 0 0-1.8z" />
          <path d="M2 12a1 1 0 0 0 .6.9l8.6 3.9a2 2 0 0 0 1.6 0l8.6-3.9A1 1 0 0 0 22 12" />
          <path d="M2 17a1 1 0 0 0 .6.9l8.6 3.9a2 2 0 0 0 1.6 0l8.6-3.9A1 1 0 0 0 22 17" />
        </RailIcon>
      </span>
    ),
  },
];

function AddBlockButton() {
  const getPuck = useGetPuck();
  const ref = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !ref.current?.contains(target)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", close);
    };
  }, [position]);

  function toggle() {
    if (position) return setPosition(null);
    const rect = ref.current?.closest("li")?.getBoundingClientRect();
    if (!rect) return;
    // Beside the rail on desktop, above it when the rail is at the bottom (mobile).
    const besides = rect.right + 300 < window.innerWidth;
    setPosition(besides ? { left: rect.right + 8, top: rect.top } : { left: 8, top: rect.top - 8 });
  }

  const categories = Object.values(pageConfig.categories ?? {});

  return (
    <span
      ref={ref}
      title="Lägg till block"
      // The ::after covers the whole rail item, so every click lands here
      // instead of opening Puck's side panel (see editor-theme.css).
      className="add-block-trigger block size-full"
      onClick={(event) => {
        event.stopPropagation();
        toggle();
      }}
    >
      <span className="flex size-full items-center justify-center rounded-full bg-violet-600 p-1 text-white shadow-md transition hover:bg-violet-700">
        <RailIcon>
          <path d="M12 5v14M5 12h14" />
        </RailIcon>
      </span>
      {position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Lägg till block"
            style={{ left: position.left, top: position.top }}
            className={`fixed z-1000 max-h-[calc(100vh-80px)] w-72 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-2 text-zinc-900 shadow-2xl ${
              position.left === 8 ? "-translate-y-full" : ""
            }`}
          >
            {categories.map((category) => (
              <div key={category.title} className="mb-1 last:mb-0">
                <p className="px-2.5 pt-2 pb-1 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                  {category.title}
                </p>
                {category.components?.map((type) => (
                  <button
                    key={type}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      addBlock(getPuck(), type);
                      setPosition(null);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-violet-50"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                      <BlockIcon name={type} size={18} />
                    </span>
                    <span className="grid min-w-0">
                      <span className="text-sm font-semibold">{BLOCKS[type]?.label ?? type}</span>
                      <span className="truncate text-xs text-zinc-500">{BLOCKS[type]?.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </span>
  );
}

function RailIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}
