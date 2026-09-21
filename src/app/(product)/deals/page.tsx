import type { Metadata } from "next";
import DealsPage from "@/app/sections/DealsPage";

export const revalidate = 86_400;

export const metadata: Metadata = {
  title: "Lacuna · Deals",
  description:
    "M&A network graph, deal flow, valuation matrix, and acquirer landscape for women's health — verified public sources.",
  alternates: { canonical: "/deals" },
};

export default function Page() {
  return <DealsPage />;
}
