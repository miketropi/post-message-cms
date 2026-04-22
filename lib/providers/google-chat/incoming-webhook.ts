/**
 * Google Chat incoming webhooks — POST JSON { "text": "…" }.
 * @see https://developers.google.com/chat/how-tos/webhooks
 */

export type GoogleChatWebhookResult =
  | { ok: true; httpStatus: number }
  | { ok: false; error: string; httpStatus: number | null };

export async function postGoogleChatIncomingWebhook(
  webhookUrl: string,
  text: string,
): Promise<GoogleChatWebhookResult> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15_000),
    });
    const raw = await res.text();
    if (!res.ok) {
      let detail = raw.slice(0, 300);
      try {
        const j = JSON.parse(raw) as { error?: { message?: string } };
        if (j.error?.message) {
          detail = j.error.message;
        }
      } catch {
        /* */
      }
      return {
        ok: false,
        httpStatus: res.status,
        error: `Google Chat HTTP ${res.status}: ${detail}`,
      };
    }
    return { ok: true, httpStatus: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, httpStatus: null, error: msg };
  }
}
