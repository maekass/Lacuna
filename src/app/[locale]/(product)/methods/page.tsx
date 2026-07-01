import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import MethodsPage from "@/app/sections/MethodsPage";

export const revalidate = 86_400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.methods" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: `/${locale}/methods` },
  };
}

export default function Page() {
  return <MethodsPage />;
}
