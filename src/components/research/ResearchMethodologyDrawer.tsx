"use client";

import type { ReactNode } from "react";
import { useState } from "react";

export function ResearchMethodologyDrawer({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-lacuna-lavender/40 bg-white px-3 py-1.5 text-xs font-medium text-lacuna-plum hover:bg-lacuna-lavender/10"
        aria-expanded={open}
      >
        <span
          className="flex h-4 w-4 items-center justify-center rounded-full border border-lacuna-lavender/60 text-[10px]"
          aria-hidden
        >
          ?
        </span>
        {title}
      </button>
      {open
        ? (
          <div className="mt-2 rounded-lg border border-lacuna-lavender/30 bg-lacuna-surface-muted/50 px-4 py-3 text-xs leading-relaxed text-lacuna-blue">
            {children}
          </div>
        )
        : null}
    </div>
  );
}
