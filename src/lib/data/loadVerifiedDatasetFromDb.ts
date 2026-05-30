import { query } from './dbClient';
import {
  mapRowsToVerifiedDataset,
  type AcquisitionRow,
  type AcquirerRow,
  type CompanyRow,
  type ProvenanceRow,
} from './mapVerifiedDataset';
import type { VerifiedDataset } from './datasetTypes';

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

/** Load the full verified dataset using parameterized queries only. */
export async function loadVerifiedDatasetFromDb(): Promise<VerifiedDataset> {
  const [provenanceRows, companies, acquirers, acquisitions] = await Promise.all([
    query<ProvenanceRow>(PROVENANCE_SQL, [1]),
    query<CompanyRow>(COMPANIES_SQL),
    query<AcquirerRow>(ACQUIRERS_SQL),
    query<AcquisitionRow>(ACQUISITIONS_SQL),
  ]);

  const provenance = provenanceRows[0];
  if (!provenance) {
    throw new Error('dataset_provenance row missing — run npm run db:import');
  }

  return mapRowsToVerifiedDataset(provenance, companies, acquirers, acquisitions);
}

/** Filter acquisitions by company sector (parameterized). */
export async function loadAcquisitionsBySector(sector: string): Promise<AcquisitionRow[]> {
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
