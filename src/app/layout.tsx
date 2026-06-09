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
    "Lacuna — Women's Health M&A Intelligence | Verified Research Demo",
  description:
    "Open research environment for women's health M&A: curator-verified deals, network visualization, genetics-first equity context, and cited descriptive analytics from public filings. Not investment advice — BSL 1.1.",
  keywords: [
    "women's health M&A education",
    "FemTech acquisitions research",
    "M&A visualization",
    "healthcare deal data open source",
    "clinical trials women's health",
    "health equity analytics",
    "descriptive M&A analytics",
    "D3 network graph",
    "BSL open source",
    "FemTech teaching tool",
    "M&A network analysis",
  ],
  metadataBase: new URL("https://lacuna-maekass.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Lacuna — Women's Health M&A Intelligence",
    description:
      "Verified deal provenance, clinical trial search, and genetics-first equity context — an open research demo with cited methodology.",
    url: "https://lacuna-maekass.vercel.app",
    siteName: "Lacuna",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lacuna — Women's Health M&A Intelligence",
    description:
      "Curator-verified M&A research demo with clinical trials and equity context — BSL 1.1. Not investment advice.",
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
                "Open research environment for women's health M&A — verified deals, network visualization, and cited descriptive analytics from public sources.",
              applicationCategory: "EducationalApplication",
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
