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
  PASSWORD_TOO_SHORT: "Lösenordet måste vara minst 8 tecken.",
  PASSWORD_TOO_LONG: "Lösenordet är för långt.",
};

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

function toErrorState(error: unknown, email: string): AuthFormState {
  if (error instanceof APIError) {
    const code = typeof error.body?.code === "string" ? error.body.code : "";
    return { error: ERROR_MESSAGES[code] ?? error.message, email };
  }
  console.error("Auth request failed", error);
  return { error: "Något gick fel. Försök igen.", email };
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);

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
