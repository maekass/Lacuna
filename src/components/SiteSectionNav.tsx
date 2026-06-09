"use client";

const SECTION_LINKS = [
  { href: "#data-coverage", label: "Coverage" },
  { href: "#network", label: "Network" },
  { href: "#matrix", label: "Matrix" },
  { href: "#clinical-trials", label: "Trials" },
  { href: "#evidence-maturity", label: "Evidence" },
  { href: "#variant-callsets", label: "Genetics" },
  { href: "#health-equity", label: "Markers" },
  { href: "#impact-assessment", label: "Impact" },
  { href: "#network-analysis", label: "Analysis" },
  { href: "#causal-engine", label: "Causal" },
  { href: "#export", label: "Export" },
  { href: "#reimbursement-intelligence", label: "Reimbursement" },
  { href: "#acquirer-prediction", label: "Acquirers" },
] as const;

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="whitespace-nowrap hover:text-lacuna-plum transition-colors shrink-0"
    >
      {label}
    </a>
  );
}

export default function SiteSectionNav() {
  return (
    <>
      <nav
        className="hidden lg:flex items-center gap-5 text-sm text-lacuna-blue"
        aria-label="Page sections"
      >
        {SECTION_LINKS.map((link) => <NavLink key={link.href} {...link} />)}
        <a
          href="https://github.com/maekass/Lacuna"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 bg-lacuna-lavender/25 hover:bg-lacuna-lavender/40 rounded-full text-xs font-medium text-lacuna-plum transition-colors"
        >
          GitHub
        </a>
      </nav>

      <nav
        className="lg:hidden flex gap-3 overflow-x-auto hide-scrollbar pb-1 -mb-1 text-sm text-lacuna-blue"
        aria-label="Page sections (mobile)"
      >
        {SECTION_LINKS.map((link) => <NavLink key={link.href} {...link} />)}
      </nav>
    </>
  );
}
