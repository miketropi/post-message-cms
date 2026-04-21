import "server-only";

import { prisma } from "@/lib/prisma";
import { postSlackIncomingWebhook } from "@/lib/providers/slack/incoming-webhook";
import { PROVIDER_SLACK_INCOMING_WEBHOOK } from "@/lib/providers/types";
import { decryptString } from "@/lib/secrets";

import { jsonBodyToSlackText } from "./format";

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
  const rawText = jsonBodyToSlackText(body);
  const text =
    rawText.trim().length > 0
      ? rawText
      : "_Post Message CMS: empty body (no `text` / `message`)._";

  const destinations = await prisma.destination.findMany({
    where: {
      workspaceId,
      enabled: true,
      provider: PROVIDER_SLACK_INCOMING_WEBHOOK,
    },
  });

  const results: DeliveryResult[] = [];

  for (const d of destinations) {
    let webhookUrl: string;
    try {
      webhookUrl = decryptString(d.secretEncrypted);
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

    const sent = await postSlackIncomingWebhook(webhookUrl, text);
    if (sent.ok) {
      results.push({
        destinationId: d.id,
        provider: d.provider,
        label: d.label,
        ok: true,
      });
    } else {
      results.push({
        destinationId: d.id,
        provider: d.provider,
        label: d.label,
        ok: false,
        error: sent.error,
      });
    }
  }

  return results;
}
