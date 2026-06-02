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
  title: "Lacuna — Women's Health M&A Intelligence | FemTech Deal Tracker & Analytics",
  description:
    "Explore the landscape of women's health mergers and acquisitions. Lacuna brings together verified FemTech, precision medicine, and reproductive health deal data with clinical trial insights and health equity research — openly sourced, honestly presented.",
  keywords: [
    "women's health M&A",
    "FemTech acquisitions",
    "women's health mergers and acquisitions",
    "healthcare M&A deal tracker",
    "precision medicine acquisitions",
    "reproductive health M&A",
    "clinical trials women's health",
    "health equity analytics",
    "FemTech investment intelligence",
    "women's health startups",
    "healthcare deal flow",
    "M&A network analysis",
  ],
  metadataBase: new URL("https://lacuna-maekass.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Lacuna — Women's Health M&A Intelligence",
    description:
      "Explore verified women's health acquisitions, clinical trial pipelines, and health equity research — all in one welcoming, open-source platform.",
    url: "https://lacuna-maekass.vercel.app",
    siteName: "Lacuna",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lacuna — Women's Health M&A Intelligence",
    description:
      "Explore verified women's health M&A deals, clinical trials, and health equity research — openly sourced and honestly presented.",
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
                "An open-source platform that brings together verified women's health M&A data, clinical trial insights, and health equity research in one welcoming space.",
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
