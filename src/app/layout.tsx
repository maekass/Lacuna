import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#faf7f8",
};

export const metadata: Metadata = {
  title:
    "Lacuna — Women's Health M&A Investment Research Stack",
  description:
    "Diligence infrastructure prototype for corp VC and healthcare investors: curator-verified deal provenance, clinical-trial signal, genomics-aware equity, and cited descriptive analytics from public filings. Not investment advice — BSL 1.1.",
  keywords: [
    "women's health M&A diligence",
    "FemTech corporate venture capital",
    "healthcare investment research",
    "M&A deal provenance",
    "clinical trials women's health",
    "genomics health equity",
    "descriptive M&A analytics",
    "SEC EDGAR deal ingest",
    "BSL open source",
    "healthcare VC research stack",
    "M&A network analysis",
  ],
  metadataBase: new URL("https://lacuna-maekass.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Lacuna — Women's Health M&A Investment Research Stack",
    description:
      "Curator-verified deal provenance, clinical-trial signal, and genomics-aware equity — an open diligence prototype with full source lineage.",
    url: "https://lacuna-maekass.vercel.app",
    siteName: "Lacuna",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lacuna — Women's Health M&A Investment Research Stack",
    description:
      "Diligence prototype for healthcare investors — verified deals, clinical trials, genomics equity. BSL 1.1. Not investment advice.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
                "Investment research stack for women's health M&A — curator-verified deals, clinical-trial signal, genomics-aware equity, and cited descriptive analytics from public sources.",
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
        {children}
      </body>
    </html>
  );
}
