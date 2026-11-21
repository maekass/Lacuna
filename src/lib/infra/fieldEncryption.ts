/**
 * Field-level encryption for user-linked database columns (AES-256-GCM).
 *
 * Scope: reviewer identities in `review_audit_log.actor_id`. The public
 * catalog is public-source and is not encrypted; this protects who did what
 * in the review console if a database dump or backup leaks.
 *
 * Keys come only from the environment, never from the repository:
 * - `LACUNA_FIELD_ENCRYPTION_KEYS`: comma-separated `keyId:base64Key` pairs.
 *   Each key decodes to exactly 32 bytes (`openssl rand -base64 32`).
 * - `LACUNA_FIELD_ENCRYPTION_ACTIVE_KEY`: the key ID new writes use. Optional
 *   when exactly one key is configured.
 *
 * Stored format: `enc:v1:<keyId>:<iv>:<ciphertext>:<tag>` (base64url parts).
 * The key ID and a caller-supplied context (for example
 * `review_audit_log.actor_id`) are bound as additional authenticated data, so
 * a ciphertext cannot be relabeled to another key or moved to another column.
 *
 * Rotation: add the new key to the list, make it active, run
 * `npm run encryption:rotate`, then remove the old key once no rows use it.
 *
 * Failure modes: a missing or malformed key configuration throws
 * `FieldEncryptionConfigError` (writes never fall back to plaintext). An
 * unknown key ID, a wrong key, tampering, or a context mismatch throws
 * `FieldDecryptionError`.
 */
import process from "node:process";
import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const FIELD_ENCRYPTION_PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

export class FieldEncryptionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FieldEncryptionConfigError";
  }
}

export class FieldDecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FieldDecryptionError";
  }
}

export interface FieldKeyring {
  activeKeyId: string;
  keys: ReadonlyMap<string, Buffer>;
}

/** Parse a keyring from raw env-style strings. Never logs key material. */
export function parseFieldKeyring(
  rawKeys: string | undefined,
  rawActiveKeyId?: string,
): FieldKeyring {
  const keys = new Map<string, Buffer>();
  const entries = (rawKeys ?? "").split(",").map((s) => s.trim()).filter(
    Boolean,
  );
  if (entries.length === 0) {
    throw new FieldEncryptionConfigError(
      "LACUNA_FIELD_ENCRYPTION_KEYS is not set",
    );
  }
  for (const entry of entries) {
    const sep = entry.indexOf(":");
    const keyId = sep > 0 ? entry.slice(0, sep) : "";
    const encoded = sep > 0 ? entry.slice(sep + 1) : "";
    if (!KEY_ID_PATTERN.test(keyId)) {
      throw new FieldEncryptionConfigError(
        "Each encryption key needs an ID of 1-32 letters, digits, _ or -",
      );
    }
    if (keys.has(keyId)) {
      throw new FieldEncryptionConfigError(
        `Duplicate encryption key ID ${keyId}`,
      );
    }
    const key = Buffer.from(encoded, "base64");
    if (key.length !== KEY_BYTES) {
      throw new FieldEncryptionConfigError(
        `Encryption key ${keyId} must decode to ${KEY_BYTES} bytes`,
      );
    }
    keys.set(keyId, key);
  }

  const active = rawActiveKeyId?.trim() ||
    (keys.size === 1 ? [...keys.keys()][0] : "");
  if (!active) {
    throw new FieldEncryptionConfigError(
      "LACUNA_FIELD_ENCRYPTION_ACTIVE_KEY is required when more than one key is configured",
    );
  }
  if (!keys.has(active)) {
    throw new FieldEncryptionConfigError(
      `Active encryption key ${active} is not in LACUNA_FIELD_ENCRYPTION_KEYS`,
    );
  }
  return { activeKeyId: active, keys };
}

/** Keyring from the process environment (read on every call; no caching). */
export function fieldKeyringFromEnv(): FieldKeyring {
  return parseFieldKeyring(
    process.env.LACUNA_FIELD_ENCRYPTION_KEYS,
    process.env.LACUNA_FIELD_ENCRYPTION_ACTIVE_KEY,
  );
}

function aad(context: string, keyId: string): Buffer {
  return Buffer.from(`lacuna:${context}:${keyId}`, "utf8");
}

export function isEncryptedField(value: string): boolean {
  return value.startsWith(FIELD_ENCRYPTION_PREFIX);
}

/** Key ID of an encrypted value, or null for plaintext. */
export function encryptedFieldKeyId(value: string): string | null {
  if (!isEncryptedField(value)) return null;
  return value.slice(FIELD_ENCRYPTION_PREFIX.length).split(":")[0] || null;
}

/** Encrypt under the active key. A fresh random IV is used for every call. */
export function encryptField(
  plaintext: string,
  context: string,
  keyring: FieldKeyring = fieldKeyringFromEnv(),
): string {
  const keyId = keyring.activeKeyId;
  const key = keyring.keys.get(keyId);
  if (!key) {
    throw new FieldEncryptionConfigError(`Active key ${keyId} is missing`);
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_BYTES,
  });
  cipher.setAAD(aad(context, keyId));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    `${FIELD_ENCRYPTION_PREFIX}${keyId}`,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url"),
  ].join(":");
}

/** Decrypt a value written by `encryptField`. Throws on any mismatch. */
export function decryptField(
  stored: string,
  context: string,
  keyring: FieldKeyring = fieldKeyringFromEnv(),
): string {
  if (!isEncryptedField(stored)) {
    throw new FieldDecryptionError("Value is not an encrypted field");
  }
  const parts = stored.slice(FIELD_ENCRYPTION_PREFIX.length).split(":");
  if (parts.length !== 4) {
    throw new FieldDecryptionError("Malformed encrypted field");
  }
  const [keyId, ivPart, ctPart, tagPart] = parts;
  const key = keyring.keys.get(keyId);
  if (!key) {
    throw new FieldDecryptionError(
      `Encryption key ${keyId} is not configured`,
    );
  }
  const iv = Buffer.from(ivPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new FieldDecryptionError("Malformed encrypted field");
  }
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: TAG_BYTES,
    });
    decipher.setAAD(aad(context, keyId));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(ctPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new FieldDecryptionError(
      "Encrypted field failed authentication (wrong key, context, or tampering)",
    );
  }
}

/**
 * Read path for columns that may still hold rows written before encryption.
 * Plaintext passes through unchanged until `encryption:rotate` encrypts it;
 * encrypted values must decrypt or this throws.
 */
export function readEncryptedOrLegacyField(
  stored: string,
  context: string,
  keyring?: FieldKeyring,
): string {
  if (!isEncryptedField(stored)) return stored;
  return decryptField(stored, context, keyring ?? fieldKeyringFromEnv());
}

/** True when the value is plaintext or encrypted under a non-active key. */
export function needsFieldRotation(
  stored: string,
  keyring: FieldKeyring,
): boolean {
  return encryptedFieldKeyId(stored) !== keyring.activeKeyId;
}

/** Re-encrypt under the active key (plaintext legacy values included). */
export function rotateField(
  stored: string,
  context: string,
  keyring: FieldKeyring,
): string {
  if (!needsFieldRotation(stored, keyring)) return stored;
  const plaintext = readEncryptedOrLegacyField(stored, context, keyring);
  return encryptField(plaintext, context, keyring);
}
