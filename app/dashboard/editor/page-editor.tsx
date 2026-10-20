"use client";

import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import Link from "next/link";
import { type MouseEvent, useEffect, useRef, useState, useTransition } from "react";
import { type EditorActionResult, publishPage, saveDraft } from "@/actions/website";
import { type PageData, pageConfig } from "@/lib/page/config";

const LEAVE_WARNING = "Du har ändringar som inte är sparade. Vill du lämna editorn ändå?";

type PageEditorProps = {
  publishedData: PageData;
  draftData: PageData | null;
  siteUrl: string;
};

type LastAction = EditorActionResult & { action: "save" | "publish" };

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

  // Warn before closing the tab or reloading with unsaved edits.
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  // Client-side navigation doesn't fire beforeunload, so ask here.
  function confirmLeave(event: MouseEvent) {
    if (unsaved && !window.confirm(LEAVE_WARNING)) event.preventDefault();
  }

  return (
    <Puck
      config={pageConfig}
      data={initialData}
      onPublish={(data) => run("publish", data)}
      onChange={handleChange}
      headerTitle="Redigera din hemsida"
      overrides={{
        headerActions: ({ children }) => (
          <>
            <Link
              href="/dashboard"
              onClick={confirmLeave}
              style={{ fontSize: 14, marginRight: 8, textDecoration: "underline" }}
            >
              Tillbaka
            </Link>
            <StatusText
              busy={busy}
              unsaved={unsaved}
              unpublished={unpublished}
              lastAction={lastAction}
              siteUrl={siteUrl}
            />
            <button
              type="button"
              onClick={save}
              disabled={!unsaved || busy}
              title="Spara utan att publicera (Ctrl+S)"
              style={{
                padding: "8px 16px",
                borderRadius: 4,
                border: "1px solid #d4d4d8",
                background: "white",
                fontSize: 14,
                fontWeight: 600,
                cursor: !unsaved || busy ? "default" : "pointer",
                opacity: !unsaved || busy ? 0.5 : 1,
              }}
            >
              Spara
            </button>
            {children}
          </>
        ),
      }}
    />
  );
}

function StatusText({
  busy,
  unsaved,
  unpublished,
  lastAction,
  siteUrl,
}: {
  busy: boolean;
  unsaved: boolean;
  unpublished: boolean;
  lastAction: LastAction | null;
  siteUrl: string;
}) {
  if (busy) return <span style={{ fontSize: 14 }}>Sparar...</span>;

  if (lastAction) {
    return (
      <span role="status" style={{ fontSize: 14, color: lastAction.ok ? "#15803d" : "#dc2626" }}>
        {lastAction.message}
        {lastAction.ok && lastAction.action === "publish" && (
          <>
            {" "}
            <a
              href={siteUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontWeight: 600, textDecoration: "underline" }}
            >
              Visa sidan ↗
            </a>
          </>
        )}
        {lastAction.ok && lastAction.action === "save" && " Inte publicerat än."}
      </span>
    );
  }

  if (unsaved) return <span style={{ fontSize: 14, color: "#71717a" }}>Ej sparade ändringar</span>;
  if (unpublished) {
    return <span style={{ fontSize: 14, color: "#b45309" }}>Sparat utkast, inte publicerat</span>;
  }
  return null;
}
