import { timingSafeEqual } from "node:crypto";

import "server-only";

/**
 * `Authorization: Bearer <token>` matches `CRON_SECRET` in constant time.
 * Returns false if `CRON_SECRET` is unset/empty, or the header is missing/wrong.
 */
export function isAuthorizedCronRequest(
  request: Request,
  cronSecret: string | undefined,
): boolean {
  const expected = cronSecret?.trim();
  if (!expected) {
    return false;
  }
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return false;
  }
  const token = auth.slice("Bearer ".length).trim();
  if (!token) {
    return false;
  }
  try {
    const a = Buffer.from(token, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
