"use client";

import { Puck, type Viewports } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import "./editor-theme.css";
import { useEffect, useRef, useState, useTransition } from "react";
import { publishSite, saveDraft } from "@/actions/website";
import { type PageData, pageConfig } from "@/lib/page/config";
import { BlockTile } from "./block-tile";
import { PreviewFrame } from "./canvas-context-menu";
import { EditorShell } from "./image-editor";
import { NamedActionBar } from "./layers-panel";
import { PartFields } from "./part-fields";
import { sideRailPlugins } from "./side-rail";
import { svDictionary } from "./dictionary";
import { EditorTopBar, type LastAction } from "./editor-top-bar";
import { type EditorPage, openEditorPage, PagesContext } from "./pages";

// Puck's sizes without its full-width one, with Swedish names.
const viewports: Viewports = [
  { width: 360, height: "auto", icon: "Smartphone", label: "Mobil" },
  { width: 768, height: "auto", icon: "Tablet", label: "Surfplatta" },
  { width: 1280, height: "auto", icon: "Monitor", label: "Dator" },
];

type PageEditorProps = {
  /** The page being edited, and all of the site's pages (for the page switcher and links). */
  pageId: string;
  pages: EditorPage[];
  publishedData: PageData;
  draftData: PageData | null;
  /** Other pages have saved changes that aren't published (Publicera publishes them too). */
  otherPagesUnpublished: boolean;
  /** This page has never been published (a new page). */
  neverPublished: boolean;
  siteUrl: string;
};

export function PageEditor({
  pageId,
  pages,
  publishedData,
  draftData,
  otherPagesUnpublished,
  neverPublished,
  siteUrl,
}: PageEditorProps) {
  const initialData = draftData ?? publishedData;
  // Publicera publishes the whole site, so the other pages' state counts too.
  const othersUnpublished = useRef(otherPagesUnpublished || neverPublished);
  // Set while switching to another page, which saves first: no leave warning.
  const leaving = useRef(false);

  const [busy, startAction] = useTransition();
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  // Compare serialized pages to know what is saved and what is live.
  const current = useRef(initialData);
  const savedJson = useRef(JSON.stringify(initialData));
  const publishedJson = useRef(JSON.stringify(publishedData));
  const [unsaved, setUnsaved] = useState(false);
  const [unpublished, setUnpublished] = useState(
    () =>
      otherPagesUnpublished ||
      neverPublished ||
      (draftData !== null && JSON.stringify(draftData) !== JSON.stringify(publishedData)),
  );

  function refreshStatus() {
    setUnsaved(JSON.stringify(current.current) !== savedJson.current);
    setUnpublished(othersUnpublished.current || savedJson.current !== publishedJson.current);
  }

  function handleChange(data: PageData) {
    current.current = data;
    const changed = JSON.stringify(data) !== savedJson.current;
    setUnsaved(changed);
    if (changed) setLastAction(null);
  }

  function run(action: LastAction["action"], data: PageData) {
    setLastAction(null);
    startAction(async () => {
      const result = await (action === "save" ? saveDraft(pageId, data) : publishSite(pageId, data));
      setLastAction({ ...result, action });
      if (!result.ok) return;
      savedJson.current = JSON.stringify(data);
      if (action === "publish") {
        publishedJson.current = savedJson.current;
        othersUnpublished.current = false;
      }
      refreshStatus();
    });
  }

  const save = () => run("save", current.current);

  /**
   * Opens another page of the site (a full page load; see the note in
   * app/dashboard/page.tsx). Unsaved edits are saved as a draft first.
   */
  async function saveCurrent() {
    const data = current.current;
    if (JSON.stringify(data) === savedJson.current) return true;
    const result = await saveDraft(pageId, data);
    if (!result.ok) {
      setLastAction({ ...result, action: "save" });
      return false;
    }
    savedJson.current = JSON.stringify(data);
    refreshStatus();
    return true;
  }

  async function goToPage(id: string) {
    if (!(await saveCurrent())) return;
    leaving.current = true;
    openEditorPage(id);
  }

  // Ctrl/Cmd+S saves, like in most editors. Puck's preview is an iframe, so
  // listen there too or the shortcut won't work while editing in the canvas.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (unsaved && !busy) save();
      }
    };
    const targets: Window[] = [window];
    document.querySelectorAll("iframe").forEach((frame) => {
      if (frame.contentWindow) targets.push(frame.contentWindow);
    });
    targets.forEach((target) => target.addEventListener("keydown", onKeyDown));
    return () => targets.forEach((target) => target.removeEventListener("keydown", onKeyDown));
  });

  // Warn before leaving with unsaved edits (closing, reloading or "Tillbaka").
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!leaving.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  return (
    <PagesContext.Provider value={{ pageId, pages, saveCurrent, goToPage }}>
      <Puck
        config={pageConfig}
        data={initialData}
        onChange={handleChange}
        dictionary={svDictionary}
        plugins={sideRailPlugins}
        viewports={viewports}
        // Start with the canvas wide open; the plus adds blocks from a dropdown,
        // and settings are icons beside the viewport buttons (canvas-context-menu.tsx),
        // so Puck's settings panel on the right stays hidden.
        ui={{
          leftSideBarVisible: false,
          rightSideBarVisible: false,
          plugin: { current: "outline" },
          leftSideBarWidth: 280,
          rightSideBarWidth: 300,
        }}
        overrides={{
          header: () => (
            <EditorTopBar
              busy={busy}
              unsaved={unsaved}
              unpublished={unpublished}
              lastAction={lastAction}
              siteUrl={siteUrl}
              onSave={save}
              onPublish={(data) => run("publish", data)}
            />
          ),
          drawerItem: BlockTile,
          iframe: PreviewFrame,
          puck: EditorShell,
          actionBar: NamedActionBar,
          fields: PartFields,
        }}
      />
    </PagesContext.Provider>
  );
}
