import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { requireUserSession, resolveWorkspaceForUser } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type CleanupResult = {
  deletedMessages: number;
  messageRetentionDays: number;
  cutoffBefore: string;
};

/**
 * Deletes `Message` rows (and cascade `Delivery`) older than each workspace’s
 * `messageRetentionDays`. Call on a schedule with `Authorization: Bearer` +
 * `CRON_SECRET`, or as a logged-in admin (session cookie).
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const hasBearer = request.headers
    .get("authorization")
    ?.startsWith("Bearer ");
  const hasCronEnv = Boolean(cronSecret?.trim());
  const validCron = isAuthorizedCronRequest(request, cronSecret);
  if (hasBearer && hasCronEnv && !validCron) {
    return NextResponse.json(
      { error: "Invalid CRON_SECRET." },
      { status: 401 },
    );
  }
  const viaCron = validCron;

  let body: { workspaceId?: string } = {};
  try {
    const t = await request.text();
    if (t) body = JSON.parse(t) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (viaCron) {
    if (body.workspaceId) {
      const one = await cleanupOneWorkspace(body.workspaceId);
      if (!one) {
        return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
      }
      return NextResponse.json({
        ...one,
        workspaceId: body.workspaceId,
        auth: "cron" as const,
      });
    }

    const rows = await prisma.workspace.findMany({
      select: { id: true },
    });
    const parts: (CleanupResult & { workspaceId: string })[] = [];
    let total = 0;
    for (const w of rows) {
      const r = await cleanupOneWorkspace(w.id);
      if (r) {
        total += r.deletedMessages;
        parts.push({ workspaceId: w.id, ...r });
      }
    }
    return NextResponse.json({
      deletedMessages: total,
      auth: "cron" as const,
      workspaces: parts,
    });
  }

  const auth = await requireUserSession();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const workspaceId = await resolveWorkspaceForUser(
    auth.userId,
    body.workspaceId,
  );
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Workspace not found or not allowed." },
      { status: 400 },
    );
  }

  const one = await cleanupOneWorkspace(workspaceId);
  if (!one) {
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ...one,
    workspaceId,
    auth: "session" as const,
  });
}

async function cleanupOneWorkspace(
  workspaceId: string,
): Promise<CleanupResult | null> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { messageRetentionDays: true },
  });
  if (!ws) {
    return null;
  }

  const days = Math.max(1, ws.messageRetentionDays);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const res = await prisma.message.deleteMany({
    where: {
      workspaceId,
      createdAt: { lt: cutoff },
    },
  });

  return {
    deletedMessages: res.count,
    messageRetentionDays: days,
    cutoffBefore: cutoff.toISOString(),
  };
}
