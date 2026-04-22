import { NextResponse } from "next/server";

import { requireUserSession, userOwnsWorkspace } from "@/lib/admin-api";
import { deliverPlainTextToDestination } from "@/lib/messages/dispatch";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_TEST_LENGTH = 16_000;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUserSession();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  let body: { text?: string } = {};
  try {
    const t = await request.text();
    if (t) body = JSON.parse(t) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const textRaw = typeof body.text === "string" ? body.text : "";
  if (textRaw.length > MAX_TEST_LENGTH) {
    return NextResponse.json(
      { error: `Message too long (max ${MAX_TEST_LENGTH} characters).` },
      { status: 400 },
    );
  }

  const dest = await prisma.destination.findUnique({
    where: { id },
    select: {
      id: true,
      workspaceId: true,
      provider: true,
      label: true,
      secretEncrypted: true,
    },
  });
  if (!dest) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const allowed = await userOwnsWorkspace(auth.userId, dest.workspaceId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { v1: result } = await deliverPlainTextToDestination(
    {
      id: dest.id,
      provider: dest.provider,
      label: dest.label,
      secretEncrypted: dest.secretEncrypted,
    },
    textRaw,
  );

  const status = result.ok ? 200 : 502;
  return NextResponse.json(
    {
      ok: result.ok,
      destinationId: result.destinationId,
      label: result.label,
      provider: result.provider,
      error: result.error,
    },
    { status },
  );
}
