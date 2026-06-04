import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/ai/insights', () => ({
  isAIConfigured: vi.fn(),
  generateAcquisitionInsights: vi.fn(),
  generateEvidenceSummary: vi.fn(),
  generateReimbursementInsights: vi.fn(),
}));

describe('ai insights API', () => {
  beforeEach(async () => {
    const insights = await import('@/lib/ai/insights');
    vi.mocked(insights.isAIConfigured).mockReset();
    vi.mocked(insights.generateAcquisitionInsights).mockReset();
    vi.mocked(insights.generateEvidenceSummary).mockReset();
    vi.mocked(insights.generateReimbursementInsights).mockReset();
  });

  it('GET reports configured status', async () => {
    const { isAIConfigured } = await import('@/lib/ai/insights');
    vi.mocked(isAIConfigured).mockReturnValue(true);

    const { GET } = await import('@/app/api/ai/insights/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ configured: true });
  });

  it('POST returns 503 when AI is not configured', async () => {
    const { isAIConfigured } = await import('@/lib/ai/insights');
    vi.mocked(isAIConfigured).mockReturnValue(false);

    const { POST } = await import('@/app/api/ai/insights/route');
    const response = await POST(
      new Request('http://localhost/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'acquisition',
          companyName: 'Acme',
          sector: 'Fertility',
          analysis: {
            topAcquirer: 'BuyerCo',
            matchScore: 80,
            estimatedValue: 100,
            competitiveThreat: 'medium',
          },
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain('not configured');
  });

  it('POST generates acquisition insights', async () => {
    const insights = await import('@/lib/ai/insights');
    vi.mocked(insights.isAIConfigured).mockReturnValue(true);
    vi.mocked(insights.generateAcquisitionInsights).mockResolvedValue('Strategic fit summary.');

    const { POST } = await import('@/app/api/ai/insights/route');
    const response = await POST(
      new Request('http://localhost/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'acquisition',
          companyName: 'Acme',
          sector: 'Fertility',
          evidenceScore: 72,
          analysis: {
            topAcquirer: 'BuyerCo',
            matchScore: 80,
            estimatedValue: 100,
            competitiveThreat: 'medium',
          },
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.content).toBe('Strategic fit summary.');
    expect(insights.generateAcquisitionInsights).toHaveBeenCalledWith(
      'Acme',
      'Fertility',
      'BuyerCo',
      80,
      100,
      'medium',
      72,
    );
  });

  it('POST validates required fields', async () => {
    const { isAIConfigured } = await import('@/lib/ai/insights');
    vi.mocked(isAIConfigured).mockReturnValue(true);

    const { POST } = await import('@/app/api/ai/insights/route');
    const response = await POST(
      new Request('http://localhost/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'acquisition' }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
