"use client";

import { useGetPuck } from "@puckeditor/core";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type MenuState = {
  x: number;
  y: number;
  id: string;
  index: number;
  zone: string;
  siblings: number;
};

const MENU_WIDTH = 200;
const MENU_HEIGHT = 230;

// Puck iframe override. Module-level on purpose: Puck remounts the preview
// when this component changes identity.
export function PreviewFrame({ children, document: doc }: { children: ReactNode; document?: Document }) {
  return (
    <>
      <CanvasContextMenu doc={doc} />
      {children}
    </>
  );
}

// Right-click menu for blocks in Puck's preview iframe, like in Canva.
// `doc` is the iframe's document; the menu itself renders in the host page
// so it isn't scaled down with the zoomed preview.
function CanvasContextMenu({ doc }: { doc?: Document }) {
  const getPuck = useGetPuck();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!doc) return;

    const onContextMenu = (event: MouseEvent) => {
      const target = event.target as Element | null;
      // Keep the browser menu for copy/paste while text is selected.
      const selection = doc.getSelection();
      if (target?.closest("[contenteditable='true']") && selection && !selection.isCollapsed) return;

      const block = target?.closest("[data-puck-component]");
      const id = block?.getAttribute("data-puck-component");
      const selector = id ? getPuck().getSelectorForId(id) : undefined;
      if (!block || !id || !selector) return;

      event.preventDefault();
      getPuck().dispatch({ type: "setUi", ui: { itemSelector: selector } });

      // The preview is scaled to fit, so map iframe coordinates to the page.
      const frame = doc.defaultView?.frameElement as HTMLElement | null;
      const rect = frame?.getBoundingClientRect();
      const scale = rect && frame?.offsetWidth ? rect.width / frame.offsetWidth : 1;
      const x = (rect?.left ?? 0) + event.clientX * scale;
      const y = (rect?.top ?? 0) + event.clientY * scale;

      setMenu({
        x: Math.min(x, window.innerWidth - MENU_WIDTH - 8),
        y: Math.min(y, window.innerHeight - MENU_HEIGHT - 8),
        id,
        index: selector.index,
        zone: selector.zone,
        siblings: block.parentElement?.querySelectorAll(":scope > [data-puck-component]").length ?? 1,
      });
    };

    doc.addEventListener("contextmenu", onContextMenu);
    return () => doc.removeEventListener("contextmenu", onContextMenu);
  }, [doc, getPuck]);

  useEffect(() => {
    if (!menu || !doc) return;
    const close = () => setMenu(null);
    const onPointerDown = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && close();
    // Capture phase: Puck's inline text fields stop key and pointer events
    // from bubbling up to the document.
    const targets = [document, doc];
    targets.forEach((target) => {
      target.addEventListener("pointerdown", onPointerDown, true);
      target.addEventListener("keydown", onKeyDown, true);
      target.addEventListener("wheel", close, true);
    });
    window.addEventListener("resize", close);
    return () => {
      targets.forEach((target) => {
        target.removeEventListener("pointerdown", onPointerDown, true);
        target.removeEventListener("keydown", onKeyDown, true);
        target.removeEventListener("wheel", close, true);
      });
      window.removeEventListener("resize", close);
    };
  }, [menu, doc]);

  if (!menu) return null;

  function run(action: () => void) {
    action();
    setMenu(null);
  }

  const { dispatch } = getPuck();
  const { index, zone, siblings } = menu;
  const move = (destinationIndex: number) =>
    dispatch({ type: "reorder", sourceIndex: index, destinationIndex, destinationZone: zone });

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ left: menu.x, top: menu.y, width: MENU_WIDTH }}
      className="fixed z-1000 rounded-xl border border-zinc-200 bg-white p-1.5 text-sm text-zinc-800 shadow-xl"
    >
      <MenuItem
        onClick={() =>
          run(() =>
            dispatch({
              type: "setUi",
              ui: { itemSelector: { index, zone }, rightSideBarVisible: true },
            }),
          )
        }
      >
        Redigera inställningar
      </MenuItem>
      <MenuItem
        onClick={() => run(() => dispatch({ type: "duplicate", sourceIndex: index, sourceZone: zone }))}
      >
        Duplicera
      </MenuItem>
      <MenuItem disabled={index === 0} onClick={() => run(() => move(index - 1))}>
        Flytta upp
      </MenuItem>
      <MenuItem disabled={index >= siblings - 1} onClick={() => run(() => move(index + 1))}>
        Flytta ner
      </MenuItem>
      <div className="my-1 h-px bg-zinc-100" />
      <MenuItem
        danger
        onClick={() =>
          run(() => {
            dispatch({ type: "setUi", ui: { itemSelector: null } });
            dispatch({ type: "remove", index, zone });
          })
        }
      >
        Ta bort
      </MenuItem>
    </div>,
    document.body,
  );
}

function MenuItem({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`block w-full rounded-lg px-3 py-2 text-left disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent ${
        danger ? "text-red-600 hover:bg-red-50" : "hover:bg-violet-50 hover:text-violet-800"
      }`}
    >
      {children}
    </button>
  );
}
