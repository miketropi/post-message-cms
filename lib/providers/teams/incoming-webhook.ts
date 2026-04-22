/**
 * Microsoft Teams / Power Platform incoming webhooks.
 * Classic Office 365 connectors accept a simple { "text": "…" } body.
 * @see https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
 */

export type TeamsWebhookResult =
  | { ok: true; httpStatus: number }
  | { ok: false; error: string; httpStatus: number | null };

export async function postTeamsIncomingWebhook(
  webhookUrl: string,
  text: string,
): Promise<TeamsWebhookResult> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15_000),
    });
    const raw = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        httpStatus: res.status,
        error: `Teams HTTP ${res.status}: ${raw.slice(0, 240)}`,
      };
    }
    // 1 — empty body often means success; some endpoints return { ... }
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed === "1") {
      return { ok: true, httpStatus: res.status };
    }
    try {
      const j = JSON.parse(raw) as { error?: { message?: string } };
      if (j.error?.message) {
        return {
          ok: false,
          httpStatus: res.status,
          error: j.error.message,
        };
      }
    } catch {
      /* text body */
    }
    return { ok: true, httpStatus: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, httpStatus: null, error: msg };
  }
}
