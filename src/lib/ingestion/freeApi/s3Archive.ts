import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import process from "node:process";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import type { FreeApiDownloadManifest, FreeApiEntityRecord } from "./types";

export interface FreeApiS3ArchiveConfig {
  bucket: string;
  region: string;
}

export interface FreeApiS3ArchiveReceipt {
  uri: string;
  sha256: string;
  bytes: number;
  versionId: string | null;
  status: "created" | "already_present";
}

/** Read configuration only when the CLI explicitly requests an AWS archive. */
export function getFreeApiS3ArchiveConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): FreeApiS3ArchiveConfig {
  const bucket = env.LACUNA_EVIDENCE_S3_BUCKET?.trim();
  if (!bucket) {
    throw new Error("--archive-s3 requires LACUNA_EVIDENCE_S3_BUCKET");
  }
  return { bucket, region: env.AWS_REGION?.trim() || "us-east-1" };
}

/**
 * Archive one public-API enrichment bundle, preserving source results and errors.
 * A hash-addressed key and conditional write prevent this uploader overwriting
 * a prior snapshot. This does not promote data or verify source truth.
 */
export async function archiveFreeApiBundleToS3(
  bundle: {
    manifest: FreeApiDownloadManifest;
    records: FreeApiEntityRecord[];
  },
  config: FreeApiS3ArchiveConfig,
): Promise<FreeApiS3ArchiveReceipt> {
  if (!config.bucket.trim()) {
    throw new Error("LACUNA_EVIDENCE_S3_BUCKET is required for S3 archiving");
  }
  if (bundle.manifest.entityCount !== bundle.records.length) {
    throw new Error("Archive manifest entity count does not match records");
  }

  const body = Buffer.from(
    JSON.stringify({
      schemaVersion: 1,
      classification: "public_api_enrichment_not_verified_ma",
      manifest: bundle.manifest,
      records: bundle.records,
    }) + "\n",
    "utf8",
  );
  const digest = createHash("sha256").update(body).digest();
  const sha256 = digest.toString("hex");
  const key = `lacuna-evidence/free-apis/sha256/${sha256}.json`;
  const client = new S3Client({ region: config.region, maxAttempts: 3 });
  const receipt = {
    uri: `s3://${config.bucket}/${key}`,
    sha256,
    bytes: body.byteLength,
  };

  try {
    try {
      const result = await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: "application/json",
          ChecksumSHA256: digest.toString("base64"),
          ServerSideEncryption: "AES256",
          IfNoneMatch: "*",
          Metadata: { sha256, classification: "public-api-enrichment" },
        }),
        { abortSignal: AbortSignal.timeout(30_000) },
      );
      return {
        ...receipt,
        versionId: result.VersionId ?? null,
        status: "created",
      };
    } catch (error: unknown) {
      if (
        !(error instanceof S3ServiceException) ||
        error.$metadata.httpStatusCode !== 412
      ) {
        throw error;
      }
    }

    // A pre-existing key is success only after checking the stored bytes.
    const existing = await client.send(
      new GetObjectCommand({ Bucket: config.bucket, Key: key }),
      { abortSignal: AbortSignal.timeout(30_000) },
    );
    const bytes = await existing.Body?.transformToByteArray();
    if (
      !bytes || createHash("sha256").update(bytes).digest("hex") !== sha256
    ) {
      throw new Error(
        "Existing S3 evidence snapshot failed SHA-256 verification",
      );
    }
    return {
      ...receipt,
      versionId: existing.VersionId ?? null,
      status: "already_present",
    };
  } finally {
    client.destroy();
  }
}
