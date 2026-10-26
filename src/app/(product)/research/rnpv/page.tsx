import Link from "next/link";
import RnpvSimulator from "@/components/RnpvSimulator";

export default function RnpvResearchPage() {
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8"><Link className="underline" href="/research">Back to research workspace</Link><h1 className="lacuna-gradient-text text-3xl font-bold">rNPV scenario and Monte Carlo sandbox</h1><RnpvSimulator /></main>;
}
