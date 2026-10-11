"use client";

import ContributionSkyline from "@/components/ui/contribution-skyline";

/**
 * 21st.dev demo wrapper. `w-full` is load-bearing: a flex parent would
 * otherwise shrink the canvas to its contents.
 */
export default function ContributionSkylineDemo() {
  return (
    <div className="w-full bg-background px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-[980px]">
        <ContributionSkyline endDate="2017-11-08" />
      </div>
    </div>
  );
}
