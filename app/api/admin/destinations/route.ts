import { NextResponse } from "next/server";

import { requireUserSession, resolveWorkspaceForUser } from "@/lib/admin-api";
import { PROVIDER_SLACK_INCOMING_WEBHOOK } from "@/lib/providers/types";
import {
  assertSlackIncomingWebhookUrl,
  slackWebhookPublicMeta,
} from "@/lib/providers/slack/validate";
import { prisma } from "@/lib/prisma";
import { encryptString } from "@/lib/secrets";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUserSession();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const workspaces = await prisma.workspace.findMany({
    where: { userId: auth.userId },
    select: { id: true },
  });
  const ids = workspaces.map((w) => w.id);

  const rows = await prisma.destination.findMany({
    where: { workspaceId: { in: ids } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      workspaceId: true,
      provider: true,
      label: true,
      publicMeta: true,
      enabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    destinations: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireUserSession();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: {
    workspaceId?: string;
    label?: string;
    webhookUrl?: string;
  } = {};
  try {
    const t = await request.text();
    if (t) body = JSON.parse(t) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const label = body.label?.trim();
  const webhookUrl = body.webhookUrl?.trim();
  if (!label) {
    return NextResponse.json({ error: "label is required." }, { status: 400 });
  }
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "webhookUrl is required." },
      { status: 400 },
    );
  }

  try {
    assertSlackIncomingWebhookUrl(webhookUrl);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid webhook URL.";
    return NextResponse.json({ error: msg }, { status: 400 });
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

  const secretEncrypted = encryptString(webhookUrl);
  const publicMeta = slackWebhookPublicMeta(webhookUrl);

  const row = await prisma.destination.create({
    data: {
      workspaceId,
      provider: PROVIDER_SLACK_INCOMING_WEBHOOK,
      label,
      secretEncrypted,
      publicMeta,
    },
    select: {
      id: true,
      workspaceId: true,
      provider: true,
      label: true,
      publicMeta: true,
      enabled: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    destination: {
      ...row,
      createdAt: row.createdAt.toISOString(),
    },
  });
}
