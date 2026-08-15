"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AmbientDepth from "@/components/layout/AmbientDepth";
import BackToTop from "@/components/layout/BackToTop";
import GlobalProvenanceBar from "@/components/layout/GlobalProvenanceBar";
import SectionNav from "@/components/layout/SectionNav";
import SiteFooter from "@/components/layout/SiteFooter";
import WorkspaceNav from "@/components/layout/WorkspaceNav";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import { ProvenanceProvider } from "@/lib/provenance/ProvenanceContext";
import { workspaceForPath } from "@/lib/navigation/workspaces";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const workspace = workspaceForPath(pathname);
  const sections = workspace?.sections ?? [];

  return (
    <ProvenanceProvider globalBarActive>
      <div className="relative min-h-screen bg-gradient-to-br from-lacuna-pink/15 via-background to-lacuna-lavender/20">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <AmbientDepth />

        <div className="relative z-10">
          <GlobalProvenanceBar />

          <header className="sticky top-0 z-50 border-b border-lacuna-lavender/40 glass-layer shadow-[0_4px_24px_-12px_rgba(93,78,109,0.22)]">
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
                    <p className="text-xs text-lacuna-blue">
                      Women&apos;s Health M&amp;A · Diligence Stack
                    </p>
                  </div>
                </Link>
                <WorkspaceNav />
              </div>
            </div>
          </header>

          {workspace
            ? (
              <div className="border-b border-lacuna-lavender/20 glass-layer-tint">
                <div className="mx-auto max-w-7xl px-4 py-1.5 sm:px-6">
                  <p className="text-xs text-lacuna-blue/70 truncate">
                    {workspace.description}
                  </p>
                </div>
              </div>
            )
            : null}

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
      </div>
    </ProvenanceProvider>
  );
}
