"use client";

import { type ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import * as amplitude from "@amplitude/unified";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { WatchlistProvider } from "@/lib/data/WatchlistContext";

const amplitudeApiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

let didInitAmplitude = false;

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (didInitAmplitude) return;
    didInitAmplitude = true;
    if (!amplitudeApiKey) {
      console.warn("Amplitude API key missing — analytics disabled");
      return;
    }
    amplitude.initAll(amplitudeApiKey, {
      analytics: { autocapture: true },
      sessionReplay: { sampleRate: 1 },
    });
    if (pathname === "/") {
      amplitude.track("Viewed Home Page", { prompt_version: "BA400.4" }); // helps improve this setup flow — safe to remove once you've verified the event lands
    }
  }, [pathname]);

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={100}>
      <WatchlistProvider>{children}</WatchlistProvider>
    </TooltipProvider>
  );
}
