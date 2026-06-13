"use client";

import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { WatchlistProvider } from "@/lib/data/WatchlistContext";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={100}>
      <WatchlistProvider>{children}</WatchlistProvider>
    </TooltipProvider>
  );
}
