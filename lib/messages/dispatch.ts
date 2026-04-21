import "server-only";

import { postDiscordChannelMessage } from "@/lib/providers/discord/channel-message";
import {
  type DiscordStoredSecret,
  parseDiscordSecretJson,
} from "@/lib/providers/discord/secret";
import { postSlackIncomingWebhook } from "@/lib/providers/slack/incoming-webhook";
import { postTelegramSendMessage } from "@/lib/providers/telegram/send-message";
import {
  type TelegramStoredSecret,
  parseTelegramSecretJson,
} from "@/lib/providers/telegram/secret";
import {
  PROVIDER_DISCORD_BOT,
  PROVIDER_SLACK_INCOMING_WEBHOOK,
  PROVIDER_TELEGRAM_BOT,
} from "@/lib/providers/types";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/secrets";

import { jsonBodyToPlainText } from "./format";

export type DeliveryResult = {
  destinationId: string;
  provider: string;
  label: string;
  ok: boolean;
  error?: string;
};

export async function dispatchIncomingMessage(
  workspaceId: string,
  body: unknown,
): Promise<DeliveryResult[]> {
  const rawText = jsonBodyToPlainText(body);
  const text =
    rawText.trim().length > 0
      ? rawText
      : "_Post Message CMS: empty body (no `text` / `message`)._";

  const destinations = await prisma.destination.findMany({
    where: {
      workspaceId,
      enabled: true,
      provider: {
        in: [
          PROVIDER_SLACK_INCOMING_WEBHOOK,
          PROVIDER_DISCORD_BOT,
          PROVIDER_TELEGRAM_BOT,
        ],
      },
    },
  });

  const results: DeliveryResult[] = [];

  for (const d of destinations) {
    let decrypted: string;
    try {
      decrypted = decryptString(d.secretEncrypted);
    } catch {
      results.push({
        destinationId: d.id,
        provider: d.provider,
        label: d.label,
        ok: false,
        error: "Stored secret could not be decrypted (check AUTH_SECRET).",
      });
      continue;
    }

    if (d.provider === PROVIDER_SLACK_INCOMING_WEBHOOK) {
      const sent = await postSlackIncomingWebhook(decrypted, text);
      results.push({
        destinationId: d.id,
        provider: d.provider,
        label: d.label,
        ok: sent.ok,
        error: sent.ok ? undefined : sent.error,
      });
      continue;
    }

    if (d.provider === PROVIDER_DISCORD_BOT) {
      let creds: DiscordStoredSecret;
      try {
        creds = parseDiscordSecretJson(decrypted);
      } catch {
        results.push({
          destinationId: d.id,
          provider: d.provider,
          label: d.label,
          ok: false,
          error: "Invalid stored Discord credentials.",
        });
        continue;
      }
      const sent = await postDiscordChannelMessage(
        creds.botToken,
        creds.channelId,
        text,
      );
      results.push({
        destinationId: d.id,
        provider: d.provider,
        label: d.label,
        ok: sent.ok,
        error: sent.ok ? undefined : sent.error,
      });
      continue;
    }

    if (d.provider === PROVIDER_TELEGRAM_BOT) {
      let creds: TelegramStoredSecret;
      try {
        creds = parseTelegramSecretJson(decrypted);
      } catch {
        results.push({
          destinationId: d.id,
          provider: d.provider,
          label: d.label,
          ok: false,
          error: "Invalid stored Telegram credentials.",
        });
        continue;
      }
      const sent = await postTelegramSendMessage(
        creds.botToken,
        creds.chatId,
        text,
      );
      results.push({
        destinationId: d.id,
        provider: d.provider,
        label: d.label,
        ok: sent.ok,
        error: sent.ok ? undefined : sent.error,
      });
      continue;
    }

    results.push({
      destinationId: d.id,
      provider: d.provider,
      label: d.label,
      ok: false,
      error: `Unsupported provider: ${d.provider}`,
    });
  }

  return results;
}
