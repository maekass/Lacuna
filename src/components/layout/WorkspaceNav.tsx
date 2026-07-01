"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { WORKSPACES } from "@/lib/navigation/workspaces";

export default function WorkspaceNav() {
  const t = useTranslations("nav");
  const tw = useTranslations("workspaces");
  const pathname = usePathname();
  // pathname from next-intl usePathname is locale-stripped (e.g. "/deals")
  const isHub = pathname === "/";

  return (
    <nav
      className="hide-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto sm:flex-wrap sm:gap-3 sm:overflow-x-visible"
      aria-label={t("workspaces")}
    >
      <Link
        href="/"
        className={`touch-target-inline rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
          isHub
            ? "bg-lacuna-lavender/30 text-lacuna-plum"
            : "text-lacuna-blue hover:bg-lacuna-pink/15 hover:text-lacuna-plum"
        }`}
        aria-current={isHub ? "page" : undefined}
      >
        {t("hub")}
      </Link>
      {WORKSPACES.map((ws) => {
        const active = pathname === ws.href ||
          pathname.startsWith(`${ws.href}/`);
        return (
          <Link
            key={ws.slug}
            href={ws.href}
            className={`touch-target-inline rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-lacuna-lavender/30 text-lacuna-plum"
                : "text-lacuna-blue hover:bg-lacuna-pink/15 hover:text-lacuna-plum"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {tw(`${ws.slug}.label`)}
            {ws.slug === "payer-ops" ? (
              <span
                className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                aria-hidden="true"
              />
            ) : null}
          </Link>
        );
      })}
      <a
        href="https://github.com/maekass/Lacuna"
        target="_blank"
        rel="noopener noreferrer"
        className="touch-target-inline ml-auto rounded-full bg-lacuna-lavender/25 px-3 py-1.5 text-xs font-medium text-lacuna-plum transition-colors hover:bg-lacuna-lavender/40"
      >
        {t("github")}
      </a>
    </nav>
  );
}
