export type VariantStoreMode = 'off' | 'clickhouse';

export type ObjectStorageBackend = 'local' | 's3';

/** Whether the variant store is enabled (ClickHouse + object storage URI resolution). */
export function getVariantStoreMode(): VariantStoreMode {
  const raw = process.env.LACUNA_VARIANT_STORE?.trim().toLowerCase();
  return raw === 'clickhouse' ? 'clickhouse' : 'off';
}

export function isVariantStoreEnabled(): boolean {
  return getVariantStoreMode() === 'clickhouse' && Boolean(process.env.CLICKHOUSE_URL?.trim());
}

export function getObjectStorageBackend(): ObjectStorageBackend {
  const raw = process.env.LACUNA_OBJECT_STORAGE?.trim().toLowerCase();
  return raw === 's3' ? 's3' : 'local';
}

export function getClickHouseUrl(): string | undefined {
  return process.env.CLICKHOUSE_URL?.trim() || undefined;
}

export function getClickHouseDatabase(): string {
  return process.env.CLICKHOUSE_DATABASE?.trim() || 'lacuna';
}

export function getLocalObjectStorageRoot(): string {
  return process.env.LACUNA_OBJECT_STORAGE_LOCAL_ROOT?.trim() || 'data/variants';
}

export function getS3Bucket(): string | undefined {
  return process.env.LACUNA_S3_BUCKET?.trim() || undefined;
}
