import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  sampleAcquisitionRow,
  sampleAcquirerRow,
  sampleCompanyRow,
  sampleProvenanceRow,
} from '../../helpers/fixtures';

const mockQuery = vi.fn();

vi.mock('@/lib/data/dbClient', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

describe('loadVerifiedDatasetFromDb', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('loads and maps all tables (success)', async () => {
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes('dataset_provenance')) {
        expect(params).toEqual([1]);
        return Promise.resolve([sampleProvenanceRow]);
      }
      if (sql.includes('FROM companies')) return Promise.resolve([sampleCompanyRow]);
      if (sql.includes('FROM acquirers')) return Promise.resolve([sampleAcquirerRow]);
      if (sql.includes('FROM acquisitions') && !sql.includes('INNER JOIN')) {
        return Promise.resolve([sampleAcquisitionRow]);
      }
      return Promise.resolve([]);
    });

    const { loadVerifiedDatasetFromDb } = await import('@/lib/data/loadVerifiedDatasetFromDb');
    const dataset = await loadVerifiedDatasetFromDb();

    expect(dataset.companies[0].name).toBe('Modern Fertility');
    expect(mockQuery).toHaveBeenCalledTimes(4);
  });

  it('throws when provenance row is missing (error)', async () => {
    mockQuery.mockResolvedValue([]);

    const { loadVerifiedDatasetFromDb } = await import('@/lib/data/loadVerifiedDatasetFromDb');
    await expect(loadVerifiedDatasetFromDb()).rejects.toThrow('dataset_provenance row missing');
  });

  it('propagates query failures (error)', async () => {
    mockQuery.mockRejectedValue(new Error('connection timeout'));
    const { loadVerifiedDatasetFromDb } = await import('@/lib/data/loadVerifiedDatasetFromDb');
    await expect(loadVerifiedDatasetFromDb()).rejects.toThrow('connection timeout');
  });
});

describe('loadAcquisitionsBySector', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('queries with parameterized sector filter (success)', async () => {
    mockQuery.mockResolvedValue([sampleAcquisitionRow]);
    const { loadAcquisitionsBySector } = await import('@/lib/data/loadVerifiedDatasetFromDb');
    const rows = await loadAcquisitionsBySector('Fertility');

    expect(rows).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE c.sector = $1'),
      ['Fertility'],
    );
  });

  it('returns empty array when no matches (edge)', async () => {
    mockQuery.mockResolvedValue([]);
    const { loadAcquisitionsBySector } = await import('@/lib/data/loadVerifiedDatasetFromDb');
    const rows = await loadAcquisitionsBySector('Unknown');
    expect(rows).toEqual([]);
  });
});
