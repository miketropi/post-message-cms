import { NextResponse } from "next/server";

import {
  buildDestinationFromBody,
  parseBranchKeyInput,
  type AdminDestinationRequestBody,
} from "@/lib/admin/destination-from-body";
import { requireUserSession, resolveWorkspaceForUser } from "@/lib/admin-api";
import { PROVIDER_SLACK_INCOMING_WEBHOOK } from "@/lib/providers/types";
import { prisma } from "@/lib/prisma";

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
      branchKey: true,
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

  let body: AdminDestinationRequestBody = {};
  try {
    const t = await request.text();
    if (t) body = JSON.parse(t) as AdminDestinationRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const label = body.label?.trim();
  if (!label) {
    return NextResponse.json({ error: "label is required." }, { status: 400 });
  }

  const provider =
    body.provider?.trim() ?? PROVIDER_SLACK_INCOMING_WEBHOOK;

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

  let branchKey: string | null;
  try {
    branchKey = parseBranchKeyInput(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid branchKey.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const built = buildDestinationFromBody(body, {
    provider,
    previousDecrypted: null,
  });
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: built.status });
  }

  const row = await prisma.destination.create({
    data: {
      workspaceId,
      provider: built.provider,
      label,
      secretEncrypted: built.secretEncrypted,
      publicMeta: built.publicMeta,
      branchKey,
    },
    select: {
      id: true,
      workspaceId: true,
      provider: true,
      label: true,
      publicMeta: true,
      branchKey: true,
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
