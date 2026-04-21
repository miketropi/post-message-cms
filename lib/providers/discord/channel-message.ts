/**
 * Discord REST: Create Message
 * https://discord.com/developers/docs/resources/channel#create-message
 */

const DISCORD_API = "https://discord.com/api/v10";
const MAX_CONTENT_LENGTH = 2000;

export async function postDiscordChannelMessage(
  botToken: string,
  channelId: string,
  content: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed =
    content.length > MAX_CONTENT_LENGTH
      ? `${content.slice(0, MAX_CONTENT_LENGTH - 3)}...`
      : content;

  try {
    const res = await fetch(
      `${DISCORD_API}/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bot ${botToken}`,
        },
        body: JSON.stringify({ content: trimmed }),
        signal: AbortSignal.timeout(15_000),
      },
    );

    const raw = await res.text();
    if (!res.ok) {
      let detail = raw.slice(0, 280);
      try {
        const j = JSON.parse(raw) as { message?: string; code?: number };
        if (j.message) {
          detail = j.code != null ? `${j.message} (code ${j.code})` : j.message;
        }
      } catch {
        /* ignore */
      }
      return {
        ok: false,
        error: `Discord HTTP ${res.status}: ${detail}`,
      };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
