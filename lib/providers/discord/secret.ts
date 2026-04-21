import { normalizeDiscordBotToken } from "./validate";

export type DiscordStoredSecret = {
  botToken: string;
  channelId: string;
};

export function discordSecretToJson(secret: DiscordStoredSecret): string {
  return JSON.stringify({
    botToken: normalizeDiscordBotToken(secret.botToken),
    channelId: secret.channelId.trim(),
  });
}

export function parseDiscordSecretJson(json: string): DiscordStoredSecret {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("invalid");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("invalid");
  const o = parsed as Record<string, unknown>;
  const botToken = o.botToken;
  const channelId = o.channelId;
  if (typeof botToken !== "string" || typeof channelId !== "string") {
    throw new Error("invalid");
  }
  return {
    botToken: normalizeDiscordBotToken(botToken),
    channelId: channelId.trim(),
  };
}
