import { NextResponse } from "next/server";

import type { Prisma } from "@/app/generated/prisma/client";
import { MessageStatus } from "@/app/generated/prisma/enums";
import { requireUserSession, resolveWorkspaceForUser } from "@/lib/admin-api";
import {
  deliveryStatsFromLatest,
  latestDeliveryRowsByDestination,
} from "@/lib/messages/delivery-aggregate";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ALL_STATUSES = new Set<string>(Object.values(MessageStatus));

export async function GET(request: Request) {
  const auth = await requireUserSession();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20),
  );
  const branchQ = searchParams.get("branch");
  const statusQ = searchParams.get("status");
  const fromQ = searchParams.get("from");
  const toQ = searchParams.get("to");
  const workspaceQ = searchParams.get("workspaceId") ?? undefined;

  if (statusQ && !ALL_STATUSES.has(statusQ)) {
    return NextResponse.json(
      { error: "Invalid status filter." },
      { status: 400 },
    );
  }

  const workspaceId = await resolveWorkspaceForUser(
    auth.userId,
    workspaceQ,
  );
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Workspace not found or not allowed." },
      { status: 400 },
    );
  }

  const and: Prisma.MessageWhereInput[] = [{ workspaceId }];

  if (statusQ) {
    and.push({ status: statusQ as MessageStatus });
  }

  if (branchQ != null) {
    const b = branchQ.trim();
    if (b.length === 0 || b === "default") {
      and.push({ branch: null });
    } else {
      and.push({ branch: b });
    }
  }

  if (fromQ || toQ) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (fromQ) {
      const t = new Date(fromQ);
      if (Number.isNaN(t.getTime())) {
        return NextResponse.json(
          { error: "Invalid `from` date (use ISO 8601)." },
          { status: 400 },
        );
      }
      createdAt.gte = t;
    }
    if (toQ) {
      const t = new Date(toQ);
      if (Number.isNaN(t.getTime())) {
        return NextResponse.json(
          { error: "Invalid `to` date (use ISO 8601)." },
          { status: 400 },
        );
      }
      createdAt.lte = t;
    }
    and.push({ createdAt });
  }

  const where: Prisma.MessageWhereInput = { AND: and };

  const [total, rows] = await prisma.$transaction([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        branch: true,
        text: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const ids = rows.map((r) => r.id);
  const deliveries =
    ids.length > 0
      ? await prisma.delivery.findMany({
          where: { messageId: { in: ids } },
          select: {
            messageId: true,
            destinationId: true,
            status: true,
            createdAt: true,
          },
        })
      : [];

  const byMessage = new Map<string, typeof deliveries>();
  for (const d of deliveries) {
    if (!byMessage.has(d.messageId)) {
      byMessage.set(d.messageId, []);
    }
    byMessage.get(d.messageId)!.push(d);
  }

  return NextResponse.json({
    messages: rows.map((m) => {
      const drows = byMessage.get(m.id) ?? [];
      const latest = latestDeliveryRowsByDestination(drows);
      const stats = deliveryStatsFromLatest(latest);
      return {
        id: m.id,
        branch: m.branch,
        text: m.text,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
        deliveryCount: stats.deliveryCount,
        deliverySuccess: stats.deliverySuccess,
        deliveryFailed: stats.deliveryFailed,
      };
    }),
    pagination: { page, limit, total },
  });
}
