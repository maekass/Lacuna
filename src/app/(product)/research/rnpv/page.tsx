import type { Metadata } from "next";
import Link from "next/link";
import RnpvSimulator from "@/components/RnpvSimulator";

export const metadata: Metadata = {
  title: "rNPV scenario sandbox · Lacuna",
  description:
    "Analyst sandbox for hypothetical rNPV and seeded Monte Carlo scenarios. Not a valuation, ranking, clinical prediction, or investment recommendation.",
  alternates: { canonical: "/research/rnpv" },
  robots: { index: false, follow: false },
};

export default function RnpvResearchPage() {
  return (
    <div className="space-y-6">
      <p className="text-sm">
        <Link
          href="/research"
          className="font-semibold text-lacuna-plum underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Research workspace
        </Link>
      </p>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-lacuna-blue">
          Analyst sandbox
        </p>
        <h1 className="lacuna-gradient-text text-3xl font-bold">
          rNPV scenario and Monte Carlo sandbox
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-lacuna-blue sm:text-base">
          Explore how development risk, commercial assumptions, timing, and
          capital requirements change a hypothetical asset value. The figures
          are assumptions you enter. They are separate from the curated deal
          dataset.
        </p>
      </header>
      <RnpvSimulator />
    </div>
  );
}
