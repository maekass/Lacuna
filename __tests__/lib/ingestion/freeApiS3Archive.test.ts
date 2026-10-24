import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import {
  archiveFreeApiBundleToS3,
  getFreeApiS3ArchiveConfig,
} from "@/lib/ingestion/freeApi/s3Archive";
import type {
  FreeApiDownloadManifest,
  FreeApiEntityRecord,
} from "@/lib/ingestion/freeApi/types";

const { send, destroy, construct } = vi.hoisted(() => ({
  send: vi.fn(),
  destroy: vi.fn(),
  construct: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
  return {
    ...actual,
    S3Client: class {
      constructor(config: unknown) {
        construct(config);
      }
      send = send;
      destroy = destroy;
    },
  };
});

const config = { bucket: "test-evidence", region: "us-east-1" };

function bundle(): {
  manifest: FreeApiDownloadManifest;
  records: FreeApiEntityRecord[];
} {
  return {
    manifest: {
      downloadedAt: "2026-10-23T12:00:00.000Z",
      datasetPath: "src/data/dataset.verified.json",
      entityCount: 1,
      sourcesRequested: ["wikidata", "patentsview"],
      ncbiEmail: "research@example.org",
      secUserAgentConfigured: false,
      patentsViewConfigured: false,
      notes: ["Enrichment only"],
    },
    records: [{
      entityId: "c1",
      name: "Research entity",
      kind: "company",
      sources: [{
        source: "wikidata",
        ok: true,
        fetchedAt: "2026-10-23T11:59:00.000Z",
        url: "https://www.wikidata.org/w/api.php?action=wbsearchentities",
        data: { search: [] },
      }, {
        source: "patentsview",
        ok: false,
        fetchedAt: "2026-10-23T11:59:01.000Z",
        error: "PATENTSVIEW_API_KEY not set",
      }],
    }],
  };
}

function preconditionFailed(): S3ServiceException {
  return new S3ServiceException({
    name: "PreconditionFailed",
    message: "Object already exists",
    $fault: "client",
    $metadata: { httpStatusCode: 412 },
  });
}

function uploadedBody(): Buffer {
  const command = send.mock.calls[0][0] as PutObjectCommand;
  return command.input.Body as Buffer;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("S3 evidence archive configuration", () => {
  it("rejects missing configuration without creating an AWS client", () => {
    expect(() => getFreeApiS3ArchiveConfig({})).toThrow(
      "LACUNA_EVIDENCE_S3_BUCKET",
    );
    expect(construct).not.toHaveBeenCalled();
  });

  it("never substitutes the genomics bucket", () => {
    expect(() =>
      getFreeApiS3ArchiveConfig({ LACUNA_S3_BUCKET: "genomics-only" })
    ).toThrow("LACUNA_EVIDENCE_S3_BUCKET");
  });

  it("reads a dedicated bucket and standard AWS region", () => {
    expect(getFreeApiS3ArchiveConfig({
      LACUNA_EVIDENCE_S3_BUCKET: " research-evidence ",
      AWS_REGION: " eu-west-1 ",
    })).toEqual({ bucket: "research-evidence", region: "eu-west-1" });
    expect(
      getFreeApiS3ArchiveConfig({
        LACUNA_EVIDENCE_S3_BUCKET: "research-evidence",
      }).region,
    ).toBe("us-east-1");
  });
});

describe("S3 public API evidence archive", () => {
  it("preserves source provenance and failures in an encrypted, hash-addressed snapshot", async () => {
    send.mockResolvedValue({ VersionId: "version-1" });
    const source = bundle();
    const before = structuredClone(source);
    const receipt = await archiveFreeApiBundleToS3(source, config);
    const body = uploadedBody();
    const sha256 = createHash("sha256").update(body).digest("hex");
    const command = send.mock.calls[0][0] as PutObjectCommand;

    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: config.bucket,
      Key: `lacuna-evidence/free-apis/sha256/${sha256}.json`,
      IfNoneMatch: "*",
      ServerSideEncryption: "AES256",
      ContentType: "application/json",
      ChecksumSHA256: createHash("sha256").update(body).digest("base64"),
    });
    expect(command.input.ACL).toBeUndefined();
    expect(JSON.parse(body.toString("utf8"))).toEqual({
      schemaVersion: 1,
      classification: "public_api_enrichment_not_verified_ma",
      ...before,
    });
    expect(source).toEqual(before);
    expect(receipt).toEqual({
      uri: `s3://${config.bucket}/${command.input.Key}`,
      sha256,
      bytes: body.byteLength,
      versionId: "version-1",
      status: "created",
    });
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("assigns a different address when a source response changes", async () => {
    send.mockResolvedValue({});
    const first = await archiveFreeApiBundleToS3(bundle(), config);
    const changed = bundle();
    changed.records[0].sources[0].data = { search: [{ id: "Q1" }] };
    const second = await archiveFreeApiBundleToS3(changed, config);
    expect(second.sha256).not.toBe(first.sha256);
    expect(second.uri).not.toBe(first.uri);
  });

  it("reports duplicate success only after verifying the stored bytes", async () => {
    send.mockRejectedValueOnce(preconditionFailed());
    send.mockImplementationOnce(() =>
      Promise.resolve({
        VersionId: "original-version",
        Body: { transformToByteArray: () => Promise.resolve(uploadedBody()) },
      })
    );
    const receipt = await archiveFreeApiBundleToS3(bundle(), config);
    expect(send.mock.calls[1][0]).toBeInstanceOf(GetObjectCommand);
    expect(receipt.status).toBe("already_present");
    expect(receipt.versionId).toBe("original-version");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("rejects a corrupt duplicate even if its metadata claims the right hash", async () => {
    send.mockRejectedValueOnce(preconditionFailed());
    send.mockImplementationOnce(() =>
      Promise.resolve({
        Metadata: {
          sha256: createHash("sha256").update(uploadedBody()).digest("hex"),
        },
        Body: {
          transformToByteArray: () => Promise.resolve(Buffer.from("corrupt")),
        },
      })
    );
    await expect(archiveFreeApiBundleToS3(bundle(), config)).rejects.toThrow(
      "failed SHA-256 verification",
    );
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("rejects a duplicate response with no body", async () => {
    send.mockRejectedValueOnce(preconditionFailed());
    send.mockResolvedValueOnce({});
    await expect(archiveFreeApiBundleToS3(bundle(), config)).rejects.toThrow(
      "failed SHA-256 verification",
    );
  });

  it.each([403, 409, 503])(
    "propagates AWS HTTP %s without claiming duplicate success",
    async (httpStatusCode) => {
      const failure = new S3ServiceException({
        name: "UploadFailed",
        message: "AWS upload failed",
        $fault: "client",
        $metadata: { httpStatusCode },
      });
      send.mockRejectedValueOnce(failure);
      await expect(archiveFreeApiBundleToS3(bundle(), config)).rejects.toBe(
        failure,
      );
      expect(send).toHaveBeenCalledOnce();
      expect(destroy).toHaveBeenCalledOnce();
    },
  );

  it("propagates credential failures", async () => {
    const failure = new Error("CredentialsProviderError");
    send.mockRejectedValueOnce(failure);
    await expect(archiveFreeApiBundleToS3(bundle(), config)).rejects.toBe(
      failure,
    );
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("rejects an inconsistent manifest before contacting AWS", async () => {
    const source = bundle();
    source.manifest.entityCount = 2;
    await expect(archiveFreeApiBundleToS3(source, config)).rejects.toThrow(
      "entity count does not match",
    );
    expect(construct).not.toHaveBeenCalled();
  });
});

describe("downloader CLI archive opt-in", () => {
  it.each([
    { mode: "off", archive: false, fail: false, status: 0 },
    { mode: "upload", archive: true, fail: false, status: 0 },
    { mode: "AWS failure", archive: true, fail: true, status: 1 },
  ])(
    "keeps exports and receipts truthful with $mode",
    ({ archive, fail, status }) => {
      const directory = mkdtempSync(join(tmpdir(), "lacuna-archive-cli-"));
      const output = join(directory, "export");
      const preload = join(directory, "mock-services.mjs");
      const uploadLog = join(directory, "upload.json");
      const receiptPath = join(output, "s3-archive-receipt.json");
      try {
        mkdirSync(output);
        writeFileSync(receiptPath, '{"uri":"s3://old/stale-snapshot"}');
        writeFileSync(
          preload,
          `
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
const require = createRequire(join(process.cwd(), "package.json"));
const { S3Client } = require("@aws-sdk/client-s3");
globalThis.fetch = async () => new Response(JSON.stringify({ search: [] }));
S3Client.prototype.send = async function(command) {
  writeFileSync(process.env.LACUNA_TEST_UPLOAD_LOG, JSON.stringify({
    key: command.input.Key,
    body: Buffer.from(command.input.Body).toString("utf8"),
  }));
  if (process.env.LACUNA_TEST_AWS_FAIL === "true") {
    throw new Error("test upload rejected");
  }
  return { VersionId: "cli-version" };
};
`,
        );
        const result = spawnSync(process.execPath, [
          "--import",
          preload,
          "--import",
          "tsx",
          "scripts/download-free-apis.ts",
          "--sources",
          "wikidata",
          "--limit",
          "1",
          "--out",
          output,
          ...(archive ? ["--archive-s3"] : []),
        ], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            LACUNA_EVIDENCE_S3_BUCKET: archive ? "test-evidence" : "",
            LACUNA_TEST_UPLOAD_LOG: uploadLog,
            LACUNA_TEST_AWS_FAIL: String(fail),
          },
          encoding: "utf8",
          timeout: 10_000,
        });
        expect(result.status, result.stderr).toBe(status);
        expect(existsSync(join(output, "manifest.json"))).toBe(true);
        expect(existsSync(join(output, "all-entities.json"))).toBe(true);
        expect(existsSync(uploadLog)).toBe(archive);
        expect(existsSync(receiptPath)).toBe(archive && !fail);
        if (archive && !fail) {
          const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
          const upload = JSON.parse(readFileSync(uploadLog, "utf8"));
          expect(receipt.sha256).toBe(
            createHash("sha256").update(upload.body).digest("hex"),
          );
          expect(receipt.uri).toBe(`s3://test-evidence/${upload.key}`);
          expect(receipt.versionId).toBe("cli-version");
          expect(JSON.parse(upload.body).records).toEqual(
            JSON.parse(readFileSync(join(output, "all-entities.json"), "utf8")),
          );
        }
        if (fail) expect(result.stderr).toContain("test upload rejected");
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );

  it("fails for a missing bucket before fetching sources or creating exports", () => {
    const directory = mkdtempSync(join(tmpdir(), "lacuna-archive-test-"));
    const output = join(directory, "export");
    try {
      const result = spawnSync(process.execPath, [
        "--import",
        "tsx",
        "scripts/download-free-apis.ts",
        "--sources",
        "wikidata",
        "--out",
        output,
        "--archive-s3",
      ], {
        cwd: process.cwd(),
        env: { ...process.env, LACUNA_EVIDENCE_S3_BUCKET: "" },
        encoding: "utf8",
        timeout: 10_000,
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("LACUNA_EVIDENCE_S3_BUCKET");
      expect(existsSync(output)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
