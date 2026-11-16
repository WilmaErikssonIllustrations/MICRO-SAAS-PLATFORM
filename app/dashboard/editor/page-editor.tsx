"use client";

import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import "./editor-theme.css";
import { useEffect, useRef, useState, useTransition } from "react";
import { publishPage, saveDraft } from "@/actions/website";
import { type PageData, pageConfig } from "@/lib/page/config";
import { BlockTile } from "./block-tile";
import { svDictionary } from "./dictionary";
import { EditorTopBar, type LastAction } from "./editor-top-bar";

type PageEditorProps = {
  publishedData: PageData;
  draftData: PageData | null;
  siteUrl: string;
};

export function PageEditor({ publishedData, draftData, siteUrl }: PageEditorProps) {
  const initialData = draftData ?? publishedData;

  const [busy, startAction] = useTransition();
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  // Compare serialized pages to know what is saved and what is live.
  const current = useRef(initialData);
  const savedJson = useRef(JSON.stringify(initialData));
  const publishedJson = useRef(JSON.stringify(publishedData));
  const [unsaved, setUnsaved] = useState(false);
  const [unpublished, setUnpublished] = useState(
    () => draftData !== null && JSON.stringify(draftData) !== JSON.stringify(publishedData),
  );

  function refreshStatus() {
    setUnsaved(JSON.stringify(current.current) !== savedJson.current);
    setUnpublished(savedJson.current !== publishedJson.current);
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
      const result = await (action === "save" ? saveDraft(data) : publishPage(data));
      setLastAction({ ...result, action });
      if (!result.ok) return;
      savedJson.current = JSON.stringify(data);
      if (action === "publish") publishedJson.current = savedJson.current;
      refreshStatus();
    });
  }

  const save = () => run("save", current.current);

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
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  return (
    <Puck
      config={pageConfig}
      data={initialData}
      onChange={handleChange}
      dictionary={svDictionary}
      ui={{ leftSideBarWidth: 280, rightSideBarWidth: 300 }}
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
      }}
    />
  );
}
