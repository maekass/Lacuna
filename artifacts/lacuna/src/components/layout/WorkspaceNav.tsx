"use client";

import { Link, useLocation } from "wouter";
import { WORKSPACES } from "@/lib/navigation/workspaces";

export default function WorkspaceNav() {
  const [pathname] = useLocation();

  return (
    <nav
      className="hide-scrollbar flex flex-nowrap items-center gap-5 overflow-x-auto sm:overflow-x-visible"
      aria-label="Workspaces"
    >
      <Link
        href="/"
        className={`touch-target-inline pb-0.5 text-sm transition-colors duration-150 ${
          pathname === "/"
            ? "border-b-2 border-lacuna-plum font-semibold text-lacuna-plum"
            : "text-lacuna-blue/60 hover:text-lacuna-plum"
        }`}
        aria-current={pathname === "/" ? "page" : undefined}
      >
        Hub
      </Link>
      {WORKSPACES.map((ws) => {
        const active = pathname === ws.href || pathname.startsWith(`${ws.href}/`);
        return (
          <Link
            key={ws.slug}
            href={ws.href}
            className={`touch-target-inline pb-0.5 text-sm transition-colors duration-150 ${
              active
                ? "border-b-2 border-lacuna-plum font-semibold text-lacuna-plum"
                : "text-lacuna-blue/60 hover:text-lacuna-plum"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {ws.label}
          </Link>
        );
      })}
    </nav>
  );
}
