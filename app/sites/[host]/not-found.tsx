export default function SiteNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-24 text-center text-zinc-900">
      <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Hemsidan finns inte</h1>
      <p className="mt-4 text-zinc-600">
        Adressen är inte kopplad till någon publicerad hemsida.
      </p>
    </main>
  );
}
