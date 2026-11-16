import type { CSSProperties, ReactNode } from "react";
import { getContrastText } from "@/lib/color";
import { type Box, boxRowStyle, boxStyle, cssHeight, type HeightUnit, isDefaultBox } from "@/lib/page/box";
import { type CustomFont, fontCss, fontFamily } from "@/lib/page/fonts";
import { type ImageEdit, imageEditStyle, imageFrameStyle } from "@/lib/page/image-edit";
import { type Typography, typographyVars } from "@/lib/page/typography";

// Presentational building blocks for published pages. They hold no state,
// so they render both in the Puck editor and in Server Components.
// Text fields marked `contentEditable` in lib/page/config.tsx arrive as
// inline-editable elements in the editor and as plain strings elsewhere,
// so render them as children and don't treat them as strings.
//
// Text sizes read --fs (scale), --ls (letter spacing) and --lh (line
// height) with each element's own default as fallback; blocks set them from
// their `typography` setting (lib/page/typography.ts).
//
// `data-resize-box` marks the element the editor puts resize handles on
// (app/dashboard/editor/resize-handles.tsx); it does nothing on the site.

type Align = "left" | "center" | "right";

const alignClass: Record<Align, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

/** Aligns one item in a flex column on its own ("" follows the column). */
const selfAlignClass: Record<Align | "", string> = {
  "": "",
  left: "self-start text-left",
  center: "self-center text-center",
  right: "self-end text-right",
};

/** Buttons and links use this color unless a block sets its own. */
const DEFAULT_ACCENT = "#18181b";

/**
 * Sets the accent color variables that buttons and links read, plus a
 * readable text color on top of it. Blocks with their own color (empty
 * means none) set them locally.
 */
function accentStyle(color: string | undefined) {
  if (!color) return undefined;
  return { "--accent": color, "--accent-contrast": getContrastText(color) } as CSSProperties;
}

/**
 * Props for a block with its own font ("" means the page's font). Headings
 * inside such a block follow it instead of the page's heading font.
 */
function fontProps(font: string | undefined) {
  const family = fontFamily(font);
  return family ? { style: { fontFamily: family }, "data-font": "" } : {};
}

/** Loads a block's Google font; uploaded fonts are loaded by SiteRoot. */
function FontImport({ font }: { font: string | undefined }) {
  const css = fontCss([font]);
  return css ? <style>{css}</style> : null;
}

export type SiteFonts = { headingFont: string; bodyFont: string; customFonts: CustomFont[] };

export function SiteRoot({
  title,
  headingFont,
  bodyFont,
  customFonts,
  children,
}: {
  title: string;
  children: ReactNode;
} & Partial<SiteFonts>) {
  const style = {
    ...accentStyle(DEFAULT_ACCENT),
    fontFamily: fontFamily(bodyFont),
    "--font-heading": fontFamily(headingFont) ?? "inherit",
  } as CSSProperties;
  // Font names and URLs are validated in lib/page/sanitize.ts.
  const css = [
    fontCss([headingFont, bodyFont], customFonts),
    ".site-root :is(h1,h2,h3){font-family:var(--font-heading)}",
    ".site-root [data-font] :is(h1,h2,h3){font-family:inherit}",
  ].join("\n");

  return (
    <div style={style} className="site-root flex min-h-full flex-col bg-white text-zinc-900">
      <style>{css}</style>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-zinc-200">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-1 px-6 py-8 text-center text-sm text-zinc-500">
          <p className="font-medium text-zinc-700">{title}</p>
          <p>Skapad med Website Builder</p>
        </div>
      </footer>
    </div>
  );
}

const heroBackground = {
  light: "bg-zinc-50 text-zinc-900",
  dark: "bg-zinc-900 text-white",
  /** backgroundColor, through the accent variables. */
  custom: "bg-[var(--accent)] text-[var(--accent-contrast)]",
} as const;

// Optional tint over a hero image, to make white text easier to read.
const heroOverlay = { none: "", light: "bg-black/25", dark: "bg-black/50" } as const;

/**
 * How the hero lays out its image: filling the hero ("cover"), at the
 * image's own proportions ("whole") or above the text ("stack", phones
 * only). Tailwind needs complete class names, so there is one map for
 * phones and one for `sm` and up; each desktop class overrides its phone
 * counterpart.
 */
const heroPhoneLayout = {
  cover: { section: "flex flex-col", image: "absolute inset-0 h-full", content: "flex-1 py-24" },
  whole: {
    section: "grid",
    image: "static col-start-1 row-start-1 h-auto self-stretch",
    content: "col-start-1 row-start-1 py-10",
  },
  stack: { section: "flex flex-col", image: "static h-auto", content: "py-12" },
} as const;

const heroDesktopLayout = {
  cover: { section: "sm:flex sm:flex-col", image: "sm:absolute sm:inset-0 sm:h-full", content: "sm:flex-1 sm:py-24" },
  whole: {
    section: "sm:grid",
    image: "sm:static sm:col-start-1 sm:row-start-1 sm:h-auto sm:self-stretch",
    content: "sm:col-start-1 sm:row-start-1 sm:py-24",
  },
} as const;

export type HeroProps = {
  image: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  /** "theme" on pages saved before themes were removed; shown as dark. */
  background: "light" | "dark";
  /** Overrides `background` when set. Empty means unset. */
  backgroundColor: string;
  imageEdit: ImageEdit;
  /** Missing on pages saved before it existed, which then get no tint. */
  overlay: keyof typeof heroOverlay;
  /** 0 is automatic (60% of the screen, or the image's proportions). */
  heroHeight: number;
  /** Missing on pages saved before it existed, which then use pixels. */
  heroHeightUnit: HeightUnit;
  /** "whole" sizes the hero to the image so none of it is cropped. */
  imageFit: "cover" | "whole";
  /**
   * The image on phones, where a tall hero would crop a wide image hard.
   * Missing on older pages, which then show the whole image too.
   */
  mobileFit: "whole" | "stack" | "same";
  /**
   * Settings for one part of the hero (`data-part` below), so the title,
   * subtitle and button can be changed on their own. Empty follows the hero.
   */
  titleAlign: Align | "";
  subtitleAlign: Align | "";
  ctaAlign: Align | "";
  titleColor: string;
  subtitleColor: string;
  /** Button colors; empty means picked from the background. */
  buttonColor: string;
  buttonTextColor: string;
  align: Align;
  font: string;
  typography: Typography;
};

/** A background color, with light text when the color is dark. */
function backgroundColorStyle(color: string | undefined): CSSProperties | undefined {
  if (!color) return undefined;
  const light = getContrastText(color) === "#ffffff";
  return {
    backgroundColor: color,
    ...(light && { color: "#ffffff", "--block-text": "rgb(255 255 255 / 0.85)", "--block-heading": "#ffffff" }),
  } as CSSProperties;
}

export type BackgroundProps = {
  /** Empty means no background (the page shows through). */
  bgColor: string;
  bgImage: string;
  bgImageEdit: ImageEdit;
  /** The box the background is drawn in (lib/page/box.ts). */
  bgBox: Box;
};

/** True if a block draws a background box around itself. */
export function hasBackground(props: Partial<BackgroundProps>) {
  return Boolean(props.bgColor || props.bgImage || !isDefaultBox(props.bgBox));
}

/**
 * A background color and/or image behind any block, in a box that by
 * default covers the block's whole area. On a dark color the text turns
 * light: Heading inherits `color`, TextBlock reads --block-text/--block-heading.
 * `data-box` is where the editor puts the box's resize handles.
 */
export function BlockBackground({
  bgColor,
  bgImage,
  bgImageEdit,
  bgBox,
  children,
}: Partial<BackgroundProps> & { children: ReactNode }) {
  if (!hasBackground({ bgColor, bgImage, bgBox })) return children;
  const style = { ...boxStyle(bgBox), ...backgroundColorStyle(bgColor) } as CSSProperties;
  return (
    <div style={boxRowStyle(bgBox)}>
      <div data-box style={style} className="relative isolate overflow-hidden">
        {bgImage && (
          // eslint-disable-next-line @next/next/no-img-element -- user uploads on S3
          <img
            src={bgImage}
            alt=""
            style={imageEditStyle(bgImageEdit)}
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
        )}
        {/* Full width, so blocks centered with mx-auto keep their width in the flex box. */}
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}

/** Editor-only controls (e.g. "Byt bild") shown on top of an image. */
type ImageControls = { imageControls?: ReactNode };

export function Hero({
  image,
  title,
  subtitle,
  ctaText,
  ctaLink,
  background,
  backgroundColor,
  imageEdit,
  overlay,
  heroHeight,
  heroHeightUnit,
  imageFit,
  mobileFit,
  titleAlign,
  subtitleAlign,
  ctaAlign,
  titleColor,
  subtitleColor,
  buttonColor,
  buttonTextColor,
  align,
  font,
  typography,
  imageControls,
}: HeroProps & ImageControls) {
  const tint = heroOverlay[overlay] ?? "";
  // The whole image: the image and the content share one grid cell, so the
  // hero is as tall as the image (or the content, if that's taller). A set
  // height wins over it.
  const desktop = image && imageFit === "whole" && !heroHeight ? "whole" : "cover";
  const phoneChoice = mobileFit ?? "whole";
  const phone = !image || phoneChoice === "same" ? desktop : phoneChoice;
  // The chosen height applies where the image fills the hero.
  const height = heroHeight ? cssHeight(heroHeight, heroHeightUnit) : undefined;
  const sectionHeight = `${phone === "cover" && height ? "min-h-(--hero-h)" : ""} ${
    desktop === "cover" && height ? "sm:min-h-(--hero-h)" : "sm:min-h-0"
  }`;
  const contentHeight = `${phone === "cover" && !height ? "min-h-[60vh]" : "min-h-0"} ${
    desktop === "cover" && !height ? "sm:min-h-[60vh]" : "sm:min-h-0"
  }`;
  // Pages saved with the old theme background get the dark one.
  const shade = backgroundColor ? "custom" : background === "light" ? "light" : "dark";
  const { style: fontStyle, ...fontAttrs } = fontProps(font);
  return (
    <section
      {...fontAttrs}
      data-resize-height="heroHeight"
      data-resize-unit="heroHeightUnit"
      style={{
        ...(image ? undefined : accentStyle(backgroundColor)),
        ...fontStyle,
        ...typographyVars(typography),
        ...(height && { "--hero-h": typeof height === "number" ? `${height}px` : height }),
      }}
      className={`group relative isolate overflow-hidden ${heroPhoneLayout[phone].section} ${
        heroDesktopLayout[desktop].section
      } ${sectionHeight} ${
        image
          ? // Without a dark tint, a soft shadow keeps the white text readable.
            `bg-zinc-900 text-white ${overlay === "dark" ? "" : "[text-shadow:0_1px_12px_rgb(0_0_0/0.45)]"}`
          : heroBackground[shade]
      }`}
    >
      <FontImport font={font} />
      {image && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on S3 */}
          <img
            src={image}
            alt=""
            style={imageEditStyle(imageEdit)}
            className={`-z-10 w-full object-cover ${heroPhoneLayout[phone].image} ${heroDesktopLayout[desktop].image}`}
          />
          {tint && <div className={`absolute inset-0 -z-10 ${tint}`} />}
        </>
      )}
      {imageControls && <HoverControls>{imageControls}</HoverControls>}
      <div
        className={`mx-auto flex w-full max-w-5xl flex-col justify-center px-6 ${heroPhoneLayout[phone].content} ${
          heroDesktopLayout[desktop].content
        } ${contentHeight} ${alignClass[align]}`}
      >
        <h1
          data-resize-box
          data-part="title"
          style={{ color: titleColor || undefined }}
          className={`${selfAlignClass[titleAlign ?? ""]} max-w-3xl text-[length:calc(2.25rem*var(--fs,1))] leading-(--lh,1.11) font-bold tracking-(--ls,-0.025em) text-balance sm:text-[length:calc(3.75rem*var(--fs,1))] sm:leading-(--lh,1)`}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            data-part="subtitle"
            style={{ color: subtitleColor || undefined }}
            className={`${selfAlignClass[subtitleAlign ?? ""]} mt-6 max-w-2xl text-[length:calc(1.125rem*var(--fs,1))] leading-(--lh,1.56) tracking-(--ls,normal) text-pretty opacity-90 sm:text-[length:calc(1.25rem*var(--fs,1))] sm:leading-(--lh,1.4)`}
          >
            {subtitle}
          </p>
        )}
        {ctaText && (
          <ButtonLink
            href={ctaLink || "#"}
            // On a dark or colored hero the default button is inverted
            // (light); a chosen button color is used as is.
            variant={shade !== "light" && !image && !buttonColor ? "inverted" : "filled"}
            color={buttonColor}
            textColor={buttonTextColor}
            part="cta"
            className={selfAlignClass[ctaAlign ?? ""]}
          >
            {ctaText}
          </ButtonLink>
        )}
      </div>
    </section>
  );
}

export type HeadingProps = {
  text: string;
  level: "h2" | "h3";
  align: Align;
  color: string;
  font: string;
  typography: Typography;
  /** Missing on pages saved before it existed. */
  decoration: "none" | "underline";
};

export function Heading({
  text,
  level: Tag,
  align,
  color,
  font,
  typography,
  decoration,
  boxed,
}: HeadingProps & {
  /** In a background box: even spacing above and below, not just above. */
  boxed?: boolean;
}) {
  return (
    <div
      style={typographyVars(typography)}
      className={`mx-auto flex w-full max-w-3xl flex-col px-6 ${boxed ? "py-8" : "pt-12"} ${alignClass[align]}`}
    >
      <FontImport font={font} />
      <Tag
        data-resize-box
        style={{ color: color || undefined, fontFamily: fontFamily(font) }}
        className={
          `${
            Tag === "h2"
              ? "text-[length:calc(1.875rem*var(--fs,1))] leading-(--lh,1.2) font-bold tracking-(--ls,-0.025em)"
              : "text-[length:calc(1.5rem*var(--fs,1))] leading-(--lh,1.33) font-semibold tracking-(--ls,-0.025em)"
          } ${decoration === "underline" ? "underline decoration-[0.06em] underline-offset-[0.18em]" : ""}`
        }
      >
        {text}
      </Tag>
    </div>
  );
}

export function TextBlock({
  content,
  color,
  font,
  typography,
}: {
  content: ReactNode;
  color?: string;
  font?: string;
  typography?: Typography;
}) {
  const { style: fontStyle, ...fontAttrs } = fontProps(font);
  return (
    <div
      data-resize-box
      {...fontAttrs}
      style={{ color: color || undefined, ...fontStyle, ...typographyVars(typography) }}
      className="mx-auto max-w-3xl px-6 py-6 text-[length:calc(1.125rem*var(--fs,1))] leading-(--lh,1.625) tracking-(--ls,normal) text-[color:var(--block-text,var(--color-zinc-700))] [&_:is(h2,h3)]:leading-(--lh,1.3) [&_a]:text-[var(--accent)] [&_a]:underline [&_h2]:mt-8 [&_h2]:text-[length:calc(1.5rem*var(--fs,1))] [&_h2]:font-bold [&_h2]:text-[color:var(--block-heading,var(--color-zinc-900))] [&_h3]:mt-6 [&_h3]:text-[length:calc(1.25rem*var(--fs,1))] [&_h3]:font-semibold [&_h3]:text-[color:var(--block-heading,var(--color-zinc-900))] [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--accent)] [&_blockquote]:pl-4 [&_blockquote]:italic"
    >
      <FontImport font={font} />
      {content}
    </div>
  );
}

export type ButtonProps = {
  label: string;
  href: string;
  variant: "filled" | "outline";
  align: Align;
  color: string;
  /** Empty means black or white, whichever reads best on the button. */
  textColor: string;
  font: string;
  typography: Typography;
};

export function Button({ label, href, variant, align, color, textColor, font, typography }: ButtonProps) {
  if (!label) return null;
  const { style: fontStyle, ...fontAttrs } = fontProps(font);
  return (
    <div
      {...fontAttrs}
      style={{ ...fontStyle, ...typographyVars(typography) }}
      className={`mx-auto flex max-w-3xl flex-col px-6 pb-6 ${alignClass[align]}`}
    >
      <FontImport font={font} />
      <ButtonLink href={href || "#"} variant={variant} color={color} textColor={textColor} resizeBox>
        {label}
      </ButtonLink>
    </div>
  );
}

const buttonVariant = {
  filled: "bg-[var(--accent)] text-[var(--accent-contrast)]",
  outline: "border-2 border-[var(--accent)] text-[var(--accent)]",
  inverted: "bg-[var(--accent-contrast)] text-[var(--accent)]",
} as const;

function ButtonLink({
  href,
  variant,
  color,
  textColor,
  resizeBox,
  part,
  className = "",
  children,
}: {
  href: string;
  variant: keyof typeof buttonVariant;
  /** Button color and text color; empty or missing means the defaults. */
  color?: string;
  textColor?: string;
  resizeBox?: boolean;
  /** Marks the button as a part of a bigger block (see Hero). */
  part?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      data-resize-box={resizeBox || undefined}
      data-part={part}
      href={href}
      rel="noopener noreferrer"
      style={{ ...accentStyle(color), color: textColor || undefined }}
      className={`${className} mt-10 inline-flex items-center rounded-full px-8 py-3 text-[length:calc(1rem*var(--fs,1))] leading-(--lh,1.5) font-semibold tracking-(--ls,normal) shadow-sm transition-transform hover:scale-105 ${buttonVariant[variant]}`}
    >
      {children}
    </a>
  );
}

// Two-column layouts from before custom widths existed.
const columnRatio = { "1:1": [1, 1], "2:1": [2, 1], "1:2": [1, 2] } as const;

export type ColumnsRatio = keyof typeof columnRatio;

export const COLUMN_COUNTS = [2, 3, 4] as const;

/**
 * Relative column widths: the dragged `widths` when they match the column
 * count, else the old two-column ratio, else equal columns.
 */
export function columnFractions(count: number, ratio: ColumnsRatio | undefined, widths: number[] | undefined) {
  const n = COLUMN_COUNTS.includes(count as 2) ? count : 2;
  if (widths?.length === n) return widths;
  if (n === 2 && ratio && columnRatio[ratio]) return [...columnRatio[ratio]];
  return Array<number>(n).fill(1);
}

export function Columns({
  count,
  ratio,
  widths,
  columnColors,
  columns,
}: {
  count: number;
  ratio?: ColumnsRatio;
  widths?: number[];
  /** A background color per column; empty means none. */
  columnColors?: string[];
  columns: ReactNode[];
}) {
  const fractions = columnFractions(count, ratio, widths);
  // Stacked on phones; side by side from md up.
  const style = { "--cols": fractions.map((f) => `minmax(0,${f}fr)`).join(" ") } as CSSProperties;
  return (
    <div data-resize-box style={style} className="mx-auto grid max-w-5xl gap-8 px-6 py-6 md:grid-cols-(--cols)">
      {columns.slice(0, fractions.length).map((column, index) => {
        const color = columnColors?.[index];
        return (
          <div
            key={index}
            style={backgroundColorStyle(color)}
            className={`min-w-0 ${color ? "rounded-xl pb-6" : ""}`}
          >
            {column}
          </div>
        );
      })}
    </div>
  );
}

const imageWidth = { narrow: "max-w-2xl", wide: "max-w-5xl", full: "max-w-none" } as const;

export type ImageProps = {
  src: string;
  alt: string;
  width: keyof typeof imageWidth;
  /** Image width in pixels; 0 fills the width above. */
  widthPx: number;
  edit: ImageEdit;
};

export function ImageBlock({ src, alt, width, widthPx, edit, imageControls }: ImageProps & ImageControls) {
  if (!src) {
    // An empty image is only shown in the editor, as a place to upload one.
    if (!imageControls) return null;
    return (
      <div className="mx-auto max-w-2xl px-6 py-6">
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500">
          {imageControls}
          <span>JPG, PNG, WebP, GIF eller AVIF</span>
        </div>
      </div>
    );
  }
  return (
    <figure className={`group relative mx-auto py-6 ${width === "full" ? "" : "px-6"} ${imageWidth[width]}`}>
      {/* The frame crops (format, zoom) and rounds the corners. */}
      <div
        data-resize-box
        style={{
          ...imageFrameStyle(edit),
          ...(width === "full" && { borderRadius: 0 }),
          ...(widthPx > 0 && { width: widthPx, maxWidth: "100%", marginInline: "auto" }),
        }}
        className="overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on S3 */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          style={imageEditStyle(edit)}
          className={`block w-full object-cover ${edit?.aspect && edit.aspect !== "original" ? "h-full" : "h-auto"}`}
        />
      </div>
      {imageControls && <HoverControls>{imageControls}</HoverControls>}
    </figure>
  );
}

function HoverControls({ children }: { children: ReactNode }) {
  return (
    <div className="absolute top-4 right-4 z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      {children}
    </div>
  );
}

/** A container for other blocks; its background (BlockBackground) covers them all. */
export function Section({ children }: { children: ReactNode }) {
  return (
    <div data-resize-box className="py-6">
      {children}
    </div>
  );
}

const spacerSize = { sm: "h-6", md: "h-16", lg: "h-32" } as const;

export type SpacerSize = keyof typeof spacerSize;

/** `height` in pixels overrides the preset `size` when above 0. */
export function Spacer({ size, height }: { size: SpacerSize; height?: number }) {
  return (
    <div
      aria-hidden
      data-resize-box
      style={height ? { height } : undefined}
      className={height ? undefined : spacerSize[size]}
    />
  );
}
