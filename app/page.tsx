import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-zinc-950">
      <main className="max-w-lg text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Post Message CMS
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          API bridge to Slack, Discord, and Telegram. See{" "}
          <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
            PROJECT.md
          </code>{" "}
          for scope.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm font-medium">
          <Link
            href="/register"
            className="text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
          >
            Register
          </Link>
          <Link
            href="/login"
            className="text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
          >
            Sign in
          </Link>
          <Link
            href="/admin"
            className="text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
          >
            Admin
          </Link>
          <Link
            href="/api/health"
            className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
          >
            Health
          </Link>
        </div>
      </main>
    </div>
  );
}
