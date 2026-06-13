"use client";

import { Link, useLocation } from "wouter";
import type { ReactNode } from "react";
import AmbientDepth from "@/components/layout/AmbientDepth";
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
      <div className="relative min-h-screen bg-[#faf8fb]">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <AmbientDepth />

        <div className="relative z-10">
        <GlobalProvenanceBar />

        <header className="sticky top-0 z-50 border-b border-lacuna-lavender/20 glass-layer shadow-[0_4px_24px_-12px_rgba(93,78,109,0.22)]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded lacuna-gradient">
                <span className="text-xs font-bold text-white">L</span>
              </div>
              <span className="text-[15px] font-semibold text-lacuna-plum tracking-tight">Lacuna</span>
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
      </div>
    </ProvenanceProvider>
  );
}
