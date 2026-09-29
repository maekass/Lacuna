import type { Metadata } from "next";
import EndometriosisDiagnostics from "@/components/therapeutics/EndometriosisDiagnostics";

export const metadata: Metadata = {
  title: "Lacuna · Endometriosis therapeutics diagnostic",
  description:
    "Developer inspection of the endometriosis therapeutics reference graph.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function Page() {
  return <EndometriosisDiagnostics />;
}
