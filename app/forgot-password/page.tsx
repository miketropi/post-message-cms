"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  requestPasswordResetAction,
  type PasswordResetFormState,
} from "@/lib/auth/password-reset-actions";

const initialState: PasswordResetFormState = null;

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Forgot password
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enter your account email. If SMTP is configured on this server, we’ll
          send a one-time link to reset your password.
        </p>
        <form action={formAction} className="mt-6 flex flex-col gap-4">
          {state?.error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          ) : null}
          {state?.success ? (
            <p
              className="text-sm text-emerald-700 dark:text-emerald-400"
              role="status"
            >
              {state.success}
            </p>
          ) : null}
          {!state?.success ? (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">Email</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {pending ? "Sending…" : "Send reset link"}
              </button>
            </>
          ) : null}
        </form>
        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link
            href="/login"
            className="font-medium text-blue-600 underline dark:text-blue-400"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
