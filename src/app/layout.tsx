import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Playfair_Display } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#faf7f8",
};

export const metadata: Metadata = {
  title: "Lacuna",
  description:
    "Descriptive women's health company and exit intelligence: verified deal provenance, similarity-based precedents, and cited analytics. Not a forecast or an investment recommendation.",
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
      "Descriptive women's health exit intelligence from verified public sources. Not a forecast.",
    url: "https://lacuna-maekass.vercel.app",
    siteName: "Lacuna",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lacuna",
    description:
      "Descriptive women's health exit intelligence from verified public sources. Not a forecast. BSL 1.1.",
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
      className={`${playfair.variable} h-full antialiased`}
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
                "Descriptive women's health company and exit intelligence. Verified deal provenance and cited analytics. Not a forecast.",
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
