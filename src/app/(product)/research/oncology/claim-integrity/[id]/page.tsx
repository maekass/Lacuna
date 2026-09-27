import type { Metadata } from "next";
import ClaimIntegrityDetail from "@/components/oncology/ClaimIntegrityDetail";

export const metadata: Metadata = {
  title: "Oncology claim record · Lacuna",
  description:
    "Exact claim, linked evidence, suggested classification, and human review history.",
};

export default async function Page(
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  return <ClaimIntegrityDetail claimId={id} />;
}
