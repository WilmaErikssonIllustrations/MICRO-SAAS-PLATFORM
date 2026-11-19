"use client";

import { createContext, type ReactNode, useContext, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { createPage, deletePage, updatePage } from "@/actions/website";
import { slugify, validateSlug } from "@/lib/page/links";
import type { BlockOutline } from "@/lib/page/outline";
import { PAGE_TEMPLATES, type PageTemplate } from "@/lib/page/templates";

// The site's pages in the editor: the page switcher in the top bar, and the
// dialogs to add a page or change one. Each page is edited on its own
// (/dashboard/editor?page=<id>); Publicera publishes them all.

export type EditorPage = {
  id: string;
  title: string;
  slug: string;
  /** The page's blocks as last saved, so buttons can link to one of them (empty for the page being edited). */
  blocks: BlockOutline[];
};

type PagesContextValue = {
  pageId: string;
  pages: EditorPage[];
  /** Saves the current page's unsaved edits as a draft; false if that failed. */
  saveCurrent: () => Promise<boolean>;
  /** Saves unsaved edits as a draft, then opens the page. */
  goToPage: (id: string) => Promise<void>;
};

export const PagesContext = createContext<PagesContextValue>({
  pageId: "",
  pages: [],
  saveCurrent: async () => true,
  goToPage: async () => {},
});

export const usePages = () => useContext(PagesContext);

/**
 * Opens a page in the editor with a full page load, not the router: Puck's
 * preview iframe breaks when Next.js shows a kept editor again (see the
 * note in app/dashboard/page.tsx).
 */
export function openEditorPage(id: string) {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load on purpose, see above
  window.location.assign(`/dashboard/editor?page=${encodeURIComponent(id)}`);
}

/** The page name and address shown in lists: "/" for the start page. */
const address = (page: EditorPage) => `/${page.slug}`;

/** The current page's name in the top bar; opens the list of pages. */
export function PageSwitcher({ siteUrl }: { siteUrl: string }) {
  const { pageId, pages, goToPage } = usePages();
  const current = pages.find((page) => page.id === pageId);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [dialog, setDialog] = useState<"new" | "settings" | null>(null);

  useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close();
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
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setPosition({ left: rect.left, top: rect.bottom + 6 });
  }

  function open(next: "new" | "settings") {
    setPosition(null);
    setDialog(next);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        title="Byt sida"
        aria-haspopup="menu"
        aria-expanded={position !== null}
        onClick={toggle}
        className={`flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 ${
          position ? "bg-zinc-100 text-zinc-900" : ""
        }`}
      >
        <span className="truncate">{current?.title ?? "Sida"}</span>
        <Icon>
          <path d="m6 9 6 6 6-6" />
        </Icon>
      </button>

      {position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Sidor"
            style={{ left: position.left, top: position.top }}
            className="fixed z-1000 max-h-[calc(100vh-80px)] w-72 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1.5 text-sm text-zinc-800 shadow-2xl"
          >
            <p className="px-2.5 pt-1 pb-1.5 text-xs font-semibold tracking-wide text-zinc-400 uppercase">Sidor</p>
            {pages.map((page) => (
              <button
                key={page.id}
                type="button"
                role="menuitemradio"
                aria-checked={page.id === pageId}
                onClick={() => {
                  setPosition(null);
                  if (page.id !== pageId) void goToPage(page.id);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-violet-50 ${
                  page.id === pageId ? "font-semibold text-violet-800" : ""
                }`}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {page.id === pageId && (
                    <Icon>
                      <path d="M5 12l5 5 9-11" />
                    </Icon>
                  )}
                </span>
                <span className="flex-1 truncate">{page.title}</span>
                <span className="max-w-28 truncate text-xs font-normal text-zinc-400">{address(page)}</span>
              </button>
            ))}
            <div className="mx-1 my-1 h-px bg-zinc-100" />
            <MenuAction label="Sidinställningar..." onClick={() => open("settings")}>
              <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
              <circle cx="16" cy="6" r="2" />
              <circle cx="10" cy="12" r="2" />
              <circle cx="18" cy="18" r="2" />
            </MenuAction>
            <MenuAction label="Ny sida..." onClick={() => open("new")}>
              <path d="M12 5v14M5 12h14" />
            </MenuAction>
          </div>,
          document.body,
        )}

      {dialog === "new" && <NewPageDialog current={current} onClose={() => setDialog(null)} />}
      {dialog === "settings" && current && (
        <PageSettingsDialog page={current} siteUrl={siteUrl} onClose={() => setDialog(null)} />
      )}
    </>
  );
}

function MenuAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-violet-50 hover:text-violet-900"
    >
      <span className="flex size-4 shrink-0 items-center justify-center opacity-70">
        <Icon>{children}</Icon>
      </span>
      {label}
    </button>
  );
}

type Start = { kind: "blank" } | { kind: "copy" } | { kind: "template"; template: PageTemplate };

/** A new page: its name, and what it starts with (empty, a copy of this page, or a template). */
function NewPageDialog({ current, onClose }: { current: EditorPage | undefined; onClose: () => void }) {
  const { pageId, saveCurrent, goToPage } = usePages();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState<Start>({ kind: "blank" });
  const [error, setError] = useState<string | null>(null);
  const [busy, startAction] = useTransition();

  // A template suggests its name until one is typed.
  const [typed, setTyped] = useState(false);
  function choose(next: Start) {
    setStart(next);
    if (!typed) setTitle(next.kind === "template" ? PAGE_TEMPLATES[next.template].label : "");
  }

  function create() {
    setError(null);
    startAction(async () => {
      // A copy includes the current page's unsaved edits: save them first.
      if (start.kind === "copy" && !(await saveCurrent())) return setError("Kunde inte spara sidan. Försök igen.");
      const result = await createPage({
        title,
        template: start.kind === "template" ? start.template : null,
        copyOf: start.kind === "copy" ? pageId : null,
      });
      if (!result.ok || !result.pageId) return setError(result.message);
      await goToPage(result.pageId);
    });
  }

  const options: { key: string; label: string; hint: string; start: Start }[] = [
    { key: "blank", label: "Tom sida", hint: "Börja från början", start: { kind: "blank" } },
    {
      key: "copy",
      label: `Kopia av ${current?.title ?? "den här sidan"}`,
      hint: "Samma innehåll som sidan du står på",
      start: { kind: "copy" },
    },
    ...(Object.keys(PAGE_TEMPLATES) as PageTemplate[]).map((template) => ({
      key: template,
      label: PAGE_TEMPLATES[template].label,
      hint: PAGE_TEMPLATES[template].hint,
      start: { kind: "template", template } as Start,
    })),
  ];
  const selectedKey = start.kind === "template" ? start.template : start.kind;

  return (
    <Dialog title="Ny sida" onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          create();
        }}
      >
        <label className="grid gap-1.5 text-sm font-medium">
          Namn
          <input
            autoFocus
            value={title}
            maxLength={60}
            placeholder="t.ex. Om oss"
            onChange={(event) => {
              setTitle(event.target.value);
              setTyped(true);
            }}
            className="h-10 rounded-lg border border-zinc-200 px-3 font-normal focus:border-violet-500 focus:outline-none"
          />
          {title.trim() && (
            <span className="text-xs font-normal text-zinc-500">Adress: /{slugify(title) || "sida"}</span>
          )}
        </label>

        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-sm font-medium">Börja med</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={selectedKey === option.key}
                onClick={() => choose(option.start)}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  selectedKey === option.key
                    ? "border-violet-600 bg-violet-50 text-violet-900"
                    : "border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <span className="block truncate font-semibold">{option.label}</span>
                <span className="block text-xs text-zinc-500">{option.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogButtons busy={busy} submitLabel="Skapa sida" onCancel={onClose} />
      </form>
    </Dialog>
  );
}

/** A page's name and address, and removing it (not the start page). */
function PageSettingsDialog({ page, siteUrl, onClose }: { page: EditorPage; siteUrl: string; onClose: () => void }) {
  const { pages, goToPage } = usePages();
  const isStart = page.slug === "";
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, startAction] = useTransition();

  function save() {
    setError(null);
    const slugError = isStart ? null : validateSlug(slug);
    if (slugError) return setError(slugError);
    startAction(async () => {
      const result = await updatePage(page.id, { title, slug });
      if (!result.ok) return setError(result.message);
      // Reload, so the page list and links show the new name.
      await goToPage(page.id);
    });
  }

  function remove() {
    if (!confirmDelete) return setConfirmDelete(true);
    startAction(async () => {
      const result = await deletePage(page.id);
      if (!result.ok) return setError(result.message);
      const start = pages.find((p) => p.slug === "");
      // The deleted page has nothing to save; go straight to the start page.
      if (start) openEditorPage(start.id);
    });
  }

  return (
    <Dialog title="Sidinställningar" onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <label className="grid gap-1.5 text-sm font-medium">
          Namn
          <input
            autoFocus
            value={title}
            maxLength={60}
            onChange={(event) => setTitle(event.target.value)}
            className="h-10 rounded-lg border border-zinc-200 px-3 font-normal focus:border-violet-500 focus:outline-none"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Adress
          <span className="flex items-center rounded-lg border border-zinc-200 focus-within:border-violet-500">
            <span className="max-w-48 truncate pl-3 font-normal text-zinc-500">{siteUrl.replace(/^https?:\/\//, "")}/</span>
            <input
              value={slug}
              disabled={isStart}
              maxLength={60}
              placeholder={isStart ? "" : "om-oss"}
              onChange={(event) => setSlug(event.target.value.toLowerCase())}
              className="h-10 min-w-0 flex-1 rounded-r-lg bg-transparent pr-3 font-normal focus:outline-none disabled:text-zinc-400"
            />
          </span>
          <span className="text-xs font-normal text-zinc-500">
            {isStart
              ? "Startsidan ligger alltid på webbplatsens huvudadress."
              : "Knappar som länkar hit följer med om du ändrar adressen. Ändringen syns direkt."}
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogButtons busy={busy} submitLabel="Spara" onCancel={onClose} />

        {!isStart && (
          <div className="border-t border-zinc-100 pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                confirmDelete ? "bg-red-600 text-white hover:bg-red-700" : "text-red-600 hover:bg-red-50"
              }`}
            >
              {confirmDelete ? "Ja, ta bort sidan" : "Ta bort sidan..."}
            </button>
            {confirmDelete && (
              <p className="mt-2 text-xs text-zinc-500">
                Sidan tas bort direkt, även från den publicerade webbplatsen. Knappar som länkar hit leder ingenstans.
              </p>
            )}
          </div>
        )}
      </form>
    </Dialog>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-1000 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm"
      onPointerDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-zinc-900 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function DialogButtons({ busy, submitLabel, onCancel }: { busy: boolean; submitLabel: string; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
      >
        Avbryt
      </button>
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {busy ? "Vänta..." : submitLabel}
      </button>
    </div>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
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
