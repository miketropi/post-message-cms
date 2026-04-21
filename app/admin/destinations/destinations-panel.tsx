"use client";

import { ChevronRight, Loader2, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/cn";
import {
  PROVIDER_DISCORD_BOT,
  PROVIDER_SLACK_INCOMING_WEBHOOK,
  PROVIDER_TELEGRAM_BOT,
} from "@/lib/providers/types";

import {
  alertError,
  btnDangerGhost,
  btnPrimary,
  cardSection,
  emptyStateDashed,
  fieldInput,
  fieldLabel,
  listItemCard,
  sectionIntro,
  sectionTitle,
} from "../ui";

type WorkspaceOption = { id: string; name: string };

export type DestinationRow = {
  id: string;
  workspaceId: string;
  provider: string;
  label: string;
  publicMeta: string | null;
  branchKey: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type ProviderChoice = "slack" | "discord" | "telegram";

function formatProviderName(provider: string): string {
  switch (provider) {
    case PROVIDER_SLACK_INCOMING_WEBHOOK:
      return "Slack";
    case PROVIDER_DISCORD_BOT:
      return "Discord";
    case PROVIDER_TELEGRAM_BOT:
      return "Telegram";
    default:
      return provider;
  }
}

export function DestinationsPanel({
  workspaces,
  initialDestinations,
}: {
  workspaces: WorkspaceOption[];
  initialDestinations: DestinationRow[];
}) {
  const router = useRouter();
  const [providerKind, setProviderKind] = useState<ProviderChoice>("slack");
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [botToken, setBotToken] = useState("");
  const [discordChannelId, setDiscordChannelId] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [branchKey, setBranchKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addDestination(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let provider: string;
      if (providerKind === "slack") {
        provider = PROVIDER_SLACK_INCOMING_WEBHOOK;
      } else if (providerKind === "discord") {
        provider = PROVIDER_DISCORD_BOT;
      } else {
        provider = PROVIDER_TELEGRAM_BOT;
      }

      const payload: Record<string, string | undefined> = {
        workspaceId: workspaceId || undefined,
        label: label.trim(),
        provider,
        branchKey: branchKey.trim() || undefined,
      };

      if (providerKind === "slack") {
        payload.webhookUrl = webhookUrl.trim();
      } else if (providerKind === "discord") {
        payload.botToken = botToken.trim();
        payload.channelId = discordChannelId.trim();
      } else {
        payload.botToken = botToken.trim();
        payload.chatId = telegramChatId.trim();
      }

      const res = await fetch("/api/admin/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save destination.");
        return;
      }
      setLabel("");
      setWebhookUrl("");
      setBotToken("");
      setDiscordChannelId("");
      setTelegramChatId("");
      setBranchKey("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this destination?")) return;
    setError(null);
    const res = await fetch(`/api/admin/destinations/${id}`, {
      method: "DELETE",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not remove destination.");
      return;
    }
    router.refresh();
  }

  if (workspaces.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No workspace found. Complete registration first.
      </p>
    );
  }

  return (
    <div className="space-y-8 md:space-y-10">
      <section className={cardSection}>
        <h2 className={sectionTitle}>Add destination</h2>
        <p className={sectionIntro}>
          Slack (webhook), Discord (bot + channel), or Telegram (bot + chat).
          Optional <strong className="font-medium text-zinc-800 dark:text-zinc-200">branch key</strong>{" "}
          routes{" "}
          <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
            POST /api/v1/messages
          </code>{" "}
          to this destination only. Leave blank for default fan-out. Secrets are
          encrypted with{" "}
          <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
            AUTH_SECRET
          </code>
          .
        </p>
        <form
          onSubmit={addDestination}
          className="mt-5 flex max-w-lg flex-col gap-4"
        >
          {error ? (
            <p className={alertError} role="alert">
              {error}
            </p>
          ) : null}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className={fieldLabel}>Provider</span>
            <select
              value={providerKind}
              onChange={(e) =>
                setProviderKind(e.target.value as ProviderChoice)
              }
              className={fieldInput}
            >
              <option value="slack">Slack — Incoming Webhook</option>
              <option value="discord">Discord — Bot (channel message)</option>
              <option value="telegram">Telegram — Bot (sendMessage)</option>
            </select>
          </label>
          {workspaces.length > 1 ? (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className={fieldLabel}>Workspace</span>
              <select
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className={fieldInput}
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className={fieldLabel}>Label</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                providerKind === "slack"
                  ? "e.g. #alerts"
                  : providerKind === "discord"
                    ? "e.g. #general"
                    : "e.g. Ops group"
              }
              required
              className={fieldInput}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className={fieldLabel}>Branch key (optional)</span>
            <input
              value={branchKey}
              onChange={(e) => setBranchKey(e.target.value)}
              placeholder="e.g. alerts — omit for default destinations"
              autoComplete="off"
              className={cn(fieldInput, "font-mono")}
            />
            <span className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              API:{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-800">
                {`{ "text": "…", "branch": "alerts" }`}
              </code>{" "}
              or{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-800">
                ?branch=alerts
              </code>
              . Reuse the same key on multiple destinations.
            </span>
          </label>
          {providerKind === "slack" ? (
            <>
              <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Slack: App → Incoming Webhooks → add to channel. URL must start
                with{" "}
                <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-800">
                  https://hooks.slack.com/services/
                </code>
                .
              </p>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className={fieldLabel}>Webhook URL</span>
                <input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  type="url"
                  placeholder="https://hooks.slack.com/services/…"
                  required
                  autoComplete="off"
                  className={fieldInput}
                />
              </label>
            </>
          ) : providerKind === "discord" ? (
            <>
              <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Discord:{" "}
                <a
                  href="https://discord.com/developers/applications"
                  className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Developer Portal
                </a>{" "}
                → Bot → copy token. Invite the bot with{" "}
                <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-800">
                  Send Messages
                </code>
                . Developer Mode → right‑click channel → Copy channel ID.
              </p>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className={fieldLabel}>Bot token</span>
                <input
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  type="password"
                  autoComplete="off"
                  placeholder="Discord bot token"
                  required
                  className={cn(fieldInput, "font-mono")}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className={fieldLabel}>Channel ID</span>
                <input
                  value={discordChannelId}
                  onChange={(e) => setDiscordChannelId(e.target.value)}
                  inputMode="numeric"
                  placeholder="e.g. 1234567890123456789"
                  required
                  autoComplete="off"
                  className={cn(fieldInput, "font-mono")}
                />
              </label>
            </>
          ) : (
            <>
              <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Telegram:{" "}
                <a
                  href="https://t.me/BotFather"
                  className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @BotFather
                </a>{" "}
                →{" "}
                <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-800">
                  /newbot
                </code>{" "}
                → copy the token. Use{" "}
                <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-800">
                  getUpdates
                </code>{" "}
                or @userinfobot for{" "}
                <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-800">
                  chat_id
                </code>
                .
              </p>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className={fieldLabel}>Bot token</span>
                <input
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  type="password"
                  autoComplete="off"
                  placeholder="123456789:AA… from BotFather"
                  required
                  className={cn(fieldInput, "font-mono")}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className={fieldLabel}>Chat ID</span>
                <input
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="e.g. -1001234567890 or @mychannel"
                  required
                  autoComplete="off"
                  className={cn(fieldInput, "font-mono")}
                />
              </label>
            </>
          )}
          <button type="submit" disabled={busy} className={cn(btnPrimary, "w-fit")}>
            {busy ? "Saving…" : "Save destination"}
          </button>
        </form>
      </section>

      <section className={cardSection}>
        <h2 className={sectionTitle}>Configured destinations</h2>
        <p className={sectionIntro}>
          Each target receives API messages according to its branch key. Use
          test send to verify credentials without touching other destinations.
        </p>
        {initialDestinations.length === 0 ? (
          <div className={cn("mt-5", emptyStateDashed)}>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No destinations yet. Add one above — messages are not forwarded
              until you do.
            </p>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {initialDestinations.map((d) => (
              <li key={d.id} className={listItemCard}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-zinc-900 dark:text-primary">
                        {formatProviderName(d.provider)}
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {d.label}
                      </h3>
                      {!d.enabled ? (
                        <span className="rounded-md bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          Disabled
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {d.branchKey ? (
                        <>
                          Branch{" "}
                          <code className="rounded bg-zinc-200/80 px-1 font-mono text-[11px] dark:bg-zinc-800">
                            {d.branchKey}
                          </code>
                        </>
                      ) : (
                        "Default routing (no branch)"
                      )}
                      {d.publicMeta ? ` · ${d.publicMeta}` : ""}
                      <span className="text-zinc-400">
                        {" "}
                        · Added {new Date(d.createdAt).toLocaleString()}
                      </span>
                    </p>
                    <DestinationTestSend destinationId={d.id} />
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(d.id)}
                    className={btnDangerGhost}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const DEFAULT_TEST_MESSAGE = "Post Message CMS — connection test";

function DestinationTestSend({ destinationId }: { destinationId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(DEFAULT_TEST_MESSAGE);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<
    | { type: "success"; message: string }
    | { type: "error"; message: string }
    | null
  >(null);

  function toggleOpen() {
    setOpen((v) => {
      const next = !v;
      if (!next) setFeedback(null);
      return next;
    });
  }

  async function sendTest() {
    const trimmed = text.trim();
    if (!trimmed) {
      setFeedback({
        type: "error",
        message: "Enter a message to send.",
      });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/admin/destinations/${destinationId}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (data.ok === true) {
        setFeedback({
          type: "success",
          message: "Sent. Check your Slack, Discord, or Telegram thread.",
        });
      } else {
        setFeedback({
          type: "error",
          message:
            data.error ??
            (res.status === 401
              ? "Session expired. Refresh the page and sign in again."
              : `Could not send (${res.status}).`),
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Network error. Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className={cn(
          "flex w-full max-w-md items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors motion-safe:duration-200",
          open
            ? "border-primary/45 bg-primary/10 dark:border-primary/35 dark:bg-primary/10"
            : "border-zinc-200 bg-white/80 hover:border-primary/35 hover:bg-primary/5 dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:border-primary/30",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
            open ? "bg-primary/25 text-zinc-900 dark:text-primary" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
          )}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform duration-200 ease-out motion-reduce:transition-none",
              open && "rotate-90",
            )}
            aria-hidden
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Test send
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-zinc-500 dark:text-zinc-400">
            Post once to this destination only — not your other channels.
          </span>
        </span>
      </button>

      <div
        className={cn(
          "grid max-w-md motion-safe:transition-[grid-template-rows] motion-safe:duration-200 motion-safe:ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-2 space-y-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Message
              </span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder="Type anything to post to this destination only…"
                disabled={busy}
                className={cn(
                  fieldInput,
                  "w-full resize-y disabled:opacity-60",
                )}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={sendTest}
                disabled={busy}
                className={btnPrimary}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                {busy ? "Sending…" : "Send test"}
              </button>
            </div>
            {feedback ? (
              <p
                role="status"
                className={cn(
                  "rounded-lg px-2.5 py-2 text-sm",
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200",
                )}
              >
                {feedback.message}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
