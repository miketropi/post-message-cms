/**
 * Shared secret for JWT session cookies (middleware + server).
 * Do not import from `server-only` modules so Edge middleware can use it.
 */
export function getAuthSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be set and at least 32 characters. Generate one with: openssl rand -base64 32",
    );
  }
  return new TextEncoder().encode(secret);
}
