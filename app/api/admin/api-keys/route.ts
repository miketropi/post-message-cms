import { NextResponse } from "next/server";

import {
  DEFAULT_API_KEY_SCOPES,
  generateApiKey,
} from "@/lib/api-keys";
import { requireUserSession, resolveWorkspaceForUser } from "@/lib/admin-api";
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
  const keys = await prisma.apiKey.findMany({
    where: { workspaceId: { in: ids } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      publicLabel: true,
      scopes: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  return NextResponse.json({
    keys: keys.map((k) => ({
      ...k,
      createdAt: k.createdAt.toISOString(),
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireUserSession();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { name?: string; workspaceId?: string } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
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

  const { raw, publicLabel, keyHash } = generateApiKey();
  const scopes = DEFAULT_API_KEY_SCOPES;

  const row = await prisma.apiKey.create({
    data: {
      workspaceId,
      name: body.name?.trim() || null,
      publicLabel,
      keyHash,
      scopes,
    },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      publicLabel: true,
      scopes: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    key: raw,
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    publicLabel: row.publicLabel,
    scopes: row.scopes,
    createdAt: row.createdAt.toISOString(),
  });
}
