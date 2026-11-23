import { DEFAULT_BOX } from "@/lib/page/box";
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

// One palette for all templates, so pages made from them look like one site.
const INK = "#1e1b4b"; // dark heroes and the checkout's payment card
const SOFT = "#f5f3ff"; // light cards
const ACCENT = "#7c3aed"; // buttons

/** A block's background box: rounded with inner spacing, i.e. a card. */
const card = (bgColor: string, padding = 24) => ({
  bgColor,
  bgBox: { ...DEFAULT_BOX, padding, radius: 20 },
});

/** A short colored hero at the top of a page, with or without a button. */
function hero(title: string, subtitle: string, cta?: { text: string; link?: string }) {
  return block("Hero", {
    title,
    subtitle,
    ctaText: cta?.text ?? "",
    ctaLink: cta?.link ?? "#",
    backgroundColor: INK,
    subtitleColor: "#c4b5fd",
    heroHeight: 340,
    heroHeightUnit: "px",
  });
}

/** A group of blocks in a card. */
const cardGroup = (bgColor: string, content: Block[]) => block("Section", { ...card(bgColor), content });

/** 2-4 columns; `columns[i]` goes in column i. */
function columns(columns: Block[][], widths: number[] = []) {
  const [left = [], right = [], third = [], fourth = []] = columns;
  return block("Columns", { count: columns.length, widths, left, right, third, fourth });
}

const subheading = (text: string) => block("Heading", { text, level: "h3" });
const button = (label: string, props: Record<string, unknown> = {}) =>
  block("Button", { label, color: ACCENT, ...props });

export const PAGE_TEMPLATES = {
  about: {
    label: "Om oss",
    hint: "Er historia, en bild och era värderingar",
    blocks: () => [
      hero("Om oss", "Vilka vi är, vad vi gör och varför vi gör det."),
      block("Spacer", { size: "sm" }),
      columns([
        [
          block("Heading", { text: "Vår historia" }),
          text(
            "<p>Berätta hur allt började: vem som startade, vilket problem ni ville lösa och vad som gör er annorlunda.</p><p>Klicka på texten för att skriva er egen.</p>",
          ),
        ],
        [block("Image", { src: "", width: "full", ...card(SOFT, 0) })],
      ]),
      block("Spacer", { size: "sm" }),
      block("Heading", { text: "Det här står vi för", align: "center" }),
      columns([
        [cardGroup(SOFT, [subheading("Kvalitet"), text("<p>Vi gör färre saker, men gör dem ordentligt.</p>")])],
        [cardGroup(SOFT, [subheading("Omtanke"), text("<p>Varje kund ska känna sig sedd och väl bemött.</p>")])],
        [cardGroup(SOFT, [subheading("Hållbarhet"), text("<p>Vi väljer material och partner som håller länge.</p>")])],
      ]),
      block("Spacer", { size: "md" }),
      button("Kontakta oss", { align: "center", href: "mailto:hej@exempel.se" }),
      block("Spacer", { size: "md" }),
    ],
  },
  contact: {
    label: "Kontakt",
    hint: "E-post, telefon och adress i kort, och en knapp för att mejla",
    blocks: () => [
      hero("Kontakta oss", "Vi svarar oftast inom en arbetsdag.", { text: "Skicka ett mejl", link: "mailto:hej@exempel.se" }),
      block("Spacer", { size: "sm" }),
      columns([
        [cardGroup(SOFT, [subheading("E-post"), text("<p>hej@exempel.se</p>")])],
        [cardGroup(SOFT, [subheading("Telefon"), text("<p>070-123 45 67<br>Vardagar 9–17</p>")])],
        [cardGroup(SOFT, [subheading("Besök oss"), text("<p>Gatan 1<br>123 45 Staden</p>")])],
      ]),
      block("Spacer", { size: "md" }),
    ],
  },
  checkout: {
    label: "Kassa",
    hint: "Ordersammanfattning och en knapp till betalningen",
    blocks: () => [
      hero("Kassa", "Kontrollera din beställning och gå vidare till betalningen."),
      block("Spacer", { size: "sm" }),
      columns(
        [
          [
            cardGroup(SOFT, [
              subheading("Din beställning"),
              text(
                "<p><strong>Produkt 1</strong><br>Storlek M · 1 st · 199 kr</p><p><strong>Produkt 2</strong><br>Svart · 1 st · 299 kr</p><hr><p>Frakt: 49 kr</p><h3>Totalt: 547 kr</h3>",
              ),
            ]),
          ],
          [
            cardGroup(INK, [
              subheading("Betalning"),
              text("<ul><li>Kort, Swish eller Klarna</li><li>Säker, krypterad betalning</li><li>Fri retur inom 30 dagar</li></ul>"),
              button("Gå till betalning →", { color: "#ffffff", textColor: INK }),
            ]),
          ],
        ],
        [3, 2],
      ),
      block("Spacer", { size: "sm" }),
      text('<p style="text-align: center">Frågor om din beställning? Mejla hej@exempel.se.</p>'),
      block("Spacer", { size: "md" }),
    ],
  },
  thanks: {
    label: "Tack",
    hint: "En bekräftelse efter ett köp eller formulär",
    blocks: () => [
      hero("Tack för din beställning!", "Vi har tagit emot den och skickar en bekräftelse till din e-post.", {
        text: "Tillbaka till startsidan",
      }),
      block("Spacer", { size: "sm" }),
      block("Heading", { text: "Vad händer nu?", align: "center" }),
      columns([
        [cardGroup(SOFT, [subheading("1. Bekräftelse"), text("<p>Du får ett mejl med allt du beställt.</p>")])],
        [cardGroup(SOFT, [subheading("2. Vi packar"), text("<p>Vi gör i ordning din order inom 1–2 dagar.</p>")])],
        [cardGroup(SOFT, [subheading("3. Leverans"), text("<p>Du får ett spårningsnummer när paketet skickas.</p>")])],
      ]),
      block("Spacer", { size: "md" }),
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
