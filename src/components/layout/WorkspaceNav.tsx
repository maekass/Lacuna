"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WORKSPACES } from "@/lib/navigation/workspaces";

export default function WorkspaceNav() {
  const pathname = usePathname();
  const activeWorkspace = WORKSPACES.find((ws) =>
    pathname === ws.href || pathname.startsWith(`${ws.href}/`)
  );

  return (
    <div className="relative w-full lg:w-auto">
      <nav
        className="flex items-center gap-3"
        aria-label="Primary navigation"
      >
        <Link
          href="/"
          className={`touch-target-inline pb-1 text-sm transition-colors duration-150 ${
            pathname === "/"
              ? "border-b-2 border-lacuna-plum font-semibold text-lacuna-plum"
              : "text-lacuna-blue hover:text-lacuna-plum"
          }`}
          aria-current={pathname === "/" ? "page" : undefined}
        >
          Home
        </Link>

        <details className="relative group">
          <summary className="touch-target-inline flex cursor-pointer list-none items-center gap-1 rounded-full border border-lacuna-lavender/50 bg-white/70 px-3 py-1.5 text-sm font-medium text-lacuna-plum transition-colors hover:bg-lacuna-lavender/20 [&::-webkit-details-marker]:hidden">
            <span>Workspaces</span>
            {activeWorkspace
              ? <span className="text-xs text-lacuna-blue">· {activeWorkspace.label}</span>
              : null}
            <span aria-hidden="true" className="text-xs">⌄</span>
          </summary>

          <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,24rem)] rounded-2xl border border-lacuna-lavender/50 bg-white/95 p-2 shadow-xl backdrop-blur-md">
            <div className="px-3 py-2">
              <p className="lacuna-kicker text-[10px] text-lacuna-blue/70">
                Choose a research path
              </p>
              <p className="mt-1 text-xs leading-relaxed text-lacuna-blue/75">
                Each workspace answers a different question. You do not need to understand the whole system to start.
              </p>
            </div>

            <div className="grid gap-1">
              {WORKSPACES.map((ws) => {
                const active = pathname === ws.href ||
                  pathname.startsWith(`${ws.href}/`);
                return (
                  <Link
                    key={ws.slug}
                    href={ws.href}
                    className={`rounded-xl px-3 py-2.5 transition-colors ${
                      active
                        ? "bg-lacuna-lavender/25 text-lacuna-plum"
                        : "text-lacuna-blue hover:bg-lacuna-pink/10 hover:text-lacuna-plum"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium">{ws.label}</span>
                      {ws.slug === "payer-ops"
                        ? <span className="lacuna-kicker text-[9px] text-lacuna-plum">Operator</span>
                        : null}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-lacuna-blue/70">
                      {ws.description}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </details>

        <a
          href="https://github.com/maekass/Lacuna"
          target="_blank"
          rel="noopener noreferrer"
          className="touch-target-inline ml-auto rounded-full border border-lacuna-lavender/50 px-3 py-1.5 text-xs font-medium text-lacuna-plum transition-colors hover:bg-lacuna-lavender/20"
        >
          GitHub
        </a>
      </nav>
    </div>
  );
}
