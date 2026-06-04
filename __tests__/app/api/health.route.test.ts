import { describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('health API', () => {
  it('returns 200 with dataset counts in static mode (success)', async () => {
    vi.stubEnv('LACUNA_DATA_MODE', 'static');
    vi.stubEnv('DATABASE_URL', '');

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.service).toBe('lacuna');
    expect(body.dataMode).toBe('static');
    expect(body.checks.dataset.companies).toBeGreaterThan(0);
    expect(body.checks.dataset.acquisitions).toBeGreaterThan(0);
    expect(body.checks.database.configured).toBe(false);
  });
});
