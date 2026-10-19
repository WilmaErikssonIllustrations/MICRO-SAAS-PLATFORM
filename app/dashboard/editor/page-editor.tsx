"use client";

import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import Link from "next/link";
import { useState, useTransition } from "react";
import { type PublishResult, publishPage } from "@/actions/website";
import { type PageData, pageConfig } from "@/lib/page/config";

export function PageEditor({ initialData }: { initialData: PageData }) {
  const [result, setResult] = useState<PublishResult | null>(null);
  const [publishing, startPublishing] = useTransition();

  function handlePublish(data: PageData) {
    setResult(null);
    startPublishing(async () => setResult(await publishPage(data)));
  }

  return (
    <Puck
      config={pageConfig}
      data={initialData}
      onPublish={handlePublish}
      onChange={() => setResult(null)}
      headerTitle="Redigera din hemsida"
      overrides={{
        headerActions: ({ children }) => (
          <>
            <Link
              href="/dashboard"
              style={{ fontSize: 14, marginRight: 8, textDecoration: "underline" }}
            >
              Tillbaka
            </Link>
            {publishing && <span style={{ fontSize: 14 }}>Publicerar...</span>}
            {result && (
              <span role="status" style={{ fontSize: 14, color: result.ok ? "#15803d" : "#dc2626" }}>
                {result.message}
              </span>
            )}
            {children}
          </>
        ),
      }}
    />
  );
}
