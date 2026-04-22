"use client";

import { Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  PROVIDER_DISCORD_BOT,
  PROVIDER_GOOGLE_CHAT_INCOMING_WEBHOOK,
  PROVIDER_SLACK_INCOMING_WEBHOOK,
  PROVIDER_SMTP_MAIL,
  PROVIDER_TEAMS_INCOMING_WEBHOOK,
  PROVIDER_TELEGRAM_BOT,
} from "@/lib/providers/types";
import { cn } from "@/lib/cn";

import {
  alertError,
  bodyText,
  btnPrimary,
  fieldInput,
  fieldLabel,
  linkInline,
} from "../ui";

const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800";

type Creds = {
  slack?: { webhookUrl: string };
  teams?: { webhookUrl: string };
  googleChat?: { webhookUrl: string };
  discord?: { botToken: string; channelId: string };
  telegram?: { botToken: string; chatId: string };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    from: string;
    to: string;
    hasPassword: boolean;
  };
};

type Detail = {
  id: string;
  provider: string;
  label: string;
  branchKey: string | null;
  enabled: boolean;
  credentials: Creds | null;
};

export function DestinationEditForm({
  destinationId,
  summaryLabel,
  onCancel,
  onSaved,
}: {
  destinationId: string;
  /** List label (shown in the modal title area while loading the full record). */
  summaryLabel?: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [portalReady, setPortalReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);

  const [label, setLabel] = useState("");
  const [branchKey, setBranchKey] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [discordBot, setDiscordBot] = useState("");
  const [discordCh, setDiscordCh] = useState("");
  const [tgBot, setTgBot] = useState("");
  const [tgChat, setTgChat] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpTo, setSmtpTo] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/admin/destinations/${destinationId}`);
        const data = (await res.json()) as {
          destination?: Detail;
          error?: string;
        };
        if (!res.ok) {
          setLoadError(data.error ?? "Failed to load destination.");
          return;
        }
        if (!data.destination) {
          setLoadError("No data.");
          return;
        }
        if (cancelled) return;
        const d = data.destination;
        setDetail(d);
        setLabel(d.label);
        setBranchKey(d.branchKey ?? "");
        setEnabled(d.enabled);
        const c = d.credentials;
        if (c?.slack) {
          setWebhookUrl(c.slack.webhookUrl);
        }
        if (c?.teams) {
          setWebhookUrl(c.teams.webhookUrl);
        }
        if (c?.googleChat) {
          setWebhookUrl(c.googleChat.webhookUrl);
        }
        if (c?.discord) {
          setDiscordBot(c.discord.botToken);
          setDiscordCh(c.discord.channelId);
        }
        if (c?.telegram) {
          setTgBot(c.telegram.botToken);
          setTgChat(c.telegram.chatId);
        }
        if (c?.smtp) {
          setSmtpHost(c.smtp.host);
          setSmtpPort(String(c.smtp.port));
          setSmtpSecure(c.smtp.secure);
          setSmtpUser(c.smtp.user ?? "");
          setSmtpPass("");
          setSmtpFrom(c.smtp.from);
          setSmtpTo(c.smtp.to);
        }
      } catch {
        if (!cancelled) setLoadError("Network error while loading.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [destinationId]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function save() {
    if (!detail) return;
    setSaveError(null);
    setSaving(true);
    try {
      const payload: Record<string, string | number | boolean | undefined> = {
        label: label.trim(),
        branchKey: branchKey.trim() || undefined,
        enabled,
      };
      if (detail.provider === PROVIDER_SLACK_INCOMING_WEBHOOK) {
        payload.webhookUrl = webhookUrl.trim();
      } else if (detail.provider === PROVIDER_TEAMS_INCOMING_WEBHOOK) {
        payload.webhookUrl = webhookUrl.trim();
      } else if (detail.provider === PROVIDER_GOOGLE_CHAT_INCOMING_WEBHOOK) {
        payload.webhookUrl = webhookUrl.trim();
      } else if (detail.provider === PROVIDER_DISCORD_BOT) {
        payload.botToken = discordBot.trim();
        payload.channelId = discordCh.trim();
      } else if (detail.provider === PROVIDER_TELEGRAM_BOT) {
        payload.botToken = tgBot.trim();
        payload.chatId = tgChat.trim();
      } else if (detail.provider === PROVIDER_SMTP_MAIL) {
        payload.smtpHost = smtpHost.trim();
        payload.smtpPort = parseInt(smtpPort.trim() || "587", 10);
        payload.smtpSecure = smtpSecure;
        if (smtpUser.trim()) {
          payload.smtpUser = smtpUser.trim();
        }
        if (smtpPass.trim()) {
          payload.smtpPass = smtpPass.trim();
        } else {
          payload.smtpPass = "";
        }
        payload.smtpFrom = smtpFrom.trim();
        payload.toEmail = smtpTo.trim();
      }

      const res = await fetch(`/api/admin/destinations/${destinationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSaveError(data.error ?? "Could not save.");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  if (!portalReady) {
    return null;
  }

  const titleId = "edit-destination-dialog-title";

  const header = (
    <div className="mb-4 flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200/90 pb-3 dark:border-zinc-700/90">
      <div className="min-w-0">
        <h2
          id={titleId}
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Edit destination
        </h2>
        {summaryLabel ? (
          <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
            {summaryLabel}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        aria-label="Close"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <div
          className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm dark:bg-zinc-950/70"
          onClick={onCancel}
          aria-hidden
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
          onClick={(e) => e.stopPropagation()}
        >
          {header}
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading…
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  if (loadError || !detail) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <div
          className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm dark:bg-zinc-950/70"
          onClick={onCancel}
          aria-hidden
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
          onClick={(e) => e.stopPropagation()}
        >
          {header}
          <p className={alertError}>{loadError ?? "Failed to load."}</p>
          <button type="button" onClick={onCancel} className={cn(btnSecondary, "mt-4 w-full sm:w-auto")}>
            Dismiss
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm dark:bg-zinc-950/70"
        onClick={onCancel}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[min(90dvh,56rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {header}
        {saveError ? <p className={cn(alertError, "mb-3")}>{saveError}</p> : null}
        <div className="space-y-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className={fieldLabel}>Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className={fieldInput}
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className={fieldLabel}>Branch key (optional)</span>
          <input
            value={branchKey}
            onChange={(e) => setBranchKey(e.target.value)}
            className={cn(fieldInput, "font-mono")}
            autoComplete="off"
            placeholder="default — leave empty for default fan-out"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Enabled
        </label>

        {detail.provider === PROVIDER_SLACK_INCOMING_WEBHOOK ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className={fieldLabel}>Webhook URL</span>
            <input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className={fieldInput}
              type="url"
              autoComplete="off"
            />
          </label>
        ) : null}

        {detail.provider === PROVIDER_TEAMS_INCOMING_WEBHOOK ? (
          <div className="space-y-2">
            <p className={bodyText}>
              Incoming Webhook (channel menu → Connectors) or a Teams / Power
              Automate workflow that posts to the channel. The URL must be an{" "}
              <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
                https
              </code>{" "}
              Microsoft or Power Platform endpoint.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span className={fieldLabel}>Webhook URL</span>
              <input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className={fieldInput}
                type="url"
                autoComplete="off"
              />
            </label>
          </div>
        ) : null}

        {detail.provider === PROVIDER_GOOGLE_CHAT_INCOMING_WEBHOOK ? (
          <div className="space-y-2">
            <p className={bodyText}>
              <a
                href="https://developers.google.com/chat/how-tos/webhooks"
                className={linkInline}
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Chat incoming webhook
              </a>
              : URL must be{" "}
              <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
                https://chat.googleapis.com/v1/spaces/…/messages?…
              </code>
              .
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span className={fieldLabel}>Webhook URL</span>
              <input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className={fieldInput}
                type="url"
                autoComplete="off"
              />
            </label>
          </div>
        ) : null}

        {detail.provider === PROVIDER_DISCORD_BOT ? (
          <div className="space-y-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className={fieldLabel}>Bot token</span>
              <input
                value={discordBot}
                onChange={(e) => setDiscordBot(e.target.value)}
                className={cn(fieldInput, "font-mono")}
                type="password"
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className={fieldLabel}>Channel ID</span>
              <input
                value={discordCh}
                onChange={(e) => setDiscordCh(e.target.value)}
                className={cn(fieldInput, "font-mono")}
                autoComplete="off"
              />
            </label>
          </div>
        ) : null}

        {detail.provider === PROVIDER_TELEGRAM_BOT ? (
          <div className="space-y-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className={fieldLabel}>Bot token</span>
              <input
                value={tgBot}
                onChange={(e) => setTgBot(e.target.value)}
                className={cn(fieldInput, "font-mono")}
                type="password"
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className={fieldLabel}>Chat ID</span>
              <input
                value={tgChat}
                onChange={(e) => setTgChat(e.target.value)}
                className={cn(fieldInput, "font-mono")}
                autoComplete="off"
              />
            </label>
          </div>
        ) : null}

        {detail.provider === PROVIDER_SMTP_MAIL ? (
          <div className="space-y-2">
            <p className={bodyText}>
              Leave password empty to keep the current one.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className={fieldLabel}>SMTP host</span>
                <input
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className={fieldInput}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className={fieldLabel}>Port</span>
                <input
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className={fieldInput}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm sm:items-end">
                <span className={fieldLabel}>TLS / SSL</span>
                <label className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={smtpSecure}
                    onChange={(e) => setSmtpSecure(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  Secure
                </label>
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className={fieldLabel}>Username (optional)</span>
                <input
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className={fieldInput}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className={fieldLabel}>
                  Password (optional — leave empty to keep)
                </span>
                <input
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  className={fieldInput}
                  type="password"
                  autoComplete="new-password"
                />
                {detail.credentials?.smtp?.hasPassword ? (
                  <span className="text-xs text-zinc-500">A password is on file.</span>
                ) : null}
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className={fieldLabel}>From</span>
                <input
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  className={fieldInput}
                  type="email"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className={fieldLabel}>To (recipient)</span>
                <input
                  value={smtpTo}
                  onChange={(e) => setSmtpTo(e.target.value)}
                  className={fieldInput}
                  type="email"
                />
              </label>
            </div>
          </div>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200/90 pt-4 dark:border-zinc-700/90">
          <button
            type="button"
            onClick={onCancel}
            className={btnSecondary}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className={btnPrimary}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Check className="h-4 w-4" aria-hidden />
            )}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  </div>,
  document.body,
  );
}
