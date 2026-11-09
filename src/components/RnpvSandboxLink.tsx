import Link from "next/link";

/** Entrance from the research workspace to the hypothetical rNPV sandbox. */
export default function RnpvSandboxLink() {
  return (
    <aside className="rounded-xl border border-lacuna-lavender/50 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-lacuna-blue">
        Analyst sandbox
      </p>
      <Link
        href="/research/rnpv"
        className="mt-2 inline-block text-lg font-semibold text-lacuna-plum underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        rNPV scenario and Monte Carlo sandbox
      </Link>
      <p className="mt-2 text-sm leading-relaxed text-lacuna-blue">
        Explore how development risk, timing, commercial assumptions, and
        capital needs change a hypothetical asset value. Illustrative inputs
        stay labeled as assumptions. This is not a valuation, a ranking, or a
        clinical prediction, and it does not use published benchmark defaults.
      </p>
    </aside>
  );
}
