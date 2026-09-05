import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Pool } from "pg";

interface CapturedPoolConfig {
  connectionString?: string;
  ssl?: unknown;
}

const mocks = vi.hoisted(() => ({
  lastPoolConfig: undefined as CapturedPoolConfig | undefined,
  mockPoolQuery: vi.fn(),
  mockClientQuery: vi.fn(),
  mockConnect: vi.fn(),
  mockRelease: vi.fn(),
  mockEnd: vi.fn(),
  reportWarning: vi.fn(),
}));

vi.mock("pg", () => ({
  Pool: class MockPool {
    constructor(config?: CapturedPoolConfig) {
      mocks.lastPoolConfig = config;
    }
    query = mocks.mockPoolQuery;
    connect = mocks.mockConnect;
    end = mocks.mockEnd;
  },
}));

vi.mock("@/lib/observability/reportError", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/observability/reportError")
  >();
  return {
    ...actual,
    reportWarning: (
      ...args: Parameters<typeof actual.reportWarning>
    ) => {
      mocks.reportWarning(...args);
      return actual.reportWarning(...args);
    },
  };
});

const SAMPLE_PEM =
  "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKH0\n-----END CERTIFICATE-----\n";

describe("dbClient", () => {
  beforeEach(() => {
    mocks.mockPoolQuery.mockReset();
    mocks.mockClientQuery.mockReset();
    mocks.mockConnect.mockReset();
    mocks.mockRelease.mockReset();
    mocks.mockEnd.mockReset();
    mocks.reportWarning.mockReset();
    mocks.lastPoolConfig = undefined;

    mocks.mockConnect.mockResolvedValue({
      query: mocks.mockClientQuery,
      release: mocks.mockRelease,
    });
    mocks.mockClientQuery.mockResolvedValue({ rows: [] });
    mocks.mockPoolQuery.mockResolvedValue({ rows: [{ id: 1 }] });
    mocks.mockEnd.mockResolvedValue(undefined);

    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/lacuna");
    vi.stubEnv("PGSSLMODE", "disable");
    vi.stubEnv("PGSSLROOTCERT", "");
    vi.stubEnv("PGSSL_ALLOW_UNVERIFIED", "");
  });

  afterEach(async () => {
    const { closePool } = await import("@/lib/data/dbClient");
    await closePool();
  });

  it("query returns rows from pool (success)", async () => {
    const { query } = await import("@/lib/data/dbClient");
    const rows = await query<{ id: number }>("SELECT 1 AS id", []);
    expect(rows).toEqual([{ id: 1 }]);
    expect(mocks.mockPoolQuery).toHaveBeenCalledWith("SELECT 1 AS id", []);
    expect(mocks.lastPoolConfig?.ssl).toBeUndefined();
  });

  it("query passes parameterized values without string interpolation (success)", async () => {
    const { query } = await import("@/lib/data/dbClient");
    await query("SELECT * FROM companies WHERE sector = $1", ["Fertility"]);
    expect(mocks.mockPoolQuery).toHaveBeenCalledWith(
      "SELECT * FROM companies WHERE sector = $1",
      ["Fertility"],
    );
  });

  it("throws when DATABASE_URL is missing (error)", async () => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "");
    const { query } = await import("@/lib/data/dbClient");
    await expect(query("SELECT 1")).rejects.toThrow(
      "DATABASE_URL is required when LACUNA_DATA_MODE=db",
    );
  });

  it("withTransaction commits on success (success)", async () => {
    const { withTransaction } = await import("@/lib/data/dbClient");
    const result = await withTransaction(async (client) => {
      await client.query("INSERT INTO companies VALUES ($1)", ["c1"]);
      return "ok";
    });

    expect(result).toBe("ok");
    expect(mocks.mockClientQuery).toHaveBeenCalledWith("BEGIN");
    expect(mocks.mockClientQuery).toHaveBeenCalledWith("COMMIT");
    expect(mocks.mockRelease).toHaveBeenCalledOnce();
  });

  it("withTransaction rolls back on failure (error)", async () => {
    const { withTransaction } = await import("@/lib/data/dbClient");
    await expect(
      withTransaction(() => {
        throw new Error("insert failed");
      }),
    ).rejects.toThrow("insert failed");

    expect(mocks.mockClientQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.mockRelease).toHaveBeenCalledOnce();
  });

  it("withTransaction surfaces the original error when rollback fails (edge)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );
    mocks.mockClientQuery.mockImplementation((sql: string) => {
      if (sql === "ROLLBACK") throw new Error("connection terminated");
      return Promise.resolve({ rows: [] });
    });

    const { withTransaction } = await import("@/lib/data/dbClient");
    await expect(
      withTransaction(() => {
        throw new Error("insert failed");
      }),
    ).rejects.toThrow("insert failed");

    expect(consoleError).toHaveBeenCalled();
    expect(mocks.mockRelease).toHaveBeenCalledOnce();
  });

  it("closePool ends the pool (success)", async () => {
    const { query, closePool } = await import("@/lib/data/dbClient");
    await query("SELECT 1");
    await closePool();
    expect(mocks.mockEnd).toHaveBeenCalled();
  });

  it("setPoolForTests override is used instead of constructing a Pool (success)", async () => {
    const { query, setPoolForTests } = await import("@/lib/data/dbClient");
    const overrideQuery = vi.fn().mockResolvedValue({ rows: [{ id: 9 }] });
    const overrideEnd = vi.fn().mockResolvedValue(undefined);
    setPoolForTests({
      query: overrideQuery,
      end: overrideEnd,
    } as unknown as Pool);

    mocks.lastPoolConfig = undefined;
    const rows = await query<{ id: number }>("SELECT 9 AS id", []);

    expect(rows).toEqual([{ id: 9 }]);
    expect(overrideQuery).toHaveBeenCalledWith("SELECT 9 AS id", []);
    expect(mocks.mockPoolQuery).not.toHaveBeenCalled();
    expect(mocks.lastPoolConfig).toBeUndefined();
  });

  it("throws when PGSSLMODE=disable targets a remote host", async () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://user:pass@db.example.com:5432/lacuna",
    );
    vi.stubEnv("PGSSLMODE", "disable");
    const { query, closePool } = await import("@/lib/data/dbClient");
    await closePool();
    await expect(query("SELECT 1")).rejects.toThrow(
      /PGSSLMODE=disable is not allowed for remote host db\.example\.com/,
    );
  });

  it("allows PGSSLMODE=disable on localhost", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/lacuna");
    vi.stubEnv("PGSSLMODE", "disable");
    const { query, closePool } = await import("@/lib/data/dbClient");
    await closePool();
    await expect(query("SELECT 1")).resolves.toEqual([{ id: 1 }]);
  });
});

describe("resolvePgSslConfig", () => {
  async function withPoolOverride() {
    const { query, setPoolForTests, resolvePgSslConfig } = await import(
      "@/lib/data/dbClient"
    );
    const overrideQuery = vi.fn().mockResolvedValue({ rows: [{ id: 1 }] });
    const overrideEnd = vi.fn().mockResolvedValue(undefined);
    setPoolForTests({
      query: overrideQuery,
      end: overrideEnd,
    } as unknown as Pool);
    mocks.lastPoolConfig = undefined;
    return { query, resolvePgSslConfig, overrideQuery };
  }

  beforeEach(async () => {
    mocks.reportWarning.mockReset();
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/lacuna");
    vi.stubEnv("PGSSLMODE", "require");
    vi.stubEnv("PGSSLROOTCERT", "");
    vi.stubEnv("PGSSL_ALLOW_UNVERIFIED", "");
    const { closePool } = await import("@/lib/data/dbClient");
    await closePool();
  });

  afterEach(async () => {
    const { closePool } = await import("@/lib/data/dbClient");
    await closePool();
  });

  it("defaults to verified TLS (rejectUnauthorized: true)", async () => {
    const { query, resolvePgSslConfig, overrideQuery } =
      await withPoolOverride();

    expect(resolvePgSslConfig()).toEqual({ rejectUnauthorized: true });
    const rows = await query("SELECT 1");
    expect(rows).toEqual([{ id: 1 }]);
    expect(overrideQuery).toHaveBeenCalledWith("SELECT 1", []);
    expect(mocks.lastPoolConfig).toBeUndefined();
    expect(mocks.reportWarning).not.toHaveBeenCalled();
  });

  it("loads PGSSLROOTCERT from a file path (custom CA)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pgssl-"));
    const certPath = join(dir, "ca.pem");
    writeFileSync(certPath, SAMPLE_PEM);
    vi.stubEnv("PGSSLROOTCERT", certPath);

    try {
      const { query, resolvePgSslConfig, overrideQuery } =
        await withPoolOverride();
      expect(resolvePgSslConfig()).toEqual({
        rejectUnauthorized: true,
        ca: SAMPLE_PEM,
      });
      await query("SELECT 1");
      expect(overrideQuery).toHaveBeenCalledOnce();
      expect(mocks.lastPoolConfig).toBeUndefined();
      expect(mocks.reportWarning).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("accepts inline PEM in PGSSLROOTCERT (custom CA)", async () => {
    vi.stubEnv(
      "PGSSLROOTCERT",
      SAMPLE_PEM.trim().replaceAll("\n", "\\n"),
    );
    const { query, resolvePgSslConfig } = await withPoolOverride();

    expect(resolvePgSslConfig()).toEqual({
      rejectUnauthorized: true,
      ca: SAMPLE_PEM.trim(),
    });
    await query("SELECT 1");
    expect(mocks.lastPoolConfig).toBeUndefined();
  });

  it("allows unverified TLS only when PGSSL_ALLOW_UNVERIFIED=true and warns", async () => {
    vi.stubEnv("PGSSL_ALLOW_UNVERIFIED", "true");
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { query, resolvePgSslConfig } = await withPoolOverride();
    expect(resolvePgSslConfig()).toEqual({ rejectUnauthorized: false });
    expect(mocks.reportWarning).toHaveBeenCalledWith(
      "db.ssl",
      "PGSSL_ALLOW_UNVERIFIED=true disables TLS certificate verification (MITM-able)",
    );

    await query("SELECT 1");
    expect(mocks.lastPoolConfig).toBeUndefined();
    expect(consoleWarn).toHaveBeenCalled();
  });

  it("constructs the Pool with verified ssl when no override is set", async () => {
    mocks.mockPoolQuery.mockResolvedValue({ rows: [{ id: 1 }] });
    const { query } = await import("@/lib/data/dbClient");
    await query("SELECT 1");
    expect(mocks.lastPoolConfig?.ssl).toEqual({ rejectUnauthorized: true });
  });
});
