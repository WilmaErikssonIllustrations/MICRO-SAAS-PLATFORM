export type WebsiteInput = {
  title: string;
  subtitle: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  content: string | null;
  themeColor: string;
};

export type WebsiteField = keyof WebsiteInput;
export type FieldErrors = Partial<Record<WebsiteField, string>>;

type ValidationResult =
  | { success: true; data: WebsiteInput }
  | { success: false; errors: FieldErrors };

const MAX_LENGTH: Record<Exclude<WebsiteField, "themeColor">, number> = {
  title: 120,
  subtitle: 240,
  ctaText: 40,
  ctaLink: 500,
  content: 5000,
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function readText(formData: FormData, field: WebsiteField): string | null {
  const value = formData.get(field);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// Only allow links that are safe to render in an href (no javascript: etc).
function isSafeLink(value: string): boolean {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export function validateWebsiteForm(formData: FormData): ValidationResult {
  const data: WebsiteInput = {
    title: readText(formData, "title") ?? "",
    subtitle: readText(formData, "subtitle"),
    ctaText: readText(formData, "ctaText"),
    ctaLink: readText(formData, "ctaLink"),
    content: readText(formData, "content"),
    themeColor: readText(formData, "themeColor") ?? "",
  };

  const errors: FieldErrors = {};

  if (!data.title) {
    errors.title = "Rubrik är obligatorisk.";
  }

  for (const [field, max] of Object.entries(MAX_LENGTH)) {
    const value = data[field as keyof typeof MAX_LENGTH];
    if (value && value.length > max) {
      errors[field as WebsiteField] = `Max ${max} tecken.`;
    }
  }

  if (data.ctaText && !data.ctaLink) {
    errors.ctaLink = "Ange en länk för knappen.";
  }
  if (data.ctaLink && !data.ctaText) {
    errors.ctaText = "Ange en text för knappen.";
  }
  if (data.ctaLink && !errors.ctaLink && !isSafeLink(data.ctaLink)) {
    errors.ctaLink = "Länken måste börja med https://, http:// eller mailto:.";
  }

  if (!HEX_COLOR.test(data.themeColor)) {
    errors.themeColor = "Ange en hex-färg, t.ex. #2563eb.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }
  return { success: true, data };
}
