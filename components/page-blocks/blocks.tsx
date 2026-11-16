import type { CSSProperties, ReactNode } from "react";
import { getContrastText } from "@/lib/color";

// Presentational building blocks for published pages. They hold no state,
// so they render both in the Puck editor and in Server Components.
// Text fields marked `contentEditable` in lib/page/config.tsx arrive as
// inline-editable elements in the editor and as plain strings elsewhere,
// so render them as children and don't treat them as strings.

type Align = "left" | "center";

const alignClass: Record<Align, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
};

/**
 * Sets the theme color variables the blocks read. Blocks with their own
 * color (an empty string means "use the theme") override them locally.
 */
function themeStyle(color: string | undefined) {
  if (!color) return undefined;
  return { "--theme": color, "--theme-contrast": getContrastText(color) } as CSSProperties;
}

export function SiteRoot({
  title,
  themeColor,
  children,
}: {
  title: string;
  themeColor: string;
  children: ReactNode;
}) {
  return (
    <div style={themeStyle(themeColor)} className="flex min-h-full flex-col bg-white text-zinc-900">
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
  theme: "bg-[var(--theme)] text-[var(--theme-contrast)]",
  light: "bg-zinc-50 text-zinc-900",
  dark: "bg-zinc-900 text-white",
} as const;

export type HeroProps = {
  image: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  background: keyof typeof heroBackground;
  /** Overrides `background` when set. Empty means unset. */
  backgroundColor: string;
  align: Align;
};

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
  align,
  imageControls,
}: HeroProps & ImageControls) {
  // A custom color works like the theme background, in that color.
  const shade = backgroundColor ? "theme" : background;
  return (
    <section
      style={image ? undefined : themeStyle(backgroundColor)}
      className={`group relative isolate ${image ? "bg-zinc-900 text-white" : heroBackground[shade]}`}
    >
      {image && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on S3 */}
          <img src={image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-black/50" />
        </>
      )}
      {imageControls && <HoverControls>{imageControls}</HoverControls>}
      <div
        className={`mx-auto flex min-h-[60vh] max-w-5xl flex-col justify-center px-6 py-24 ${alignClass[align]}`}
      >
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-6 max-w-2xl text-lg text-pretty opacity-90 sm:text-xl">{subtitle}</p>
        )}
        {ctaText && (
          <ButtonLink
            href={ctaLink || "#"}
            variant={shade === "theme" && !image ? "inverted" : "filled"}
          >
            {ctaText}
          </ButtonLink>
        )}
      </div>
    </section>
  );
}

export type HeadingProps = { text: string; level: "h2" | "h3"; align: Align; color: string };

export function Heading({ text, level: Tag, align, color }: HeadingProps) {
  return (
    <div className={`mx-auto flex max-w-3xl flex-col px-6 pt-12 ${alignClass[align]}`}>
      <Tag
        style={color ? { color } : undefined}
        className={
          Tag === "h2"
            ? "text-3xl font-bold tracking-tight"
            : "text-2xl font-semibold tracking-tight"
        }
      >
        {text}
      </Tag>
    </div>
  );
}

export function TextBlock({ content, color }: { content: ReactNode; color?: string }) {
  return (
    <div
      style={color ? { color } : undefined}
      className="mx-auto max-w-3xl px-6 py-6 text-lg leading-relaxed text-zinc-700 [&_a]:text-[var(--theme)] [&_a]:underline [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-zinc-900 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-zinc-900 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--theme)] [&_blockquote]:pl-4 [&_blockquote]:italic"
    >
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
};

export function Button({ label, href, variant, align, color }: ButtonProps) {
  if (!label) return null;
  return (
    <div style={themeStyle(color)} className={`mx-auto flex max-w-3xl flex-col px-6 pb-6 ${alignClass[align]}`}>
      <ButtonLink href={href || "#"} variant={variant}>
        {label}
      </ButtonLink>
    </div>
  );
}

const buttonVariant = {
  filled: "bg-[var(--theme)] text-[var(--theme-contrast)]",
  outline: "border-2 border-[var(--theme)] text-[var(--theme)]",
  inverted: "bg-[var(--theme-contrast)] text-[var(--theme)]",
} as const;

function ButtonLink({
  href,
  variant,
  children,
}: {
  href: string;
  variant: keyof typeof buttonVariant;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      className={`mt-10 inline-flex items-center rounded-full px-8 py-3 text-base font-semibold shadow-sm transition-transform hover:scale-105 ${buttonVariant[variant]}`}
    >
      {children}
    </a>
  );
}

const columnRatio = {
  "1:1": "md:grid-cols-2",
  "2:1": "md:grid-cols-[2fr_1fr]",
  "1:2": "md:grid-cols-[1fr_2fr]",
} as const;

export type ColumnsRatio = keyof typeof columnRatio;

export function Columns({
  ratio,
  left,
  right,
}: {
  ratio: ColumnsRatio;
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className={`mx-auto grid max-w-5xl gap-8 px-6 py-6 ${columnRatio[ratio]}`}>
      <div className="min-w-0">{left}</div>
      <div className="min-w-0">{right}</div>
    </div>
  );
}

const imageWidth = { narrow: "max-w-2xl", wide: "max-w-5xl", full: "max-w-none" } as const;

export type ImageProps = { src: string; alt: string; width: keyof typeof imageWidth };

export function ImageBlock({ src, alt, width, imageControls }: ImageProps & ImageControls) {
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
      {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on S3 */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`h-auto w-full object-cover ${width === "full" ? "" : "rounded-xl"}`}
      />
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

const spacerSize = { sm: "h-6", md: "h-16", lg: "h-32" } as const;

export type SpacerSize = keyof typeof spacerSize;

export function Spacer({ size }: { size: SpacerSize }) {
  return <div aria-hidden className={spacerSize[size]} />;
}
