/**
 * Telegram Bot API — sendMessage
 * https://core.telegram.org/bots/api#sendmessage
 */

const MAX_TEXT_LENGTH = 4096;

export async function postTelegramSendMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed =
    text.length > MAX_TEXT_LENGTH
      ? `${text.slice(0, MAX_TEXT_LENGTH - 3)}...`
      : text;

  const url = `https://api.telegram.org/bot${botToken.trim()}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: trimmed,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const raw = await res.text();
    let description = raw.slice(0, 320);
    try {
      const j = JSON.parse(raw) as { ok?: boolean; description?: string };
      if (j.description) description = j.description;
      if (j.ok === true) {
        return { ok: true };
      }
    } catch {
      /* not JSON */
    }

    if (res.ok) {
      return { ok: true };
    }

    return {
      ok: false,
      error: `Telegram HTTP ${res.status}: ${description}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
