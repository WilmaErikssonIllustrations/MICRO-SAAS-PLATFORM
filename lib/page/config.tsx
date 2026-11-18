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
import { TEXT_EFFECTS, type TextEffect } from "@/lib/page/text-effect";
import { DEFAULT_TEXT_STYLE, type TextStyle } from "@/lib/page/text-style";
import { DEFAULT_TYPOGRAPHY, type Typography } from "@/lib/page/typography";
import { TextStyleField } from "@/components/page-blocks/text-style-field";
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
  Text: Block<{ content: RichText; color: string; font: string; typography: Typography; textStyle: TextStyle; effect: TextEffect }>;
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
    options: [{ label: "Auto", value: "" }, ...alignField.options],
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

/**
 * A background color that replaces a background image (`imageProp`):
 * picking a color removes the image, which would otherwise cover it.
 */
function replacesImage<F extends { metadata?: Record<string, unknown> }>(field: F, imageProp: string): F {
  return { ...field, metadata: { ...field.metadata, replaces: imageProp } };
}

/** Background color and image behind a block (see BlockBackground). */
const backgroundFields = {
  bgColor: replacesImage(inGroup(colorField("Bakgrundsfärg"), "background"), "bgImage"),
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

/**
 * Bold / italic / underline (B, I, U in the toolbar). `defaultBold` is
 * whether the element is bold without a choice.
 */
function textStyleField(defaultBold: boolean) {
  const metadata = { kind: "textStyle", defaultBold };
  return {
    type: "custom",
    label: "Stil",
    metadata,
    render: ({ value, onChange }) => (
      <TextStyleField label="Stil" value={value} onChange={onChange} defaultBold={defaultBold} />
    ),
  } satisfies CustomField<TextStyle>;
}

/** A text effect (shadow, outline, neon...), the sparkle in the toolbar. */
const textEffectField = {
  type: "select",
  label: "Effekter",
  metadata: { kind: "textEffect" },
  options: TEXT_EFFECTS.map((effect) => ({ ...effect })),
} as const;

/** Puts a field on one part of a block (metadata.part, see the Hero). */
function onPart<F extends { metadata?: Record<string, unknown> }>(field: F, part: string, menuLabel?: string): F {
  return { ...field, metadata: { ...field.metadata, part, ...(menuLabel && { menuLabel }) } };
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
      // Hidden: fonts are picked per text block. Pages that set these
      // before keep them (see SiteRoot).
      headingFont: { ...fontField("Typsnitt för rubriker"), visible: false },
      bodyFont: { ...fontField("Typsnitt för text"), visible: false },
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
          // needs: only shown once the hero has an image.
          metadata: { group: "heroBackground", needs: "image" },
          type: "radio",
          label: "Bildvisning",
          options: [
            { label: "Fyll ytan", value: "cover" },
            { label: "Visa hela bilden", value: "whole" },
          ],
        },
        mobileFit: {
          metadata: { group: "heroBackground", needs: "image" },
          type: "radio",
          label: "På mobil",
          options: [
            { label: "Visa hela bilden", value: "whole" },
            { label: "Bilden ovanför texten", value: "stack" },
            { label: "Samma som på datorn", value: "same" },
          ],
        },
        // Behind the text when the image is above it on phones; only shown then.
        stackColor: {
          ...colorField("Bakgrund under bilden på mobil"),
          metadata: { kind: "color", group: "heroBackground", needs: "image", showWhen: { mobileFit: "stack" } },
        },
        heroHeightUnit: {
          metadata: { group: "heroBackground" },
          type: "radio",
          label: "Höjdenhet",
          // Picked next to the height itself (metadata.unitProp on heroHeight).
          visible: false,
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
          // One menu row for the height and its unit (heroHeightUnit).
          metadata: {
            unitProp: "heroHeightUnit",
            units: [
              { value: "px", label: "px", max: 2000 },
              { value: "vh", label: "%", max: 200 },
            ],
            unitHint: "0 = automatisk. % är andel av skärmens höjd.",
            group: "heroBackground",
          },
        },
        overlay: {
          metadata: { group: "heroBackground", needs: "image" },
          type: "radio",
          label: "Ton över bilden",
          options: [
            { label: "Ingen", value: "none" },
            { label: "Lätt", value: "light" },
            { label: "Mörk", value: "dark" },
          ],
        },
        title: { type: "text", label: "Rubrik", contentEditable: true, metadata: { part: "title" } },
        // Text settings per part; empty follows the hero.
        titleFont: onPart(fontField("Rubrikens typsnitt"), "title", "Typsnitt"),
        titleTypography: onPart(typographyField(60), "title"),
        titleStyle: onPart(textStyleField(true), "title"),
        titleEffect: onPart(textEffectField, "title"),
        titleAlign: partAlignField("Rubrikens justering", "title"),
        titleColor: { ...colorField("Rubrikens färg"), metadata: { kind: "color", part: "title", menuLabel: "Färg" } },
        subtitle: { type: "textarea", label: "Underrubrik", contentEditable: true, metadata: { part: "subtitle" } },
        subtitleFont: onPart(fontField("Underrubrikens typsnitt"), "subtitle", "Typsnitt"),
        subtitleTypography: onPart(typographyField(20), "subtitle"),
        subtitleStyle: onPart(textStyleField(false), "subtitle"),
        subtitleEffect: onPart(textEffectField, "subtitle"),
        subtitleAlign: partAlignField("Underrubrikens justering", "subtitle"),
        subtitleColor: {
          ...colorField("Underrubrikens färg"),
          metadata: { kind: "color", part: "subtitle", menuLabel: "Färg" },
        },
        ctaText: { type: "text", label: "Knapptext", contentEditable: true, metadata: { part: "cta" } },
        ctaFont: onPart(fontField("Knappens typsnitt"), "cta", "Typsnitt"),
        ctaTypography: onPart(typographyField(16), "cta"),
        ctaStyle: onPart(textStyleField(true), "cta"),
        ctaEffect: onPart(textEffectField, "cta"),
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
          // Hidden: the background is picked with Bakgrundsfärg. Without a
          // color, heroes stay as they were (dark unless set to light).
          visible: false,
          options: [
            { label: "Ljus", value: "light" },
            { label: "Mörk", value: "dark" },
          ],
        },
        backgroundColor: replacesImage(inGroup(colorField("Bakgrundsfärg"), "heroBackground"), "image"),
        align: alignField,
        // Hidden: text is styled per part (title, subtitle, button). Pages
        // that set these before keep them, under the parts' own settings.
        font: { ...fontField("Typsnitt"), visible: false },
        typography: { ...typographyField(60), visible: false },
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
        stackColor: "",
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
        titleFont: "",
        titleTypography: DEFAULT_TYPOGRAPHY,
        titleStyle: DEFAULT_TEXT_STYLE,
        subtitleFont: "",
        subtitleTypography: DEFAULT_TYPOGRAPHY,
        subtitleStyle: DEFAULT_TEXT_STYLE,
        ctaFont: "",
        ctaTypography: DEFAULT_TYPOGRAPHY,
        ctaStyle: DEFAULT_TEXT_STYLE,
        titleEffect: "",
        subtitleEffect: "",
        ctaEffect: "",
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
          // Replaced by textStyle's underline; still read on older pages.
          visible: false,
          options: [
            { label: "Nej", value: "none" },
            { label: "Ja", value: "underline" },
          ],
        },
        color: colorField("Textfärg"),
        font: fontField("Typsnitt"),
        typography: typographyField({ h2: 30, h3: 24 }, "level"),
        textStyle: textStyleField(true),
        effect: textEffectField,
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
        textStyle: DEFAULT_TEXT_STYLE,
        effect: "",
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
        textStyle: textStyleField(false),
        effect: textEffectField,
        ...backgroundFields,
      },
      defaultProps: {
        ...backgroundDefaults,
        layerName: "",
        content: "<p>Skriv din text här.</p>",
        color: "",
        font: "",
        typography: DEFAULT_TYPOGRAPHY,
        textStyle: DEFAULT_TEXT_STYLE,
        effect: "",
      },
      render: ({ content, color, font, typography, textStyle, effect, ...props }) =>
        withBackground(
          props,
          <TextBlock content={content} color={color} font={font} typography={typography} textStyle={textStyle} effect={effect} />,
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
          // Older width presets: still used when widthPx is 0 (automatic).
          visible: false,
          options: [
            { label: "Smal", value: "narrow" },
            { label: "Bred", value: "wide" },
            { label: "Hela sidan", value: "full" },
          ],
        },
        widthPx: {
          type: "number",
          label: "Bredd",
          min: 0,
          max: 2000,
          step: 10,
          // One menu row for the width and its unit (widthUnit), like the Hero's height.
          metadata: {
            unitProp: "widthUnit",
            units: [
              { value: "px", label: "px", max: 2000 },
              { value: "%", label: "%", max: 100 },
            ],
            unitHint: "0 = automatisk. % är andel av sidans bredd.",
          },
        },
        widthUnit: {
          type: "radio",
          label: "Breddenhet",
          // Picked next to the width itself.
          visible: false,
          options: [
            { label: "Pixlar", value: "px" },
            { label: "% av sidans bredd", value: "%" },
          ],
        },
        ...backgroundFields,
      },
      defaultProps: {
        ...backgroundDefaults, layerName: "", src: "", alt: "", width: "wide", widthPx: 0, widthUnit: "px", edit: DEFAULT_IMAGE_EDIT },
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
        textStyle: textStyleField(true),
        effect: textEffectField,
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
        textStyle: DEFAULT_TEXT_STYLE,
        effect: "",
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
      label: "Grupp",
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
            {/* See .section-content in SiteRoot: no space at the section's edges. */}
            <Content className="section-content" />
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
