import Link from "next/link";
import type { DatasetScope } from "@/lib/data/medBiotechFilters";
import { DATASET_SCOPE_LABELS } from "@/lib/data/medBiotechFilters";

interface DatasetScopeBannerProps {
  scope: DatasetScope;
  companyCount: number;
  dealCount: number;
}

/** Explains which dataset scope a workspace uses and links to the sibling track. */
export default function DatasetScopeBanner({
  scope,
  companyCount,
  dealCount,
}: DatasetScopeBannerProps) {
  const isConsumer = scope === "consumer_health";
  const siblingHref = isConsumer ? "/deals" : "/consumer";
  const siblingLabel = isConsumer
    ? DATASET_SCOPE_LABELS.med_biotech
    : DATASET_SCOPE_LABELS.consumer_health;

  return (
    <div
      className="rounded-xl border border-lacuna-lavender/40 bg-lacuna-lavender/10 px-4 py-3 text-sm text-lacuna-blue"
      role="note"
    >
      <p>
        <span className="font-medium text-lacuna-plum">
          {DATASET_SCOPE_LABELS[scope]}
        </span>{" "}
        scope — {companyCount} companies · {dealCount}{" "}
        verified deals in this workspace. Not live market data; descriptive
        analytics only.
      </p>
      <p className="mt-1 text-lacuna-blue/85">
        {isConsumer
          ? "Wearables, wellness apps, and consumer digital health — tracked separately from therapeutics, diagnostics, and medtech."
          : "Therapeutics, diagnostics, medtech, and clinical women's health — consumer brands live in a separate workspace."}
        {" "}
        <Link
          href={siblingHref}
          className="font-medium text-lacuna-plum underline-offset-2 hover:underline"
        >
          View {siblingLabel} →
        </Link>
      </p>
    </div>
  );
}
