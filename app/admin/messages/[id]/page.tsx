import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Hash, Inbox, MessageCircle } from "lucide-react";

import { getSession } from "@/lib/auth/session";
import { latestDeliveryRowsByDestination } from "@/lib/messages/delivery-aggregate";
import { DeliveryStatus } from "@/app/generated/prisma/enums";
import { userOwnsWorkspace } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

import { MessageRetryButton } from "../message-retry-button";
import {
  adminContentStack,
  adminPageTitle,
  bodyText,
  cardSection,
  codeBlockPre,
  linkInline,
  sectionTitle,
} from "../../ui";
import { cn } from "@/lib/cn";

type PageProps = { params: Promise<{ id: string }> };

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw) as unknown, null, 2);
  } catch {
    return raw;
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "SUCCESS":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200";
    case "PARTIAL":
      return "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100";
    case "FAILED":
      return "bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200";
    case "NO_MATCH":
    default:
      return "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
  }
}

export default async function AdminMessageDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const message = await prisma.message.findUnique({
    where: { id },
    include: {
      apiKey: { select: { publicLabel: true, name: true } },
      deliveries: {
        orderBy: { createdAt: "asc" },
        include: {
          destination: { select: { id: true, label: true, provider: true } },
        },
      },
    },
  });
  if (!message) {
    notFound();
  }

  const allowed = await userOwnsWorkspace(
    session.userId,
    message.workspaceId,
  );
  if (!allowed) {
    notFound();
  }

  const canRetry = latestDeliveryRowsByDestination(
    message.deliveries.map((d) => ({
      destinationId: d.destinationId,
      status: d.status,
      createdAt: d.createdAt,
    })),
  ).some((d) => d.status === DeliveryStatus.FAILED);

  return (
    <div>
      <p className="text-sm text-zinc-500">
        <Link href="/admin/messages" className={linkInline}>
          Message log
        </Link>{" "}
        / <span className="text-zinc-700 dark:text-zinc-300">Detail</span>
      </p>
      <h1 className={`${adminPageTitle} mt-2 flex flex-wrap items-center gap-2`}>
        <MessageCircle className="h-7 w-7 text-primary" strokeWidth={2} />
        Message
      </h1>

      <div className={adminContentStack}>
        <div className={`${cardSection} space-y-3`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Status
              </p>
              <span
                className={cn(
                  "mt-1 inline-flex rounded-md px-2.5 py-1 text-sm font-medium",
                  statusBadgeClass(message.status),
                )}
              >
                {message.status}
              </span>
            </div>
            <p className="text-sm text-zinc-500">
              {new Date(message.createdAt).toLocaleString()}
            </p>
          </div>
          {message.branch != null && message.branch !== "" ? (
            <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Hash className="h-4 w-4 shrink-0" />
              Branch:{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
                {message.branch}
              </code>
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Inbox className="h-4 w-4" />
              Default routing (no branch key)
            </p>
          )}
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">API key</p>
            <p className="text-sm text-zinc-800 dark:text-zinc-200">
              {message.apiKey.name?.trim() || message.apiKey.publicLabel}
            </p>
          </div>
          {message.idempotencyKey ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Idempotency-Key:{" "}
              <code className="rounded bg-zinc-100 px-1.5 font-mono text-xs dark:bg-zinc-800">
                {message.idempotencyKey}
              </code>
            </p>
          ) : null}
          <div>
            <h2 className={sectionTitle}>Text</h2>
            <p className={`${bodyText} mt-1 whitespace-pre-wrap`}>{message.text}</p>
          </div>
        </div>

        <div className={`${cardSection} space-y-2`}>
          <h2 className={sectionTitle}>Raw request body (JSON)</h2>
          <pre className={codeBlockPre}>{prettyJson(message.rawBody)}</pre>
        </div>

        <div className={`${cardSection} space-y-3`}>
          <h2 className={sectionTitle}>Deliveries</h2>
          <p className={bodyText}>
            Latest attempt per destination; older attempts stay in the log for
            audit.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700">
                  <th className="py-2 pr-2 font-medium">Destination</th>
                  <th className="py-2 pr-2 font-medium">Provider</th>
                  <th className="py-2 pr-2 font-medium">Status</th>
                  <th className="py-2 pr-2 font-medium">HTTP</th>
                  <th className="py-2 pr-2 font-medium">ms</th>
                  <th className="py-2 pr-2 font-medium">Attempt</th>
                  <th className="py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {message.deliveries.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-zinc-100 dark:border-zinc-800/80"
                  >
                    <td className="py-2 pr-2 align-top">
                      {d.destination.label}
                    </td>
                    <td className="py-2 pr-2 align-top font-mono text-xs">
                      {d.destination.provider}
                    </td>
                    <td className="py-2 pr-2 align-top">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium",
                          d.status === "SUCCESS"
                            ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
                            : "bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200",
                        )}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-2 pr-2 align-top">
                      {d.httpStatus ?? "—"}
                    </td>
                    <td className="py-2 pr-2 align-top">
                      {d.duration ?? "—"}
                    </td>
                    <td className="py-2 pr-2 align-top">{d.attempt}</td>
                    <td className="max-w-xs py-2 align-top break-words text-zinc-600 dark:text-zinc-400">
                      {d.error ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {message.deliveries.length === 0 ? (
              <p className="text-sm text-zinc-500">No delivery rows (NO_MATCH).</p>
            ) : null}
          </div>

          <MessageRetryButton messageId={message.id} show={canRetry} />
        </div>
      </div>
    </div>
  );
}
