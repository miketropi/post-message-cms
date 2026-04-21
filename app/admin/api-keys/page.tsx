import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

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
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        API keys
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Use keys with{" "}
        <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">
          POST /api/v1/messages
        </code>{" "}
        (Bearer or{" "}
        <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">
          X-Api-Key
        </code>
        ). Add a Slack webhook under{" "}
        <Link
          href="/admin/destinations"
          className="text-blue-600 underline dark:text-blue-400"
        >
          Destinations
        </Link>{" "}
        for the same workspace.
      </p>
      <div className="mt-8">
        <ApiKeysPanel workspaces={workspaces} initialKeys={initialKeys} />
      </div>
    </div>
  );
}
