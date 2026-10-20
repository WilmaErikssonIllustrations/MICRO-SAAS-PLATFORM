// Host parsing and domain rules shared by proxy.ts, validation and the UI.
// Kept free of database imports so it can run in the proxy.

const DEFAULT_ROOT_DOMAIN = "localhost:3000";

/** The platform's own domain, including the port in development. */
export function getRootDomain() {
  return (process.env.ROOT_DOMAIN || DEFAULT_ROOT_DOMAIN).toLowerCase();
}

/** Hostname customers point their CNAME record at. */
export function getCustomDomainTarget() {
  return process.env.CUSTOM_DOMAIN_TARGET || stripPort(getRootDomain());
}

/**
 * "subdomain" (default) serves sites on <subdomain>.ROOT_DOMAIN. "path" serves
 * them on ROOT_DOMAIN/s/<subdomain>, for hosting without a wildcard domain
 * (e.g. a free *.vercel.app address).
 */
export function usesPathRouting() {
  return process.env.SITE_ROUTING === "path";
}

function stripPort(host: string) {
  return host.replace(/:\d+$/, "");
}

export type HostMatch =
  | { kind: "platform" }
  | { kind: "subdomain"; subdomain: string }
  | { kind: "custom"; domain: string };

/** Decides whether a request host is the platform itself or a tenant site. */
export function matchHost(host: string): HostMatch {
  const hostname = stripPort(host.toLowerCase());
  const root = stripPort(getRootDomain());

  if (hostname === root || hostname === `www.${root}`) {
    return { kind: "platform" };
  }
  // Vercel preview deployments get their own *.vercel.app hostnames, which
  // customers can never own, so treat them as the platform too.
  if (hostname.endsWith(".vercel.app")) return { kind: "platform" };
  if (hostname.endsWith(`.${root}`)) {
    const subdomain = hostname.slice(0, -(root.length + 1));
    // Only one level deep: a.b.root is not a valid site address.
    if (!subdomain.includes(".")) return { kind: "subdomain", subdomain };
  }
  return { kind: "custom", domain: hostname };
}

/** Cache tag for everything rendered for a given site hostname. */
export const hostTag = (hostname: string) => `host-${hostname}`;

/** Internal hostname for a subdomain; also the cache key for path routing. */
export function subdomainHostname(subdomain: string) {
  return `${subdomain}.${stripPort(getRootDomain())}`;
}

/** All hostnames a website answers on, without ports. */
export function websiteHostnames(site: { subdomain: string; customDomain: string | null }) {
  const hostnames = [subdomainHostname(site.subdomain)];
  if (site.customDomain) hostnames.push(site.customDomain);
  return hostnames;
}

/** Public URL of a website on the platform (subdomain or /s/ path). */
export function platformSiteUrl(subdomain: string) {
  const root = getRootDomain();
  const protocol = root.startsWith("localhost") ? "http" : "https";
  return usesPathRouting()
    ? `${protocol}://${root}/s/${subdomain}`
    : `${protocol}://${subdomain}.${root}`;
}

// --- Validation -----------------------------------------------------------

const SUBDOMAIN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const RESERVED_SUBDOMAINS = new Set([
  "www", "app", "api", "admin", "dashboard", "mail", "sites", "cname", "static",
]);
const DOMAIN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** Returns an error message, or null if the subdomain is valid. */
export function validateSubdomain(value: string): string | null {
  if (!SUBDOMAIN.test(value)) {
    return "3–40 tecken: små bokstäver a–z, siffror och bindestreck.";
  }
  if (RESERVED_SUBDOMAINS.has(value)) return "Den adressen är reserverad.";
  return null;
}

/** Lowercases and strips protocol, path and trailing dot from user input. */
export function normalizeDomain(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");
}

/** Returns an error message, or null if the custom domain is valid. */
export function validateCustomDomain(domain: string): string | null {
  if (!DOMAIN.test(domain)) return "Ange en domän, t.ex. www.mittforetag.se.";
  const root = stripPort(getRootDomain());
  if (domain === root || domain.endsWith(`.${root}`)) {
    return "Använd adressfältet ovan för plattformens egna adresser.";
  }
  return null;
}

/** Suggests a subdomain from an email address, e.g. anna-k3x9. */
export function suggestSubdomain(email: string) {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // å -> a, ö -> o
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base.length >= 2 ? base : "sajt"}-${suffix}`;
}
