"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import BackToTop from "@/components/layout/BackToTop";
import GlobalProvenanceBar from "@/components/layout/GlobalProvenanceBar";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import SectionNav from "@/components/layout/SectionNav";
import SiteFooter from "@/components/layout/SiteFooter";
import WorkspaceNav from "@/components/layout/WorkspaceNav";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import { Link, usePathname } from "@/i18n/navigation";
import { ProvenanceProvider } from "@/lib/provenance/ProvenanceContext";
import { workspaceForPath } from "@/lib/navigation/workspaces";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const t = useTranslations("nav");
  const tw = useTranslations("workspaces");
  const pathname = usePathname();
  const workspace = workspaceForPath(pathname);
  const rawSections = workspace?.sections ?? [];
  // Translate section labels; fall back to the English label if key is missing
  const sections = rawSections.map((s) => {
    try {
      const label = tw(`${workspace!.slug}.sections.${s.id}`);
      return { ...s, label };
    } catch {
      return s;
    }
  });

  return (
    <ProvenanceProvider globalBarActive>
      <div className="min-h-screen bg-gradient-to-br from-lacuna-pink/15 via-background to-lacuna-lavender/20">
        <a href="#main-content" className="skip-link">
          {t("skipToMain")}
        </a>

        <GlobalProvenanceBar />

        <header className="sticky top-0 z-50 border-b border-lacuna-lavender/40 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Link
                href="/"
                className="group flex shrink-0 items-center gap-2 sm:gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg lacuna-gradient transition-transform group-hover:scale-105">
                  <span className="text-lg font-bold text-white">L</span>
                </div>
                <div>
                  <p className="text-xl font-bold text-lacuna-plum">Lacuna</p>
                  <p className="text-xs text-lacuna-blue">{t("tagline")}</p>
                </div>
              </Link>
              <div className="flex items-center gap-3">
                <WorkspaceNav />
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-12"
        >
          {sections.length > 0
            ? (
              <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
                <SectionNav sections={sections} />
                <div>{children}</div>
              </div>
            )
            : children}
        </main>

        <footer className="mx-auto max-w-7xl px-4 sm:px-6">
          <SiteFooter />
        </footer>

        <BackToTop />
        <KeyboardShortcuts />
      </div>
    </ProvenanceProvider>
  );
}
