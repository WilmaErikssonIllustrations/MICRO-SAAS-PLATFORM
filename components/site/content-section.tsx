type ContentSectionProps = {
  content: string;
  themeColor: string;
};

// Blank lines in the text become separate paragraphs.
function toParagraphs(content: string) {
  return content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function ContentSection({ content, themeColor }: ContentSectionProps) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <div className="mb-8 h-1 w-16 rounded-full" style={{ backgroundColor: themeColor }} />
      <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Om oss</h2>
      <div className="mt-6 space-y-5 text-lg leading-relaxed text-zinc-700">
        {toParagraphs(content).map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
