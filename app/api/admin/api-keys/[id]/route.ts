import { NextResponse } from "next/server";

import { requireUserSession, userOwnsWorkspace } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireUserSession();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.apiKey.findUnique({
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

  await prisma.apiKey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
