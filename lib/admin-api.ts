import "server-only";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function requireUserSession() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true },
  });
  if (!user) return null;
  return { userId: user.id };
}

export async function resolveWorkspaceForUser(
  userId: string,
  requestedWorkspaceId: string | undefined,
): Promise<string | null> {
  const workspaces = await prisma.workspace.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (workspaces.length === 0) return null;
  if (requestedWorkspaceId) {
    const allowed = workspaces.some((w) => w.id === requestedWorkspaceId);
    return allowed ? requestedWorkspaceId : null;
  }
  return workspaces[0]?.id ?? null;
}

export async function userOwnsWorkspace(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const row = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId },
    select: { id: true },
  });
  return Boolean(row);
}
