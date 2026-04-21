/**
 * Bot token from @BotFather: `<bot_id>:<secret>` (rough shape).
 * chat_id: numeric (user / group / supergroup; may be negative), or @channelusername.
 */
export function assertTelegramBotDestination(
  botToken: string,
  chatId: string,
): void {
  const token = botToken.trim();
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error(
      "Bot token should look like 123456789:AA... from @BotFather.",
    );
  }
  if (token.length < 40) {
    throw new Error("Bot token looks too short.");
  }

  const ch = chatId.trim();
  if (!ch) {
    throw new Error("Chat ID is required.");
  }
  if (/^-?\d+$/.test(ch)) {
    return;
  }
  if (/^@[a-zA-Z][a-zA-Z0-9_]{3,31}$/.test(ch)) {
    return;
  }
  throw new Error(
    "Chat ID must be numeric (e.g. from getUpdates) or a @channelusername for public channels.",
  );
}

export function telegramDestinationPublicMeta(chatId: string): string {
  const ch = chatId.trim();
  if (ch.startsWith("@")) {
    return `telegram · ${ch}`;
  }
  const tail = ch.replace(/^-/, "").slice(-6);
  return `api.telegram.org · …${tail}`;
}
