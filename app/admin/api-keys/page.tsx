import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import { adminContentStack, adminPageIntro, adminPageTitle, linkInline } from "../ui";
import { ApiKeysPanel, type ApiKeyRow } from "./api-keys-panel";

export default async function AdminApiKeysPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const workspaces = await prisma.workspace.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  const workspaceIds = workspaces.map((w) => w.id);
  const keys = await prisma.apiKey.findMany({
    where: { workspaceId: { in: workspaceIds } },
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

  const initialKeys: ApiKeyRow[] = keys.map((k) => ({
    id: k.id,
    workspaceId: k.workspaceId,
    name: k.name,
    publicLabel: k.publicLabel,
    scopes: k.scopes,
    createdAt: k.createdAt.toISOString(),
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
  }));

  return (
    <div>
      <h1 className={adminPageTitle}>API keys</h1>
      <p className={adminPageIntro}>
        Use keys with{" "}
        <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
          POST /api/v1/messages
        </code>{" "}
        (Bearer or{" "}
        <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
          X-Api-Key
        </code>
        ). Add a destination (Slack, Discord, or Telegram) under{" "}
        <Link href="/admin/destinations" className={linkInline}>
          Destinations
        </Link>{" "}
        for the same workspace.
      </p>
      <div className={adminContentStack}>
        <ApiKeysPanel workspaces={workspaces} initialKeys={initialKeys} />
      </div>
    </div>
  );
}
