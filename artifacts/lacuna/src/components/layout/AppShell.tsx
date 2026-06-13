"use client";

import { Link, useLocation } from "wouter";
import type { ReactNode } from "react";
import BackToTop from "@/components/layout/BackToTop";
import GlobalProvenanceBar from "@/components/layout/GlobalProvenanceBar";
import SectionNav from "@/components/layout/SectionNav";
import SiteFooter from "@/components/layout/SiteFooter";
import WorkspaceNav from "@/components/layout/WorkspaceNav";
import { ProvenanceProvider } from "@/lib/provenance/ProvenanceContext";
import { workspaceForPath } from "@/lib/navigation/workspaces";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [pathname] = useLocation();
  const workspace = workspaceForPath(pathname);
  const sections = workspace?.sections ?? [];

  return (
    <ProvenanceProvider globalBarActive>
      <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #fdf6f8 0%, #faf7fb 40%, #f4f0f8 100%)" }}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <GlobalProvenanceBar />

        <header className="sticky top-0 z-50 border-b border-lacuna-lavender/25 bg-white/90 backdrop-blur-md shadow-[0_1px_12px_rgba(93,78,109,0.07)]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-3.5">
            <Link
              href="/"
              className="group flex shrink-0 items-center gap-2.5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg lacuna-gradient shadow-sm transition-transform group-hover:scale-105">
                <span className="text-sm font-bold text-white tracking-tight">L</span>
              </div>
              <div>
                <p className="text-[15px] font-semibold leading-tight text-lacuna-plum tracking-tight">Lacuna</p>
                <p className="text-[10px] leading-tight text-lacuna-blue/70 font-medium">
                  Women&apos;s Health M&amp;A · Diligence Stack
                </p>
              </div>
            </Link>
            <WorkspaceNav />
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10"
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
      </div>
    </ProvenanceProvider>
  );
}
