import Link from "next/link";
import { AuroraBackdrop } from "@/components/aurora-backdrop";

// The platform's front page: the pitch and the sign-up buttons on the
// animated backdrop.

const FEATURES = [
  { title: "Dra och släpp", text: "Bygg sidan med rubriker, bilder, knappar och kolumner direkt på sidan." },
  { title: "Flera sidor", text: "Lägg till Om oss, Kontakt eller Kassa från färdiga mallar och länka ihop dem." },
  { title: "Publicera direkt", text: "Ett klick, så ligger webbplatsen ute på en egen adress eller din domän." },
];

export default function Home() {
  return (
    <main className="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden bg-zinc-950 px-6 py-24 text-center text-white">
      <AuroraBackdrop />

      <p className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-sm font-medium text-violet-200 backdrop-blur">
        Ingen kod behövs
      </p>
      <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
        Bygg din egen hemsida{" "}
        <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-sky-300 bg-clip-text text-transparent">
          på några minuter
        </span>
      </h1>
      <p className="mt-6 max-w-xl text-lg text-pretty text-zinc-300">
        Klicka på det du vill ändra, välj färger, typsnitt och bilder och publicera med ett klick.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/sign-up"
          className="rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition hover:from-violet-400 hover:to-fuchsia-400"
        >
          Skapa konto gratis
        </Link>
        <Link
          href="/sign-in"
          className="rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
        >
          Logga in
        </Link>
      </div>

      <ul className="mt-20 grid w-full max-w-4xl gap-4 text-left sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <h2 className="font-semibold">{feature.title}</h2>
            <p className="mt-2 text-sm text-pretty text-zinc-400">{feature.text}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
