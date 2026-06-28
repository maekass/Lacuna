import type { Metadata } from "next";
import ResearchPage from "@/app/sections/ResearchPage";

export const revalidate = 86_400;

export const metadata: Metadata = {
  title: "Lacuna · Research",
  description:
    "Clinical trials, evidence maturity, genomics governance, and health equity markers for women's health M&A diligence.",
  alternates: { canonical: "/research" },
};

export default function Page() {
  return <ResearchPage />;
}
