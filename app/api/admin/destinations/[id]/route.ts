import { NextResponse } from "next/server";

import {
  buildDestinationFromBody,
  getDestinationCredentialsForForm,
  parseBranchKeyInput,
  type AdminDestinationRequestBody,
} from "@/lib/admin/destination-from-body";
import { requireUserSession, userOwnsWorkspace } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/secrets";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUserSession();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const row = await prisma.destination.findUnique({
    where: { id },
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
      secretEncrypted: true,
    },
  });
  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const allowed = await userOwnsWorkspace(auth.userId, row.workspaceId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let decrypted: string;
  try {
    decrypted = decryptString(row.secretEncrypted);
  } catch {
    return NextResponse.json(
      { error: "Could not read destination secret." },
      { status: 500 },
    );
  }

  const credentials = getDestinationCredentialsForForm(
    row.provider,
    decrypted,
  );

  return NextResponse.json({
    destination: {
      id: row.id,
      workspaceId: row.workspaceId,
      provider: row.provider,
      label: row.label,
      branchKey: row.branchKey,
      enabled: row.enabled,
      publicMeta: row.publicMeta,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      credentials,
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUserSession();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.destination.findUnique({
    where: { id },
    select: {
      workspaceId: true,
      provider: true,
      secretEncrypted: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const allowed = await userOwnsWorkspace(
    auth.userId,
    existing.workspaceId,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
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

  let branchKey: string | null;
  try {
    branchKey = parseBranchKeyInput(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid branchKey.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const enabled =
    typeof body.enabled === "boolean" ? body.enabled : undefined;

  let previousDecrypted: string;
  try {
    previousDecrypted = decryptString(existing.secretEncrypted);
  } catch {
    return NextResponse.json(
      { error: "Could not read existing secret." },
      { status: 500 },
    );
  }

  const built = buildDestinationFromBody(body, {
    provider: existing.provider,
    previousDecrypted,
  });
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: built.status });
  }

  const row = await prisma.destination.update({
    where: { id },
    data: {
      label,
      branchKey,
      enabled: enabled ?? undefined,
      secretEncrypted: built.secretEncrypted,
      publicMeta: built.publicMeta,
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
      updatedAt: true,
    },
  });

  return NextResponse.json({
    destination: {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireUserSession();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.destination.findUnique({
    where: { id },
    select: { workspaceId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const allowed = await userOwnsWorkspace(auth.userId, existing.workspaceId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.destination.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
