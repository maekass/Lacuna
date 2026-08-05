import { QRCodeSVG } from "qrcode.react";
import H20SignatoryNote from "@/components/H20SignatoryNote";

const DEFAULT_MOBILE_APP_URL = "https://lacuna-maekass.vercel.app";

function getMobileAppUrl(): string | null {
  const configuredUrl = process.env.NEXT_PUBLIC_MOBILE_APP_URL;
  const candidate = configuredUrl === undefined
    ? DEFAULT_MOBILE_APP_URL
    : configuredUrl;

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export default function SiteFooter() {
  const mobileAppUrl = getMobileAppUrl();

  return (
    <footer className="mt-20 pt-8 border-t border-lacuna-lavender/40">
      <div className="flex flex-col gap-8">
        {mobileAppUrl
          ? (
            <div className="rounded-2xl border border-lacuna-lavender/30 bg-white/70 p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
                <div className="flex-1">
                  <h2 className="text-sm font-semibold tracking-tight text-lacuna-plum">
                    Open Lacuna on your phone
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-lacuna-blue/80">
                    Scan the code or open the link to browse the diligence stack
                    wherever you are.
                  </p>
                  <a
                    href={mobileAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-lacuna-plum transition-colors hover:text-lacuna-blue touch-target-inline"
                  >
                    Open Lacuna
                  </a>
                </div>
                <div className="shrink-0 self-start rounded-xl border border-lacuna-lavender/30 bg-white p-2.5 shadow-[0_2px_10px_-4px_rgba(93,78,109,0.25)] sm:self-center">
                  <QRCodeSVG
                    value={mobileAppUrl}
                    size={112}
                    bgColor="#ffffff"
                    fgColor="#5d4e6d"
                    level="M"
                    role="img"
                    aria-label="QR code to open Lacuna on your phone"
                  />
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
          <p className="mt-1">
            <H20SignatoryNote />
          </p>
        </div>
      </div>
    </footer>
  );
}
