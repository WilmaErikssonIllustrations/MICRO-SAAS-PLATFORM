import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 text-center text-zinc-900">
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
        Bygg din egen hemsida på några minuter
      </h1>
      <p className="mt-6 max-w-xl text-lg text-pretty text-zinc-600">
        Fyll i rubrik, text och färg i formuläret, klicka på Spara &amp; Publicera
        och få en publik länk direkt.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/sign-up"
          className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700"
        >
          Skapa konto
        </Link>
        <Link
          href="/sign-in"
          className="rounded-lg px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
        >
          Logga in
        </Link>
      </div>
    </main>
  );
}
