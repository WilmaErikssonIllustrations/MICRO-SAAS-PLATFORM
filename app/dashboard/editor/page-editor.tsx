"use client";

import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import Link from "next/link";
import { type MouseEvent, useEffect, useRef, useState, useTransition } from "react";
import { type PublishResult, publishPage } from "@/actions/website";
import { type PageData, pageConfig } from "@/lib/page/config";

const LEAVE_WARNING = "Du har ändringar som inte är publicerade. Vill du lämna editorn ändå?";

export function PageEditor({ initialData, siteUrl }: { initialData: PageData; siteUrl: string }) {
  const [result, setResult] = useState<PublishResult | null>(null);
  const [publishing, startPublishing] = useTransition();
  const [dirty, setDirty] = useState(false);
  // The last published page, to tell whether the editor holds unsaved edits.
  const publishedJson = useRef(JSON.stringify(initialData));

  // Warn before closing the tab or reloading with unpublished edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function handleChange(data: PageData) {
    const changed = JSON.stringify(data) !== publishedJson.current;
    setDirty(changed);
    if (changed) setResult(null);
  }

  function handlePublish(data: PageData) {
    setResult(null);
    startPublishing(async () => {
      const response = await publishPage(data);
      setResult(response);
      if (response.ok) {
        publishedJson.current = JSON.stringify(data);
        setDirty(false);
      }
    });
  }

  // Client-side navigation doesn't fire beforeunload, so ask here.
  function confirmLeave(event: MouseEvent) {
    if (dirty && !window.confirm(LEAVE_WARNING)) event.preventDefault();
  }

  return (
    <Puck
      config={pageConfig}
      data={initialData}
      onPublish={handlePublish}
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
            {publishing && <span style={{ fontSize: 14 }}>Publicerar...</span>}
            {!publishing && dirty && (
              <span style={{ fontSize: 14, color: "#71717a" }}>Ej publicerade ändringar</span>
            )}
            {result && (
              <span
                role="status"
                style={{ fontSize: 14, color: result.ok ? "#15803d" : "#dc2626" }}
              >
                {result.message}
                {result.ok && (
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
              </span>
            )}
            {children}
          </>
        ),
      }}
    />
  );
}
