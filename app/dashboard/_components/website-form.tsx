"use client";

import { type FormEvent, type ReactNode, startTransition, useActionState } from "react";
import { type SaveWebsiteState, saveWebsite } from "@/actions/website";
import type { WebsiteField } from "@/lib/validation";
import { FormField, fieldProps } from "./form-field";
import { PublishedLink } from "./published-link";
import { ThemeColorField } from "./theme-color-field";

type WebsiteFormProps = {
  websiteId: string | null;
  initialValues: Record<WebsiteField, string>;
};

const initialState: SaveWebsiteState = { status: "idle" };

export function WebsiteForm({ websiteId, initialValues }: WebsiteFormProps) {
  const [state, formAction, pending] = useActionState(saveWebsite, initialState);

  const errors = state.status === "error" ? state.errors : undefined;
  const publishedId = state.status === "success" ? state.websiteId : websiteId;

  // Submit manually instead of via <form action> so React keeps the typed
  // values instead of resetting the form after saving.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <Section title="Hero">
        <FormField id="title" label="Rubrik" error={errors?.title}>
          <input
            {...fieldProps("title", errors?.title)}
            defaultValue={initialValues.title}
            placeholder="Välkommen till vårt företag"
            required
          />
        </FormField>

        <FormField id="subtitle" label="Underrubrik" error={errors?.subtitle}>
          <input
            {...fieldProps("subtitle", errors?.subtitle)}
            defaultValue={initialValues.subtitle}
            placeholder="En kort mening om vad ni gör"
          />
        </FormField>
      </Section>

      <Section title="Call to Action">
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField id="ctaText" label="Knapptext" error={errors?.ctaText}>
            <input
              {...fieldProps("ctaText", errors?.ctaText)}
              defaultValue={initialValues.ctaText}
              placeholder="Kontakta oss"
            />
          </FormField>

          <FormField id="ctaLink" label="Länk" error={errors?.ctaLink}>
            <input
              {...fieldProps("ctaLink", errors?.ctaLink)}
              type="url"
              defaultValue={initialValues.ctaLink}
              placeholder="https://..."
            />
          </FormField>
        </div>
      </Section>

      <Section title="Innehåll">
        <FormField
          id="content"
          label="Om oss"
          hint="En tom rad mellan stycken skapar nya paragrafer."
          error={errors?.content}
        >
          <textarea
            {...fieldProps("content", errors?.content)}
            defaultValue={initialValues.content}
            rows={8}
            placeholder="Berätta om er verksamhet..."
          />
        </FormField>
      </Section>

      <Section title="Utseende">
        <ThemeColorField
          defaultValue={initialValues.themeColor}
          error={errors?.themeColor}
        />
      </Section>

      <div className="space-y-4 border-t border-zinc-200 pt-6">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Sparar..." : "Spara & Publicera"}
          </button>

          {state.status !== "idle" && (
            <p
              role="status"
              className={state.status === "success" ? "text-sm text-green-700" : "text-sm text-red-600"}
            >
              {state.message}
            </p>
          )}
        </div>

        {publishedId && <PublishedLink websiteId={publishedId} />}
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
