"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WORKSPACES } from "@/lib/navigation/workspaces";

export default function WorkspaceNav() {
  const pathname = usePathname();

  return (
    <div className="relative">
      <nav
        className="hide-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto sm:flex-wrap sm:gap-3 sm:overflow-x-visible"
        aria-label="Workspaces"
      >
        <Link
          href="/"
          className={`touch-target-inline pb-0.5 text-sm transition-colors duration-150 ${
            pathname === "/"
              ? "border-b-2 border-lacuna-plum font-semibold text-lacuna-plum"
              : "text-lacuna-blue hover:text-lacuna-plum"
          }`}
          aria-current={pathname === "/" ? "page" : undefined}
        >
          Hub
        </Link>
        {WORKSPACES.map((ws) => {
          const active = pathname === ws.href ||
            pathname.startsWith(`${ws.href}/`);
          return (
            <Link
              key={ws.slug}
              href={ws.href}
              className={`touch-target-inline pb-0.5 text-sm transition-colors duration-150 ${
                active
                  ? "border-b-2 border-lacuna-plum font-semibold text-lacuna-plum"
                  : "text-lacuna-blue hover:text-lacuna-plum"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {ws.label}
              {ws.slug === "payer-ops"
                ? (
                  <span
                    className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                    aria-hidden="true"
                  />
                )
                : null}
            </Link>
          );
        })}
        <a
          href="https://github.com/maekass/Lacuna"
          target="_blank"
          rel="noopener noreferrer"
          className="touch-target-inline ml-auto rounded-full bg-lacuna-lavender/25 px-3 py-1.5 text-xs font-medium text-lacuna-plum transition-colors hover:bg-lacuna-lavender/40"
        >
          GitHub
        </a>
      </nav>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent sm:hidden"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent sm:hidden"
        aria-hidden="true"
      />
    </div>
  );
}
