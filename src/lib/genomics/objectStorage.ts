import { join } from 'node:path';
import {
  getLocalObjectStorageRoot,
  getObjectStorageBackend,
  getS3Bucket,
} from './variantStoreConfig';

export interface ResolvedObjectRef {
  backend: 'local' | 's3';
  uri: string;
  /** Browser-safe or CLI path hint for operators (not a public download URL on Vercel). */
  accessHint: string;
}

/**
 * Resolve a stored object URI for operators.
 * Raw VCF blobs are never served through Next.js — use signed S3 URLs or local paths in dev.
 */
export function resolveObjectUri(objectUri: string): ResolvedObjectRef {
  const backend = getObjectStorageBackend();

  if (objectUri.startsWith('s3://')) {
    return {
      backend: 's3',
      uri: objectUri,
      accessHint: `aws s3 cp ${objectUri} ./`,
    };
  }

  if (objectUri.startsWith('file://')) {
    return {
      backend: 'local',
      uri: objectUri,
      accessHint: objectUri.replace('file://', ''),
    };
  }

  if (backend === 's3') {
    const bucket = getS3Bucket();
    if (!bucket) {
      throw new Error('LACUNA_S3_BUCKET required when LACUNA_OBJECT_STORAGE=s3');
    }
    const key = objectUri.replace(/^\/+/, '');
    const uri = `s3://${bucket}/${key}`;
    return {
      backend: 's3',
      uri,
      accessHint: `aws s3 cp ${uri} ./`,
    };
  }

  const root = getLocalObjectStorageRoot();
  const relative = objectUri.replace(/^\/+/, '');
  const localPath = join(root, relative);
  return {
    backend: 'local',
    uri: `file://${localPath}`,
    accessHint: localPath,
  };
}

/** Build a canonical object URI for new callset registrations. */
export function buildObjectUri(relativePath: string): string {
  const backend = getObjectStorageBackend();
  const normalized = relativePath.replace(/^\/+/, '');

  if (backend === 's3') {
    const bucket = getS3Bucket();
    if (!bucket) {
      throw new Error('LACUNA_S3_BUCKET required when LACUNA_OBJECT_STORAGE=s3');
    }
    return `s3://${bucket}/${normalized}`;
  }

  return `file://${join(getLocalObjectStorageRoot(), normalized)}`;
}
