"use client";

import { KeyRound, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CopyButton } from "@/app/admin/copy-button";

import {
  alertError,
  bodyText,
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
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No workspace found. Complete registration first.
      </p>
    );
  }

  return (
    <div className="space-y-8 md:space-y-10">
      <section className={cardSection}>
        <h2 className={sectionTitle}>Create API key</h2>
        <p className={sectionIntro}>
          The full secret is shown only once. Copy it into a password manager or
          secret store before leaving this page.
        </p>
        <form onSubmit={createKey} className="mt-5 flex max-w-md flex-col gap-4">
          {error ? (
            <p className={alertError} role="alert">
              {error}
            </p>
          ) : null}
          {createdKey ? (
            <div
              className="rounded-xl border border-amber-300/80 bg-amber-50 p-4 text-sm shadow-sm dark:border-amber-800/50 dark:bg-amber-950/50"
              role="status"
            >
              <p className="font-semibold text-amber-950 dark:text-amber-100">
                New key — copy now
              </p>
              <code className="mt-2 block break-all rounded-lg bg-white/80 px-2 py-2 font-mono text-xs text-amber-950 dark:bg-zinc-950 dark:text-amber-50">
                {createdKey}
              </code>
              <div className="mt-3">
                <CopyButton text={createdKey} label="Copy key" />
              </div>
            </div>
          ) : null}
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
            <span className={fieldLabel}>Label (optional)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. production bot"
              className={fieldInput}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className={`${btnPrimary} w-fit`}
          >
            {busy ? "Creating…" : "Create API key"}
          </button>
        </form>
      </section>

      <section className={cardSection}>
        <h2 className={sectionTitle}>Existing keys</h2>
        <p className={sectionIntro}>
          Only the key prefix is shown here. Revoke a key if it may be
          compromised.
        </p>
        {initialKeys.length === 0 ? (
          <div className={`mt-5 ${emptyStateDashed}`}>
            <KeyRound
              className="mx-auto h-8 w-8 text-zinc-400"
              strokeWidth={1.5}
              aria-hidden
            />
            <p className={`mt-3 ${bodyText}`}>
              No keys yet. Create one above to call{" "}
              <code className="rounded-md bg-zinc-200/80 px-1 font-mono text-xs dark:bg-zinc-800">
                POST /api/v1/messages
              </code>
              .
            </p>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {initialKeys.map((k) => (
              <li key={k.id} className={listItemCard}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <span className="inline-flex items-center rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-zinc-900 dark:text-primary">
                      API key
                    </span>
                    <p className="mt-2 font-mono text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {k.publicLabel}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {k.name ?? "Unlabeled"}
                      <span className="text-zinc-400">
                        {" "}
                        · Created {new Date(k.createdAt).toLocaleString()}
                        {k.lastUsedAt
                          ? ` · Last used ${new Date(k.lastUsedAt).toLocaleString()}`
                          : " · Never used"}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => revoke(k.id)}
                    className={btnDangerGhost}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Revoke
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
