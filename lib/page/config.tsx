import type { Config, CustomField, Data, RichText, Slot } from "@puckeditor/core";
import type { ReactNode } from "react";
import {
  type BackgroundProps,
  BlockBackground,
  Button,
  hasBackground,
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
  Section,
  SiteRoot,
  Spacer,
  type SpacerSize,
  TextBlock,
} from "@/components/page-blocks/blocks";
import { BoxField } from "@/components/page-blocks/box-field";
import { CanvasImagePicker } from "@/components/page-blocks/canvas-image-picker";
import { ColorField } from "@/components/page-blocks/color-field";
import { ColumnColorsField } from "@/components/page-blocks/column-colors-field";
import { ColumnWidthsField } from "@/components/page-blocks/column-widths-field";
import { FontField, FontListField } from "@/components/page-blocks/font-field";
import { ImageEditField } from "@/components/page-blocks/image-edit-field";
import { ImageField } from "@/components/page-blocks/image-field";
import { type Box, DEFAULT_BOX } from "@/lib/page/box";
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
/** Blocks other than Hero (which has its own) can have a background. */
type Block<Props> = Named<Props> & BackgroundProps;

type Components = {
  Hero: Named<HeroProps>;
  Heading: Block<HeadingProps>;
  Text: Block<{ content: RichText; color: string; font: string; typography: Typography }>;
  Image: Block<ImageProps>;
  Button: Block<ButtonProps>;
  Columns: Block<{
    count: number;
    /** Two-column layouts from before `widths`; hidden in the editor. */
    ratio: ColumnsRatio;
    widths: number[];
    columnColors: string[];
    left: Slot;
    right: Slot;
    third: Slot;
    fourth: Slot;
  }>;
  Spacer: Block<{ size: SpacerSize; height: number }>;
  Section: Block<{ content: Slot }>;
};

export type RootProps = {
  title: string;
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
    { label: "Höger", value: "right" },
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

/** A block color; empty means the block's normal color. */
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
/** Alignment for one part of a block; empty follows the block's Justering. */
function partAlignField(label: string, part: string) {
  return {
    type: "radio",
    label,
    // menuLabel: the right-click menu lists these under the part's name.
    metadata: { part, menuLabel: "Justering" },
    options: [{ label: "Som heron", value: "" }, ...alignField.options],
  } as const;
}

function imageEditField(imageProp: string, editProp: string, background = false, label = "Redigera bild") {
  return {
    type: "custom",
    label,
    metadata: { kind: "imageEdit", imageProp, background },
    render: () => (
      <ImageEditField label={label} imageProp={imageProp} editProp={editProp} background={background} />
    ),
  } satisfies CustomField<ImageEdit>;
}

/**
 * Puts a field in a group: the right-click menu shows a group as one row
 * with a submenu, to keep the menu short.
 */
function inGroup<F extends { metadata?: Record<string, unknown> }>(field: F, group: string): F {
  return { ...field, metadata: { ...field.metadata, group } };
}

/** Background color and image behind a block (see BlockBackground). */
const backgroundFields = {
  bgColor: inGroup(colorField("Bakgrundsfärg"), "background"),
  bgImage: inGroup(imageField("Bakgrundsbild"), "background"),
  bgImageEdit: inGroup(imageEditField("bgImage", "bgImageEdit", true, "Redigera bakgrundsbild"), "background"),
  bgBox: inGroup({
    type: "custom",
    label: "Ruta",
    metadata: { kind: "box" },
    render: ({ value, onChange }) => <BoxField label="Ruta" value={value} onChange={onChange} />,
  } satisfies CustomField<Box>, "background"),
};
const backgroundDefaults = { bgColor: "", bgImage: "", bgImageEdit: DEFAULT_IMAGE_EDIT, bgBox: DEFAULT_BOX };

/** Wraps a block's rendering in its background. */
function withBackground(props: Partial<BackgroundProps>, block: ReactNode) {
  return (
    <BlockBackground
      bgColor={props.bgColor}
      bgImage={props.bgImage}
      bgImageEdit={props.bgImageEdit}
      bgBox={props.bgBox}
    >
      {block}
    </BlockBackground>
  );
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
    layout: { title: "Layout", components: ["Section", "Columns", "Spacer"] },
  },
  root: {
    fields: {
      title: { type: "text", label: "Sidans namn" },
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
    defaultProps: { title: "Min hemsida", headingFont: "", bodyFont: "", customFonts: [] },
    render: ({ title, headingFont, bodyFont, customFonts, children }) => (
      <SiteRoot
        title={title}
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
        image: inGroup(imageField("Bakgrundsbild (valfri)"), "heroBackground"),
        imageEdit: inGroup(imageEditField("image", "imageEdit", true), "heroBackground"),
        imageFit: {
          metadata: { group: "heroBackground" },
          type: "radio",
          label: "Bildvisning",
          options: [
            { label: "Fyll ytan", value: "cover" },
            { label: "Visa hela bilden", value: "whole" },
          ],
        },
        mobileFit: {
          metadata: { group: "heroBackground" },
          type: "radio",
          label: "På mobil",
          options: [
            { label: "Visa hela bilden", value: "whole" },
            { label: "Bilden ovanför texten", value: "stack" },
            { label: "Samma som på datorn", value: "same" },
          ],
        },
        heroHeightUnit: {
          metadata: { group: "heroBackground" },
          type: "radio",
          label: "Höjdenhet",
          options: [
            { label: "Pixlar", value: "px" },
            { label: "% av skärmhöjden", value: "vh" },
          ],
        },
        heroHeight: {
          type: "number",
          label: "Höjd (0 = automatisk)",
          min: 0,
          max: 2000,
          step: 10,
          // The menu shows the unit chosen in heroHeightUnit.
          metadata: { unitProp: "heroHeightUnit", group: "heroBackground" },
        },
        overlay: {
          metadata: { group: "heroBackground" },
          type: "radio",
          label: "Ton över bilden",
          options: [
            { label: "Ingen", value: "none" },
            { label: "Lätt", value: "light" },
            { label: "Mörk", value: "dark" },
          ],
        },
        title: { type: "text", label: "Rubrik", contentEditable: true, metadata: { part: "title" } },
        titleAlign: partAlignField("Rubrikens justering", "title"),
        titleColor: { ...colorField("Rubrikens färg"), metadata: { kind: "color", part: "title", menuLabel: "Färg" } },
        subtitle: { type: "textarea", label: "Underrubrik", contentEditable: true, metadata: { part: "subtitle" } },
        subtitleAlign: partAlignField("Underrubrikens justering", "subtitle"),
        subtitleColor: {
          ...colorField("Underrubrikens färg"),
          metadata: { kind: "color", part: "subtitle", menuLabel: "Färg" },
        },
        ctaText: { type: "text", label: "Knapptext", contentEditable: true, metadata: { part: "cta" } },
        ctaAlign: partAlignField("Knappens justering", "cta"),
        ctaLink: { type: "text", label: "Knapplänk", metadata: { kind: "url", part: "cta", menuLabel: "Länk" } },
        buttonColor: { ...colorField("Knappfärg"), metadata: { kind: "color", part: "cta", menuLabel: "Färg" } },
        buttonTextColor: {
          ...colorField("Knappens textfärg"),
          metadata: { kind: "color", part: "cta", menuLabel: "Textfärg" },
        },
        background: {
          metadata: { group: "heroBackground" },
          type: "radio",
          label: "Bakgrund",
          options: [
            { label: "Ljus", value: "light" },
            { label: "Mörk", value: "dark" },
          ],
        },
        backgroundColor: inGroup(colorField("Egen bakgrundsfärg"), "heroBackground"),
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
        background: "dark",
        backgroundColor: "",
        imageEdit: DEFAULT_IMAGE_EDIT,
        overlay: "none",
        imageFit: "cover",
        mobileFit: "whole",
        titleAlign: "",
        subtitleAlign: "",
        ctaAlign: "",
        titleColor: "",
        subtitleColor: "",
        heroHeight: 0,
        heroHeightUnit: "px",
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
        decoration: {
          type: "radio",
          label: "Understruken",
          options: [
            { label: "Nej", value: "none" },
            { label: "Ja", value: "underline" },
          ],
        },
        color: colorField("Textfärg"),
        font: fontField("Typsnitt"),
        typography: typographyField({ h2: 30, h3: 24 }, "level"),
        ...backgroundFields,
      },
      defaultProps: {
        ...backgroundDefaults,
        layerName: "",
        text: "Rubrik",
        level: "h2",
        align: "left",
        decoration: "none",
        color: "",
        font: "",
        typography: DEFAULT_TYPOGRAPHY,
      },
      render: (props) => withBackground(props, <Heading {...props} boxed={hasBackground(props)} />),
    },
    Text: {
      label: "Text",
      fields: {
        layerName: layerNameField,
        content: { type: "richtext", label: "Text" },
        color: colorField("Textfärg"),
        font: fontField("Typsnitt"),
        typography: typographyField(18),
        ...backgroundFields,
      },
      defaultProps: {
        ...backgroundDefaults, layerName: "", content: "<p>Skriv din text här.</p>", color: "", font: "", typography: DEFAULT_TYPOGRAPHY },
      render: ({ content, color, font, typography, ...props }) =>
        withBackground(props, <TextBlock content={content} color={color} font={font} typography={typography} />),
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
        ...backgroundFields,
      },
      defaultProps: {
        ...backgroundDefaults, layerName: "", src: "", alt: "", width: "wide", widthPx: 0, edit: DEFAULT_IMAGE_EDIT },
      render: ({ puck, ...props }) =>
        withBackground(
          props,
          <ImageBlock
            {...props}
            imageControls={
              puck.isEditing && <CanvasImagePicker componentId={props.id} propName="src" hasImage={!!props.src} />
            }
          />,
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
        ...backgroundFields,
      },
      defaultProps: {
        ...backgroundDefaults,
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
      render: (props) => withBackground(props, <Button {...props} />),
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
        columnColors: {
          type: "custom",
          label: "Kolumnernas bakgrundsfärger",
          metadata: { kind: "colorList" },
          render: ({ field, value, onChange }) => (
            <ColumnColorsField label={field.label ?? "Kolumnernas bakgrundsfärger"} value={value} onChange={onChange} />
          ),
        },
        // Slot names kept from the two-column version, so old pages still work.
        left: { type: "slot", label: "Kolumn 1" },
        right: { type: "slot", label: "Kolumn 2" },
        third: { type: "slot", label: "Kolumn 3" },
        fourth: { type: "slot", label: "Kolumn 4" },
        ...backgroundFields,
      },
      defaultProps: {
        ...backgroundDefaults, layerName: "", count: 2, ratio: "1:1", widths: [], columnColors: [], left: [], right: [], third: [], fourth: [] },
      render: ({ count, ratio, widths, columnColors, left: First, right: Second, third: Third, fourth: Fourth, ...props }) =>
        withBackground(
          props,
          <Columns
            count={count}
            ratio={ratio}
            widths={widths}
            columnColors={columnColors}
            columns={[<First key="1" />, <Second key="2" />, <Third key="3" />, <Fourth key="4" />]}
          />,
        ),
    },
    Section: {
      label: "Sektion",
      fields: {
        layerName: layerNameField,
        content: { type: "slot", label: "Innehåll" },
        ...backgroundFields,
      },
      // A light background, so a new section is visible right away.
      defaultProps: { layerName: "", content: [], ...backgroundDefaults, bgColor: "#f4f4f5" },
      render: ({ content: Content, ...props }) =>
        withBackground(
          props,
          <Section>
            <Content />
          </Section>,
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
        ...backgroundFields,
      },
      defaultProps: {
        ...backgroundDefaults, layerName: "", size: "md", height: 0 },
      render: ({ size, height, ...props }) => withBackground(props, <Spacer size={size} height={height} />),
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
          ...pageConfig.components.Text.defaultProps!,
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
