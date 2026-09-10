import { afterEach, describe, expect, it } from "vitest";
import {
  parseDatabaseUrl,
  pingDatabase,
  redactDatabaseUrl,
  suggestFix,
} from "../../scripts/lib/databaseUrl";

describe("parseDatabaseUrl", () => {
  it("parses Neon pooled hostnames", () => {
    const meta = parseDatabaseUrl(
      "postgresql://neondb_owner:secret@ep-curly-bread-atq0kwpl-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require",
    );
    expect(meta?.isNeon).toBe(true);
    expect(meta?.isPooledNeon).toBe(true);
    expect(meta?.database).toBe("neondb");
  });

  it("redacts passwords", () => {
    const redacted = redactDatabaseUrl(
      "postgresql://user:secret@localhost:5432/lacuna",
    );
    expect(redacted).toContain("****");
    expect(redacted).not.toContain("secret");
  });
});

describe("pingDatabase TLS policy", () => {
  const previous = process.env.PGSSLMODE;

  afterEach(() => {
    if (previous === undefined) delete process.env.PGSSLMODE;
    else process.env.PGSSLMODE = previous;
  });

  it("returns a handled failure for remote PGSSLMODE=disable", async () => {
    process.env.PGSSLMODE = "disable";
    const result = await pingDatabase(
      "postgresql://u:p@ep-example.neon.tech:5432/neondb",
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/PGSSLMODE=disable/);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    const meta = parseDatabaseUrl(
      "postgresql://u:p@ep-example.neon.tech:5432/neondb",
    );
    const tips = suggestFix(result.error ?? "", meta);
    expect(tips.some((tip) => tip.includes("PGSSLMODE=disable"))).toBe(true);
  });
});

describe("suggestFix", () => {
  it("hints on ENOTFOUND", () => {
    const tips = suggestFix("getaddrinfo ENOTFOUND ep-old.neon.tech", {
      host: "ep-old.neon.tech",
      port: "5432",
      database: "neondb",
      user: "u",
      hasPassword: true,
      isLocalhost: false,
      isNeon: true,
      isPooledNeon: false,
      sslmode: "require",
    });
    expect(tips.some((t) => t.includes("Neon"))).toBe(true);
  });
});
