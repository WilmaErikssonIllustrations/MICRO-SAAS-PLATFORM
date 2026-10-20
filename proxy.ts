import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { matchHost, usesPathRouting } from "@/lib/domains";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;
  const match = matchHost(host);

  // Tenant sites: serve <subdomain>.ROOT_DOMAIN and custom domains from
  // the internal /sites/[host] route.
  if (match.kind !== "platform") {
    const hostname = host.replace(/:\d+$/, "").toLowerCase();
    return NextResponse.rewrite(new URL(`/sites/${hostname}${pathname}`, request.url));
  }

  // The internal route is only reachable through a tenant hostname, and
  // /s/<subdomain> only when path routing is enabled.
  if (pathname.startsWith("/sites") || (pathname.startsWith("/s/") && !usesPathRouting())) {
    return NextResponse.rewrite(new URL("/404", request.url));
  }

  // Optimistic check only: it looks for a session cookie without hitting the
  // database. Pages and Server Actions still verify the session via requireUser().
  if (pathname.startsWith("/dashboard") && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
