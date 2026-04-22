"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  adminContentStack,
  alertError,
  bodyText,
  cardSection,
  fieldInput,
  fieldLabel,
  linkInline,
  sectionTitle,
} from "../ui";
import { cn } from "@/lib/cn";

type WorkspaceOption = { id: string; name: string };

export type ListRow = {
  id: string;
  branch: string | null;
  text: string;
  status: string;
  createdAt: string;
  deliveryCount: number;
  deliverySuccess: number;
  deliveryFailed: number;
};

const STATUS_ALL = "" as const;

function statusClass(status: string) {
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

export function MessagesPanel({ workspaces }: { workspaces: WorkspaceOption[] }) {
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [status, setStatus] = useState<string>(STATUS_ALL);
  const [branch, setBranch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [rows, setRows] = useState<ListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams();
      p.set("workspaceId", workspaceId);
      p.set("page", String(page));
      p.set("limit", String(limit));
      if (status) p.set("status", status);
      if (branch.trim()) p.set("branch", branch.trim());
      if (from) p.set("from", new Date(from).toISOString());
      if (to) p.set("to", new Date(to).toISOString());
      const res = await fetch(`/api/admin/messages?${p.toString()}`);
      const data = (await res.json()) as {
        messages?: ListRow[];
        pagination?: { total: number; page: number; limit: number };
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Failed to load messages.");
        return;
      }
      setRows(data.messages ?? []);
      setTotal(data.pagination?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, page, limit, status, branch, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (workspaces.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No workspace found.
      </p>
    );
  }

  return (
    <div className={adminContentStack}>
      <div
        className={`${cardSection} space-y-4`}
      >
        <h2 className={sectionTitle}>Filters</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={fieldLabel} htmlFor="msg-workspace">
              Workspace
            </label>
            <select
              id="msg-workspace"
              className={`${fieldInput} w-full mt-1`}
              value={workspaceId}
              onChange={(e) => {
                setWorkspaceId(e.target.value);
                setPage(1);
              }}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={fieldLabel} htmlFor="msg-status">
              Status
            </label>
            <select
              id="msg-status"
              className={`${fieldInput} w-full mt-1`}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value={STATUS_ALL}>All</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="PARTIAL">PARTIAL</option>
              <option value="FAILED">FAILED</option>
              <option value="NO_MATCH">NO_MATCH</option>
            </select>
          </div>
          <div>
            <label className={fieldLabel} htmlFor="msg-branch">
              Branch
            </label>
            <input
              id="msg-branch"
              className={`${fieldInput} w-full mt-1`}
              placeholder="default, or key"
              value={branch}
              onChange={(e) => {
                setBranch(e.target.value);
                setPage(1);
              }}
            />
            <p className="mt-1 text-xs text-zinc-500">
              Type <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">default</code> for default
              (non-branch) destinations.
            </p>
          </div>
          <div>
            <label className={fieldLabel} htmlFor="msg-from">
              From
            </label>
            <input
              id="msg-from"
              type="datetime-local"
              className={`${fieldInput} w-full mt-1`}
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="msg-to">
              To
            </label>
            <input
              id="msg-to"
              type="datetime-local"
              className={`${fieldInput} w-full mt-1`}
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <p className={bodyText}>
          <button
            type="button"
            className={linkInline}
            onClick={() => {
              setStatus(STATUS_ALL);
              setBranch("");
              setFrom("");
              setTo("");
              setPage(1);
            }}
          >
            Clear filters
          </button>
        </p>
      </div>

      {error ? <p className={alertError}>{error}</p> : null}

      <div
        className={`${cardSection} overflow-x-auto`}
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className={sectionTitle}>Messages</h2>
          <p className="text-sm text-zinc-500">
            {loading ? "Loading…" : `${total} total`}
          </p>
        </div>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700">
              <th className="py-2 pr-3 font-medium">Time</th>
              <th className="py-2 pr-3 font-medium">Content</th>
              <th className="py-2 pr-3 font-medium">Branch</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Deliveries</th>
              <th className="py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr
                key={m.id}
                className="border-b border-zinc-100 dark:border-zinc-800/80"
              >
                <td className="whitespace-nowrap py-2.5 pr-3 align-top text-zinc-600 dark:text-zinc-400">
                  {new Date(m.createdAt).toLocaleString()}
                </td>
                <td
                  className="max-w-[200px] py-2.5 pr-3 align-top"
                  title={m.text}
                >
                  {m.text.length > 100 ? `${m.text.slice(0, 100)}…` : m.text}
                </td>
                <td className="py-2.5 pr-3 align-top">
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                      m.branch
                        ? "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200"
                        : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                    )}
                  >
                    {m.branch ?? "default"}
                  </span>
                </td>
                <td className="py-2.5 pr-3 align-top">
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                      statusClass(m.status),
                    )}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3 align-top">
                  {m.deliverySuccess}/{m.deliveryCount}
                  {m.deliveryFailed > 0 ? (
                    <span className="text-red-600 dark:text-red-400">
                      {" "}
                      ({m.deliveryFailed} failed)
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 align-top">
                  <Link
                    href={`/admin/messages/${m.id}`}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-10 text-center text-zinc-500"
                >
                  No messages in this range.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {total > limit ? (
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 enabled:hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200 dark:enabled:hover:bg-zinc-800"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Newer
            </button>
            <span className="text-sm text-zinc-500">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 enabled:hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200 dark:enabled:hover:bg-zinc-800"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Older
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
