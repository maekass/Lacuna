import type { Metadata } from "next";
import { Suspense } from "react";
import ConsumerHealthPage from "@/app/sections/ConsumerHealthPage";

export const revalidate = 86_400;

export const metadata: Metadata = {
  title: "Lacuna · Consumer health",
  description:
    "Wearables, wellness apps, and consumer digital health M&A — separate track from medicine & biotech diligence.",
  alternates: { canonical: "/consumer" },
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-lacuna-blue">
          Loading consumer health workspace…
        </div>
      }
    >
      <ConsumerHealthPage />
    </Suspense>
  );
}
