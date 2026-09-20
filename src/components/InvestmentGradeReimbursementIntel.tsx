"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { buildSectorDealIntel, sectorKey } from "@/lib/data/sectorDealIntel";

/**
 * Verified competitive context only — no invented TAM, payer mix, or keyword risk scores.
 */
export default function InvestmentGradeReimbursementIntel() {
  const { verifiedCompanies, verifiedAcquisitions } = useVerifiedDataset();
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const sectors = useMemo(
    () =>
      [...new Set(verifiedCompanies.map((c) => sectorKey(c.sector)))].sort(),
    [verifiedCompanies],
  );

  const sectorRows = useMemo(
    () =>
      sectors.map((sector) =>
        buildSectorDealIntel(sector, verifiedCompanies, verifiedAcquisitions)
      ),
    [sectors, verifiedCompanies, verifiedAcquisitions],
  );

  const active = sectorRows.find((r) => r.sector === selectedSector) ??
    sectorRows[0] ??
    null;

  return (
    <div className="space-y-6">
      <CuratedDatasetBanner />
      <Card>
        <h3 className="text-lg font-semibold text-lacuna-plum">
          Verified deal context by sector
        </h3>
        <p className="mt-1 text-sm text-lacuna-blue">
          Descriptive counts from{" "}
          <code className="text-xs">dataset.verified.json</code>{" "}
          only. Deals join on target company id and sector — not name substring.
          TAM/SAM, reimbursement risk scores, and payer-mix estimates are not
          shown.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {sectors.map((sector) => (
            <button
              key={sector}
              type="button"
              onClick={() => setSelectedSector(sector)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active?.sector === sector
                  ? "bg-lacuna-plum text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {sector}
            </button>
          ))}
        </div>

        {active
          ? (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-lacuna-lavender/40 p-3">
                  <p className="text-xs uppercase text-lacuna-blue/70">
                    Companies
                  </p>
                  <p className="text-2xl font-bold text-lacuna-plum">
                    {active.companyCount}
                  </p>
                </div>
                <div className="rounded-lg border border-lacuna-lavender/40 p-3">
                  <p className="text-xs uppercase text-lacuna-blue/70">
                    Verified deals
                  </p>
                  <p className="text-2xl font-bold text-lacuna-plum">
                    {active.dealCount}
                  </p>
                </div>
                <div className="rounded-lg border border-lacuna-lavender/40 p-3">
                  <p className="text-xs uppercase text-lacuna-blue/70">
                    Disclosed values
                  </p>
                  <p className="text-2xl font-bold text-lacuna-plum">
                    {active.disclosedCount}
                  </p>
                </div>
                <div className="rounded-lg border border-lacuna-lavender/40 p-3">
                  <p className="text-xs uppercase text-lacuna-blue/70">
                    Median deal ($M)
                  </p>
                  <p className="text-2xl font-bold text-lacuna-plum">
                    {active.medianDealValueM !== null
                      ? active.medianDealValueM.toLocaleString()
                      : "—"}
                  </p>
                </div>
              </div>

              {active.sector.includes("(portfolio)")
                ? (
                  <p className="text-xs text-lacuna-blue/80">
                    Portfolio companies labeled{" "}
                    <strong>Diagnostic (portfolio)</strong>{" "}
                    (Rock Health / fund listing) stay separate from acquired
                    {" "}
                    <strong>Diagnostics</strong>{" "}
                    targets. Their deal count stays zero — they are not merged
                    into M&A diagnostics.
                  </p>
                )
                : null}

              {active.acquirers.length > 0
                ? (
                  <p className="text-sm text-lacuna-blue">
                    Active acquirers in sector: {active.acquirers.join(", ")}
                  </p>
                )
                : null}

              {active.deals.length > 0
                ? (
                  <div className="overflow-x-auto rounded-lg border border-lacuna-lavender/40">
                    <table className="min-w-full text-sm">
                      <thead className="bg-lacuna-lavender/20 text-left text-xs uppercase text-lacuna-plum/80">
                        <tr>
                          <th className="px-3 py-2">Target</th>
                          <th className="px-3 py-2">Acquirer</th>
                          <th className="px-3 py-2">Announced</th>
                          <th className="px-3 py-2">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {active.deals.map((d) => (
                          <tr
                            key={d.id}
                            className="border-t border-lacuna-lavender/30"
                          >
                            <td className="px-3 py-2">
                              <Link
                                href={`/deals/${d.id}`}
                                className="font-medium text-lacuna-plum hover:underline"
                              >
                                {d.targetName}
                              </Link>
                            </td>
                            <td className="px-3 py-2">{d.acquirerName}</td>
                            <td className="px-3 py-2">{d.announcedDate}</td>
                            <td className="px-3 py-2">
                              {typeof d.dealValue === "number"
                                ? `$${d.dealValue.toLocaleString()}M`
                                : "Undisclosed"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {active.dealCount > active.deals.length
                      ? (
                        <p className="border-t border-lacuna-lavender/30 px-3 py-2 text-xs text-lacuna-blue/80">
                          Showing {active.deals.length} of {active.dealCount}
                          {" "}
                          verified deals, newest first.
                        </p>
                      )
                      : null}
                  </div>
                )
                : (
                  <p className="rounded-lg border border-dashed border-lacuna-lavender/50 px-4 py-6 text-center text-sm text-lacuna-blue/80">
                    No verified acquisitions tagged to this sector in the
                    dataset.
                  </p>
                )}
            </div>
          )
          : null}
      </Card>
    </div>
  );
}
