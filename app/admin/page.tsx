import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Dashboard
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Connect chat providers and route messages from the API. More admin tools
        coming next.
      </p>
      <ul className="mt-6 list-inside list-disc text-sm text-blue-600 dark:text-blue-400">
        <li>
          <Link href="/admin/api-keys" className="underline-offset-2 hover:underline">
            API keys &amp; messaging endpoint
          </Link>
        </li>
        <li>
          <Link
            href="/admin/destinations"
            className="underline-offset-2 hover:underline"
          >
            Slack destinations (Incoming Webhooks)
          </Link>
        </li>
      </ul>
    </div>
  );
}
