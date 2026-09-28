import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  Bodoni_Moda,
  Jost,
  Ovo,
  Parisienne,
  Source_Serif_4,
} from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

/** Heavy Didone for poster-scale titles. Optical size keeps small headings open. */
const display = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

/** Calligraphy for the wordmark and short name lines. */
const script = Parisienne({
  variable: "--font-parisienne",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

/** Light elegant serif for secondary names (single weight — do not faux-bold). */
const elegant = Ovo({
  variable: "--font-ovo",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

/** Reading text. Didone is reserved for display sizes. */
const body = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

/** Small caps and interface chrome under the script and Didone lines. */
const label = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  display: "swap",
});

const luxuryType = [
  display.variable,
  script.variable,
  elegant.variable,
  body.variable,
  label.variable,
].join(" ");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#faf7f8",
};

export const metadata: Metadata = {
  title: "Lacuna",
  description:
    "Prototype investment-research environment for women's health M&A: verified deal provenance, clinical trial search, genomics governance, and cited analytics.",
  keywords: [
    "women's health M&A diligence",
    "FemTech corporate venture capital",
    "healthcare investment research",
    "M&A deal provenance",
    "clinical trials women's health",
    "genomics governance",
    "descriptive M&A analytics",
    "SEC EDGAR deal ingest",
    "BSL open source",
    "healthcare VC diligence",
    "M&A network analysis",
  ],
  metadataBase: new URL("https://lacuna-maekass.vercel.app"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon-v2.ico",
    shortcut: "/favicon-v2.ico",
    apple: "/l-icon.png",
  },
  openGraph: {
    title: "Lacuna",
    description:
      "Verified deal provenance, clinical trial search, genomics governance, and cited analytics for women's health M&A.",
    url: "https://lacuna-maekass.vercel.app",
    siteName: "Lacuna",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lacuna",
    description:
      "Verified deals, clinical trial search, genomics governance, and cited analytics. BSL 1.1.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${luxuryType} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Lacuna",
              url: "https://lacuna-maekass.vercel.app",
              description:
                "Women's health M&A diligence stack — verified deal provenance, clinical trial search, genomics governance, and cited analytics.",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              isAccessibleForFree: true,
              creator: {
                "@type": "Organization",
                name: "Lacuna Project",
                url: "https://github.com/maekass/Lacuna",
              },
              license: "https://github.com/maekass/Lacuna/blob/main/LICENSE",
              about: [
                {
                  "@type": "Thing",
                  name: "Women's Health Mergers and Acquisitions",
                },
                { "@type": "Thing", name: "FemTech" },
                { "@type": "Thing", name: "Precision Medicine" },
                { "@type": "Thing", name: "Health Equity" },
                { "@type": "Thing", name: "Clinical Trials" },
              ],
            }),
          }}
        />
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
