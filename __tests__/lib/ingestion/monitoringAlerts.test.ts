import { describe, expect, it, vi } from 'vitest';
import {
  alertApiFailure,
  alertNewDeal,
  clearIngestEvents,
  getIngestEvents,
} from '@/lib/ingestion/monitoringAlerts';

describe('monitoringAlerts', () => {
  it('records structured api_failure events (success)', () => {
    clearIngestEvents();
    alertApiFailure('https://data.sec.gov/test', 403, 'forbidden');
    const events = getIngestEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('api_failure');
    expect(events[0].level).toBe('error');
    expect(events[0].context?.status).toBe(403);
  });

  it('records new_deal alert with context (success)', () => {
    clearIngestEvents();
    alertNewDeal({
      dealId: 'sec-1',
      targetName: 'TargetCo',
      confidence: 'high',
      filingUrl: 'https://sec.gov/filing',
    });
    const events = getIngestEvents();
    expect(events[0].type).toBe('new_deal');
    expect(events[0].context?.dealId).toBe('sec-1');
  });
});

describe('sec ingest cron route', () => {
  it('returns 401 without CRON_SECRET in production (error)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CRON_SECRET', 'test-secret');
    vi.stubEnv('SEC_EDGAR_USER_AGENT', 'Lacuna test@example.com');

    const { GET } = await import('@/app/api/cron/sec-ingest/route');
    const response = await GET(new Request('http://localhost/api/cron/sec-ingest'));
    expect(response.status).toBe(401);
  });
});
