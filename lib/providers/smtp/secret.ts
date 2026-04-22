import type { SmtpMailStoredSecret } from "./types";

export type { SmtpMailStoredSecret } from "./types";

export function smtpMailSecretToJson(secret: SmtpMailStoredSecret): string {
  return JSON.stringify({
    host: secret.host.trim(),
    port: secret.port,
    secure: secret.secure,
    user: secret.user?.trim() || undefined,
    pass: secret.pass || undefined,
    from: secret.from.trim(),
    to: secret.to.trim(),
  });
}

export function parseSmtpMailSecretJson(raw: string): SmtpMailStoredSecret {
  let o: unknown;
  try {
    o = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Invalid stored SMTP destination.");
  }
  if (typeof o !== "object" || o === null) {
    throw new Error("Invalid stored SMTP destination.");
  }
  const r = o as Record<string, unknown>;
  if (typeof r.to === "string" && r.to.trim() && typeof r.host !== "string") {
    throw new Error(
      "This SMTP destination must be re-added with full host, port, and sender (no longer using app .env).",
    );
  }
  const host = r.host;
  const port = r.port;
  const secure = r.secure;
  const from = r.from;
  const to = r.to;
  if (typeof host !== "string" || !host.trim()) {
    throw new Error("Invalid stored SMTP destination.");
  }
  if (typeof port !== "number" || !Number.isFinite(port)) {
    throw new Error("Invalid stored SMTP destination.");
  }
  if (typeof secure !== "boolean") {
    throw new Error("Invalid stored SMTP destination.");
  }
  if (typeof from !== "string" || !from.trim()) {
    throw new Error("Invalid stored SMTP destination.");
  }
  if (typeof to !== "string" || !to.trim()) {
    throw new Error("Invalid stored SMTP destination.");
  }
  return {
    host: host.trim(),
    port,
    secure,
    user: typeof r.user === "string" && r.user.trim() ? r.user.trim() : undefined,
    pass: typeof r.pass === "string" && r.pass.length > 0 ? r.pass : undefined,
    from: from.trim(),
    to: to.trim(),
  };
}

export function smtpMailPublicMeta(secret: {
  host: string;
  port: number;
  to: string;
}): string {
  const t = secret.to.trim();
  const at = t.lastIndexOf("@");
  const tail = at > 0 && at < t.length - 1 ? t.slice(at) : t;
  return `${secret.host.trim()}:${secret.port} → *${tail}`;
}
