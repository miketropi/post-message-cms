/**
 * Slack Incoming Webhooks — https://api.slack.com/messaging/webhooks
 */

export async function postSlackIncomingWebhook(
  webhookUrl: string,
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
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
        error: `Slack HTTP ${res.status}: ${raw.slice(0, 240)}`,
      };
    }
    // Incoming Webhooks typically respond with plain text `ok`; some setups return JSON.
    const trimmed = raw.trim();
    if (trimmed === "ok" || trimmed === "") {
      return { ok: true };
    }
    try {
      const j = JSON.parse(raw) as { ok?: boolean; error?: string };
      if (j.ok === true) return { ok: true };
      if (j.ok === false && j.error) {
        return { ok: false, error: j.error };
      }
    } catch {
      /* non-JSON body on 200 — treat as success */
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
