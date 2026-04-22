import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  CircleUser,
  KeyRound,
  Radio,
  Share2,
  Sparkles,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CopyButton } from "@/app/admin/copy-button";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getRequestBaseUrl } from "@/lib/request-base-url";
import { cn } from "@/lib/cn";
import {
  PROVIDER_DISCORD_BOT,
  PROVIDER_GOOGLE_CHAT_INCOMING_WEBHOOK,
  PROVIDER_SLACK_INCOMING_WEBHOOK,
  PROVIDER_SMTP_MAIL,
  PROVIDER_TEAMS_INCOMING_WEBHOOK,
  PROVIDER_TELEGRAM_BOT,
} from "@/lib/providers/types";

function providerLabel(provider: string): string {
  switch (provider) {
    case PROVIDER_SLACK_INCOMING_WEBHOOK:
      return "Slack";
    case PROVIDER_DISCORD_BOT:
      return "Discord";
    case PROVIDER_TELEGRAM_BOT:
      return "Telegram";
    case PROVIDER_SMTP_MAIL:
      return "SMTP";
    case PROVIDER_TEAMS_INCOMING_WEBHOOK:
      return "Teams";
    case PROVIDER_GOOGLE_CHAT_INCOMING_WEBHOOK:
      return "Google Chat";
    default:
      return provider;
  }
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default async function AdminHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, baseUrl] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, firstName: true, lastName: true },
    }),
    getRequestBaseUrl(),
  ]);
  if (!user) redirect("/login");

  const workspaces = await prisma.workspace.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  const workspaceIds = workspaces.map((w) => w.id);

  const [destinations, apiKeys] = await Promise.all([
    prisma.destination.findMany({
      where: { workspaceId: { in: workspaceIds } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        label: true,
        provider: true,
        enabled: true,
        branchKey: true,
        createdAt: true,
      },
    }),
    prisma.apiKey.findMany({
      where: { workspaceId: { in: workspaceIds } },
      orderBy: { createdAt: "desc" },
      select: {
        name: true,
        publicLabel: true,
        lastUsedAt: true,
        createdAt: true,
      },
    }),
  ]);

  const destEnabled = destinations.filter((d) => d.enabled).length;
  const branchCount = new Set(
    destinations.filter((d) => d.branchKey).map((d) => d.branchKey as string),
  ).size;

  const providerCounts = destinations.reduce<Record<string, number>>(
    (acc, d) => {
      acc[d.provider] = (acc[d.provider] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const latestKeyUse = apiKeys.reduce<Date | null>((max, k) => {
    if (!k.lastUsedAt) return max;
    return !max || k.lastUsedAt > max ? k.lastUsedAt : max;
  }, null);

  const messagesUrl = `${baseUrl}/api/v1/messages`;
  const curlExample = `curl -sS -X POST ${messagesUrl} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"text":"Hello from my app"}'`;

  const steps = [
    {
      done: destEnabled > 0,
      title: "Add a destination",
      detail: "Connect Slack, Discord, or Telegram so messages have somewhere to go.",
      href: "/admin/destinations",
    },
    {
      done: apiKeys.length > 0,
      title: "Create an API key",
      detail: "Keys authenticate POST /api/v1/messages. Copy it once when created.",
      href: "/admin/api-keys",
    },
    {
      done: destEnabled > 0 && apiKeys.length > 0,
      title: "Send a test message",
      detail: "Use curl or your stack to hit the messaging endpoint and check deliveries in the response.",
      href: "/admin/guide",
    },
  ];
  const completedSteps = steps.filter((s) => s.done).length;

  const f = user.firstName?.trim() ?? "";
  const l = user.lastName?.trim() ?? "";
  const greetingName =
    f && l
      ? `${f} ${l}`
      : f || l || (user.email.includes("@") ? user.email.split("@")[0]! : user.email);

  return (
    <div className="space-y-8 md:space-y-10">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-3xl">
            Welcome back, {greetingName}
          </h1>
          <span
            className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-zinc-900 dark:text-primary"
            title="Primary workspace context"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {workspaces.length === 1
              ? workspaces[0]?.name ?? "Workspace"
              : `${workspaces.length} workspaces`}
          </span>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Your bridge is ready when you have at least one{" "}
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">
            destination
          </strong>{" "}
          and an{" "}
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">
            API key
          </strong>
          . Everything below updates from your live configuration.
        </p>
      </header>

      {/* Stats */}
      <section aria-label="Summary statistics">
        <h2 className="sr-only">Summary statistics</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Destinations"
            value={destEnabled}
            suffix={
              destinations.length !== destEnabled
                ? ` / ${destinations.length} total`
                : destinations.length
                  ? " active"
                  : ""
            }
            hint={
              destinations.length === 0
                ? "Add Slack, Discord, or Telegram"
                : `${destinations.length - destEnabled > 0 ? `${destinations.length - destEnabled} disabled · ` : ""}${Object.entries(providerCounts)
                    .map(([p, n]) => `${providerLabel(p)} ${n}`)
                    .join(" · ")}`
            }
          />
          <StatCard
            label="API keys"
            value={apiKeys.length}
            hint={
              apiKeys.length === 0
                ? "Create a key to call the API"
                : `Last used ${formatRelative(latestKeyUse?.toISOString() ?? null)}`
            }
          />
          <StatCard
            label="Branch routes"
            value={branchCount}
            hint={
              branchCount === 0
                ? "Optional: tag destinations for scoped sends"
                : "Distinct branch keys in use"
            }
          />
          <StatCard
            label="Workspaces"
            value={workspaces.length}
            hint={
              workspaces.length <= 2
                ? workspaces.map((w) => w.name).join(", ")
                : "Use Destinations to pick workspace per target"
            }
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
        {/* Setup + quick actions */}
        <div className="space-y-6 lg:col-span-3">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Setup checklist
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {completedSteps} of {steps.length} complete — finish the rest to
                  go live.
                </p>
              </div>
              <div
                className="h-2 w-32 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
                role="progressbar"
                aria-valuenow={completedSteps}
                aria-valuemin={0}
                aria-valuemax={steps.length}
                aria-label="Setup progress"
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{
                    width: `${(completedSteps / steps.length) * 100}%`,
                  }}
                />
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {steps.map((step) => (
                <li key={step.title}>
                  <Link
                    href={step.href}
                    className="group flex gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-zinc-200 hover:bg-zinc-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60"
                  >
                    {step.done ? (
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                        strokeWidth={2}
                        aria-hidden
                      />
                    ) : (
                      <Circle
                        className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400"
                        strokeWidth={2}
                        aria-hidden
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 font-medium text-zinc-900 dark:text-zinc-50">
                        {step.title}
                        <ArrowRight
                          className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden
                        />
                      </span>
                      <span className="mt-0.5 block text-sm text-zinc-600 dark:text-zinc-400">
                        {step.detail}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Quick actions
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <ActionCard
                href="/admin/destinations"
                title="Destinations"
                description="Webhooks, bots, branch keys"
                icon={Share2}
              />
              <ActionCard
                href="/admin/account"
                title="Account"
                description="Profile, password, Gravatar"
                icon={CircleUser}
              />
              <ActionCard
                href="/admin/api-keys"
                title="API keys"
                description="Issue and revoke access"
                icon={KeyRound}
              />
              <ActionCard
                href="/admin/guide"
                title="Developer guide"
                description="Examples per chat app"
                icon={BookOpen}
              />
              <ActionCard
                href="/api/health"
                title="Health check"
                description="GET JSON + DB ping"
                icon={Radio}
                external
              />
            </div>
          </section>
        </div>

        {/* Endpoint + curl */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 md:p-6">
            <div className="flex items-start gap-2">
              <Terminal
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                strokeWidth={2}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Messaging endpoint
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Send JSON with{" "}
                  <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
                    text
                  </code>
                  ,{" "}
                  <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
                    message
                  </code>
                  , or{" "}
                  <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
                    branch
                  </code>{" "}
                  for routing.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="block min-w-0 flex-1 truncate rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                {messagesUrl}
              </code>
              <CopyButton text={messagesUrl} label="Copy URL" />
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Try it
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-950 p-3 text-left text-[11px] leading-relaxed text-zinc-100 dark:border-zinc-700">
                <code>{curlExample}</code>
              </pre>
              <div className="mt-2">
                <CopyButton text={curlExample} label="Copy curl" />
              </div>
            </div>
          </section>

          {destinations.length > 0 ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 md:p-6">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Recent destinations
              </h2>
              <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
                {destinations.slice(0, 5).map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {d.label}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {providerLabel(d.provider)}
                        {d.branchKey ? ` · ${d.branchKey}` : " · default"}
                        {!d.enabled ? " · disabled" : ""}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-400">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/admin/destinations"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Manage all
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </section>
          ) : null}
        </div>
      </div>

      <p className="text-center text-xs text-zinc-500 dark:text-zinc-500">
        Need help?{" "}
        <Link
          href="/admin/guide"
          className="font-medium text-primary hover:underline"
        >
          Open the developer guide
        </Link>
        .
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix = "",
  hint,
}: {
  label: string;
  value: number;
  suffix?: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 md:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 md:text-3xl">
        <span className="text-primary">{value}</span>
        {suffix ? (
          <span className="text-lg font-medium text-zinc-500 dark:text-zinc-400">
            {suffix}
          </span>
        ) : null}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        {hint}
      </p>
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon: Icon,
  external,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={cn(
        "group flex gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-200",
        "hover:border-primary/40 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-primary/35",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-zinc-900 dark:text-primary">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 font-medium text-zinc-900 dark:text-zinc-50">
          {title}
          {external ? (
            <span className="text-xs font-normal text-zinc-400">↗</span>
          ) : (
            <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </span>
        <span className="mt-0.5 block text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </span>
      </span>
    </Link>
  );
}
