/**
 * Slack Incoming Webhooks — https://api.slack.com/messaging/webhooks
 */

export type SlackWebhookResult =
  | { ok: true; httpStatus: number }
  | { ok: false; error: string; httpStatus: number | null };

export async function postSlackIncomingWebhook(
  webhookUrl: string,
  text: string,
): Promise<SlackWebhookResult> {
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
        error: `Slack HTTP ${res.status}: ${raw.slice(0, 240)}`,
      };
    }
    // Incoming Webhooks typically respond with plain text `ok`; some setups return JSON.
    const trimmed = raw.trim();
    if (trimmed === "ok" || trimmed === "") {
      return { ok: true, httpStatus: res.status };
    }
    try {
      const j = JSON.parse(raw) as { ok?: boolean; error?: string };
      if (j.ok === true) return { ok: true, httpStatus: res.status };
      if (j.ok === false && j.error) {
        return {
          ok: false,
          httpStatus: res.status,
          error: j.error,
        };
      }
    } catch {
      /* non-JSON body on 200 — treat as success */
    }
    return { ok: true, httpStatus: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, httpStatus: null, error: msg };
  }
}
