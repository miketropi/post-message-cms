/** Strip optional `Bot ` prefix; Discord API expects raw token in `Authorization: Bot <token>`. */
export function normalizeDiscordBotToken(token: string): string {
  return token.trim().replace(/^Bot\s+/i, "");
}

/**
 * Basic checks only — invalid tokens fail at send time with a clear Discord error.
 */
export function assertDiscordBotDestination(
  botToken: string,
  channelId: string,
): void {
  const token = normalizeDiscordBotToken(botToken);
  if (token.length < 50) {
    throw new Error("Bot token looks too short. Paste the token from the Discord Developer Portal.");
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error(
      "Bot token should look like three dot-separated segments (from the Developer Portal).",
    );
  }

  const ch = channelId.trim();
  if (!/^\d{17,22}$/.test(ch)) {
    throw new Error(
      "Channel ID must be numeric (snowflake). Enable Developer Mode in Discord, right‑click the channel → Copy channel ID.",
    );
  }
}

export function discordDestinationPublicMeta(channelId: string): string {
  const ch = channelId.trim();
  const tail = ch.length > 6 ? ch.slice(-6) : ch;
  return `discord.com · …${tail}`;
}
