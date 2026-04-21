"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type WorkspaceOption = { id: string; name: string };

export type DestinationRow = {
  id: string;
  workspaceId: string;
  provider: string;
  label: string;
  publicMeta: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export function DestinationsPanel({
  workspaces,
  initialDestinations,
}: {
  workspaces: WorkspaceOption[];
  initialDestinations: DestinationRow[];
}) {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addDestination(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspaceId || undefined,
          label: label.trim(),
          webhookUrl: webhookUrl.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save destination.");
        return;
      }
      setLabel("");
      setWebhookUrl("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this Slack destination?")) return;
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
      <p className="text-zinc-600 dark:text-zinc-400">
        No workspace found. Complete registration first.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Add Slack Incoming Webhook
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          In Slack: App → Incoming Webhooks → add to channel → copy the webhook
          URL. It must start with{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
            https://hooks.slack.com/services/
          </code>
          .
        </p>
        <form
          onSubmit={addDestination}
          className="mt-4 flex max-w-lg flex-col gap-4"
        >
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          {workspaces.length > 1 ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">Workspace</span>
              <select
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Label</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. #alerts"
              required
              className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Webhook URL</span>
            <input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              type="url"
              placeholder="https://hooks.slack.com/services/…"
              required
              autoComplete="off"
              className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {busy ? "Saving…" : "Save destination"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Configured destinations
        </h2>
        {initialDestinations.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            None yet. Messages will not be forwarded until you add a webhook.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {initialDestinations.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {d.label}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {d.provider}
                    {d.publicMeta ? ` · ${d.publicMeta}` : ""} · added{" "}
                    {new Date(d.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(d.id)}
                  className="text-sm text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
