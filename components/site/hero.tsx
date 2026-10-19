import { getContrastText } from "@/lib/color";

type HeroProps = {
  title: string;
  subtitle: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  themeColor: string;
};

export function Hero({ title, subtitle, ctaText, ctaLink, themeColor }: HeroProps) {
  const textColor = getContrastText(themeColor);

  return (
    <section style={{ backgroundColor: themeColor, color: textColor }}>
      <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-6 max-w-2xl text-lg text-pretty opacity-90 sm:text-xl">
            {subtitle}
          </p>
        )}

        {ctaText && ctaLink && (
          <a
            href={ctaLink}
            rel="noopener noreferrer"
            style={{ backgroundColor: textColor, color: themeColor }}
            className="mt-10 inline-flex items-center rounded-full px-8 py-3 text-base font-semibold shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}
