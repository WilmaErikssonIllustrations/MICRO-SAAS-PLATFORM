import type { Config, CustomField, Data, RichText, Slot } from "@puckeditor/core";
import {
  Button,
  type ButtonProps,
  Columns,
  type ColumnsRatio,
  Heading,
  type HeadingProps,
  Hero,
  type HeroProps,
  ImageBlock,
  type ImageProps,
  SiteRoot,
  Spacer,
  type SpacerSize,
  TextBlock,
} from "@/components/page-blocks/blocks";
import { ColorField } from "@/components/page-blocks/color-field";
import { ImageField } from "@/components/page-blocks/image-field";

// The Puck config is shared by the editor (client) and the public page
// (server). `metadata.kind` tells lib/page/sanitize.ts how to validate
// fields whose Puck type alone isn't enough (links, colors, images).

type Components = {
  Hero: HeroProps;
  Heading: HeadingProps;
  Text: { content: RichText };
  Image: ImageProps;
  Button: ButtonProps;
  Columns: { ratio: ColumnsRatio; left: Slot; right: Slot };
  Spacer: { size: SpacerSize };
};

export type RootProps = { title: string; themeColor: string };

export type PageConfig = Config<Components, RootProps>;
export type PageData = Data<Components, RootProps>;

const alignField = {
  type: "radio",
  label: "Justering",
  options: [
    { label: "Vänster", value: "left" },
    { label: "Centrerad", value: "center" },
  ],
} as const;

function imageField(label: string) {
  return {
    type: "custom",
    label,
    metadata: { kind: "image" },
    render: ({ value, onChange, readOnly }) => (
      <ImageField label={label} value={value ?? ""} onChange={onChange} readOnly={readOnly} />
    ),
  } satisfies CustomField<string>;
}

export const pageConfig: PageConfig = {
  categories: {
    content: { title: "Innehåll", components: ["Hero", "Heading", "Text", "Image", "Button"] },
    layout: { title: "Layout", components: ["Columns", "Spacer"] },
  },
  root: {
    fields: {
      title: { type: "text", label: "Sidans namn" },
      themeColor: {
        type: "custom",
        label: "Temafärg",
        metadata: { kind: "color" },
        render: ({ field, value, onChange, readOnly }) => (
          <ColorField label={field.label ?? "Temafärg"} value={value} onChange={onChange} readOnly={readOnly} />
        ),
      },
    },
    defaultProps: { title: "Min hemsida", themeColor: "#2563eb" },
    render: ({ title, themeColor, children }) => (
      <SiteRoot title={title} themeColor={themeColor}>
        {children}
      </SiteRoot>
    ),
  },
  components: {
    Hero: {
      label: "Hero",
      fields: {
        image: imageField("Bakgrundsbild (valfri)"),
        title: { type: "text", label: "Rubrik" },
        subtitle: { type: "textarea", label: "Underrubrik" },
        ctaText: { type: "text", label: "Knapptext" },
        ctaLink: { type: "text", label: "Knapplänk", metadata: { kind: "url" } },
        background: {
          type: "radio",
          label: "Bakgrund",
          options: [
            { label: "Temafärg", value: "theme" },
            { label: "Ljus", value: "light" },
            { label: "Mörk", value: "dark" },
          ],
        },
        align: alignField,
      },
      defaultProps: {
        image: "",
        title: "Välkommen!",
        subtitle: "En kort mening om vad ni gör.",
        ctaText: "Kontakta oss",
        ctaLink: "mailto:hej@exempel.se",
        background: "theme",
        align: "center",
      },
      render: (props) => <Hero {...props} />,
    },
    Heading: {
      label: "Rubrik",
      fields: {
        text: { type: "text", label: "Text" },
        level: {
          type: "select",
          label: "Storlek",
          options: [
            { label: "Stor (H2)", value: "h2" },
            { label: "Mellan (H3)", value: "h3" },
          ],
        },
        align: alignField,
      },
      defaultProps: { text: "Rubrik", level: "h2", align: "left" },
      render: (props) => <Heading {...props} />,
    },
    Text: {
      label: "Text",
      fields: { content: { type: "richtext", label: "Text" } },
      defaultProps: { content: "<p>Skriv din text här.</p>" },
      render: ({ content }) => <TextBlock content={content} />,
    },
    Image: {
      label: "Bild",
      fields: {
        src: imageField("Bild"),
        alt: { type: "text", label: "Beskrivning (för skärmläsare)" },
        width: {
          type: "select",
          label: "Bredd",
          options: [
            { label: "Smal", value: "narrow" },
            { label: "Bred", value: "wide" },
            { label: "Hela sidan", value: "full" },
          ],
        },
      },
      defaultProps: { src: "", alt: "", width: "wide" },
      render: (props) => <ImageBlock {...props} />,
    },
    Button: {
      label: "Knapp",
      fields: {
        label: { type: "text", label: "Text" },
        href: { type: "text", label: "Länk", metadata: { kind: "url" } },
        variant: {
          type: "radio",
          label: "Stil",
          options: [
            { label: "Fylld", value: "filled" },
            { label: "Kontur", value: "outline" },
          ],
        },
        align: alignField,
      },
      defaultProps: { label: "Läs mer", href: "#", variant: "filled", align: "left" },
      render: (props) => <Button {...props} />,
    },
    Columns: {
      label: "Kolumner",
      fields: {
        ratio: {
          type: "select",
          label: "Fördelning",
          options: [
            { label: "Lika breda", value: "1:1" },
            { label: "Bred vänster", value: "2:1" },
            { label: "Bred höger", value: "1:2" },
          ],
        },
        left: { type: "slot", label: "Vänster" },
        right: { type: "slot", label: "Höger" },
      },
      defaultProps: { ratio: "1:1", left: [], right: [] },
      render: ({ ratio, left: Left, right: Right }) => (
        <Columns ratio={ratio} left={<Left />} right={<Right />} />
      ),
    },
    Spacer: {
      label: "Mellanrum",
      fields: {
        size: {
          type: "select",
          label: "Storlek",
          options: [
            { label: "Litet", value: "sm" },
            { label: "Mellan", value: "md" },
            { label: "Stort", value: "lg" },
          ],
        },
      },
      defaultProps: { size: "md" },
      render: ({ size }) => <Spacer size={size} />,
    },
  },
};

/** Starting point for new websites. */
export function starterPage(title = "Min hemsida"): PageData {
  return {
    root: { props: { title, themeColor: "#2563eb" } },
    content: [
      {
        type: "Hero",
        props: { id: "hero-1", ...pageConfig.components.Hero.defaultProps!, title },
      },
      {
        type: "Heading",
        props: { id: "heading-1", text: "Om oss", level: "h2", align: "left" },
      },
      {
        type: "Text",
        props: {
          id: "text-1",
          content: "<p>Berätta om er verksamhet här. Klicka på blocket för att redigera.</p>",
        },
      },
    ],
  };
}

export function isEmptyPage(data: unknown) {
  return !data || typeof data !== "object" || !Array.isArray((data as PageData).content);
}
