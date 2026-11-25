import type { Metadata } from "next";
import recorded from "@/data/coding-judgment-reviewer-demo.json";
import { reviewerDemoSchema } from "@/lib/payerOps/codingJudgment/reviewerDemoView";
import CodingReviewDemo from "./CodingReviewDemo";

export const metadata: Metadata = {
  title: "Lacuna · Coding judgment reviewer view (recorded run)",
  description:
    "Read-only reviewer view of recorded coding-judgment cases: claim facts, model decision, cited rule rows, final route and the reason. Recorded run, not a live model.",
  alternates: { canonical: "/payer-ops/coding-review" },
  robots: { index: false, follow: false },
};

// Parsed at build time so a malformed data file fails the build, not the page.
const demo = reviewerDemoSchema.parse(recorded);

export default function Page() {
  return <CodingReviewDemo demo={demo} />;
}
