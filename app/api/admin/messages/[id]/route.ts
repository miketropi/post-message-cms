import { NextResponse } from "next/server";

import { requireUserSession, userOwnsWorkspace } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUserSession();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  const message = await prisma.message.findUnique({
    where: { id },
    select: { workspaceId: true },
  });
  if (!message) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const allowed = await userOwnsWorkspace(auth.userId, message.workspaceId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const full = await prisma.message.findFirst({
    where: { id },
    include: {
      apiKey: { select: { id: true, publicLabel: true, name: true } },
      deliveries: {
        orderBy: { createdAt: "asc" },
        include: {
          destination: {
            select: { id: true, label: true, provider: true },
          },
        },
      },
    },
  });

  if (!full) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: full.id,
    branch: full.branch,
    rawBody: full.rawBody,
    text: full.text,
    status: full.status,
    idempotencyKey: full.idempotencyKey,
    createdAt: full.createdAt.toISOString(),
    apiKey: {
      id: full.apiKey.id,
      label: full.apiKey.name?.trim() || full.apiKey.publicLabel,
    },
    deliveries: full.deliveries.map((d) => ({
      id: d.id,
      destination: {
        id: d.destination.id,
        label: d.destination.label,
        provider: d.destination.provider,
      },
      status: d.status,
      httpStatus: d.httpStatus,
      error: d.error,
      duration: d.duration,
      attempt: d.attempt,
      createdAt: d.createdAt.toISOString(),
    })),
  });
}
