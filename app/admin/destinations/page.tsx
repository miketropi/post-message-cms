import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import { DestinationsPanel, type DestinationRow } from "./destinations-panel";

export default async function AdminDestinationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const workspaces = await prisma.workspace.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  const workspaceIds = workspaces.map((w) => w.id);
  const destinations = await prisma.destination.findMany({
    where: { workspaceId: { in: workspaceIds } },
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

  const initialDestinations: DestinationRow[] = destinations.map((d) => ({
    id: d.id,
    workspaceId: d.workspaceId,
    provider: d.provider,
    label: d.label,
    publicMeta: d.publicMeta,
    enabled: d.enabled,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Destinations
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        <strong className="font-medium text-zinc-800 dark:text-zinc-200">
          Slack
        </strong>{" "}
        uses{" "}
        <a
          href="https://api.slack.com/messaging/webhooks"
          className="text-blue-600 underline dark:text-blue-400"
          target="_blank"
          rel="noopener noreferrer"
        >
          Incoming Webhooks
        </a>
        .{" "}
        <strong className="font-medium text-zinc-800 dark:text-zinc-200">
          Discord
        </strong>{" "}
        uses a bot token and channel ID (
        <a
          href="https://discord.com/developers/docs/resources/channel#create-message"
          className="text-blue-600 underline dark:text-blue-400"
          target="_blank"
          rel="noopener noreferrer"
        >
          Create Message
        </a>
        ).{" "}
        <strong className="font-medium text-zinc-800 dark:text-zinc-200">
          Telegram
        </strong>{" "}
        uses a bot token from{" "}
        <a
          href="https://t.me/BotFather"
          className="text-blue-600 underline dark:text-blue-400"
          target="_blank"
          rel="noopener noreferrer"
        >
          @BotFather
        </a>{" "}
        and a{" "}
        <a
          href="https://core.telegram.org/bots/api#sendmessage"
          className="text-blue-600 underline dark:text-blue-400"
          target="_blank"
          rel="noopener noreferrer"
        >
          chat_id
        </a>{" "}
        (numeric or @channel). Use the same workspace as your API key for{" "}
        <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">
          POST /api/v1/messages
        </code>
        .
      </p>
      <div className="mt-8">
        <DestinationsPanel
          workspaces={workspaces}
          initialDestinations={initialDestinations}
        />
      </div>
    </div>
  );
}
