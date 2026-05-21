// AES-256-GCM encryption helper for AWS secret access keys at rest.
// Uses a key derived from SUPABASE_SERVICE_ROLE_KEY (server-only) so secrets
// in the database are useless without server-side runtime access.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const SALT = "strata-aws-v1"; // fixed salt — key material is the server secret

function getKey(): Buffer {
  const seed = process.env.STRATA_ENC_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!seed) throw new Error("Missing server encryption key material");
  return scryptSync(seed, SALT, 32);
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // payload: v1.<iv b64>.<tag b64>.<ct b64>
  return `v1.${iv.toString("base64")}.${tag.toString("base64")}.${ct.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, tagB64, ctB64] = payload.split(".");
  if (version !== "v1") throw new Error("Unsupported secret payload version");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const pt = Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]);
  return pt.toString("utf8");
}

// Mask helper for displaying credentials in UI
export function maskKey(key: string): string {
  if (!key || key.length < 8) return "••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
