import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/evidence/clinical-trials/route";

const mockFetch = vi.fn();

describe("evidence clinical-trials API", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("summarizes only reported enrollment values", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          studies: [
            {
              protocolSection: {
                identificationModule: {
                  nctId: "NCT0001",
                  briefTitle: "Reported enrollment",
                },
                designModule: { enrollmentInfo: { count: 50 } },
              },
            },
            {
              protocolSection: {
                identificationModule: {
                  nctId: "NCT0002",
                  briefTitle: "Missing enrollment",
                },
                designModule: {},
              },
            },
          ],
        }),
    });

    const request = new NextRequest(
      "http://localhost/api/evidence/clinical-trials?company=Acme",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(body.trials[1].enrollment).toBeNull();
    expect(body.totalEnrollment).toBe(50);
    expect(body.enrollmentReportedTrials).toBe(1);
  });
});
