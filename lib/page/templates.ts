import { type PageData, pageConfig } from "@/lib/page/config";

// Starting points for a new page: an empty page, or a template built from
// the ordinary blocks (so everything in it can be edited as usual). A
// template has no logic of its own: "Kassa" is a layout for a checkout
// page, with a button to link to the payment page of your choice.

type Block = PageData["content"][number];
type Components = typeof pageConfig.components;

/** A block with its type's defaults, these props and a fresh id. */
function block<T extends keyof Components>(type: T, props: Record<string, unknown> = {}): Block {
  return {
    type,
    props: { ...pageConfig.components[type].defaultProps, ...props, id: `${type}-${crypto.randomUUID()}` },
  } as Block;
}

const text = (html: string) => block("Text", { content: html });

export const PAGE_TEMPLATES = {
  about: {
    label: "Om oss",
    hint: "Rubrik, text om er och en bild",
    blocks: () => [
      block("Heading", { text: "Om oss" }),
      text("<p>Berätta vilka ni är, vad ni gör och varför. Klicka på texten för att skriva.</p>"),
      block("Image", { src: "" }),
      text("<p>Lägg till mer om er historia, ert team eller era värderingar.</p>"),
    ],
  },
  contact: {
    label: "Kontakt",
    hint: "Kontaktuppgifter och en knapp för att mejla",
    blocks: () => [
      block("Heading", { text: "Kontakta oss" }),
      text("<p><strong>E-post:</strong> hej@exempel.se<br><strong>Telefon:</strong> 070-123 45 67<br><strong>Adress:</strong> Gatan 1, 123 45 Staden</p>"),
      block("Button", { label: "Skicka ett mejl", href: "mailto:hej@exempel.se" }),
    ],
  },
  checkout: {
    label: "Kassa",
    hint: "Ordersammanfattning och en knapp till betalningen",
    blocks: () => [
      block("Heading", { text: "Kassa" }),
      block("Section", {
        content: [
          block("Heading", { text: "Din beställning", level: "h3" }),
          text("<ul><li>Produkt 1 – 199 kr</li><li>Produkt 2 – 299 kr</li></ul><p><strong>Totalt: 498 kr</strong></p>"),
          block("Button", { label: "Gå till betalning", href: "#" }),
        ],
      }),
      text("<p>Frågor om din beställning? Hör av dig till hej@exempel.se.</p>"),
    ],
  },
  thanks: {
    label: "Tack",
    hint: "En bekräftelse efter ett köp eller formulär",
    blocks: () => [
      block("Heading", { text: "Tack!" }),
      text("<p>Vi har tagit emot det du skickade och hör av oss så snart vi kan.</p>"),
      block("Button", { label: "Tillbaka till startsidan", href: "#" }),
    ],
  },
} as const;

export type PageTemplate = keyof typeof PAGE_TEMPLATES;

export const isPageTemplate = (value: unknown): value is PageTemplate =>
  typeof value === "string" && Object.hasOwn(PAGE_TEMPLATES, value);

/** Gives every block (also in slots) a fresh id, so a copied page doesn't share ids with the original. */
export function withFreshIds(data: PageData): PageData {
  const fresh = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(fresh);
    if (!value || typeof value !== "object") return value;
    const object = value as Record<string, unknown>;
    if (typeof object.type === "string" && object.props && typeof object.props === "object") {
      const props = fresh(object.props) as Record<string, unknown>;
      return { ...object, props: { ...props, id: `${object.type}-${crypto.randomUUID()}` } };
    }
    return Object.fromEntries(Object.entries(object).map(([key, entry]) => [key, fresh(entry)]));
  };
  return { ...data, content: fresh(data.content) as PageData["content"] };
}

/** A new page: empty, or from a template. Its root props come from the site. */
export function newPageData(template: PageTemplate | null): PageData {
  return {
    root: { props: { ...pageConfig.root!.defaultProps! } },
    content: template ? [...PAGE_TEMPLATES[template].blocks()] : [],
  } as PageData;
}
