import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 12 bytes recommended for AES-GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes standard auth tag

function getEncryptionKey(): Buffer {
  const hexKey = process.env.TOKEN_VAULT_ENCRYPTION_KEY;
  if (!hexKey) {
    throw new Error(
      "TOKEN_VAULT_ENCRYPTION_KEY environment variable is missing. It must be a 64-character hex string (32 bytes)."
    );
  }

  // Key can be 64-char hex string (32 bytes) or fallback to hash of string
  if (hexKey.length === 64 && /^[0-9a-fA-F]+$/.test(hexKey)) {
    return Buffer.from(hexKey, "hex");
  }

  // Fallback: derive 32-byte key via SHA-256
  return crypto.createHash("sha256").update(hexKey).digest();
}

export interface EncryptedData {
  encrypted: string; // Base64
  iv: string; // Base64
  authTag: string; // Base64
  version: string;
}

/**
 * Encrypt plaintext using AES-256-GCM
 */
export function encryptToken(plaintext: string): EncryptedData {
  if (!plaintext) {
    throw new Error("Plaintext cannot be empty");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag().toString("base64");

  return {
    encrypted,
    iv: iv.toString("base64"),
    authTag,
    version: "aes-256-gcm-v1",
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM with authentication tag verification
 */
export function decryptToken(data: {
  encrypted: string;
  iv: string;
  authTag: string;
}): string {
  const { encrypted, iv, authTag } = data;
  if (!encrypted || !iv || !authTag) {
    throw new Error("Invalid encrypted token payload: missing ciphertext, IV, or authTag");
  }

  const key = getEncryptionKey();
  const ivBuffer = Buffer.from(iv, "base64");
  const authTagBuffer = Buffer.from(authTag, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTagBuffer);

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a cryptographically secure random token (e.g. for CIBA approval nonces or auth_req_id)
 */
export function generateSecureNonce(prefix = "vto"): string {
  const random = crypto.randomBytes(24).toString("hex");
  return `${prefix}_${random}`;
}

/**
 * Hash utility for idempotency or checksums
 */
export function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}
