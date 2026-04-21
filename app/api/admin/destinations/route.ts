import { NextResponse } from "next/server";

import { requireUserSession, resolveWorkspaceForUser } from "@/lib/admin-api";
import {
  assertDiscordBotDestination,
  discordDestinationPublicMeta,
  normalizeDiscordBotToken,
} from "@/lib/providers/discord/validate";
import { discordSecretToJson } from "@/lib/providers/discord/secret";
import {
  assertTelegramBotDestination,
  telegramDestinationPublicMeta,
} from "@/lib/providers/telegram/validate";
import { telegramSecretToJson } from "@/lib/providers/telegram/secret";
import {
  PROVIDER_DISCORD_BOT,
  PROVIDER_SLACK_INCOMING_WEBHOOK,
  PROVIDER_TELEGRAM_BOT,
} from "@/lib/providers/types";
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
    provider?: string;
    webhookUrl?: string;
    botToken?: string;
    channelId?: string;
    chatId?: string;
  } = {};
  try {
    const t = await request.text();
    if (t) body = JSON.parse(t) as typeof body;
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

  let secretEncrypted: string;
  let publicMeta: string;
  let providerRow: string;

  if (provider === PROVIDER_SLACK_INCOMING_WEBHOOK) {
    const webhookUrl = body.webhookUrl?.trim();
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "webhookUrl is required for Slack." },
        { status: 400 },
      );
    }
    try {
      assertSlackIncomingWebhookUrl(webhookUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid webhook URL.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    secretEncrypted = encryptString(webhookUrl);
    publicMeta = slackWebhookPublicMeta(webhookUrl);
    providerRow = PROVIDER_SLACK_INCOMING_WEBHOOK;
  } else if (provider === PROVIDER_DISCORD_BOT) {
    const botToken = body.botToken?.trim() ?? "";
    const channelId = body.channelId?.trim() ?? "";
    if (!botToken || !channelId) {
      return NextResponse.json(
        { error: "botToken and channelId are required for Discord." },
        { status: 400 },
      );
    }
    try {
      assertDiscordBotDestination(botToken, channelId);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Invalid Discord credentials.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    secretEncrypted = encryptString(
      discordSecretToJson({
        botToken: normalizeDiscordBotToken(botToken),
        channelId,
      }),
    );
    publicMeta = discordDestinationPublicMeta(channelId);
    providerRow = PROVIDER_DISCORD_BOT;
  } else if (provider === PROVIDER_TELEGRAM_BOT) {
    const botToken = body.botToken?.trim() ?? "";
    const chatId = body.chatId?.trim() ?? "";
    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: "botToken and chatId are required for Telegram." },
        { status: 400 },
      );
    }
    try {
      assertTelegramBotDestination(botToken, chatId);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Invalid Telegram credentials.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    secretEncrypted = encryptString(
      telegramSecretToJson({ botToken, chatId }),
    );
    publicMeta = telegramDestinationPublicMeta(chatId);
    providerRow = PROVIDER_TELEGRAM_BOT;
  } else {
    return NextResponse.json(
      {
        error: `Unknown provider. Use "${PROVIDER_SLACK_INCOMING_WEBHOOK}", "${PROVIDER_DISCORD_BOT}", or "${PROVIDER_TELEGRAM_BOT}".`,
      },
      { status: 400 },
    );
  }

  const row = await prisma.destination.create({
    data: {
      workspaceId,
      provider: providerRow,
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
