"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type AuthFormState = { error: string | null; email: string };

const ERROR_MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS: "Det finns redan ett konto med den e-postadressen.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Det finns redan ett konto med den e-postadressen.",
  INVALID_EMAIL_OR_PASSWORD: "Fel e-post eller lösenord.",
  INVALID_EMAIL: "Ange en giltig e-postadress.",
  VALIDATION_ERROR: "Kontrollera e-postadressen och lösenordet.",
  PASSWORD_TOO_SHORT: "Lösenordet måste vara minst 8 tecken.",
  PASSWORD_TOO_LONG: "Lösenordet är för långt.",
};

// Checked here as well as by Better Auth: its own check throws a validation
// error that isn't an APIError, which would show "Något gick fel".
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 254;

/** An error message for the email address, or null when it looks fine. */
function emailError(email: string) {
  return EMAIL.test(email) && email.length <= MAX_EMAIL ? null : ERROR_MESSAGES.INVALID_EMAIL;
}

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

function toErrorState(error: unknown, email: string): AuthFormState {
  // Better Auth's errors carry a code in `body`; not all of them are APIErrors.
  const body = error instanceof APIError ? error.body : (error as { body?: { code?: unknown } } | null)?.body;
  const code = typeof body?.code === "string" ? body.code : "";
  if (ERROR_MESSAGES[code]) return { error: ERROR_MESSAGES[code], email };
  if (error instanceof APIError) return { error: error.message, email };
  console.error("Auth request failed", error);
  return { error: "Något gick fel. Försök igen.", email };
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);
  const invalid = emailError(email);
  if (invalid) return { error: invalid, email };

  try {
    await auth.api.signUpEmail({
      // Signup only asks for email + password; the name defaults to the
      // part before @ and can be changed later.
      body: { email, password, name: email.split("@")[0] },
      headers: await headers(),
    });
  } catch (error) {
    return toErrorState(error, email);
  }

  redirect("/dashboard");
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);
  // A malformed address can't have an account: same message as a wrong password.
  if (emailError(email)) return { error: ERROR_MESSAGES.INVALID_EMAIL_OR_PASSWORD, email };

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch (error) {
    return toErrorState(error, email);
  }

  redirect("/dashboard");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/sign-in");
}
