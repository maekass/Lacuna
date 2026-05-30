import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/clinical-trials/route';

const mockFetch = vi.fn();

describe('clinical-trials API', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  describe('GET', () => {
    it('transforms ClinicalTrials.gov response (success)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          totalCount: 1,
          studies: [
            {
              protocolSection: {
                identificationModule: { nctId: 'NCT0001', briefTitle: 'Trial One' },
                statusModule: {
                  overallStatus: 'Recruiting',
                  startDateStruct: { date: '2024-01-01' },
                },
                sponsorCollaboratorsModule: { leadSponsor: { name: 'Acme Research' } },
                designModule: { phases: ['Phase 2'], enrollmentInfo: { count: 120 } },
                conditionsModule: { conditions: ['Endometriosis'] },
                armsInterventionsModule: { interventions: [{ name: 'Drug A' }] },
                contactsLocationsModule: {
                  locations: [{ facility: { name: 'Hospital', address: { city: 'Boston' } } }],
                },
              },
            },
          ],
        }),
      });

      const request = new NextRequest(
        'http://localhost/api/clinical-trials?condition=endometriosis&limit=5',
      );
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.trials[0].nctId).toBe('NCT0001');
      expect(body.total).toBe(1);
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('returns 502 when upstream API fails (error)', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503 });

      const request = new NextRequest('http://localhost/api/clinical-trials');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(502);
      expect(body.trials).toEqual([]);
      expect(body.error).toContain('unavailable');
    });

    it('defaults limit to 10 when param missing (edge)', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ studies: [] }) });

      const request = new NextRequest('http://localhost/api/clinical-trials');
      await GET(request);

      expect(mockFetch.mock.calls[0][0]).toContain('pageSize=10');
    });
  });

  describe('POST', () => {
    it('batch-fetches trials by NCT id (success)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          protocolSection: {
            identificationModule: { briefTitle: 'Batch Trial' },
            designModule: { phases: ['Phase 1'] },
            statusModule: { overallStatus: 'Completed' },
            conditionsModule: { conditions: ['PCOS'] },
            sponsorCollaboratorsModule: { leadSponsor: { name: 'Sponsor Inc' } },
          },
        }),
      });

      const request = new NextRequest('http://localhost/api/clinical-trials', {
        method: 'POST',
        body: JSON.stringify({ nctIds: ['NCT0001', 'NCT0002'] }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.trials).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('returns 400 when nctIds is not an array (error)', async () => {
      const request = new NextRequest('http://localhost/api/clinical-trials', {
        method: 'POST',
        body: JSON.stringify({ nctIds: 'NCT0001' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('filters out failed upstream lookups (edge)', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ protocolSection: {} }) })
        .mockResolvedValueOnce({ ok: false, status: 404 });

      const request = new NextRequest('http://localhost/api/clinical-trials', {
        method: 'POST',
        body: JSON.stringify({ nctIds: ['NCT0001', 'NCT404'] }),
        headers: { 'Content-Type': 'application/json' },
      });
      const body = await (await POST(request)).json();
      expect(body.trials).toHaveLength(1);
    });
  });
});
