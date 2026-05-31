import { describe, expect, it } from 'vitest';

describe('ingestion index barrel', () => {
  it('exports pipeline, connector, and alert symbols (success)', async () => {
    const ingestion = await import('@/lib/ingestion');
    expect(typeof ingestion.runSecIngest).toBe('function');
    expect(typeof ingestion.scanItem201Acquisitions).toBe('function');
    expect(typeof ingestion.classifyDealAsync).toBe('function');
    expect(typeof ingestion.syncDealsToDatabase).toBe('function');
    expect(typeof ingestion.alertApiFailure).toBe('function');
    expect(ingestion.secEdgarMcpConnector).toBeDefined();
    expect(typeof ingestion.secEdgarMcpConnector.fetchSubmissions).toBe('function');
  });
});

describe('sec-edgar-mcp-connector alias', () => {
  it('re-exports SEC EDGAR connector API (success)', async () => {
    const mcp = await import('@/lib/ingestion/sec-edgar-mcp-connector');
    const connector = await import('@/lib/ingestion/secEdgarConnector');
    expect(typeof mcp.fetchSubmissions).toBe('function');
    expect(typeof mcp.parseItem201).toBe('function');
    expect(mcp.fetchSubmissions).toBe(connector.fetchSubmissions);
  });
});
