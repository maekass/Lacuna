import { query } from "./dbClient";
import {
  type AcquirerRow,
  type AcquisitionRow,
  type CompanyRow,
  mapRowsToVerifiedDataset,
  type ProvenanceRow,
} from "./mapVerifiedDataset";
import type { VerifiedDataset } from "./datasetTypes";

const PROVENANCE_SQL = `
  SELECT last_updated, purpose, disclaimer, sources, notes
  FROM dataset_provenance
  WHERE id = $1
`;

const COMPANIES_SQL = `
  SELECT
    id, name, sector, stage, founded, hq, description,
    last_known_valuation, valuation_source, total_funding, sources
  FROM companies
  ORDER BY id
`;

const ACQUIRERS_SQL = `
  SELECT id, name, ticker, sector, hq
  FROM acquirers
  ORDER BY id
`;

const ACQUISITIONS_SQL = `
  SELECT
    id, target_id, acquirer_id, target_name, acquirer_name,
    announced_date, closed_date, deal_value, deal_value_note,
    deal_type, source, strategic_rationale
  FROM acquisitions
  ORDER BY announced_date DESC, id
`;

export async function loadProvenanceRow(): Promise<ProvenanceRow> {
  const provenanceRows = await query<ProvenanceRow>(PROVENANCE_SQL, [1]);
  const provenance = provenanceRows[0];
  if (!provenance) {
    throw new Error("dataset_provenance row missing — run npm run db:import");
  }
  return provenance;
}

/** Load the full verified dataset using parameterized queries only. */
export async function loadVerifiedDatasetFromDb(): Promise<VerifiedDataset> {
  const [provenance, companies, acquirers, acquisitions] = await Promise.all([
    loadProvenanceRow(),
    query<CompanyRow>(COMPANIES_SQL),
    query<AcquirerRow>(ACQUIRERS_SQL),
    query<AcquisitionRow>(ACQUISITIONS_SQL),
  ]);

  return mapRowsToVerifiedDataset(
    provenance,
    companies,
    acquirers,
    acquisitions,
  );
}

export interface PaginatedQuery {
  limit: number;
  offset: number;
  sector?: string;
  genomics?: boolean;
}

const GENOMICS_WHERE = `
  (
    c.sector = 'Diagnostics'
    OR c.description ~* 'genomic|genome|sequenc|brca|biomarker|hereditary|carrier screening|cgp|profiling|variant|exome|oncotype'
    OR c.name ~* 'genomic|genome'
  )
`;

/** Paginated acquirer load. */
export function loadAcquirersPage(
  queryOpts: PaginatedQuery,
): Promise<AcquirerRow[]> {
  return query<AcquirerRow>(
    `
      SELECT id, name, ticker, sector, hq
      FROM acquirers
      ORDER BY id
      LIMIT $1 OFFSET $2
    `,
    [queryOpts.limit, queryOpts.offset],
  );
}

export function countAcquirers(): Promise<number> {
  return query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM acquirers`,
  ).then((rows) => Number(rows[0]?.count ?? 0));
}

/** Count companies with optional sector / genomics filters. */
export function countCompaniesPage(queryOpts: PaginatedQuery): Promise<number> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (queryOpts.sector) {
    params.push(queryOpts.sector);
    clauses.push(`c.sector = $${params.length}`);
  }
  if (queryOpts.genomics) {
    clauses.push(GENOMICS_WHERE);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM companies c ${where}`,
    params,
  ).then(
    (rows) => Number(rows[0]?.count ?? 0),
  );
}

/** Paginated company load — avoids full-table reads for large catalogs. */
export function loadCompaniesPage(
  queryOpts: PaginatedQuery,
): Promise<CompanyRow[]> {
  const params: unknown[] = [];
  const clauses: string[] = [];
  if (queryOpts.sector) {
    params.push(queryOpts.sector);
    clauses.push(`c.sector = $${params.length}`);
  }
  if (queryOpts.genomics) {
    clauses.push(GENOMICS_WHERE);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  params.push(queryOpts.limit, queryOpts.offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;
  return query<CompanyRow>(
    `
      SELECT
        c.id, c.name, c.sector, c.stage, c.founded, c.hq, c.description,
        c.last_known_valuation, c.valuation_source, c.total_funding, c.sources
      FROM companies c
      ${where}
      ORDER BY c.id
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `,
    params,
  );
}

/** Paginated acquisitions — optional sector / genomics filter via target company join. */
export function loadAcquisitionsPage(
  queryOpts: PaginatedQuery,
): Promise<AcquisitionRow[]> {
  const params: unknown[] = [];
  const clauses: string[] = [];
  if (queryOpts.sector) {
    params.push(queryOpts.sector);
    clauses.push(`c.sector = $${params.length}`);
  }
  if (queryOpts.genomics) {
    clauses.push(GENOMICS_WHERE);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  params.push(queryOpts.limit, queryOpts.offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;
  return query<AcquisitionRow>(
    `
      SELECT
        a.id, a.target_id, a.acquirer_id, a.target_name, a.acquirer_name,
        a.announced_date, a.closed_date, a.deal_value, a.deal_value_note,
        a.deal_type, a.source, a.strategic_rationale
      FROM acquisitions a
      INNER JOIN companies c ON c.id = a.target_id
      ${where}
      ORDER BY a.announced_date DESC, a.id
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `,
    params,
  );
}

export function countAcquisitionsPage(
  queryOpts: PaginatedQuery,
): Promise<number> {
  const params: unknown[] = [];
  const clauses: string[] = [];
  if (queryOpts.sector) {
    params.push(queryOpts.sector);
    clauses.push(`c.sector = $${params.length}`);
  }
  if (queryOpts.genomics) {
    clauses.push(GENOMICS_WHERE);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM acquisitions a
      INNER JOIN companies c ON c.id = a.target_id
      ${where}
    `,
    params,
  ).then((rows) => Number(rows[0]?.count ?? 0));
}

/** Filter acquisitions by company sector (parameterized). */
export function loadAcquisitionsBySector(
  sector: string,
): Promise<AcquisitionRow[]> {
  return query<AcquisitionRow>(
    `
      SELECT
        a.id, a.target_id, a.acquirer_id, a.target_name, a.acquirer_name,
        a.announced_date, a.closed_date, a.deal_value, a.deal_value_note,
        a.deal_type, a.source, a.strategic_rationale
      FROM acquisitions a
      INNER JOIN companies c ON c.id = a.target_id
      WHERE c.sector = $1
      ORDER BY a.announced_date DESC, a.id
    `,
    [sector],
  );
}
