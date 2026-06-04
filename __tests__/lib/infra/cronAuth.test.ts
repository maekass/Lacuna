import { describe, expect, it, vi } from 'vitest';
import { isCronAuthorized } from '@/lib/infra/cronAuth';

describe('isCronAuthorized', () => {
  it('allows any request in non-production when CRON_SECRET is unset (success)', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('CRON_SECRET', '');
    const request = new Request('http://localhost/api/cron/sec-ingest');
    expect(isCronAuthorized(request)).toBe(true);
  });

  it('denies production when CRON_SECRET is unset (error)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('CRON_SECRET', '');
    const request = new Request('http://localhost/api/cron/sec-ingest');
    expect(isCronAuthorized(request)).toBe(false);
  });

  it('requires Bearer token in production when CRON_SECRET is set (error)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('CRON_SECRET', 'test-secret');
    const request = new Request('http://localhost/api/cron/sec-ingest');
    expect(isCronAuthorized(request)).toBe(false);
  });

  it('accepts matching Bearer token (success)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('CRON_SECRET', 'test-secret');
    const request = new Request('http://localhost/api/cron/sec-ingest', {
      headers: { authorization: 'Bearer test-secret' },
    });
    expect(isCronAuthorized(request)).toBe(true);
  });
});
