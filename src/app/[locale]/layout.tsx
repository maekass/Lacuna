import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Providers from "@/components/Providers";
import { routing } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
    metadataBase: new URL("https://lacuna-maekass.vercel.app"),
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
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", fr: "/fr" },
    },
    icons: {
      icon: "/favicon-v2.ico",
      shortcut: "/favicon-v2.ico",
      apple: "/l-icon.png",
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "https://lacuna-maekass.vercel.app",
      siteName: "Lacuna",
      type: "website",
      locale: locale === "fr" ? "fr_FR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
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
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <>
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
      <NextIntlClientProvider messages={messages}>
        <Providers>{children}</Providers>
      </NextIntlClientProvider>
    </>
  );
}
