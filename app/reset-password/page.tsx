import Link from "next/link";

import { ResetPasswordForm } from "./reset-password-form";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const raw = typeof token === "string" ? token.trim() : "";

  if (!raw) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Invalid link
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This page needs a reset token from the email we send. Request a new
            link below.
          </p>
          <p className="mt-6 flex flex-col gap-3 text-center text-sm">
            <Link
              href="/forgot-password"
              className="font-medium text-blue-600 underline dark:text-blue-400"
            >
              Forgot password
            </Link>
            <Link
              href="/login"
              className="text-zinc-600 underline dark:text-zinc-400"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <ResetPasswordForm token={raw} />
    </div>
  );
}
