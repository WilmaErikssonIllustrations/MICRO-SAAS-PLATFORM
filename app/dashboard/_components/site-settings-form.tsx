"use client";

import { type FormEvent, startTransition, useActionState, useState, useTransition } from "react";
import {
  type DnsCheckResult,
  type SiteSettingsState,
  checkDomainDns,
  saveSiteSettings,
} from "@/actions/site-settings";
import { FormField, fieldProps } from "./form-field";
import { Section } from "./section";

type SiteSettingsFormProps = {
  /** Shown around the subdomain input, e.g. ".example.com" or "example.com/s/". */
  addressPrefix: string;
  addressSuffix: string;
  cnameTarget: string;
  subdomain: string;
  customDomain: string | null;
};

const initialState: SiteSettingsState = { status: "idle" };

export function SiteSettingsForm({
  addressPrefix,
  addressSuffix,
  cnameTarget,
  subdomain,
  customDomain,
}: SiteSettingsFormProps) {
  const [state, formAction, pending] = useActionState(saveSiteSettings, initialState);
  const errors = state.status === "error" ? state.errors : undefined;

  // Submit manually so React doesn't reset the fields after saving.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Section title="Adress">
        <FormField id="subdomain" label="Gratisadress" error={errors?.subdomain}>
          <div className="flex items-center gap-2">
            {addressPrefix && (
              <span className="shrink-0 text-sm text-zinc-400">{addressPrefix}</span>
            )}
            <input
              // Remount when the saved value changes so the field shows it normalized.
              key={subdomain}
              {...fieldProps("subdomain", errors?.subdomain)}
              defaultValue={subdomain}
              autoComplete="off"
              spellCheck={false}
            />
            <span className="shrink-0 text-sm text-zinc-400">{addressSuffix}</span>
          </div>
        </FormField>

        <FormField
          id="customDomain"
          label="Egen domän (valfritt)"
          hint="T.ex. www.mittforetag.se. Lämna tomt om du bara vill använda gratisadressen."
          error={errors?.customDomain}
        >
          <input
            key={customDomain}
            {...fieldProps("customDomain", errors?.customDomain)}
            defaultValue={customDomain ?? ""}
            placeholder="www.mittforetag.se"
            autoComplete="off"
            spellCheck={false}
          />
        </FormField>

        {customDomain && <DnsInstructions domain={customDomain} target={cnameTarget} />}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-60"
          >
            {pending ? "Sparar..." : "Spara adresser"}
          </button>
          {state.status !== "idle" && (
            <p
              role="status"
              className={state.status === "success" ? "text-sm text-green-400" : "text-sm text-red-400"}
            >
              {state.message}
            </p>
          )}
        </div>
      </Section>
    </form>
  );
}

function DnsInstructions({ domain, target }: { domain: string; target: string }) {
  const [result, setResult] = useState<DnsCheckResult | null>(null);
  const [checking, startChecking] = useTransition();

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
      <p className="font-medium text-white">Koppla {domain}</p>
      <p>Logga in hos din domänleverantör och skapa den här DNS-posten:</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
        <dt className="text-zinc-400">Typ</dt>
        <dd>CNAME</dd>
        <dt className="text-zinc-400">Namn</dt>
        <dd className="break-all">{domain}</dd>
        <dt className="text-zinc-400">Värde</dt>
        <dd className="break-all">{target}</dd>
      </dl>
      <p className="text-zinc-400">
        För en domän utan www (t.ex. mittforetag.se) använder du en ALIAS-/ANAME-post om
        leverantören stödjer det. Hemsidan visas både med och utan www när båda pekar hit.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={checking}
          onClick={() => startChecking(async () => setResult(await checkDomainDns()))}
          className="rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15 disabled:opacity-60"
        >
          {checking ? "Kontrollerar..." : "Kontrollera DNS"}
        </button>
        {result && (
          <p role="status" className={result.ok ? "text-green-400" : "text-amber-300"}>
            {result.message}
          </p>
        )}
      </div>
    </div>
  );
}
