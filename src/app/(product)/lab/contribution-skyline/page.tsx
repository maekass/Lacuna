import type { Metadata } from "next";
import ContributionSkylineDemo from "@/components/ui/contribution-skyline-demo";

export const metadata: Metadata = {
  title: "Lacuna · Contribution Skyline",
  description:
    "Developer preview of the 21st.dev Contribution Skyline component.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function Page() {
  return <ContributionSkylineDemo />;
}
