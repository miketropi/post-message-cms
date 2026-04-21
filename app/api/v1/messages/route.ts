import { NextResponse } from "next/server";

import {
  SCOPE_MESSAGES_WRITE,
  extractApiKeyFromRequest,
  hasApiKeyScope,
  hashApiKey,
} from "@/lib/api-keys";
import { dispatchIncomingMessage } from "@/lib/messages/dispatch";
import {
  assertValidRequestBranch,
  parseIncomingMessageBody,
} from "@/lib/messages/routing";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawKey = extractApiKeyFromRequest(request);
  if (!rawKey) {
    return NextResponse.json(
      { error: "Missing API key. Send Authorization: Bearer <key> or X-Api-Key." },
      { status: 401 },
    );
  }

  const keyHash = hashApiKey(rawKey);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });
  if (!apiKey) {
    return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
  }

  if (!hasApiKeyScope(apiKey.scopes, SCOPE_MESSAGES_WRITE)) {
    return NextResponse.json(
      { error: "This key does not have the messages:write scope." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body." }, { status: 400 });
  }

  const parsed = parseIncomingMessageBody(body);
  const branchFromQuery =
    new URL(request.url).searchParams.get("branch") ?? undefined;
  let branch: string | undefined;
  try {
    branch = assertValidRequestBranch(parsed.branch ?? branchFromQuery);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid branch.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  const idempotencyKey = request.headers.get("idempotency-key") ?? undefined;

  const deliveries = await dispatchIncomingMessage(
    apiKey.workspaceId,
    parsed.bodyForText,
    { branch },
  );
  const hadTargets = deliveries.length > 0;
  const anyOk = deliveries.some((d) => d.ok);

  const payload = {
    ok: !hadTargets || anyOk,
    workspaceId: apiKey.workspaceId,
    branch: branch ?? null,
    received: body,
    deliveries,
    idempotencyKey,
    ...(hadTargets
      ? {}
      : {
          notice: branch
            ? `No enabled destinations for branch "${branch}". Add a destination with this branch key under Admin → Destinations, or omit branch to use default destinations.`
            : "No enabled destinations for this workspace. Add Slack, Discord, or Telegram under Admin → Destinations.",
        }),
  };

  const status = hadTargets && !anyOk ? 502 : 200;
  return NextResponse.json(payload, { status });
}
