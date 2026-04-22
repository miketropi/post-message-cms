import { NextResponse } from "next/server";

import { recomputeMessageStatusFromDeliveries } from "@/lib/messages/message-status";
import { deliverPlainTextToDestination } from "@/lib/messages/dispatch";
import type { DeliveryResult } from "@/lib/messages/dispatch";
import { requireUserSession, userOwnsWorkspace } from "@/lib/admin-api";
import {
  PROVIDER_DISCORD_BOT,
  PROVIDER_GOOGLE_CHAT_INCOMING_WEBHOOK,
  PROVIDER_SLACK_INCOMING_WEBHOOK,
  PROVIDER_SMTP_MAIL,
  PROVIDER_TEAMS_INCOMING_WEBHOOK,
  PROVIDER_TELEGRAM_BOT,
} from "@/lib/providers/types";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireUserSession();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: messageId } = await context.params;

  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });
  if (!message) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const allowed = await userOwnsWorkspace(auth.userId, message.workspaceId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const allDeliveries = await prisma.delivery.findMany({
    where: { messageId },
    orderBy: { createdAt: "asc" },
  });

  const byDest = new Map<string, (typeof allDeliveries)[0]>();
  for (const d of allDeliveries) {
    byDest.set(d.destinationId, d);
  }
  const latest = [...byDest.values()];
  const failedDestIds = latest
    .filter((d) => d.status === "FAILED")
    .map((d) => d.destinationId);

  if (failedDestIds.length === 0) {
    return NextResponse.json({
      ok: true,
      workspaceId: message.workspaceId,
      branch: message.branch,
      received: tryParseJson(message.rawBody),
      deliveries: [] as DeliveryResult[],
      idempotencyKey: message.idempotencyKey ?? undefined,
      notice: "No failed destinations to retry for this message.",
    });
  }

  const destinations = await prisma.destination.findMany({
    where: {
      id: { in: failedDestIds },
      workspaceId: message.workspaceId,
      enabled: true,
      provider: {
        in: [
          PROVIDER_SLACK_INCOMING_WEBHOOK,
          PROVIDER_TEAMS_INCOMING_WEBHOOK,
          PROVIDER_GOOGLE_CHAT_INCOMING_WEBHOOK,
          PROVIDER_DISCORD_BOT,
          PROVIDER_TELEGRAM_BOT,
          PROVIDER_SMTP_MAIL,
        ],
      },
    },
  });
  if (destinations.length === 0) {
    return NextResponse.json({
      ok: true,
      workspaceId: message.workspaceId,
      branch: message.branch,
      received: tryParseJson(message.rawBody),
      deliveries: [] as DeliveryResult[],
      idempotencyKey: message.idempotencyKey ?? undefined,
      notice:
        "Failed destinations are disabled or use an unsupported provider; nothing was retried.",
    });
  }

  const maxAttemptByDest = new Map<string, number>();
  for (const d of allDeliveries) {
    const prev = maxAttemptByDest.get(d.destinationId) ?? 0;
    if (d.attempt > prev) {
      maxAttemptByDest.set(d.destinationId, d.attempt);
    }
  }

  const v1: DeliveryResult[] = [];
  const rows: {
    destinationId: string;
    log: (Awaited<ReturnType<typeof deliverPlainTextToDestination>>)["log"];
  }[] = [];

  for (const dest of destinations) {
    const nextAttempt = (maxAttemptByDest.get(dest.id) ?? 0) + 1;
    const { v1: out, log } = await deliverPlainTextToDestination(
      {
        id: dest.id,
        provider: dest.provider,
        label: dest.label,
        secretEncrypted: dest.secretEncrypted,
      },
      message.text,
      { attempt: nextAttempt },
    );
    v1.push(out);
    rows.push({ destinationId: dest.id, log });
  }

  await prisma.$transaction(async (tx) => {
    for (const { destinationId, log } of rows) {
      await tx.delivery.create({
        data: {
          messageId,
          destinationId,
          provider: log.provider,
          status: log.status,
          httpStatus: log.httpStatus,
          error: log.error,
          duration: log.duration,
          attempt: log.attempt,
        },
      });
    }

    const all = await tx.delivery.findMany({
      where: { messageId },
      orderBy: { createdAt: "asc" },
      select: {
        destinationId: true,
        status: true,
        createdAt: true,
      },
    });

    const nextStatus = recomputeMessageStatusFromDeliveries(all);
    await tx.message.update({
      where: { id: messageId },
      data: { status: nextStatus },
    });
  });

  const hadTargets = v1.length > 0;
  const anyOk = v1.some((d) => d.ok);

  return NextResponse.json(
    {
      ok: !hadTargets || anyOk,
      workspaceId: message.workspaceId,
      branch: message.branch,
      received: tryParseJson(message.rawBody),
      deliveries: v1,
      idempotencyKey: message.idempotencyKey ?? undefined,
    },
    { status: hadTargets && !anyOk ? 502 : 200 },
  );
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { text: raw };
  }
}
