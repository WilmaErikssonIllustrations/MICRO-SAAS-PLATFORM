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
import { CanvasImagePicker } from "@/components/page-blocks/canvas-image-picker";
import { ColorField } from "@/components/page-blocks/color-field";
import { FontField, FontListField } from "@/components/page-blocks/font-field";
import { ImageEditField } from "@/components/page-blocks/image-edit-field";
import { ImageField } from "@/components/page-blocks/image-field";
import type { CustomFont } from "@/lib/page/fonts";
import { DEFAULT_IMAGE_EDIT, type ImageEdit } from "@/lib/page/image-edit";
import { DEFAULT_TYPOGRAPHY, type Typography } from "@/lib/page/typography";
import { TypographyField } from "@/components/page-blocks/typography-field";

// The Puck config is shared by the editor (client) and the public page
// (server). `metadata.kind` tells lib/page/sanitize.ts how to validate
// fields whose Puck type alone isn't enough (links, colors, images,
// image edits, fonts).

type Components = {
  Hero: HeroProps;
  Heading: HeadingProps;
  Text: { content: RichText; color: string; font: string; typography: Typography };
  Image: ImageProps;
  Button: ButtonProps;
  Columns: { ratio: ColumnsRatio; left: Slot; right: Slot };
  Spacer: { size: SpacerSize };
};

export type RootProps = {
  title: string;
  themeColor: string;
  headingFont: string;
  bodyFont: string;
  customFonts: CustomFont[];
};

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

/** A block color; empty means the block's normal (theme) color. */
function colorField(label: string) {
  return {
    type: "custom",
    label,
    metadata: { kind: "color" },
    render: ({ value, onChange, readOnly }) => (
      <ColorField label={label} value={value ?? ""} onChange={onChange} readOnly={readOnly} optional />
    ),
  } satisfies CustomField<string>;
}

/** Image adjustments (filters, crop, flip...) for the block's `imageProp`. */
function imageEditField(imageProp: string, editProp: string, background = false) {
  return {
    type: "custom",
    label: "Redigera bild",
    metadata: { kind: "imageEdit", imageProp, background },
    render: () => (
      <ImageEditField label="Redigera bild" imageProp={imageProp} editProp={editProp} background={background} />
    ),
  } satisfies CustomField<ImageEdit>;
}

/** Text size, letter spacing and line height. */
const typographyField = {
  type: "custom",
  label: "Textstil",
  metadata: { kind: "typography" },
  render: ({ value, onChange }) => <TypographyField label="Textstil" value={value} onChange={onChange} />,
} satisfies CustomField<Typography>;

/** A font; empty means the page's font. */
function fontField(label: string) {
  return {
    type: "custom",
    label,
    metadata: { kind: "font" },
    render: ({ value, onChange, readOnly }) => (
      <FontField label={label} value={value ?? ""} onChange={onChange} readOnly={readOnly} />
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
      headingFont: fontField("Typsnitt för rubriker"),
      bodyFont: fontField("Typsnitt för text"),
      customFonts: {
        type: "custom",
        label: "Egna typsnitt",
        metadata: { kind: "fontList" },
        render: ({ field, value, onChange, readOnly }) => (
          <FontListField label={field.label ?? "Egna typsnitt"} value={value} onChange={onChange} readOnly={readOnly} />
        ),
      },
    },
    defaultProps: { title: "Min hemsida", themeColor: "#2563eb", headingFont: "", bodyFont: "", customFonts: [] },
    render: ({ title, themeColor, headingFont, bodyFont, customFonts, children }) => (
      <SiteRoot
        title={title}
        themeColor={themeColor}
        headingFont={headingFont}
        bodyFont={bodyFont}
        customFonts={customFonts}
      >
        {children}
      </SiteRoot>
    ),
  },
  components: {
    Hero: {
      label: "Hero",
      fields: {
        image: imageField("Bakgrundsbild (valfri)"),
        imageEdit: imageEditField("image", "imageEdit", true),
        overlay: {
          type: "radio",
          label: "Ton över bilden",
          options: [
            { label: "Ingen", value: "none" },
            { label: "Lätt", value: "light" },
            { label: "Mörk", value: "dark" },
          ],
        },
        title: { type: "text", label: "Rubrik", contentEditable: true },
        subtitle: { type: "textarea", label: "Underrubrik", contentEditable: true },
        ctaText: { type: "text", label: "Knapptext", contentEditable: true },
        ctaLink: { type: "text", label: "Knapplänk", metadata: { kind: "url" } },
        buttonColor: colorField("Knappfärg"),
        buttonTextColor: colorField("Knappens textfärg"),
        background: {
          type: "radio",
          label: "Bakgrund",
          options: [
            { label: "Temafärg", value: "theme" },
            { label: "Ljus", value: "light" },
            { label: "Mörk", value: "dark" },
          ],
        },
        backgroundColor: colorField("Egen bakgrundsfärg"),
        align: alignField,
        font: fontField("Typsnitt"),
        typography: typographyField,
      },
      defaultProps: {
        image: "",
        title: "Välkommen!",
        subtitle: "En kort mening om vad ni gör.",
        ctaText: "Kontakta oss",
        ctaLink: "mailto:hej@exempel.se",
        background: "theme",
        backgroundColor: "",
        imageEdit: DEFAULT_IMAGE_EDIT,
        overlay: "none",
        buttonColor: "",
        buttonTextColor: "",
        align: "center",
        font: "",
        typography: DEFAULT_TYPOGRAPHY,
      },
      render: ({ puck, ...props }) => (
        <Hero
          {...props}
          imageControls={
            puck.isEditing && (
              <CanvasImagePicker
                componentId={props.id}
                propName="image"
                hasImage={!!props.image}
                emptyLabel="Lägg till bakgrundsbild"
              />
            )
          }
        />
      ),
    },
    Heading: {
      label: "Rubrik",
      fields: {
        text: { type: "text", label: "Text", contentEditable: true },
        level: {
          type: "select",
          label: "Rubriknivå",
          options: [
            { label: "Stor (H2)", value: "h2" },
            { label: "Mellan (H3)", value: "h3" },
          ],
        },
        align: alignField,
        color: colorField("Textfärg"),
        font: fontField("Typsnitt"),
        typography: typographyField,
      },
      defaultProps: {
        text: "Rubrik",
        level: "h2",
        align: "left",
        color: "",
        font: "",
        typography: DEFAULT_TYPOGRAPHY,
      },
      render: (props) => <Heading {...props} />,
    },
    Text: {
      label: "Text",
      fields: {
        content: { type: "richtext", label: "Text" },
        color: colorField("Textfärg"),
        font: fontField("Typsnitt"),
        typography: typographyField,
      },
      defaultProps: { content: "<p>Skriv din text här.</p>", color: "", font: "", typography: DEFAULT_TYPOGRAPHY },
      render: ({ content, color, font, typography }) => (
        <TextBlock content={content} color={color} font={font} typography={typography} />
      ),
    },
    Image: {
      label: "Bild",
      fields: {
        src: imageField("Bild"),
        edit: imageEditField("src", "edit"),
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
      defaultProps: { src: "", alt: "", width: "wide", edit: DEFAULT_IMAGE_EDIT },
      render: ({ puck, ...props }) => (
        <ImageBlock
          {...props}
          imageControls={
            puck.isEditing && (
              <CanvasImagePicker componentId={props.id} propName="src" hasImage={!!props.src} />
            )
          }
        />
      ),
    },
    Button: {
      label: "Knapp",
      fields: {
        label: { type: "text", label: "Text", contentEditable: true },
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
        color: colorField("Knappfärg"),
        textColor: colorField("Textfärg"),
        font: fontField("Typsnitt"),
        typography: typographyField,
      },
      defaultProps: {
        label: "Läs mer",
        href: "#",
        variant: "filled",
        align: "left",
        color: "",
        textColor: "",
        font: "",
        typography: DEFAULT_TYPOGRAPHY,
      },
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
    root: { props: { ...pageConfig.root!.defaultProps!, title } },
    content: [
      {
        type: "Hero",
        props: { id: "hero-1", ...pageConfig.components.Hero.defaultProps!, title },
      },
      {
        type: "Heading",
        props: { ...pageConfig.components.Heading.defaultProps!, id: "heading-1", text: "Om oss" },
      },
      {
        type: "Text",
        props: {
          id: "text-1",
          content: "<p>Berätta om er verksamhet här. Klicka på blocket för att redigera.</p>",
          color: "",
          font: "",
          typography: DEFAULT_TYPOGRAPHY,
        },
      },
    ],
  };
}

export function isEmptyPage(data: unknown) {
  return !data || typeof data !== "object" || !Array.isArray((data as PageData).content);
}
