import type { Metadata } from "next";
import PayerOpsPage from "@/app/sections/PayerOpsPage";
import payerOpsSnapshot from "@/data/payer-ops-benchmarks.snapshot.json";

export const revalidate = 86_400;

export const metadata: Metadata = {
  title: "Lacuna · Payer operations",
  description:
    "PayerOps Navigator — cited CAQH, KFF, and CMS payer-operations benchmarks for prior auth, claims, and administrative cost context in women's health M&A diligence.",
  alternates: { canonical: "/payer-ops" },
};

export default function Page() {
  const verifiedOn = payerOpsSnapshot.fetchedAt.slice(0, 10);
  return <PayerOpsPage sourcesLastVerified={verifiedOn} />;
}
