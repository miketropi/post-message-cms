import { createHash } from "node:crypto";

import "server-only";

/** Gravatar image URL from email (MD5 hash per Gravatar spec). */
export function gravatarUrl(email: string, size = 80): string {
  const normalized = email.trim().toLowerCase();
  const hash = createHash("md5").update(normalized).digest("hex");
  const s = Math.min(512, Math.max(1, Math.floor(size)));
  return `https://www.gravatar.com/avatar/${hash}?s=${s}&d=identicon&r=pg`;
}
