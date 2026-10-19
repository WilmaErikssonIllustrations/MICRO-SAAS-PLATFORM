export function SiteFooter({ title }: { title: string }) {
  return (
    <footer className="border-t border-zinc-200">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-1 px-6 py-8 text-center text-sm text-zinc-500">
        <p className="font-medium text-zinc-700">{title}</p>
        <p>Skapad med Website Builder</p>
      </div>
    </footer>
  );
}
