import type { Metadata } from "next";
import ConsumerHealthPage from "@/app/sections/ConsumerHealthPage";

export const revalidate = 86_400;

export const metadata: Metadata = {
  title: "Lacuna · Consumer health",
  description:
    "Wearables, wellness apps, and consumer digital health M&A — separate track from medicine & biotech diligence.",
  alternates: { canonical: "/consumer" },
};

export default function Page() {
  return <ConsumerHealthPage />;
}
