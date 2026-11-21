import { Buffer } from "node:buffer";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decryptField,
  encryptedFieldKeyId,
  encryptField,
  FieldDecryptionError,
  FieldEncryptionConfigError,
  fieldKeyringFromEnv,
  isEncryptedField,
  needsFieldRotation,
  parseFieldKeyring,
  readEncryptedOrLegacyField,
  rotateField,
} from "@/lib/infra/fieldEncryption";

// Synthetic test keys (fixed bytes), never used outside tests.
const KEY_A = Buffer.alloc(32, 1).toString("base64");
const KEY_B = Buffer.alloc(32, 2).toString("base64");
const CTX = "review_audit_log.actor_id";
const SAMPLE = "github:example-reviewer";

const ringA = () => parseFieldKeyring(`k1:${KEY_A}`);
const ringAB = (active: string) =>
  parseFieldKeyring(`k1:${KEY_A},k2:${KEY_B}`, active);

describe("fieldEncryption", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips through the intended decrypt path", () => {
    const stored = encryptField(SAMPLE, CTX, ringA());
    expect(isEncryptedField(stored)).toBe(true);
    expect(encryptedFieldKeyId(stored)).toBe("k1");
    expect(decryptField(stored, CTX, ringA())).toBe(SAMPLE);
  });

  it("stores ciphertext, not the plaintext, and uses a fresh IV each time", () => {
    const first = encryptField(SAMPLE, CTX, ringA());
    const second = encryptField(SAMPLE, CTX, ringA());
    expect(first).not.toContain(SAMPLE);
    expect(first).not.toContain(Buffer.from(SAMPLE).toString("base64url"));
    expect(first).not.toBe(second);
  });

  it("fails with the wrong key", () => {
    const stored = encryptField(SAMPLE, CTX, ringA());
    const wrong = parseFieldKeyring(`k1:${KEY_B}`);
    expect(() => decryptField(stored, CTX, wrong)).toThrow(
      FieldDecryptionError,
    );
  });

  it("fails when the key ID is not configured", () => {
    const stored = encryptField(SAMPLE, CTX, ringAB("k2"));
    expect(() => decryptField(stored, CTX, ringA())).toThrow(
      /k2 is not configured/,
    );
  });

  it("binds the column context and key ID as authenticated data", () => {
    const stored = encryptField(SAMPLE, CTX, ringAB("k1"));
    expect(() => decryptField(stored, "other_table.col", ringAB("k1")))
      .toThrow(FieldDecryptionError);
    const relabeled = stored.replace("enc:v1:k1:", "enc:v1:k2:");
    expect(() => decryptField(relabeled, CTX, ringAB("k1"))).toThrow(
      FieldDecryptionError,
    );
  });

  it("detects tampering and malformed values", () => {
    const stored = encryptField(SAMPLE, CTX, ringA());
    const parts = stored.split(":");
    const ct = Buffer.from(parts[4], "base64url");
    ct[0] ^= 0xff;
    parts[4] = ct.toString("base64url");
    expect(() => decryptField(parts.join(":"), CTX, ringA())).toThrow(
      FieldDecryptionError,
    );
    expect(() => decryptField("enc:v1:k1:abc", CTX, ringA())).toThrow(
      /Malformed/,
    );
    expect(() => decryptField(SAMPLE, CTX, ringA())).toThrow(
      /not an encrypted field/,
    );
  });

  it("refuses to encrypt when the key is missing (no plaintext fallback)", () => {
    vi.stubEnv("LACUNA_FIELD_ENCRYPTION_KEYS", "");
    expect(() => encryptField(SAMPLE, CTX)).toThrow(
      FieldEncryptionConfigError,
    );
  });

  it("validates key configuration", () => {
    expect(() => parseFieldKeyring(undefined)).toThrow(/not set/);
    expect(() => parseFieldKeyring("k1:c2hvcnQ=")).toThrow(/32 bytes/);
    expect(() => parseFieldKeyring(`bad id:${KEY_A}`)).toThrow(/ID/);
    expect(() => parseFieldKeyring(`k1:${KEY_A},k1:${KEY_B}`)).toThrow(
      /Duplicate/,
    );
    expect(() => parseFieldKeyring(`k1:${KEY_A},k2:${KEY_B}`)).toThrow(
      /ACTIVE_KEY is required/,
    );
    expect(() => parseFieldKeyring(`k1:${KEY_A}`, "k9")).toThrow(
      /k9 is not in/,
    );
  });

  it("reads the keyring from the environment", () => {
    vi.stubEnv("LACUNA_FIELD_ENCRYPTION_KEYS", `k1:${KEY_A},k2:${KEY_B}`);
    vi.stubEnv("LACUNA_FIELD_ENCRYPTION_ACTIVE_KEY", "k2");
    const stored = encryptField(SAMPLE, CTX);
    expect(encryptedFieldKeyId(stored)).toBe("k2");
    expect(fieldKeyringFromEnv().activeKeyId).toBe("k2");
    expect(decryptField(stored, CTX)).toBe(SAMPLE);
  });

  it("passes legacy plaintext through only on the legacy read path", () => {
    expect(readEncryptedOrLegacyField("system:promote", CTX, ringA())).toBe(
      "system:promote",
    );
  });

  it("rotates old-key and plaintext values to the active key", () => {
    const underOld = encryptField(SAMPLE, CTX, ringAB("k1"));
    const ring = ringAB("k2");
    expect(needsFieldRotation(underOld, ring)).toBe(true);
    expect(needsFieldRotation("plain", ring)).toBe(true);

    const rotated = rotateField(underOld, CTX, ring);
    expect(encryptedFieldKeyId(rotated)).toBe("k2");
    expect(needsFieldRotation(rotated, ring)).toBe(false);
    expect(rotateField(rotated, CTX, ring)).toBe(rotated);

    const onlyNew = parseFieldKeyring(`k2:${KEY_B}`);
    expect(decryptField(rotated, CTX, onlyNew)).toBe(SAMPLE);
    expect(decryptField(rotateField("plain", CTX, ring), CTX, onlyNew)).toBe(
      "plain",
    );
  });
});
