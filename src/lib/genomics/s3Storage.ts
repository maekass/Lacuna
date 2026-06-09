import { createReadStream } from 'node:fs';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getObjectStorageBackend, getS3Bucket } from './variantStoreConfig';

export interface S3Location {
  bucket: string;
  key: string;
}

/** Parse s3://bucket/key/object paths. */
export function parseS3Uri(uri: string): S3Location | null {
  const match = uri.match(/^s3:\/\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return { bucket: match[1], key: match[2] };
}

function getS3Client(): S3Client {
  const region = process.env.LACUNA_S3_REGION?.trim() || 'us-east-1';
  return new S3Client({ region });
}

/**
 * Issue a time-limited HTTPS GET URL for an s3:// object.
 * Returns null when object storage is not S3 or credentials are unavailable.
 */
export async function presignS3GetObject(
  uri: string,
  expiresInSec = 3600,
): Promise<string | null> {
  if (getObjectStorageBackend() !== 's3') return null;

  const location = parseS3Uri(uri);
  if (!location) return null;

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: location.bucket,
    Key: location.key,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSec });
}

/** Stream-upload a local file to the configured S3 bucket. */
export async function uploadFileToS3(localPath: string, key: string): Promise<string> {
  const bucket = getS3Bucket();
  if (!bucket) {
    throw new Error('LACUNA_S3_BUCKET required for S3 upload');
  }

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: createReadStream(localPath),
    }),
  );

  return `s3://${bucket}/${key}`;
}
