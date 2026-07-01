import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ResearchPage from "@/app/sections/ResearchPage";

export const revalidate = 86_400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.research" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: `/${locale}/research` },
  };
}

export default function Page() {
  return <ResearchPage />;
}
