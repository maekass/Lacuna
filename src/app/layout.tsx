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
  title: "Lacuna — Women's Health M&A Education Demo | Verified Deals & Analytics",
  description:
    "Open educational demo for women's health M&A: curated verified deals, D3 network visualization, descriptive analytics, and health-equity context from public filings. Not investment advice or commercial deal intelligence — BSL 1.1.",
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
    title: "Lacuna — Women's Health M&A Education Demo",
    description:
      "Curated verified deals, interactive network viz, and honest descriptive analytics — an open research demo, not commercial intelligence.",
    url: "https://lacuna-maekass.vercel.app",
    siteName: "Lacuna",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lacuna — Women's Health M&A Education Demo",
    description:
      "Verified deals, clinical trial lookup, and health-equity context — open educational demo under BSL 1.1. Not investment advice.",
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
                "Open educational demo for women's health M&A — verified curated deals, network visualization, and descriptive analytics from public sources.",
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
                { "@type": "Thing", name: "Women's Health Mergers and Acquisitions" },
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
