import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import { adminPageIntro, adminPageTitle, linkInline } from "../ui";
import { MessagesPanel } from "./messages-panel";

export default async function AdminMessagesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const workspaces = await prisma.workspace.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <h1 className={adminPageTitle}>Message log</h1>
      <p className={adminPageIntro}>
        Inbound API traffic from{" "}
        <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
          POST /api/v1/messages
        </code>{" "}
        is saved per workspace for debugging and{" "}
        <Link href="#retry" className={linkInline}>
          retry
        </Link>{" "}
        of failed destinations.
      </p>
      <div className="mt-8" id="retry">
        <MessagesPanel workspaces={workspaces} />
      </div>
    </div>
  );
}
