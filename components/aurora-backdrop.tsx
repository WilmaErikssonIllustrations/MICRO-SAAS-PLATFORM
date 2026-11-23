import Link from "next/link";

// The platform's backdrop (front page, sign-in and dashboard): slowly
// drifting colored glows and a faint grid, see .aurora in globals.css.
// Fixed, so it stays put while a long page scrolls; still for people who
// prefer less motion. Put it in a dark `relative isolate` container.
export function AuroraBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />
      <div className="aurora aurora-3" />
      <div className="landing-grid absolute inset-0" />
    </div>
  );
}

/** The platform's name with its mark, linking to the front page. */
export function BrandLink() {
  return (
    <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white">
      <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold">
        W
      </span>
      Website Builder
    </Link>
  );
}
