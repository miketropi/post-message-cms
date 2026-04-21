/**
 * Extract routing fields from POST /api/v1/messages JSON before text formatting.
 */

const ROUTING_KEYS = new Set(["branch"]);

export type ParsedMessagePayload = {
  /** When set, only destinations with this `branchKey` receive the message. */
  branch: string | undefined;
  /** Body with routing keys removed, for `jsonBodyToPlainText`. */
  bodyForText: unknown;
};

export function parseIncomingMessageBody(body: unknown): ParsedMessagePayload {
  if (body === null || body === undefined) {
    return { branch: undefined, bodyForText: body };
  }
  if (typeof body !== "object" || Array.isArray(body)) {
    return { branch: undefined, bodyForText: body };
  }

  const o = body as Record<string, unknown>;
  let branch: string | undefined;
  if (typeof o.branch === "string") {
    const t = o.branch.trim();
    if (t.length > 0) branch = t;
  }

  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (!ROUTING_KEYS.has(k)) rest[k] = v;
  }

  const bodyForText =
    Object.keys(rest).length > 0 ? rest : undefined;

  return { branch, bodyForText };
}

/** Allowed destination branch keys (admin): alphanumeric start, then alnum, `_`, `-`. */
export const BRANCH_KEY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}$/;

export function assertValidBranchKey(raw: string): void {
  const t = raw.trim();
  if (!t) return;
  if (!BRANCH_KEY_PATTERN.test(t)) {
    throw new Error(
      "branchKey must be 1–63 characters: start with a letter or digit, then letters, digits, underscores, or hyphens.",
    );
  }
}

export function normalizeBranchKeyInput(
  raw: string | undefined,
): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  assertValidBranchKey(t);
  return t;
}

/**
 * Normalize and validate `branch` from API (body or query). Throws if present but invalid.
 */
export function assertValidRequestBranch(
  raw: string | undefined,
): string | undefined {
  if (raw == null) return undefined;
  const t = raw.trim();
  if (!t.length) return undefined;
  if (!BRANCH_KEY_PATTERN.test(t)) {
    throw new Error(
      "Invalid branch: use 1–63 characters, start with a letter or digit, then letters, digits, underscores, or hyphens.",
    );
  }
  return t;
}
