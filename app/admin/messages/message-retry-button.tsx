"use client";

import { useState } from "react";

import { btnPrimary, alertError, bodyText } from "../ui";
import { cn } from "@/lib/cn";

export function MessageRetryButton({
  messageId,
  show,
}: {
  messageId: string;
  show: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  if (!show) {
    return null;
  }

  async function retry() {
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch(`/api/admin/messages/${messageId}/retry`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        notice?: string;
        deliveries?: { ok: boolean }[];
      };
      if (!res.ok) {
        setError(data.error ?? "Retry failed.");
        return;
      }
      if (data.notice) {
        setOkMsg(data.notice);
      } else {
        const ok = data.deliveries?.filter((d) => d.ok).length ?? 0;
        const n = data.deliveries?.length ?? 0;
        setOkMsg(`Retried ${n} destination(s), ${ok} succeeded.`);
      }
      setTimeout(() => {
        globalThis.location.reload();
      }, 800);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className={cn(btnPrimary, "w-full sm:w-auto")}
        disabled={busy}
        onClick={() => void retry()}
      >
        {busy ? "Retrying…" : "Retry failed destinations"}
      </button>
      {error ? <p className={alertError}>{error}</p> : null}
      {okMsg ? <p className={bodyText}>{okMsg}</p> : null}
    </div>
  );
}
