"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type AuthFormState, signIn, signUp } from "@/actions/auth";

const COPY = {
  "sign-up": {
    action: signUp,
    title: "Skapa konto",
    submit: "Skapa konto",
    pending: "Skapar konto...",
    switchText: "Har du redan ett konto?",
    switchLink: { href: "/sign-in", label: "Logga in" },
    passwordAutoComplete: "new-password",
  },
  "sign-in": {
    action: signIn,
    title: "Logga in",
    submit: "Logga in",
    pending: "Loggar in...",
    switchText: "Har du inget konto?",
    switchLink: { href: "/sign-up", label: "Skapa konto" },
    passwordAutoComplete: "current-password",
  },
} as const;

const initialState: AuthFormState = { error: null, email: "" };

const inputClassName =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900";

export function AuthForm({ mode }: { mode: keyof typeof COPY }) {
  const copy = COPY[mode];
  const [state, formAction, pending] = useActionState(copy.action, initialState);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>

      <form action={formAction} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-zinc-800">
            E-post
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state.email}
            required
            className={inputClassName}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-zinc-800">
            Lösenord
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={copy.passwordAutoComplete}
            minLength={8}
            required
            className={inputClassName}
          />
          {mode === "sign-up" && <p className="text-sm text-zinc-500">Minst 8 tecken.</p>}
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {pending ? copy.pending : copy.submit}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        {copy.switchText}{" "}
        <Link href={copy.switchLink.href} className="font-medium text-zinc-900 underline">
          {copy.switchLink.label}
        </Link>
      </p>
    </div>
  );
}
