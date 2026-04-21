export type TelegramStoredSecret = {
  botToken: string;
  chatId: string;
};

export function telegramSecretToJson(secret: TelegramStoredSecret): string {
  return JSON.stringify({
    botToken: secret.botToken.trim(),
    chatId: secret.chatId.trim(),
  });
}

export function parseTelegramSecretJson(json: string): TelegramStoredSecret {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("invalid");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("invalid");
  const o = parsed as Record<string, unknown>;
  const botToken = o.botToken;
  const chatId = o.chatId;
  if (typeof botToken !== "string" || typeof chatId !== "string") {
    throw new Error("invalid");
  }
  return {
    botToken: botToken.trim(),
    chatId: chatId.trim(),
  };
}
