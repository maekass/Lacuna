"use client";

import { useTranslations } from "next-intl";

export default function SiteFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="mt-20 pt-8 border-t border-lacuna-lavender/40">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 lacuna-gradient rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">L</span>
            </div>
            <span className="text-sm font-medium text-lacuna-plum">Lacuna</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-lacuna-blue">
            <a
              href="https://github.com/maekass/Lacuna"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-lacuna-plum transition-colors touch-target-inline"
            >
              GitHub
            </a>
            <a
              href="https://github.com/maekass/Lacuna/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-lacuna-plum transition-colors touch-target-inline"
            >
              {t("license")}
            </a>
            <a
              href="https://github.com/maekass/Lacuna/tree/main/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-lacuna-plum transition-colors touch-target-inline"
            >
              {t("methodology")}
            </a>
          </div>
        </div>

        <div className="text-[11px] text-lacuna-blue/60 text-center leading-relaxed max-w-3xl mx-auto">
          <p>{t("copyright")}</p>
          <p className="mt-1">{t("disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
}
