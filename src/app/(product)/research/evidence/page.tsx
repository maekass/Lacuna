import type { Metadata } from "next";
import EvidenceAskPanel from "@/components/research/EvidenceAskPanel";

export const metadata: Metadata = {
  title: "Evidence ask · Lacuna",
  description:
    "Ask a scoped question against dated public CMS excerpts and labeled Lacuna evidence. Answers abstain when support is missing.",
  alternates: { canonical: "/research/evidence" },
  robots: { index: false, follow: false },
};

export default function EvidenceAskPage() {
  return <EvidenceAskPanel />;
}
