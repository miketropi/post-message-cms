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

/** Row fields needed to deliver plain text (admin test send + fan-out). */
export type DestinationDeliveryRow = {
  id: string;
  provider: string;
  label: string;
  secretEncrypted: string;
};

export async function deliverPlainTextToDestination(
  d: DestinationDeliveryRow,
  rawText: string,
): Promise<DeliveryResult> {
  const text =
    rawText.trim().length > 0
      ? rawText
      : "_Post Message CMS: empty test message._";

  let decrypted: string;
  try {
    decrypted = decryptString(d.secretEncrypted);
  } catch {
    return {
      destinationId: d.id,
      provider: d.provider,
      label: d.label,
      ok: false,
      error: "Stored secret could not be decrypted (check AUTH_SECRET).",
    };
  }

  if (d.provider === PROVIDER_SLACK_INCOMING_WEBHOOK) {
    const sent = await postSlackIncomingWebhook(decrypted, text);
    return {
      destinationId: d.id,
      provider: d.provider,
      label: d.label,
      ok: sent.ok,
      error: sent.ok ? undefined : sent.error,
    };
  }

  if (d.provider === PROVIDER_DISCORD_BOT) {
    let creds: DiscordStoredSecret;
    try {
      creds = parseDiscordSecretJson(decrypted);
    } catch {
      return {
        destinationId: d.id,
        provider: d.provider,
        label: d.label,
        ok: false,
        error: "Invalid stored Discord credentials.",
      };
    }
    const sent = await postDiscordChannelMessage(
      creds.botToken,
      creds.channelId,
      text,
    );
    return {
      destinationId: d.id,
      provider: d.provider,
      label: d.label,
      ok: sent.ok,
      error: sent.ok ? undefined : sent.error,
    };
  }

  if (d.provider === PROVIDER_TELEGRAM_BOT) {
    let creds: TelegramStoredSecret;
    try {
      creds = parseTelegramSecretJson(decrypted);
    } catch {
      return {
        destinationId: d.id,
        provider: d.provider,
        label: d.label,
        ok: false,
        error: "Invalid stored Telegram credentials.",
      };
    }
    const sent = await postTelegramSendMessage(
      creds.botToken,
      creds.chatId,
      text,
    );
    return {
      destinationId: d.id,
      provider: d.provider,
      label: d.label,
      ok: sent.ok,
      error: sent.ok ? undefined : sent.error,
    };
  }

  return {
    destinationId: d.id,
    provider: d.provider,
    label: d.label,
    ok: false,
    error: `Unsupported provider: ${d.provider}`,
  };
}

export async function dispatchIncomingMessage(
  workspaceId: string,
  body: unknown,
  options?: { branch?: string },
): Promise<DeliveryResult[]> {
  const rawText = jsonBodyToPlainText(body);
  const text =
    rawText.trim().length > 0
      ? rawText
      : "_Post Message CMS: empty body (no `text` / `message`)._";

  const branch = options?.branch;
  const destinations = await prisma.destination.findMany({
    where: {
      workspaceId,
      enabled: true,
      branchKey: branch != null ? branch : null,
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
    results.push(
      await deliverPlainTextToDestination(
        {
          id: d.id,
          provider: d.provider,
          label: d.label,
          secretEncrypted: d.secretEncrypted,
        },
        text,
      ),
    );
  }

  return results;
}
