import { Buffer } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type LacunaDealsPgMem,
  seedLacunaDealsPgMem,
} from "../../helpers/seedLacunaDealsPgMem";
import {
  listReviewAuditForDeal,
  logReviewAction,
  rotateReviewAuditActorIds,
  withoutLegacyLogin,
} from "@/lib/ingestion/reviewAuditLog";
import {
  FieldDecryptionError,
  FieldEncryptionConfigError,
  parseFieldKeyring,
} from "@/lib/infra/fieldEncryption";

// Synthetic keys and a synthetic reviewer login; no real identities.
const KEY_A = Buffer.alloc(32, 7).toString("base64");
const KEY_B = Buffer.alloc(32, 9).toString("base64");
const ACTOR = "github:example-reviewer";

describe("review_audit_log actor_id encryption at rest (pg-mem)", () => {
  let db: LacunaDealsPgMem;

  beforeEach(async () => {
    db = await seedLacunaDealsPgMem();
    vi.stubEnv("LACUNA_FIELD_ENCRYPTION_KEYS", `k1:${KEY_A}`);
    vi.stubEnv("LACUNA_FIELD_ENCRYPTION_ACTIVE_KEY", "");
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await db.teardown();
  });

  async function rawActorIds(): Promise<string[]> {
    const { rows } = await db.pool.query<{ actor_id: string }>(
      "SELECT actor_id FROM review_audit_log ORDER BY id",
    );
    return rows.map((r) => r.actor_id);
  }

  it("writes ciphertext to the table and decrypts only through the read path", async () => {
    const written = await logReviewAction({
      dealId: "sec-1",
      action: "approve",
      actorId: ACTOR,
      actorMethod: "github",
    });
    expect(written.actorId).toBe(ACTOR);

    const [stored] = await rawActorIds();
    expect(stored.startsWith("enc:v1:k1:")).toBe(true);
    expect(stored).not.toContain("example-reviewer");

    const [listed] = await listReviewAuditForDeal("sec-1");
    expect(listed.actorId).toBe(ACTOR);
  });

  it("refuses to read rows with the wrong key", async () => {
    await logReviewAction({
      dealId: "sec-1",
      action: "approve",
      actorId: ACTOR,
      actorMethod: "github",
    });
    vi.stubEnv("LACUNA_FIELD_ENCRYPTION_KEYS", `k1:${KEY_B}`);
    await expect(listReviewAuditForDeal("sec-1")).rejects.toBeInstanceOf(
      FieldDecryptionError,
    );
  });

  it("does not insert anything when the key is missing", async () => {
    vi.stubEnv("LACUNA_FIELD_ENCRYPTION_KEYS", "");
    await expect(logReviewAction({
      dealId: "sec-1",
      action: "reject",
      actorId: ACTOR,
      actorMethod: "github",
    })).rejects.toBeInstanceOf(FieldEncryptionConfigError);
    expect(await rawActorIds()).toEqual([]);
  });

  it("rotates old-key and legacy plaintext rows to the new key", async () => {
    await logReviewAction({
      dealId: "sec-1",
      action: "approve",
      actorId: ACTOR,
      actorMethod: "github",
    });
    // A row written before encryption existed.
    await db.pool.query(
      `INSERT INTO review_audit_log (deal_id, action, actor_id, actor_method)
       VALUES ('sec-1', 'promote', 'system:promote', 'api_key')`,
    );

    const ring = parseFieldKeyring(`k1:${KEY_A},k2:${KEY_B}`, "k2");
    const before = await rawActorIds();

    const dry = await rotateReviewAuditActorIds(db.pool, ring, {
      dryRun: true,
    });
    expect(dry).toEqual({ scanned: 2, rotated: 2, scrubbed: 0 });
    expect(await rawActorIds()).toEqual(before);

    const real = await rotateReviewAuditActorIds(db.pool, ring, {
      batchSize: 1,
    });
    expect(real).toEqual({ scanned: 2, rotated: 2, scrubbed: 0 });
    const after = await rawActorIds();
    expect(after.every((v) => v.startsWith("enc:v1:k2:"))).toBe(true);
    expect(after.join(" ")).not.toContain("system:promote");

    const again = await rotateReviewAuditActorIds(db.pool, ring);
    expect(again).toEqual({ scanned: 2, rotated: 0, scrubbed: 0 });

    // The old key can now be retired.
    vi.stubEnv("LACUNA_FIELD_ENCRYPTION_KEYS", `k2:${KEY_B}`);
    const rows = await listReviewAuditForDeal("sec-1");
    expect(rows.map((r) => r.actorId).sort()).toEqual(
      [ACTOR, "system:promote"].sort(),
    );
  });

  it("removes the legacy plaintext login copy and keeps other metadata", async () => {
    // Shape the pre-encryption GitHub callback wrote: login in both columns.
    await db.pool.query(
      `INSERT INTO review_audit_log (action, actor_id, actor_method, metadata)
       VALUES ('session_start', $1, 'github', $2::jsonb)`,
      [
        ACTOR,
        JSON.stringify({ provider: "github", login: "example-reviewer" }),
      ],
    );
    await db.pool.query(
      `INSERT INTO review_audit_log (action, actor_id, actor_method, metadata)
       VALUES ('import', 'system:promote', 'api_key', $1::jsonb)`,
      [JSON.stringify({ parsed: 3, login: "not-a-github-row" })],
    );
    const ring = parseFieldKeyring(`k1:${KEY_A}`);

    const dry = await rotateReviewAuditActorIds(db.pool, ring, {
      dryRun: true,
    });
    expect(dry).toEqual({ scanned: 2, rotated: 2, scrubbed: 1 });

    const real = await rotateReviewAuditActorIds(db.pool, ring);
    expect(real).toEqual({ scanned: 2, rotated: 2, scrubbed: 1 });

    const { rows } = await db.pool.query<
      { actor_id: string; metadata: Record<string, unknown> }
    >("SELECT actor_id, metadata FROM review_audit_log ORDER BY id");
    expect(rows[0].metadata).toEqual({ provider: "github" });
    expect(JSON.stringify(rows[0])).not.toContain("example-reviewer");
    // Non-GitHub metadata is not touched.
    expect(rows[1].metadata).toEqual({ parsed: 3, login: "not-a-github-row" });

    const again = await rotateReviewAuditActorIds(db.pool, ring);
    expect(again).toEqual({ scanned: 2, rotated: 0, scrubbed: 0 });
  });
});

describe("withoutLegacyLogin", () => {
  it("returns null when there is nothing to remove", () => {
    expect(withoutLegacyLogin(null)).toBeNull();
    expect(withoutLegacyLogin({})).toBeNull();
    expect(withoutLegacyLogin({ provider: "github" })).toBeNull();
    expect(withoutLegacyLogin({ login: "x" })).toBeNull();
  });

  it("drops only the login key from GitHub sign-in metadata", () => {
    expect(withoutLegacyLogin({ provider: "github", login: "x", n: 1 }))
      .toEqual({ provider: "github", n: 1 });
  });
});
