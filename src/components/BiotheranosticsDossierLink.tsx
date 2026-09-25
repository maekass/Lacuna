import Link from "next/link";
import { BIOTHERANOSTICS_DOSSIER_PATH } from "@/lib/research/biotheranosticsDossier";

/** A visible, crawlable entrance to the first focused research dossier. */
export default function BiotheranosticsDossierLink() {
  return (
    <aside className="mb-8 rounded-xl border border-lacuna-lavender/50 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-lacuna-blue">
        Follow one case
      </p>
      <Link
        href={BIOTHERANOSTICS_DOSSIER_PATH}
        className="mt-2 inline-block text-lg font-semibold text-lacuna-plum underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        Biotheranostics: inspect the evidence
      </Link>
      <p className="mt-2 text-sm leading-relaxed text-lacuna-blue">
        Acquisition prices, a clinical evidence check, and unresolved
        patient-access questions. Sources and limitations accompany each claim.
      </p>
    </aside>
  );
}
