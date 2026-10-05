"use client";

import { useEffect, useState } from "react";
import { MobileSheetNav } from "@/components/ui/Sheet";
import type { SectionLink } from "@/lib/navigation/workspaces";

interface SectionNavProps {
  sections: SectionLink[];
}

function NavLink(
  { href, label, active, onNavigate }: {
    href: string;
    label: string;
    active: boolean;
    onNavigate?: () => void;
  },
) {
  return (
    <a
      href={href}
      onClick={onNavigate}
      className={`block rounded-lg px-3 py-2 text-sm transition-colors touch-target-inline ${
        active
          ? "bg-lacuna-lavender/25 font-medium text-lacuna-plum"
          : "text-lacuna-blue hover:bg-lacuna-pink/10 hover:text-lacuna-plum"
      }`}
      aria-current={active ? "location" : undefined}
    >
      {label}
    </a>
  );
}

export default function SectionNav({ sections }: SectionNavProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const ids = sections.map((s) => s.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5] },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [sections]);

  const activeLabel =
    sections.find((section) => section.id === activeId)?.label ??
      sections[0]?.label ??
      "Sections";

  const list = (onNavigate?: () => void) => (
    <ul className="space-y-1">
      {sections.map((section) => (
        <li key={section.id}>
          <NavLink
            href={`#${section.id}`}
            label={section.label}
            active={activeId === section.id}
            onNavigate={onNavigate}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <div className="lg:hidden mb-4">
        <MobileSheetNav
          title="On this page"
          triggerLabel={`Sections · ${activeLabel}`}
        >
          <nav aria-label="Page sections">{list()}</nav>
        </MobileSheetNav>
      </div>

      <aside className="hidden lg:block">
        <details className="sticky top-20 rounded-xl border border-lacuna-lavender/30 bg-lacuna-surface/90 p-2 backdrop-blur-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-lacuna-plum [&::-webkit-details-marker]:hidden">
            <span>
              <span className="lacuna-kicker block text-[10px] text-lacuna-blue/70">
                On this page
              </span>
              <span className="mt-0.5 block">{activeLabel}</span>
            </span>
            <span aria-hidden="true" className="text-xs">⌄</span>
          </summary>
          <nav
            aria-label="Page sections"
            className="mt-1 max-h-[calc(100vh-10rem)] overflow-y-auto border-t border-lacuna-lavender/20 pt-1"
          >
            {list()}
          </nav>
        </details>
      </aside>
    </>
  );
}
