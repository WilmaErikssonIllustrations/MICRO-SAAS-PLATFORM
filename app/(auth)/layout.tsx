import type { ReactNode } from "react";
import { AuroraBackdrop, BrandLink } from "@/components/aurora-backdrop";

// Sign-in and sign-up, on the front page's dark animated backdrop.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative isolate flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-950 px-6 py-16 text-white scheme-dark">
      <AuroraBackdrop />
      <BrandLink />
      {children}
    </main>
  );
}
