'use client';

import { useState } from 'react';

const DATA_SOURCES = [
  {
    name: 'SEC EDGAR',
    url: 'https://www.sec.gov/edgar',
    description: 'Public filings (8-K, merger proxies, 10-K)',
    license: 'U.S. Government public domain — no restrictions',
  },
  {
    name: 'ClinicalTrials.gov',
    url: 'https://clinicaltrials.gov',
    description: 'NIH clinical trial registry (API v2)',
    license: 'Public domain per 42 USC §282(j) — open access',
  },
  {
    name: 'Company press releases',
    url: null,
    description: 'Business Wire, PR Newswire, GlobeNewswire, company IR pages',
    license: 'Fair use for research, commentary, and education',
  },
  {
    name: 'Business news coverage',
    url: null,
    description: 'Reuters, Bloomberg, trade publications for deal verification',
    license: 'Fair use — factual reporting cited for verification',
  },
] as const;

const COMPLIANCE_ITEMS = [
  {
    title: 'Your privacy is respected',
    detail: 'Everything here concerns corporate entities and public filings — no personal, patient, or individual data is ever accessed or stored.',
  },
  {
    title: 'Gathered with integrity',
    detail: 'We only use official public APIs and published press releases. No scraping, no paywall workarounds, no proprietary database access.',
  },
  {
    title: 'Built for learning & research',
    detail: 'Lacuna is designed for academic research, policy analysis, and education. It\'s not investment advice or commercial intelligence — just an honest research companion.',
  },
  {
    title: 'We show our work',
    detail: 'Every model discloses its assumptions and limitations. When our sample is small, we say so. Full methodology documentation is available on GitHub.',
  },
] as const;

export default function DataProvenanceBanner() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-lacuna-lavender/30 bg-white/60 backdrop-blur-sm overflow-hidden">
      {/* Collapsed bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-lacuna-lavender/10 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM7 4.5h2v5H7v-5zm0 6h2v2H7v-2z" fill="currentColor" />
            </svg>
            Open data
          </span>
          <span className="text-xs text-lacuna-blue truncate">
            Thoughtfully sourced from SEC EDGAR, ClinicalTrials.gov, and public filings · Open-source · BUSL 1.1
          </span>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`shrink-0 text-lacuna-blue/50 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-lacuna-lavender/20 px-4 py-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Data sources */}
            <div>
              <h4 className="text-xs font-semibold text-lacuna-plum uppercase tracking-wide mb-3">
                Data provenance
              </h4>
              <div className="space-y-2">
                {DATA_SOURCES.map((src) => (
                  <div key={src.name} className="rounded-lg bg-slate-50/80 border border-slate-100 px-3 py-2">
                    <div className="flex items-center gap-2">
                      {src.url ? (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-lacuna-plum hover:underline underline-offset-2"
                        >
                          {src.name}
                        </a>
                      ) : (
                        <span className="text-xs font-medium text-lacuna-plum">{src.name}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-lacuna-blue/70 mt-0.5">{src.description}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 italic">{src.license}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance & ethics */}
            <div>
              <h4 className="text-xs font-semibold text-lacuna-plum uppercase tracking-wide mb-3">
                Ethics &amp; compliance
              </h4>
              <div className="space-y-2">
                {COMPLIANCE_ITEMS.map((item) => (
                  <div key={item.title} className="rounded-lg bg-slate-50/80 border border-slate-100 px-3 py-2">
                    <p className="text-xs font-medium text-lacuna-plum">{item.title}</p>
                    <p className="text-[11px] text-lacuna-blue/70 mt-0.5">{item.detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-lg bg-amber-50/60 border border-amber-200/50 px-3 py-2">
                <p className="text-[11px] text-amber-800">
                  <span className="font-medium">Disclaimer:</span> This platform is an open-source educational tool.
                  Nothing herein constitutes investment advice, securities analysis, or medical guidance.
                  Deal data reflects publicly announced transactions; undisclosed terms are noted.
                  Clinical trial data is retrieved in real time from ClinicalTrials.gov and may change without notice.
                </p>
              </div>
            </div>
          </div>

          {/* License reference */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-lacuna-blue/50">
            <span>Business Source License 1.1</span>
            <span>·</span>
            <a
              href="https://github.com/maekass/Lacuna/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-lacuna-plum underline underline-offset-2"
            >
              Full license text
            </a>
            <span>·</span>
            <a
              href="https://github.com/maekass/Lacuna/tree/main/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-lacuna-plum underline underline-offset-2"
            >
              Methodology documentation
            </a>
            <span>·</span>
            <a
              href="https://github.com/maekass/Lacuna/blob/main/docs/DATA_CURATION_CHECKLIST.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-lacuna-plum underline underline-offset-2"
            >
              Data curation checklist
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
