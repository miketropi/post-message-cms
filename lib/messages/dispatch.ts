import "server-only";

import { DeliveryStatus } from "@/app/generated/prisma/enums";
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
import type { PendingDeliveryRow } from "@/lib/messages/persist-message-log";
import { jsonBodyToPlainText } from "./format";

export type { PendingDeliveryRow } from "@/lib/messages/persist-message-log";

export type DeliveryResult = {
  destinationId: string;
  provider: string;
  label: string;
  ok: boolean;
  error?: string;
};

export type DeliveryDispatch = {
  v1: DeliveryResult;
  log: PendingDeliveryRow;
};

/** Row fields needed to deliver plain text (admin test send + fan-out). */
export type DestinationDeliveryRow = {
  id: string;
  provider: string;
  label: string;
  secretEncrypted: string;
};

/**
 * Same plain text as `dispatchIncomingMessage` uses for outbound sends
 * (including empty-body placeholder).
 */
export function resolveOutgoingPlainText(body: unknown): string {
  const rawText = jsonBodyToPlainText(body);
  return rawText.trim().length > 0
    ? rawText
    : "_Post Message CMS: empty body (no `text` / `message`)._";
}

export async function deliverPlainTextToDestination(
  d: DestinationDeliveryRow,
  rawText: string,
  options?: { attempt?: number },
): Promise<DeliveryDispatch> {
  const attemptNo = options?.attempt ?? 1;
  const text =
    rawText.trim().length > 0
      ? rawText
      : "_Post Message CMS: empty test message._";

  const baseV1 = {
    destinationId: d.id,
    provider: d.provider,
    label: d.label,
  } as const;

  const t0 = Date.now();
  const duration = () => Date.now() - t0;

  let decrypted: string;
  try {
    decrypted = decryptString(d.secretEncrypted);
  } catch {
    const ms = duration();
    return {
      v1: {
        ...baseV1,
        ok: false,
        error: "Stored secret could not be decrypted (check AUTH_SECRET).",
      },
      log: {
        destinationId: d.id,
        provider: d.provider,
        status: DeliveryStatus.FAILED,
        httpStatus: null,
        error:
          "Stored secret could not be decrypted (check AUTH_SECRET).",
        duration: ms,
        attempt: attemptNo,
      },
    };
  }

  if (d.provider === PROVIDER_SLACK_INCOMING_WEBHOOK) {
    const start = Date.now();
    const sent = await postSlackIncomingWebhook(decrypted, text);
    const ms = Date.now() - start;
    return {
      v1: {
        ...baseV1,
        ok: sent.ok,
        error: sent.ok ? undefined : sent.error,
      },
      log: {
        destinationId: d.id,
        provider: d.provider,
        status: sent.ok ? DeliveryStatus.SUCCESS : DeliveryStatus.FAILED,
        httpStatus: sent.httpStatus,
        error: sent.ok ? null : sent.error,
        duration: ms,
        attempt: attemptNo,
      },
    };
  }

  if (d.provider === PROVIDER_DISCORD_BOT) {
    let creds: DiscordStoredSecret;
    try {
      creds = parseDiscordSecretJson(decrypted);
    } catch {
      return {
        v1: {
          ...baseV1,
          ok: false,
          error: "Invalid stored Discord credentials.",
        },
        log: {
          destinationId: d.id,
          provider: d.provider,
          status: DeliveryStatus.FAILED,
          httpStatus: null,
          error: "Invalid stored Discord credentials.",
          duration: duration(),
          attempt: attemptNo,
        },
      };
    }
    const start = Date.now();
    const sent = await postDiscordChannelMessage(
      creds.botToken,
      creds.channelId,
      text,
    );
    const ms = Date.now() - start;
    return {
      v1: {
        ...baseV1,
        ok: sent.ok,
        error: sent.ok ? undefined : sent.error,
      },
      log: {
        destinationId: d.id,
        provider: d.provider,
        status: sent.ok ? DeliveryStatus.SUCCESS : DeliveryStatus.FAILED,
        httpStatus: sent.httpStatus,
        error: sent.ok ? null : sent.error,
        duration: ms,
        attempt: attemptNo,
      },
    };
  }

  if (d.provider === PROVIDER_TELEGRAM_BOT) {
    let creds: TelegramStoredSecret;
    try {
      creds = parseTelegramSecretJson(decrypted);
    } catch {
      return {
        v1: {
          ...baseV1,
          ok: false,
          error: "Invalid stored Telegram credentials.",
        },
        log: {
          destinationId: d.id,
          provider: d.provider,
          status: DeliveryStatus.FAILED,
          httpStatus: null,
          error: "Invalid stored Telegram credentials.",
          duration: duration(),
          attempt: attemptNo,
        },
      };
    }
    const start = Date.now();
    const sent = await postTelegramSendMessage(
      creds.botToken,
      creds.chatId,
      text,
    );
    const ms = Date.now() - start;
    return {
      v1: {
        ...baseV1,
        ok: sent.ok,
        error: sent.ok ? undefined : sent.error,
      },
      log: {
        destinationId: d.id,
        provider: d.provider,
        status: sent.ok ? DeliveryStatus.SUCCESS : DeliveryStatus.FAILED,
        httpStatus: sent.httpStatus,
        error: sent.ok ? null : sent.error,
        duration: ms,
        attempt: attemptNo,
      },
    };
  }

  return {
    v1: {
      ...baseV1,
      ok: false,
      error: `Unsupported provider: ${d.provider}`,
    },
    log: {
      destinationId: d.id,
      provider: d.provider,
      status: DeliveryStatus.FAILED,
      httpStatus: null,
      error: `Unsupported provider: ${d.provider}`,
      duration: duration(),
      attempt: attemptNo,
    },
  };
}

export async function dispatchIncomingMessage(
  workspaceId: string,
  body: unknown,
  options?: { branch?: string },
): Promise<{
  v1: DeliveryResult[];
  logs: PendingDeliveryRow[];
}> {
  const text = resolveOutgoingPlainText(body);
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

  const v1: DeliveryResult[] = [];
  const logs: PendingDeliveryRow[] = [];

  for (const d of destinations) {
    const out = await deliverPlainTextToDestination(
      {
        id: d.id,
        provider: d.provider,
        label: d.label,
        secretEncrypted: d.secretEncrypted,
      },
      text,
    );
    v1.push(out.v1);
    logs.push(out.log);
  }

  return { v1, logs };
}
