import { createHash, randomBytes } from "node:crypto";

import type { Prisma } from "@/app/generated/prisma/client";

export const SCOPE_MESSAGES_WRITE = "messages:write";

export const DEFAULT_API_KEY_SCOPES: string[] = [SCOPE_MESSAGES_WRITE];

export function generateApiKey(): {
  raw: string;
  publicLabel: string;
  keyHash: string;
} {
  const raw = `pms_${randomBytes(24).toString("base64url")}`;
  const publicLabel = `${raw.slice(0, 12)}…`;
  return {
    raw,
    publicLabel,
    keyHash: hashApiKey(raw),
  };
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function extractApiKeyFromRequest(request: Request): string | null {
  const direct = request.headers.get("x-api-key")?.trim();
  if (direct) return direct;
  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  return null;
}

export function hasApiKeyScope(
  scopes: Prisma.JsonValue,
  scope: string,
): boolean {
  if (!Array.isArray(scopes)) return false;
  return scopes.some((s) => s === scope);
}
