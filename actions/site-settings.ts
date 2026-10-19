"use server";

import { resolve4, resolveCname } from "node:dns/promises";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/current-user";
import {
  getCustomDomainTarget,
  normalizeDomain,
  validateCustomDomain,
  validateSubdomain,
} from "@/lib/domains";
import { prisma } from "@/lib/prisma";
import { expireWebsiteCache, getOrCreateUserWebsite } from "@/lib/websites";

type SettingsField = "subdomain" | "customDomain";

export type SiteSettingsState =
  | { status: "idle" }
  | { status: "error"; message: string; errors?: Partial<Record<SettingsField, string>> }
  | { status: "success"; message: string };

export async function saveSiteSettings(
  _prev: SiteSettingsState,
  formData: FormData,
): Promise<SiteSettingsState> {
  const user = await requireUser();
  const website = await getOrCreateUserWebsite(user);

  const subdomain = String(formData.get("subdomain") ?? "").trim().toLowerCase();
  const customDomain = normalizeDomain(String(formData.get("customDomain") ?? "")) || null;

  const errors: Partial<Record<SettingsField, string>> = {};
  const subdomainError = validateSubdomain(subdomain);
  if (subdomainError) errors.subdomain = subdomainError;
  const domainError = customDomain ? validateCustomDomain(customDomain) : null;
  if (domainError) errors.customDomain = domainError;

  // Addresses are unique across all tenants.
  if (!errors.subdomain) {
    const taken = await prisma.website.findFirst({
      where: { subdomain, NOT: { id: website.id } },
      select: { id: true },
    });
    if (taken) errors.subdomain = "Adressen är redan upptagen.";
  }
  if (customDomain && !errors.customDomain) {
    const taken = await prisma.website.findFirst({
      where: { customDomain, NOT: { id: website.id } },
      select: { id: true },
    });
    if (taken) errors.customDomain = "Domänen används redan av en annan hemsida.";
  }

  if (Object.keys(errors).length > 0) {
    return { status: "error", message: "Kontrollera de markerade fälten.", errors };
  }

  try {
    const updated = await prisma.website.update({
      where: { id: website.id },
      data: { subdomain, customDomain },
    });
    // Expire both the old and the new addresses.
    expireWebsiteCache(website);
    expireWebsiteCache(updated);
    refresh();
  } catch (error) {
    console.error("Failed to save site settings", error);
    return { status: "error", message: "Något gick fel. Försök igen." };
  }

  return { status: "success", message: "Adresserna är sparade." };
}

export type DnsCheckResult = { ok: boolean; message: string };

/** Checks whether the user's custom domain points at the platform. */
export async function checkDomainDns(): Promise<DnsCheckResult> {
  const user = await requireUser();
  const website = await getOrCreateUserWebsite(user);
  const domain = website.customDomain;
  if (!domain) return { ok: false, message: "Spara en egen domän först." };

  const target = getCustomDomainTarget();

  const cnames = await resolveCname(domain).catch(() => [] as string[]);
  if (cnames.some((name) => normalizeDomain(name) === target)) {
    return { ok: true, message: `${domain} pekar på ${target}. Allt ser bra ut!` };
  }

  // Apex domains can't use CNAME; accept A records that match the target's.
  const [domainIps, targetIps] = await Promise.all([
    resolve4(domain).catch(() => [] as string[]),
    resolve4(target).catch(() => [] as string[]),
  ]);
  if (domainIps.length > 0 && domainIps.every((ip) => targetIps.includes(ip))) {
    return { ok: true, message: `${domain} pekar på plattformen. Allt ser bra ut!` };
  }

  return {
    ok: false,
    message: `${domain} pekar inte på ${target} än. DNS-ändringar kan ta upp till ett par timmar.`,
  };
}
