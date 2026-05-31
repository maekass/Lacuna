import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockPoolQuery = vi.fn();
const mockClientQuery = vi.fn();
const mockConnect = vi.fn();
const mockRelease = vi.fn();
const mockEnd = vi.fn();

vi.mock('pg', () => ({
  Pool: class MockPool {
    query = mockPoolQuery;
    connect = mockConnect;
    end = mockEnd;
  },
}));

describe('dbClient', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    mockClientQuery.mockReset();
    mockConnect.mockReset();
    mockRelease.mockReset();
    mockEnd.mockReset();

    mockConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockRelease,
    });
    mockClientQuery.mockResolvedValue({ rows: [] });
    mockPoolQuery.mockResolvedValue({ rows: [{ id: 1 }] });
    mockEnd.mockResolvedValue(undefined);

    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/lacuna');
    vi.stubEnv('PGSSLMODE', 'disable');
  });

  afterEach(async () => {
    const { closePool } = await import('@/lib/data/dbClient');
    await closePool();
  });

  it('query returns rows from pool (success)', async () => {
    const { query } = await import('@/lib/data/dbClient');
    const rows = await query<{ id: number }>('SELECT 1 AS id', []);
    expect(rows).toEqual([{ id: 1 }]);
    expect(mockPoolQuery).toHaveBeenCalledWith('SELECT 1 AS id', []);
  });

  it('query passes parameterized values without string interpolation (success)', async () => {
    const { query } = await import('@/lib/data/dbClient');
    await query('SELECT * FROM companies WHERE sector = $1', ['Fertility']);
    expect(mockPoolQuery).toHaveBeenCalledWith(
      'SELECT * FROM companies WHERE sector = $1',
      ['Fertility'],
    );
  });

  it('throws when DATABASE_URL is missing (error)', async () => {
    vi.resetModules();
    vi.stubEnv('DATABASE_URL', '');
    const { query } = await import('@/lib/data/dbClient');
    await expect(query('SELECT 1')).rejects.toThrow('DATABASE_URL is required when LACUNA_DATA_MODE=db');
  });

  it('withTransaction commits on success (success)', async () => {
    const { withTransaction } = await import('@/lib/data/dbClient');
    const result = await withTransaction(async (client) => {
      await client.query('INSERT INTO companies VALUES ($1)', ['c1']);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it('withTransaction rolls back on failure (error)', async () => {
    const { withTransaction } = await import('@/lib/data/dbClient');
    await expect(
      withTransaction(() => {
        throw new Error('insert failed');
      }),
    ).rejects.toThrow('insert failed');

    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it('closePool ends the pool (success)', async () => {
    const { query, closePool } = await import('@/lib/data/dbClient');
    await query('SELECT 1');
    await closePool();
    expect(mockEnd).toHaveBeenCalled();
  });
});
