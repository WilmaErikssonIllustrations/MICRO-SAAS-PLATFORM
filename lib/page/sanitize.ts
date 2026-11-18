import "server-only";
import type { Field, Fields } from "@puckeditor/core";
import sanitizeHtml from "sanitize-html";
import { type PageData, pageConfig } from "@/lib/page/config";
import { type CustomFont, isFontValue, isValidFontName } from "@/lib/page/fonts";
import { sanitizeBox } from "@/lib/page/box";
import { sanitizeImageEdit } from "@/lib/page/image-edit";
import { sanitizeTextStyle } from "@/lib/page/text-style";
import { sanitizeTypography } from "@/lib/page/typography";
import { isStoredFontUrl, isStoredImageUrl } from "@/lib/storage";

// Page data arrives from the browser, so it is untrusted: rebuild it from
// the config, keeping only known components and fields, and clean every
// value according to its field type. Richtext HTML is rendered with
// dangerouslySetInnerHTML by Puck, so it must be sanitized here.

const MAX_BLOCKS = 300;
const MAX_TEXT = 2_000;
const MAX_RICHTEXT = 50_000;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const MAX_CUSTOM_FONTS = 10;
const MAX_LAYER_NAME = 60;

const RICHTEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h1", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s",
    "a", "ul", "ol", "li", "blockquote", "code", "pre", "hr",
  ],
  allowedAttributes: { a: ["href", "target", "rel"], "*": ["style"] },
  allowedStyles: { "*": { "text-align": [/^(left|right|center|justify)$/] } },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }) },
};

export function isSafeUrl(value: string) {
  // In-page anchors such as #kontakt are fine too.
  if (/^#[\w-]*$/.test(value)) return true;
  try {
    return ["http:", "https:", "mailto:", "tel:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

type Props = Record<string, unknown>;

/** One color (or "" for none) per column. */
function sanitizeColorList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).map((color) => (typeof color === "string" && HEX_COLOR.test(color) ? color : ""));
}

/** Relative column widths (percent); anything odd means equal columns. */
function sanitizeColumnWidths(value: unknown): number[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 4) return [];
  if (!value.every((width) => typeof width === "number" && width >= 5 && width <= 95)) return [];
  return value.map((width: number) => Math.round(width * 10) / 10);
}

/** Uploaded fonts: names end up in CSS, so only safe names and our own URLs. */
function sanitizeFontList(value: unknown): CustomFont[] {
  if (!Array.isArray(value)) return [];
  const fonts: CustomFont[] = [];
  for (const entry of value) {
    const { name, url } = (entry ?? {}) as Partial<CustomFont>;
    if (typeof name !== "string" || typeof url !== "string") continue;
    const trimmed = name.trim();
    if (!isValidFontName(trimmed) || !isStoredFontUrl(url)) continue;
    if (fonts.some((font) => font.name === trimmed)) continue;
    fonts.push({ name: trimmed, url });
    if (fonts.length === MAX_CUSTOM_FONTS) break;
  }
  return fonts;
}

function sanitizeValue(field: Field, value: unknown, fallback: unknown, budget: Budget): unknown {
  const kind = field.metadata?.kind as string | undefined;

  switch (field.type) {
    case "text":
    case "textarea": {
      const text = typeof value === "string" ? value.slice(0, MAX_TEXT) : "";
      if (kind === "layerName") return text.trim().slice(0, MAX_LAYER_NAME);
      if (kind === "url") return text === "" || isSafeUrl(text) ? text : "";
      return text;
    }
    case "richtext":
      return typeof value === "string"
        ? sanitizeHtml(value.slice(0, MAX_RICHTEXT), RICHTEXT_OPTIONS)
        : "";
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
      return Math.min(field.max ?? Infinity, Math.max(field.min ?? -Infinity, value));
    case "select":
    case "radio":
      return field.options.some((option) => option.value === value) ? value : fallback;
    case "slot":
      return sanitizeContent(value, budget);
    case "custom":
      if (kind === "color") return typeof value === "string" && HEX_COLOR.test(value) ? value : fallback;
      if (kind === "image") return typeof value === "string" && isStoredImageUrl(value) ? value : "";
      if (kind === "imageEdit") return sanitizeImageEdit(value);
      if (kind === "typography") return sanitizeTypography(value);
      if (kind === "box") return sanitizeBox(value);
      if (kind === "colorList") return sanitizeColorList(value);
      if (kind === "columnWidths") return sanitizeColumnWidths(value);
      if (kind === "font") return isFontValue(value) ? value : "";
      if (kind === "fontList") return sanitizeFontList(value);
      if (kind === "textStyle") return sanitizeTextStyle(value);
      return fallback;
    default:
      // Field types this config doesn't use are dropped.
      return fallback;
  }
}

function sanitizeProps(fields: Fields | undefined, props: unknown, defaults: Props = {}, budget: Budget) {
  const input = (props && typeof props === "object" ? props : {}) as Props;
  const output: Props = {};
  for (const [key, field] of Object.entries(fields ?? {})) {
    output[key] = sanitizeValue(field as Field, input[key], defaults[key], budget);
  }
  return output;
}

type Budget = { blocks: number };

function sanitizeContent(content: unknown, budget: Budget): PageData["content"] {
  if (!Array.isArray(content)) return [];

  const result: PageData["content"] = [];
  for (const item of content) {
    if (budget.blocks >= MAX_BLOCKS) break;
    const type = (item as { type?: unknown })?.type;
    if (typeof type !== "string" || !Object.hasOwn(pageConfig.components, type)) continue;

    const component = pageConfig.components[type as keyof typeof pageConfig.components];
    const rawProps = (item as { props?: Props }).props ?? {};
    budget.blocks++;

    result.push({
      type,
      props: {
        ...sanitizeProps(component.fields as Fields, rawProps, component.defaultProps as Props, budget),
        id: typeof rawProps.id === "string" ? rawProps.id.slice(0, 100) : crypto.randomUUID(),
      },
    } as PageData["content"][number]);
  }
  return result;
}

export function sanitizePageData(data: unknown): PageData {
  const budget: Budget = { blocks: 0 };
  const input = (data && typeof data === "object" ? data : {}) as { root?: { props?: unknown }; content?: unknown };
  const root = pageConfig.root!;

  const rootProps = sanitizeProps(root.fields as Fields, input.root?.props, root.defaultProps as Props, budget);
  const title = typeof rootProps.title === "string" ? rootProps.title.trim().slice(0, 120) : "";

  return {
    root: { props: { ...rootProps, title: title || "Min hemsida" } as PageData["root"]["props"] },
    content: sanitizeContent(input.content, budget),
  } as PageData;
}
