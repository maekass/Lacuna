import type { Metadata } from "next";
import MethodsPage from "@/app/sections/MethodsPage";

export const revalidate = 86_400;

export const metadata: Metadata = {
  title: "Lacuna · Methods",
  description:
    "Causal DAG, Bayesian small-n analysis, temporal patterns, and sensitivity analysis for women's health M&A research.",
  alternates: { canonical: "/methods" },
};

export default function Page() {
  return <MethodsPage />;
}
