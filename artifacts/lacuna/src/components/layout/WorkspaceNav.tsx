"use client";

import { Link, useLocation } from "wouter";
import { WORKSPACES } from "@/lib/navigation/workspaces";

export default function WorkspaceNav() {
  const [pathname] = useLocation();

  return (
    <nav
      className="hide-scrollbar flex flex-nowrap items-center gap-1 overflow-x-auto sm:flex-wrap sm:gap-1.5 sm:overflow-x-visible"
      aria-label="Workspaces"
    >
      <Link
        href="/"
        className={`touch-target-inline rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
          pathname === "/"
            ? "bg-lacuna-plum text-white shadow-sm"
            : "text-lacuna-blue/80 hover:bg-lacuna-pink/20 hover:text-lacuna-plum"
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
            className={`touch-target-inline rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
              active
                ? "bg-lacuna-plum text-white shadow-sm"
                : "text-lacuna-blue/80 hover:bg-lacuna-pink/20 hover:text-lacuna-plum"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {ws.label}
          </Link>
        );
      })}
      <a
        href="https://github.com/maekass/Lacuna"
        target="_blank"
        rel="noopener noreferrer"
        className="touch-target-inline ml-2 rounded-full border border-lacuna-lavender/50 px-3 py-1.5 text-xs font-medium text-lacuna-plum/70 transition-all hover:border-lacuna-plum/40 hover:bg-lacuna-pink/10 hover:text-lacuna-plum"
      >
        GitHub
      </a>
    </nav>
  );
}
