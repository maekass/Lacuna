import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertRemotePostgresTlsEnabled,
  hostFromDatabaseUrl,
  isLocalPostgresHost,
} from "@/lib/data/pgSslPolicy";

describe("pgSslPolicy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("treats localhost, loopback, and *.local as local", () => {
    expect(isLocalPostgresHost("localhost")).toBe(true);
    expect(isLocalPostgresHost("127.0.0.1")).toBe(true);
    expect(isLocalPostgresHost("::1")).toBe(true);
    expect(isLocalPostgresHost("postgres.local")).toBe(true);
    expect(isLocalPostgresHost("db.example.com")).toBe(false);
  });

  it("parses postgresql hosts", () => {
    expect(hostFromDatabaseUrl("postgresql://u:p@db.example.com:5432/x"))
      .toBe("db.example.com");
  });

  it("throws for PGSSLMODE=disable on a remote host", () => {
    vi.stubEnv("PGSSLMODE", "disable");
    expect(() =>
      assertRemotePostgresTlsEnabled(
        "postgresql://u:p@ep-foo.neon.tech/neondb",
      )
    ).toThrow(/ep-foo\.neon\.tech/);
  });

  it("does not throw for localhost disable", () => {
    vi.stubEnv("PGSSLMODE", "disable");
    expect(() =>
      assertRemotePostgresTlsEnabled("postgresql://u:p@localhost:5432/lacuna")
    ).not.toThrow();
  });
});
