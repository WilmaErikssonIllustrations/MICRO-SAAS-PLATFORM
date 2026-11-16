import type { Config, CustomField, Data, RichText, Slot } from "@puckeditor/core";
import {
  Button,
  type ButtonProps,
  COLUMN_COUNTS,
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
import { ColumnWidthsField } from "@/components/page-blocks/column-widths-field";
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

/** Every block can be given its own name in the Lager panel. */
type Named<Props> = Props & { layerName: string };

type Components = {
  Hero: Named<HeroProps>;
  Heading: Named<HeadingProps>;
  Text: Named<{ content: RichText; color: string; font: string; typography: Typography }>;
  Image: Named<ImageProps>;
  Button: Named<ButtonProps>;
  Columns: Named<{
    count: number;
    /** Two-column layouts from before `widths`; hidden in the editor. */
    ratio: ColumnsRatio;
    widths: number[];
    left: Slot;
    right: Slot;
    third: Slot;
    fourth: Slot;
  }>;
  Spacer: Named<{ size: SpacerSize; height: number }>;
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

/**
 * Text size, letter spacing and line height. `basePx` is the block's normal
 * text size in pixels (per value of `baseProp` when it depends on another
 * prop), so the size can also be entered in pixels.
 */
function typographyField(basePx: number | Record<string, number>, baseProp?: string) {
  const metadata = { kind: "typography", basePx, baseProp };
  return {
    type: "custom",
    label: "Textstil",
    metadata,
    render: ({ value, onChange }) => (
      <TypographyField label="Textstil" value={value} onChange={onChange} metadata={metadata} />
    ),
  } satisfies CustomField<Typography>;
}

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

/**
 * The block's name in the Lager panel; empty means the block type's name.
 * Hidden in the side panel: it's renamed in the Lager panel or the menu.
 */
const layerNameField = {
  type: "text",
  label: "Lagernamn",
  visible: false,
  metadata: { kind: "layerName" },
} as const;

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
        layerName: layerNameField,
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
        typography: typographyField(60),
      },
      defaultProps: {
        layerName: "",
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
        layerName: layerNameField,
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
        typography: typographyField({ h2: 30, h3: 24 }, "level"),
      },
      defaultProps: {
        layerName: "",
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
        layerName: layerNameField,
        content: { type: "richtext", label: "Text" },
        color: colorField("Textfärg"),
        font: fontField("Typsnitt"),
        typography: typographyField(18),
      },
      defaultProps: { layerName: "", content: "<p>Skriv din text här.</p>", color: "", font: "", typography: DEFAULT_TYPOGRAPHY },
      render: ({ content, color, font, typography }) => (
        <TextBlock content={content} color={color} font={font} typography={typography} />
      ),
    },
    Image: {
      label: "Bild",
      fields: {
        layerName: layerNameField,
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
        widthPx: { type: "number", label: "Bredd i pixlar (0 = fyll bredden)", min: 0, max: 2000, step: 10 },
      },
      defaultProps: { layerName: "", src: "", alt: "", width: "wide", widthPx: 0, edit: DEFAULT_IMAGE_EDIT },
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
        layerName: layerNameField,
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
        typography: typographyField(16),
      },
      defaultProps: {
        layerName: "",
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
        layerName: layerNameField,
        count: {
          type: "select",
          label: "Antal kolumner",
          options: COLUMN_COUNTS.map((count) => ({ label: String(count), value: count })),
        },
        ratio: {
          type: "select",
          label: "Fördelning",
          visible: false,
          options: [
            { label: "Lika breda", value: "1:1" },
            { label: "Bred vänster", value: "2:1" },
            { label: "Bred höger", value: "1:2" },
          ],
        },
        widths: {
          type: "custom",
          label: "Kolumnbredder",
          metadata: { kind: "columnWidths" },
          render: ({ field, value, onChange }) => (
            <ColumnWidthsField label={field.label ?? "Kolumnbredder"} value={value} onChange={onChange} />
          ),
        },
        // Slot names kept from the two-column version, so old pages still work.
        left: { type: "slot", label: "Kolumn 1" },
        right: { type: "slot", label: "Kolumn 2" },
        third: { type: "slot", label: "Kolumn 3" },
        fourth: { type: "slot", label: "Kolumn 4" },
      },
      defaultProps: { layerName: "", count: 2, ratio: "1:1", widths: [], left: [], right: [], third: [], fourth: [] },
      render: ({ count, ratio, widths, left: First, right: Second, third: Third, fourth: Fourth }) => (
        <Columns
          count={count}
          ratio={ratio}
          widths={widths}
          columns={[<First key="1" />, <Second key="2" />, <Third key="3" />, <Fourth key="4" />]}
        />
      ),
    },
    Spacer: {
      label: "Mellanrum",
      fields: {
        layerName: layerNameField,
        size: {
          type: "select",
          label: "Storlek",
          options: [
            { label: "Litet", value: "sm" },
            { label: "Mellan", value: "md" },
            { label: "Stort", value: "lg" },
          ],
        },
        height: { type: "number", label: "Höjd i pixlar (0 = enligt storlek)", min: 0, max: 800, step: 4 },
      },
      defaultProps: { layerName: "", size: "md", height: 0 },
      render: ({ size, height }) => <Spacer size={size} height={height} />,
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
          layerName: "",
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
