"use client";

import { createUsePuck, useGetPuck } from "@puckeditor/core";
import { type ReactNode, useRef, useState } from "react";
import type { EditorActionResult } from "@/actions/website";
import { updateRootProps } from "@/components/page-blocks/update-block";
import { PageSwitcher } from "./pages";
import type { PageConfig, PageData } from "@/lib/page/config";

const usePuck = createUsePuck<PageConfig>();

export type LastAction = EditorActionResult & { action: "save" | "publish" };

export type EditorStatus = {
  busy: boolean;
  unsaved: boolean;
  unpublished: boolean;
  lastAction: LastAction | null;
  siteUrl: string;
};

type EditorTopBarProps = EditorStatus & {
  onSave: () => void;
  onPublish: (data: PageData) => void;
};

// Replaces Puck's header: back link and page name on the left, undo/redo
// in the middle and save state plus Spara/Publicera on the right.
export function EditorTopBar({ onSave, onPublish, ...status }: EditorTopBarProps) {
  const getPuck = useGetPuck();
  const title = usePuck((s) => s.appState.data.root.props?.title);
  const history = usePuck((s) => s.history);
  const { busy, unsaved } = status;

  return (
    <header
      style={{ gridArea: "header" }}
      className="flex h-14 items-center gap-3 border-b border-zinc-200 bg-(--editor-surface) px-3 text-zinc-900"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* A full page load, not <Link>: see the note in app/dashboard/page.tsx. */}
        <a
          href="/dashboard"
          title="Tillbaka till dashboard"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <Icon>
            <path d="M15 18l-6-6 6-6" />
          </Icon>
        </a>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
          {(title || "W").trim().charAt(0).toUpperCase()}
        </span>
        {/* The site's name (shared by its pages), then the page being edited. */}
        <PageName title={title ?? ""} onRename={(name) => updateRootProps(getPuck(), { title: name })} />
        <span aria-hidden className="-mx-1.5 text-zinc-300">
          ›
        </span>
        <PageSwitcher siteUrl={status.siteUrl} />
      </div>

      <div className="flex items-center gap-1">
        <IconButton title="Ångra (Ctrl+Z)" disabled={!history.hasPast} onClick={history.back}>
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
        </IconButton>
        <IconButton title="Gör om (Ctrl+Shift+Z)" disabled={!history.hasFuture} onClick={history.forward}>
          <path d="m15 14 5-5-5-5" />
          <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
        </IconButton>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <StatusText {...status} />
        <button
          type="button"
          onClick={onSave}
          disabled={!unsaved || busy}
          title="Spara utan att publicera (Ctrl+S)"
          className="rounded-lg border border-zinc-200 bg-(--editor-surface) px-3.5 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:cursor-default disabled:opacity-50"
        >
          Spara
        </button>
        <button
          type="button"
          onClick={() => onPublish(getPuck().appState.data as PageData)}
          disabled={busy}
          className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-60"
        >
          Publicera
        </button>
      </div>
    </header>
  );
}

/** The site's name; a click turns it into a field. Enter or leaving saves, Esc cancels. */
function PageName({ title, onRename }: { title: string; onRename: (name: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);

  if (draft === null) {
    return (
      <button
        type="button"
        title="Byt namn på webbplatsen"
        onClick={() => {
          cancelled.current = false;
          setDraft(title);
        }}
        className="min-w-0 truncate rounded-md px-1.5 py-1 text-left text-sm font-semibold hover:bg-zinc-100"
      >
        {title || "Min hemsida"}
      </button>
    );
  }

  const save = () => {
    // Esc already closed it (the field can still fire blur as it goes).
    if (cancelled.current) return;
    const name = draft.trim();
    if (name && name !== title) onRename(name);
    setDraft(null);
  };

  return (
    <input
      autoFocus
      aria-label="Webbplatsens namn"
      value={draft}
      maxLength={80}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => event.target.select()}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === "Enter") save();
        if (event.key === "Escape") {
          cancelled.current = true;
          setDraft(null);
        }
      }}
      className="h-8 w-56 min-w-0 rounded-md border border-violet-500 px-1.5 text-sm font-semibold outline-none"
    />
  );
}

function StatusText({ busy, unsaved, unpublished, lastAction, siteUrl }: EditorStatus) {
  const base = "hidden text-sm md:inline";

  if (busy) return <span className={`${base} text-zinc-500`}>Sparar...</span>;

  if (lastAction) {
    return (
      <span role="status" className={`${base} ${lastAction.ok ? "text-green-700" : "text-red-600"}`}>
        {lastAction.message}
        {lastAction.ok && lastAction.action === "publish" && (
          <>
            {" "}
            <a href={siteUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
              Visa sidan ↗
            </a>
          </>
        )}
        {lastAction.ok && lastAction.action === "save" && " Inte publicerat än."}
      </span>
    );
  }

  if (unsaved) return <span className={`${base} text-zinc-500`}>Ej sparade ändringar</span>;
  if (unpublished) return <span className={`${base} text-amber-700`}>Sparat utkast, inte publicerat</span>;
  return null;
}

function IconButton({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={() => onClick()}
      className="flex size-9 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"
    >
      <Icon>{children}</Icon>
    </button>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
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
