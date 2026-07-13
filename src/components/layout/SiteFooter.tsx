import H20SignatoryNote from "@/components/H20SignatoryNote";

export default function SiteFooter() {
  return (
    <footer className="mt-20 pt-8 border-t border-lacuna-lavender/40">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 lacuna-gradient rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">L</span>
            </div>
            <span className="text-sm font-medium text-lacuna-plum">Lacuna</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-lacuna-blue">
            <a
              href="https://github.com/maekass/Lacuna"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-lacuna-plum transition-colors touch-target-inline"
            >
              GitHub
            </a>
            <a
              href="https://github.com/maekass/Lacuna/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-lacuna-plum transition-colors touch-target-inline"
            >
              License (BUSL 1.1)
            </a>
            <a
              href="https://github.com/maekass/Lacuna/tree/main/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-lacuna-plum transition-colors touch-target-inline"
            >
              Methodology
            </a>
          </div>
        </div>

        <div className="text-[11px] text-lacuna-blue/60 text-center leading-relaxed max-w-3xl mx-auto">
          <p>
            © 2026 Lacuna · Made with care for women&apos;s health research ·
            BUSL 1.1 · Open source
          </p>
          <p className="mt-1">
            Verified data from SEC EDGAR, company disclosures, and
            ClinicalTrials.gov. An open investment-research prototype for
            women&apos;s health M&amp;A — not investment advice and not a
            substitute for paid deal-intelligence products.
          </p>
          <p className="mt-1">
            <H20SignatoryNote />
          </p>
        </div>
      </div>
    </footer>
  );
}
