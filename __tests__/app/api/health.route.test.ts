import { describe, expect, it, vi } from 'vitest';
import { GET as getLive } from '@/app/api/health/route';
import { GET as getReady } from '@/app/api/health/ready/route';

describe('health API', () => {
  it('liveness returns 200 without loading dataset (success)', async () => {
    vi.stubEnv('LACUNA_DATA_MODE', 'static');
    const response = await getLive();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.probe).toBe('live');
    expect(body.checks).toBeUndefined();
  });

  it('readiness returns dataset counts in static mode (success)', async () => {
    vi.stubEnv('LACUNA_DATA_MODE', 'static');
    vi.stubEnv('DATABASE_URL', '');

    const response = await getReady();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.probe).toBe('ready');
    expect(body.checks.dataset.companies).toBeGreaterThan(0);
    expect(body.checks.dataset.acquisitions).toBeGreaterThan(0);
    expect(body.checks.database.configured).toBe(false);
  });
});
