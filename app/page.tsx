import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(209,254,23,0.14),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(209,254,23,0.08),transparent)]"
        aria-hidden
      />
      <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 md:pt-20">
        <header className="flex flex-col items-center text-center">
          <span
            className="mb-6 overflow-hidden rounded-2xl shadow-md ring-1 ring-zinc-900/10 dark:ring-zinc-700"
            aria-hidden 
          >
            <Image
              src="/icon.png"
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 object-cover"
              priority
            />
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-[2.5rem] md:leading-tight">
            Post Message CMS
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
            Send one HTTP request and deliver to{" "}
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">
              Slack
            </strong>
            ,{" "}
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">
              Discord
            </strong>
            , or{" "}
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">
              Telegram
            </strong>
            . API keys, branch routing, and a small admin UI—self-hosted, your
            data.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              Create account
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800/80"
            >
              Sign in
            </Link>
          </div>
        </header>

        <footer className="mt-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-16 text-sm text-zinc-500 dark:text-zinc-500">
          <Link
            href="/forgot-password"
            className="underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-300"
          >
            Forgot password
          </Link>
          <Link
            href="/api/health"
            className="inline-flex items-center gap-1 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-300"
          >
            API health
            <span className="text-xs opacity-70">↗</span>
          </Link>
        </footer>
      </main>
    </div>
  );
}
