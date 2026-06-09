import { type ClickHouseClient, createClient } from "@clickhouse/client";
import {
  getClickHouseDatabase,
  getClickHouseUrl,
  isVariantStoreEnabled,
} from "./variantStoreConfig";

let client: ClickHouseClient | null = null;

/** Lazy singleton ClickHouse client — only when variant store is enabled. */
export function getClickHouseClient(): ClickHouseClient {
  if (!isVariantStoreEnabled()) {
    throw new Error(
      "Variant store is disabled — set LACUNA_VARIANT_STORE=clickhouse and CLICKHOUSE_URL",
    );
  }

  if (!client) {
    const url = getClickHouseUrl();
    if (!url) {
      throw new Error(
        "CLICKHOUSE_URL is required when LACUNA_VARIANT_STORE=clickhouse",
      );
    }
    client = createClient({
      url,
      database: getClickHouseDatabase(),
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 1,
      },
    });
  }

  return client;
}

/** Ping ClickHouse for readiness checks. */
export async function pingClickHouse(): Promise<
  { ok: boolean; latencyMs: number; error?: string }
> {
  if (!isVariantStoreEnabled()) {
    return { ok: true, latencyMs: 0 };
  }

  const started = Date.now();
  try {
    const ch = getClickHouseClient();
    await ch.query({ query: "SELECT 1 AS ok", format: "JSONEachRow" });
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "clickhouse ping failed";
    return { ok: false, latencyMs: Date.now() - started, error: message };
  }
}
