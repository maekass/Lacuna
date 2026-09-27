import type { Metadata } from "next";
import NewOncologyClaimForm from "@/components/oncology/NewOncologyClaimForm";

export const metadata: Metadata = {
  title: "Record an oncology claim · Lacuna",
  description:
    "Capture the exact wording of a dated oncology claim for evidence comparison.",
};

export default function Page() {
  return <NewOncologyClaimForm />;
}
