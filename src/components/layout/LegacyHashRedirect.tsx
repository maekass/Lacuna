"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { LEGACY_HASH_REDIRECTS } from "@/lib/navigation/workspaces";

/**
 * Redirects old monolith hash bookmarks from `/` to workspace routes.
 */
export default function LegacyHashRedirect() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const target = LEGACY_HASH_REDIRECTS[hash];
    if (target && target !== `/#${hash}`) {
      window.location.replace(target);
    }
  }, [pathname]);

  return null;
}
