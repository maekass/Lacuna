import { QRCodeSVG } from "qrcode.react";
import { Smartphone, ArrowUpRight } from "lucide-react";

const rawMobileAppUrl = (
  import.meta.env as Record<string, string | undefined>
).VITE_MOBILE_APP_URL;
// Only honor real http(s) URLs so a misconfigured env var can never produce a
// javascript:/data: href or a non-web QR target.
const mobileAppUrl =
  rawMobileAppUrl && /^https?:\/\//i.test(rawMobileAppUrl)
    ? rawMobileAppUrl
    : "";

export default function SiteFooter() {
  return (
    <footer className="mt-20 pt-8 border-t border-lacuna-lavender/40">
      <div className="flex flex-col gap-8">
        {mobileAppUrl
          ? (
            <div className="depth-card rounded-2xl border border-lacuna-lavender/30 bg-white/70 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-lacuna-plum">
                    <Smartphone className="h-4 w-4" aria-hidden="true" />
                    <h3 className="text-sm font-semibold tracking-tight">
                      Lacuna on mobile
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-lacuna-blue/80 leading-relaxed max-w-md">
                    The diligence stack in your pocket — browse deals, companies,
                    and acquirers on the go. Scan the code or open the app in your
                    browser.
                  </p>
                  <a
                    href={mobileAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-lacuna-plum hover:text-lacuna-blue transition-colors touch-target-inline"
                  >
                    Open the mobile app
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
                <div className="shrink-0 self-start sm:self-center">
                  <div className="rounded-xl bg-white p-2.5 shadow-[0_2px_10px_-4px_rgba(93,78,109,0.25)] border border-lacuna-lavender/30">
                    <QRCodeSVG
                      value={mobileAppUrl}
                      size={104}
                      bgColor="#ffffff"
                      fgColor="#5d4e6d"
                      level="M"
                      aria-label="QR code to open the Lacuna mobile app"
                    />
                  </div>
                </div>
              </div>
            </div>
          )
          : null}

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
        </div>
      </div>
    </footer>
  );
}
