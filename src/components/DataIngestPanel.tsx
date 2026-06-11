"use client";

import { useEffect, useState } from "react";
interface SecIngestStatus {
  ok: boolean;
  latest?: {
    id: number;
    status: string;
    started_at: string;
    finished_at: string | null;
    scanned_tickers: number | null;
    parsed_filings: number | null;
    error_message: string | null;
  } | null;
  error?: string;
  cli?: string;
}

interface FreeApiStatus {
  ok: boolean;
  latest?: {
    directory: string;
    downloadedAt: string;
    entityCount: number;
    entityFileCount: number;
    sourcesRequested: string[];
    secUserAgentConfigured: boolean;
    patentsViewConfigured: boolean;
  } | null;
  message?: string;
  cli?: string;
}

function CommandBlock({ command }: { command: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg bg-lacuna-surface-inverse px-3 py-2 text-xs text-lacuna-text-inverse">
      {command}
    </pre>
  );
}

export default function DataIngestPanel() {
  const [sec, setSec] = useState<SecIngestStatus | null>(null);
  const [freeApi, setFreeApi] = useState<FreeApiStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [secRes, freeRes] = await Promise.all([
          fetch("/api/ingest/sec/status"),
          fetch("/api/ingest/free-apis/status"),
        ]);
        if (cancelled) return;
        setSec(await secRes.json() as SecIngestStatus);
        setFreeApi(await freeRes.json() as FreeApiStatus);
      } catch {
        if (!cancelled) {
          setSec({ ok: false, error: "Failed to load SEC ingest status" });
          setFreeApi({ ok: false, message: "Failed to load free-API status" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-xl border border-lacuna-lavender/40 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-lacuna-plum">Data pipelines</h3>
      <p className="mt-1 text-sm text-lacuna-blue">
        SEC EDGAR ingest (cron + Postgres) and free public API batch exports —
        linked to this repo, not third-party MCP plugins.
      </p>

      {loading
        ? (
          <p className="mt-4 text-sm text-lacuna-blue/70" aria-live="polite">
            Loading pipeline status…
          </p>
        )
        : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border border-lacuna-lavender/30 p-4">
              <h4 className="text-sm font-semibold text-lacuna-plum">
                SEC EDGAR ingest
              </h4>
              <p className="mt-1 text-xs text-lacuna-blue">
                Daily 8-K Item 2.01 scan →{" "}
                <code className="text-[11px]">lacuna_deals</code> staging. See
                {" "}
                <a
                  href="https://github.com/maekass/Lacuna/blob/main/docs/SEC_INGESTION.md"
                  className="underline hover:text-lacuna-plum"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  SEC_INGESTION.md
                </a>
                .
              </p>
              {sec?.ok && sec.latest
                ? (
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-lacuna-blue/70">Status</dt>
                      <dd className="font-medium text-lacuna-plum">
                        {sec.latest.status}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-lacuna-blue/70">Tickers scanned</dt>
                      <dd className="font-medium text-lacuna-plum">
                        {sec.latest.scanned_tickers ?? "—"}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-lacuna-blue/70">Last run</dt>
                      <dd className="font-medium text-lacuna-plum">
                        {sec.latest.finished_at ?? sec.latest.started_at}
                      </dd>
                    </div>
                  </dl>
                )
                : (
                  <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                    {sec?.error ??
                      "No ingest run recorded. Configure DATABASE_URL and run the cron or CLI."}
                  </p>
                )}
              <CommandBlock command="npm run sec:ingest" />
              <p className="mt-2 text-[11px] text-lacuna-blue/60">
                API: <code>/api/ingest/sec/status</code>
              </p>
            </section>

            <section className="rounded-lg border border-lacuna-lavender/30 p-4">
              <h4 className="text-sm font-semibold text-lacuna-plum">
                Free public APIs
              </h4>
              <p className="mt-1 text-xs text-lacuna-blue">
                Batch JSON for ClinicalTrials.gov, openFDA, SEC facts, NIH,
                PubMed, Wikidata, and more. See{" "}
                <a
                  href="https://github.com/maekass/Lacuna/blob/main/docs/FREE_API_DOWNLOADS.md"
                  className="underline hover:text-lacuna-plum"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  FREE_API_DOWNLOADS.md
                </a>
                .
              </p>
              {freeApi?.latest
                ? (
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-lacuna-blue/70">Exported</dt>
                      <dd className="font-medium text-lacuna-plum">
                        {new Date(freeApi.latest.downloadedAt).toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-lacuna-blue/70">Entities</dt>
                      <dd className="font-medium text-lacuna-plum">
                        {freeApi.latest.entityFileCount}/{freeApi.latest
                          .entityCount}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-lacuna-blue/70">Folder</dt>
                      <dd className="font-mono text-[11px] text-lacuna-plum break-all">
                        {freeApi.latest.directory}
                      </dd>
                    </div>
                  </dl>
                )
                : (
                  <p className="mt-3 text-xs text-lacuna-blue/80">
                    {freeApi?.message ?? "No export on disk yet."}
                  </p>
                )}
              <CommandBlock command="npm run download:free-apis" />
              <p className="mt-2 text-[11px] text-lacuna-blue/60">
                API: <code>/api/ingest/free-apis/status</code>
              </p>
            </section>
          </div>
        )}
    </div>
  );
}
