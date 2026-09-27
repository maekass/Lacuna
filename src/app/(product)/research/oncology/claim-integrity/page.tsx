import type { Metadata } from "next";
import ClaimIntegrityRegistry from "@/components/oncology/ClaimIntegrityRegistry";

export const metadata: Metadata = {
  title: "Oncology Claim-Integrity Monitor · Lacuna",
  description:
    "Analyst workspace for comparing dated oncology claims with public evidence. Evidence consistency only.",
  alternates: { canonical: "/research/oncology/claim-integrity" },
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ClaimIntegrityRegistry />;
}
