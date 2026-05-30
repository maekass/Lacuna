import { beforeEach, describe, expect, it, vi } from 'vitest';
import { minimalVerifiedDataset } from '../../helpers/fixtures';

vi.mock('@/lib/data/datasetProvider', () => ({
  getVerifiedDataset: vi.fn(),
}));

describe('dataset verified API', () => {
  beforeEach(async () => {
    const { getVerifiedDataset } = await import('@/lib/data/datasetProvider');
    vi.mocked(getVerifiedDataset).mockReset();
    vi.mocked(getVerifiedDataset).mockResolvedValue(minimalVerifiedDataset);
  });

  it('GET returns verified dataset JSON (success)', async () => {
    const { GET } = await import('@/app/api/dataset/verified/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.companies).toHaveLength(2);
    expect(body.acquisitions[0].id).toBe('deal2');
  });

  it('GET propagates provider errors (error)', async () => {
    const { getVerifiedDataset } = await import('@/lib/data/datasetProvider');
    vi.mocked(getVerifiedDataset).mockRejectedValue(new Error('db down'));

    const { GET } = await import('@/app/api/dataset/verified/route');
    await expect(GET()).rejects.toThrow('db down');
  });
});

describe('deals.csv export API', () => {
  beforeEach(async () => {
    const { getVerifiedDataset } = await import('@/lib/data/datasetProvider');
    vi.mocked(getVerifiedDataset).mockReset();
    vi.mocked(getVerifiedDataset).mockResolvedValue(minimalVerifiedDataset);
  });

  it('GET returns CSV with escaped fields (success)', async () => {
    const { GET } = await import('@/app/api/export/deals.csv/route');
    const response = await GET();
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(csv.split('\n')[0]).toContain('announcedDate');
    expect(csv).toContain('"Modern Fertility"');
    expect(csv).toContain('225');
  });

  it('GET handles missing optional deal fields (edge)', async () => {
    const { getVerifiedDataset } = await import('@/lib/data/datasetProvider');
    vi.mocked(getVerifiedDataset).mockResolvedValue({
      ...minimalVerifiedDataset,
      acquisitions: [
        {
          ...minimalVerifiedDataset.acquisitions[0],
          closedDate: undefined,
          dealValue: undefined,
          dealValueNote: undefined,
          source: undefined,
        },
      ],
    });

    const { GET } = await import('@/app/api/export/deals.csv/route');
    const csv = await (await GET()).text();
    const dataRow = csv.split('\n')[1];
    expect(dataRow).toContain('"deal2"');
    expect(dataRow).not.toContain('undefined');
  });
});
