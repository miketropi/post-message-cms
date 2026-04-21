import { createHash, randomBytes } from "crypto";

/** URL-safe opaque token sent by email; only a SHA-256 hash is stored. */
export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
