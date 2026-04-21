"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type WorkspaceOption = { id: string; name: string };

export type ApiKeyRow = {
  id: string;
  workspaceId: string;
  name: string | null;
  publicLabel: string;
  scopes: unknown;
  createdAt: string;
  lastUsedAt: string | null;
};

export function ApiKeysPanel({
  workspaces,
  initialKeys,
}: {
  workspaces: WorkspaceOption[];
  initialKeys: ApiKeyRow[];
}) {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedKey(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspaceId || undefined,
          name: name.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { key?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to create key.");
        return;
      }
      if (data.key) setCreatedKey(data.key);
      setName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (
      !confirm(
        "Revoke this API key? Any integration using it will stop working.",
      )
    ) {
      return;
    }
    setError(null);
    const res = await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not revoke key.");
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
          Create key
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          The full secret is shown only once. Store it in a password manager or
          secret store.
        </p>
        <form onSubmit={createKey} className="mt-4 flex max-w-md flex-col gap-4">
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          {createdKey ? (
            <div
              className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40"
              role="status"
            >
              <p className="font-medium text-amber-900 dark:text-amber-200">
                New API key (copy now)
              </p>
              <code className="mt-2 block break-all text-amber-950 dark:text-amber-100">
                {createdKey}
              </code>
            </div>
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
            <span className="text-zinc-700 dark:text-zinc-300">
              Label (optional)
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. production bot"
              className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {busy ? "Creating…" : "Create API key"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Existing keys
        </h2>
        {initialKeys.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            No keys yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {initialKeys.map((k) => (
              <li
                key={k.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-sm text-zinc-900 dark:text-zinc-50">
                    {k.publicLabel}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {k.name ?? "Unlabeled"} · created{" "}
                    {new Date(k.createdAt).toLocaleString()}
                    {k.lastUsedAt
                      ? ` · last used ${new Date(k.lastUsedAt).toLocaleString()}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(k.id)}
                  className="text-sm text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
