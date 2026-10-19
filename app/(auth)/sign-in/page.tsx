import type { Metadata } from "next";
import { AuthForm } from "../_components/auth-form";

export const metadata: Metadata = { title: "Logga in – Website Builder" };

export default function SignInPage() {
  return <AuthForm mode="sign-in" />;
}
