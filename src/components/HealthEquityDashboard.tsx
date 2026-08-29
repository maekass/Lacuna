"use client";

import { useMemo, useState } from "react";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import PatientEmpowermentInsight from "@/components/PatientEmpowermentInsight";
import HeuristicTierBadge from "@/components/research/HeuristicTierBadge";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import type { PatientEmpowermentInsightData } from "@/lib/research/patientEmpowermentInsightTypes";
import { EPIDEMIOLOGY_DATABASE } from "@/lib/impact/oaisCalculator";
import {
  HEALTH_EQUITY_FOCUS_AREAS,
  type HealthEquityDataTier,
  type HealthEquityFocusArea,
} from "@/lib/impact/healthEquityFocusAreas";

const tierLabels: Record<HealthEquityDataTier, string> = {
  cited_epidemiology: "Cited epidemiology (static)",
  illustrative_static: "Illustrative context only",
};

interface VerifiedCompanyOverlap {
  id: string;
  name: string;
  sector: string;
  stage: string;
  description?: string;
  sources: readonly string[];
  deal?: {
    id: string;
    acquirerName: string;
    announcedDate: string;
    dealValueNote?: string;
  };
}

interface FocusAreaView extends HealthEquityFocusArea {
  verifiedCompanies: VerifiedCompanyOverlap[];
  addressablePopulation?: string;
}

function formatPopulation(condition: string): string | undefined {
  const row = EPIDEMIOLOGY_DATABASE.find((e) => e.condition === condition);
  if (!row) return undefined;
  const { pointEstimate, lowerBound, upperBound } = row.addressablePopulation;
  return `${pointEstimate}M US women (${lowerBound}–${upperBound}M, ${row.year})`;
}

function downloadOverlapCsv(areas: FocusAreaView[]) {
  const header =
    "focus_area,data_tier,disparity_label,source,company_id,company_name,sector,stage,deal_acquirer,deal_date";
  const rows = [header];
  for (const area of areas) {
    if (area.verifiedCompanies.length === 0) {
      rows.push(
        [
          csvEscape(area.title),
          tierLabels[area.dataTier],
          csvEscape(area.disparityLabel),
          csvEscape(area.source),
          "",
          "",
          "",
          "",
          "",
          "",
        ].join(","),
      );
      continue;
    }
    for (const c of area.verifiedCompanies) {
      rows.push(
        [
          csvEscape(area.title),
          tierLabels[area.dataTier],
          csvEscape(area.disparityLabel),
          csvEscape(area.source),
          c.id,
          csvEscape(c.name),
          csvEscape(c.sector),
          csvEscape(c.stage),
          csvEscape(c.deal?.acquirerName ?? ""),
          c.deal?.announcedDate ?? "",
        ].join(","),
      );
    }
  }
  const blob = new Blob([`${rows.join("\n")}\n`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "health-equity-portfolio-overlap.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function CompanyOverlapRow({
  company,
  highlighted,
}: {
  company: VerifiedCompanyOverlap;
  highlighted: boolean;
}) {
  return (
    <li
      className={`rounded-md border px-3 py-2 text-sm ${
        highlighted
          ? "border-lacuna-plum/40 bg-lacuna-pink/10"
          : "border-lacuna-border-subtle bg-lacuna-surface-muted/50"
      }`}
    >
      <details>
        <summary className="cursor-pointer font-medium text-lacuna-text-primary list-none flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{company.name}</span>
          <span className="text-lacuna-text-muted font-normal text-xs">
            {company.sector} · {company.stage}
          </span>
        </summary>
        <div className="mt-2 space-y-2 text-xs text-lacuna-text-secondary">
          <p>{company.description}</p>
          {company.deal
            ? (
              <p>
                Verified deal: acquired by {company.deal.acquirerName}{" "}
                ({company.deal.announcedDate})
                {company.deal.dealValueNote
                  ? ` — ${company.deal.dealValueNote}`
                  : ""}
              </p>
            )
            : (
              <p className="text-lacuna-text-muted">
                No verified acquisition row for this company.
              </p>
            )}
          <div>
            <p className="font-medium text-lacuna-text-primary mb-1">
              Sources ({company.sources.length})
            </p>
            <ul className="list-disc pl-4 space-y-0.5">
              {company.sources.map((source) => <li key={source}>{source}</li>)}
            </ul>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href="#network"
              className="inline-flex rounded border border-lacuna-border bg-white px-2 py-1 text-[11px] font-medium text-lacuna-text-primary hover:bg-lacuna-surface-muted"
            >
              View network graph
            </a>
            <a
              href="/api/dataset/verified"
              className="inline-flex rounded border border-lacuna-border bg-white px-2 py-1 text-[11px] font-medium text-lacuna-text-primary hover:bg-lacuna-surface-muted"
            >
              Full dataset JSON
            </a>
          </div>
        </div>
      </details>
    </li>
  );
}

function FocusAreaCard({
  area,
  active,
  highlightedCompanyId,
  empowermentInsight,
  onSelect,
}: {
  area: FocusAreaView;
  active: boolean;
  highlightedCompanyId: string;
  empowermentInsight?: PatientEmpowermentInsightData;
  onSelect: () => void;
}) {
  return (
    <article
      className={`rounded-lg border p-5 flex flex-col gap-3 transition-colors ${
        active
          ? "border-lacuna-plum/50 ring-1 ring-lacuna-plum/20 bg-white"
          : "border-lacuna-border bg-white"
      }`}
    >
      <button type="button" onClick={onSelect} className="text-left w-full">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h4 className="text-base font-semibold text-lacuna-text-primary">
            {area.title}
          </h4>
          <HeuristicTierBadge
            tier={area.dataTier}
            label={tierLabels[area.dataTier]}
          />
        </div>
      </button>

      <p className="text-sm text-lacuna-text-secondary leading-relaxed">
        {area.summary}
      </p>

      <div className="rounded-md bg-lacuna-surface-muted border border-lacuna-border-subtle px-3 py-2 text-xs">
        <p className="text-lacuna-text-muted">
          Disparity / prevalence (static)
        </p>
        <p className="font-medium text-lacuna-text-primary mt-0.5">
          {area.disparityLabel}
        </p>
        {area.addressablePopulation
          ? (
            <p className="text-lacuna-text-secondary mt-1">
              Addressable population: {area.addressablePopulation}
            </p>
          )
          : null}
        <p className="text-lacuna-text-muted mt-2">Source: {area.source}</p>
      </div>

      {area.id === "breast-cancer-genetics" && empowermentInsight
        ? (
          <PatientEmpowermentInsight
            data={empowermentInsight}
            variant="inline"
            className="mt-1"
          />
        )
        : null}

      <div className="border-t border-lacuna-border-subtle pt-3">
        <p className="text-xs font-medium text-lacuna-text-secondary mb-2">
          Verified portfolio overlap ({area.relatedSectors.join(", ")}) ·{" "}
          {area.verifiedCompanies.length}{" "}
          {area.verifiedCompanies.length === 1 ? "company" : "companies"}
        </p>
        {area.verifiedCompanies.length > 0
          ? (
            <ul className="space-y-2">
              {area.verifiedCompanies.map((c) => (
                <CompanyOverlapRow
                  key={c.id}
                  company={c}
                  highlighted={highlightedCompanyId === c.id}
                />
              ))}
            </ul>
          )
          : (
            <p className="text-sm text-lacuna-text-muted">
              No companies in the verified sample for these sectors yet — this
              is a dataset gap, not evidence of no market activity.
            </p>
          )}
      </div>
    </article>
  );
}

export default function HealthEquityDashboard({
  empowermentInsight,
}: {
  empowermentInsight?: PatientEmpowermentInsightData;
}) {
  const { verifiedCompanies, verifiedAcquisitions, dataProvenance } =
    useVerifiedDataset();
  const lastUpdated = dataProvenance.lastUpdated || "—";

  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [focusFilter, setFocusFilter] = useState<string>("all");
  const [portfolioOnly, setPortfolioOnly] = useState(false);
  const [companyQuery, setCompanyQuery] = useState("");
  const [highlightCompanyId, setHighlightCompanyId] = useState("");

  const sectorOptions = useMemo(() => {
    const sectors = new Set<string>();
    for (const area of HEALTH_EQUITY_FOCUS_AREAS) {
      for (const sector of area.relatedSectors) sectors.add(sector);
    }
    return [...sectors].sort();
  }, []);

  const companyOptions = useMemo(
    () =>
      verifiedCompanies
        .filter((c) => sectorOptions.includes(c.sector))
        .map((c) => ({ id: c.id, name: c.name, sector: c.sector }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [verifiedCompanies, sectorOptions],
  );

  const focusAreas = useMemo((): FocusAreaView[] => {
    return HEALTH_EQUITY_FOCUS_AREAS.map((area) => {
      const verifiedInSectors = verifiedCompanies
        .filter((c) => area.relatedSectors.includes(c.sector))
        .map((c) => {
          const deal = verifiedAcquisitions.find((d) => d.targetId === c.id);
          return {
            id: c.id,
            name: c.name,
            sector: c.sector,
            stage: c.stage,
            description: c.description,
            sources: c.sources,
            deal: deal
              ? {
                id: deal.id,
                acquirerName: deal.acquirerName,
                announcedDate: deal.announcedDate,
                dealValueNote: deal.dealValueNote,
              }
              : undefined,
          };
        });

      return {
        ...area,
        verifiedCompanies: verifiedInSectors,
        addressablePopulation: area.epidemiologyCondition
          ? formatPopulation(area.epidemiologyCondition)
          : undefined,
      };
    });
  }, [verifiedCompanies, verifiedAcquisitions]);

  const filteredAreas = useMemo(() => {
    const query = companyQuery.trim().toLowerCase();

    return focusAreas
      .filter((area) => focusFilter === "all" || area.id === focusFilter)
      .filter((area) =>
        sectorFilter === "all" || area.relatedSectors.includes(sectorFilter)
      )
      .filter((area) => !portfolioOnly || area.verifiedCompanies.length > 0)
      .map((area) => {
        let companies = area.verifiedCompanies;
        if (sectorFilter !== "all") {
          companies = companies.filter((c) => c.sector === sectorFilter);
        }
        if (query) {
          companies = companies.filter((c) =>
            c.name.toLowerCase().includes(query)
          );
        }
        if (highlightCompanyId) {
          companies = companies.filter((c) => c.id === highlightCompanyId);
        }
        return { ...area, verifiedCompanies: companies };
      })
      .filter((area) => {
        if (query || highlightCompanyId) {
          return area.verifiedCompanies.length > 0;
        }
        if (portfolioOnly) return area.verifiedCompanies.length > 0;
        return true;
      });
  }, [
    focusAreas,
    focusFilter,
    sectorFilter,
    portfolioOnly,
    companyQuery,
    highlightCompanyId,
  ]);

  const portfolioStats = useMemo(() => {
    const sectorSet = new Set(
      HEALTH_EQUITY_FOCUS_AREAS.flatMap((a) => [...a.relatedSectors]),
    );
    const companiesInScope = verifiedCompanies.filter((c) =>
      sectorSet.has(c.sector)
    );
    const companyIds = new Set(companiesInScope.map((c) => c.id));
    const dealsInScope = verifiedAcquisitions.filter((d) =>
      companyIds.has(d.targetId)
    );
    const areasWithPortfolio = focusAreas.filter((a) =>
      a.verifiedCompanies.length > 0
    ).length;

    return {
      companiesInScope: companiesInScope.length,
      dealsInScope: dealsInScope.length,
      areasWithPortfolio,
      areaCount: focusAreas.length,
    };
  }, [verifiedCompanies, verifiedAcquisitions, focusAreas]);

  const resetFilters = () => {
    setSectorFilter("all");
    setFocusFilter("all");
    setPortfolioOnly(false);
    setCompanyQuery("");
    setHighlightCompanyId("");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-lacuna-border p-6">
      <CuratedDatasetBanner className="mb-4" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-lacuna-text-primary">
            Health equity context
          </h3>
          <p className="text-sm text-lacuna-text-muted mt-1">
            Public-health framing with cited static epidemiology, mapped to
            companies in the verified sample. Filter, expand records, or export
            the overlap table.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-lacuna-surface-subtle text-lacuna-text-primary shrink-0">
          Dataset {lastUpdated}
        </span>
      </div>

      <div className="mt-5 rounded-lg border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-lacuna-text-primary">
        <p className="font-medium text-lacuna-text-primary">
          What you can do here
        </p>
        <ul className="mt-2 space-y-1 text-xs text-lacuna-text-secondary list-disc pl-5">
          <li>
            Filter by focus area, sector, or company; expand a row for sources
            and deal provenance.
          </li>
          <li>
            Epidemiology numbers are static citations (OAIS reference list), not
            a live CDC feed.
          </li>
          <li>Dual-metric ROI scoring lives under Impact Assessment.</li>
        </ul>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <label className="flex flex-col gap-1 text-xs text-lacuna-text-secondary min-w-[10rem]">
          Focus area
          <select
            value={focusFilter}
            onChange={(e) => setFocusFilter(e.target.value)}
            className="rounded-lg border border-lacuna-border bg-white px-3 py-2 text-sm text-lacuna-text-primary"
          >
            <option value="all">All focus areas</option>
            {HEALTH_EQUITY_FOCUS_AREAS.map((area) => (
              <option key={area.id} value={area.id}>
                {area.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-lacuna-text-secondary min-w-[10rem]">
          Sector
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="rounded-lg border border-lacuna-border bg-white px-3 py-2 text-sm text-lacuna-text-primary"
          >
            <option value="all">All related sectors</option>
            {sectorOptions.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-lacuna-text-secondary min-w-[10rem] flex-1">
          Company
          <select
            value={highlightCompanyId}
            onChange={(e) => {
              setHighlightCompanyId(e.target.value);
              setCompanyQuery("");
            }}
            className="rounded-lg border border-lacuna-border bg-white px-3 py-2 text-sm text-lacuna-text-primary"
          >
            <option value="">All companies</option>
            {companyOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.sector})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-lacuna-text-secondary min-w-[10rem] flex-1">
          Search company name
          <input
            type="search"
            value={companyQuery}
            onChange={(e) => {
              setCompanyQuery(e.target.value);
              setHighlightCompanyId("");
            }}
            placeholder="e.g. Maven, Bloomi"
            className="rounded-lg border border-lacuna-border bg-white px-3 py-2 text-sm text-lacuna-text-primary"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-lacuna-text-primary pb-2">
          <input
            type="checkbox"
            checked={portfolioOnly}
            onChange={(e) => setPortfolioOnly(e.target.checked)}
            className="rounded border-lacuna-border-strong"
          />
          Only areas with sample companies
        </label>

        <div className="flex flex-wrap gap-2 pb-0.5">
          <button
            type="button"
            onClick={() => downloadOverlapCsv(filteredAreas)}
            className="inline-flex items-center justify-center rounded-lg border border-lacuna-border bg-white px-3 py-2 text-xs font-medium text-lacuna-text-primary hover:bg-lacuna-surface-muted"
          >
            Export overlap CSV
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center rounded-lg border border-lacuna-border bg-lacuna-surface-muted px-3 py-2 text-xs font-medium text-lacuna-text-secondary hover:bg-lacuna-surface-subtle"
          >
            Reset filters
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs text-lacuna-text-muted">
        Showing {filteredAreas.length} of {focusAreas.length} focus areas
        {filteredAreas.reduce((n, a) => n + a.verifiedCompanies.length, 0) > 0
          ? ` · ${
            filteredAreas.reduce((n, a) => n + a.verifiedCompanies.length, 0)
          } company rows`
          : " · no matching companies for current filters"}
      </p>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg bg-lacuna-surface-muted border border-lacuna-border p-3">
          <p className="text-2xl font-bold text-lacuna-text-primary">
            {portfolioStats.areaCount}
          </p>
          <p className="text-xs text-lacuna-text-muted mt-1">Focus areas</p>
        </div>
        <div className="rounded-lg bg-lacuna-surface-muted border border-lacuna-border p-3">
          <p className="text-2xl font-bold text-lacuna-text-primary">
            {portfolioStats.companiesInScope}
          </p>
          <p className="text-xs text-lacuna-text-muted mt-1">
            Sample cos. in related sectors
          </p>
        </div>
        <div className="rounded-lg bg-lacuna-surface-muted border border-lacuna-border p-3">
          <p className="text-2xl font-bold text-lacuna-text-primary">
            {portfolioStats.dealsInScope}
          </p>
          <p className="text-xs text-lacuna-text-muted mt-1">
            Verified deals (those targets)
          </p>
        </div>
        <div className="rounded-lg bg-lacuna-surface-muted border border-lacuna-border p-3">
          <p className="text-2xl font-bold text-lacuna-text-primary">
            {portfolioStats.areasWithPortfolio}
          </p>
          <p className="text-xs text-lacuna-text-muted mt-1">
            Areas with ≥1 sample company
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAreas.length > 0
          ? (
            filteredAreas.map((area) => (
              <FocusAreaCard
                key={area.id}
                area={area}
                active={focusFilter === area.id}
                highlightedCompanyId={highlightCompanyId}
                empowermentInsight={empowermentInsight}
                onSelect={() =>
                  setFocusFilter((
                    current,
                  ) => (current === area.id ? "all" : area.id))}
              />
            ))
          )
          : (
            <div className="md:col-span-2 rounded-lg border border-dashed border-lacuna-border p-8 text-center text-sm text-lacuna-text-muted">
              No focus areas match the current filters.{" "}
              <button
                type="button"
                onClick={resetFilters}
                className="text-lacuna-plum underline"
              >
                Reset filters
              </button>
            </div>
          )}
      </div>

      <div className="mt-6 rounded-lg border border-lacuna-border overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead className="bg-lacuna-surface-muted text-lacuna-text-muted">
            <tr>
              <th className="text-left p-2 font-medium">Focus area</th>
              <th className="text-left p-2 font-medium">Data tier</th>
              <th className="text-right p-2 font-medium">Sample cos.</th>
              <th className="text-left p-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {filteredAreas.map((area) => (
              <tr
                key={area.id}
                className="border-t border-lacuna-border-subtle hover:bg-lacuna-surface-muted/80 cursor-pointer"
                onClick={() => setFocusFilter(area.id)}
              >
                <td className="p-2 text-lacuna-text-primary">{area.title}</td>
                <td className="p-2 text-lacuna-text-secondary">
                  <HeuristicTierBadge
                    tier={area.dataTier}
                    label={tierLabels[area.dataTier]}
                  />
                </td>
                <td className="p-2 text-right text-lacuna-text-secondary">
                  {area.verifiedCompanies.length}
                </td>
                <td className="p-2 text-lacuna-text-muted max-w-xs truncate">
                  {area.source}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <p className="text-xs text-lacuna-text-muted">
          {dataProvenance.disclaimer}
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/research#patient-empowerment"
            className="inline-flex items-center justify-center rounded-lg border border-lacuna-border bg-white px-3 py-2 text-xs font-medium text-lacuna-text-primary hover:bg-lacuna-surface-muted"
          >
            Patient empowerment (HLTH 2022)
          </a>
          <a
            href="#impact-assessment"
            className="inline-flex items-center justify-center rounded-lg border border-lacuna-border bg-white px-3 py-2 text-xs font-medium text-lacuna-text-primary hover:bg-lacuna-surface-muted"
          >
            Impact Assessment (OAIS)
          </a>
          <a
            href="/api/export/deals.csv"
            className="inline-flex items-center justify-center rounded-lg border border-lacuna-border bg-white px-3 py-2 text-xs font-medium text-lacuna-text-primary hover:bg-lacuna-surface-muted"
          >
            Download deals CSV
          </a>
        </div>
      </div>
    </div>
  );
}
