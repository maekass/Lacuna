"use client";

import { Link, useLocation } from "wouter";
import { WORKSPACES } from "@/lib/navigation/workspaces";

export default function WorkspaceNav() {
  const [pathname] = useLocation();

  return (
    <nav
      className="hide-scrollbar flex flex-nowrap items-center gap-1 overflow-x-auto sm:flex-wrap sm:gap-1 sm:overflow-x-visible"
      aria-label="Workspaces"
    >
      <Link
        href="/"
        className={`touch-target-inline rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
          pathname === "/"
            ? "bg-lacuna-plum text-white"
            : "text-lacuna-blue/70 hover:text-lacuna-plum"
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
            className={`touch-target-inline rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
              active
                ? "bg-lacuna-plum text-white"
                : "text-lacuna-blue/70 hover:text-lacuna-plum"
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
