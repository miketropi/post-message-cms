import "server-only";

import type { DeliveryStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { resolveMessageStatus } from "./message-status";

export type PendingDeliveryRow = {
  destinationId: string;
  provider: string;
  status: DeliveryStatus;
  httpStatus: number | null;
  error: string | null;
  duration: number | null;
  attempt: number;
};

/**
 * Best-effort persistence. Never throws — errors are logged only.
 */
export async function tryPersistMessageLog(input: {
  workspaceId: string;
  apiKeyId: string;
  branch: string | null;
  idempotencyKey: string | null;
  rawBody: string;
  text: string;
  deliveries: PendingDeliveryRow[];
}): Promise<void> {
  try {
    const messageStatus = resolveMessageStatus(
      input.deliveries.map((d) => d.status),
    );

    await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          workspaceId: input.workspaceId,
          apiKeyId: input.apiKeyId,
          branch: input.branch,
          rawBody: input.rawBody,
          text: input.text,
          idempotencyKey: input.idempotencyKey,
          status: messageStatus,
        },
      });

      for (const d of input.deliveries) {
        await tx.delivery.create({
          data: {
            messageId: msg.id,
            destinationId: d.destinationId,
            provider: d.provider,
            status: d.status,
            httpStatus: d.httpStatus,
            error: d.error,
            duration: d.duration,
            attempt: d.attempt,
          },
        });
      }
    });
  } catch (err) {
    console.error("[message-log] Failed to save message:", err);
  }
}
