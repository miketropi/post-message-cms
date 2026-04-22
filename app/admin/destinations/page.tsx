import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import {
  adminContentStack,
  adminPageIntro,
  adminPageTitle,
  linkInline,
} from "../ui";
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
      branchKey: true,
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
    branchKey: d.branchKey,
    enabled: d.enabled,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  return (
    <div>
      <h1 className={adminPageTitle}>Destinations</h1>
      <p className={adminPageIntro}>
        Add destinations in a short guided flow: pick{" "}
        <strong className="font-medium text-zinc-800 dark:text-zinc-200">
          Slack
        </strong>{" "}
        (
        <a
          href="https://api.slack.com/messaging/webhooks"
          className={linkInline}
          target="_blank"
          rel="noopener noreferrer"
        >
          webhooks
        </a>
        ),{" "}
        <strong className="font-medium text-zinc-800 dark:text-zinc-200">
          Discord
        </strong>{" "}
        (bot +{" "}
        <a
          href="https://discord.com/developers/docs/resources/channel#create-message"
          className={linkInline}
          target="_blank"
          rel="noopener noreferrer"
        >
          channel
        </a>
        ), or{" "}
        <strong className="font-medium text-zinc-800 dark:text-zinc-200">
          Telegram
        </strong>{" "}
        (
        <a
          href="https://t.me/BotFather"
          className={linkInline}
          target="_blank"
          rel="noopener noreferrer"
        >
          @BotFather
        </a>{" "}
        +{" "}
        <a
          href="https://core.telegram.org/bots/api#sendmessage"
          className={linkInline}
          target="_blank"
          rel="noopener noreferrer"
        >
          chat_id
        </a>
        ), or{" "}
        <strong className="font-medium text-zinc-800 dark:text-zinc-200">
          SMTP
        </strong>{" "}
        (email with <strong className="font-medium">per-destination</strong>{" "}
        server and sender). Match the workspace your API key uses for{" "}
        <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">
          POST /api/v1/messages
        </code>
        .
      </p>
      <div className={adminContentStack}>
        <DestinationsPanel
          workspaces={workspaces}
          initialDestinations={initialDestinations}
        />
      </div>
    </div>
  );
}
