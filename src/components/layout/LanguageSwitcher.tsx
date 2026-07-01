"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

export default function LanguageSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchLocale() {
    const next = locale === "en" ? "fr" : "en";
    // pathname is like /en/deals → swap the locale segment
    const newPath = pathname.replace(new RegExp(`^/${locale}`), `/${next}`);
    startTransition(() => {
      router.push(newPath);
    });
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      disabled={isPending}
      aria-label={t("switchLanguage")}
      className="touch-target-inline rounded-full border border-lacuna-lavender/60 px-3 py-1.5 text-xs font-semibold text-lacuna-plum transition-colors hover:bg-lacuna-lavender/25 disabled:opacity-50"
    >
      {t("switchLanguage")}
    </button>
  );
}
