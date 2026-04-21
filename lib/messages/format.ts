/**
 * Map API JSON to a single Slack `text` string (mrkdwn-friendly plain text).
 */
export function jsonBodyToSlackText(body: unknown): string {
  if (body === null || body === undefined) {
    return "";
  }
  if (typeof body === "string") {
    return body;
  }
  if (typeof body === "number" || typeof body === "boolean") {
    return String(body);
  }
  if (Array.isArray(body)) {
    return body.map((x) => jsonBodyToSlackText(x)).join("\n");
  }
  if (typeof body === "object") {
    const o = body as Record<string, unknown>;
    if (typeof o.text === "string") return o.text;
    if (typeof o.message === "string") return o.message;
    if (typeof o.title === "string" && typeof o.body === "string") {
      return `*${o.title}*\n${o.body}`;
    }
  }
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}
