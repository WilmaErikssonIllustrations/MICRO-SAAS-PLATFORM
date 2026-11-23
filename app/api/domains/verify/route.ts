import type { NextRequest } from "next/server";
import { domainVariants, isHostname, matchHost } from "@/lib/domains";
import { prisma } from "@/lib/prisma";

// "Ask" endpoint for on-demand TLS (e.g. Caddy's `on_demand_tls { ask ... }`):
// returns 200 only for hostnames that belong to a website, so certificates
// are issued for customer domains but not for arbitrary hosts.
export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain")?.toLowerCase() ?? "";
  // Anything that isn't a hostname (e.g. with a null byte, which the
  // database refuses) can't be a site.
  if (!isHostname(domain)) return new Response(null, { status: 404 });
  const match = matchHost(domain);

  if (match.kind === "platform") return new Response(null, { status: 200 });

  const website = await prisma.website.findFirst({
    where:
      match.kind === "subdomain"
        ? { subdomain: match.subdomain }
        : { customDomain: { in: domainVariants(match.domain) } },
    select: { id: true },
  });

  return new Response(null, { status: website ? 200 : 404 });
}
