import type { PropsWithChildren } from "react";
import Link from "next/link";

import {
  adminPageIntro,
  adminPageTitle,
  calloutBox,
  codeBlockPre,
  guideSection,
  linkInline,
  sectionTitle,
  subsectionTitle,
  tocLink,
  tocNav,
} from "../ui";

function CodeBlock({
  title,
  children,
}: {
  title?: string;
  children: string;
}) {
  return (
    <div className="mt-3">
      {title ? (
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {title}
        </p>
      ) : null}
      <pre className={codeBlockPre}>
        <code className="font-mono">{children}</code>
      </pre>
    </div>
  );
}

function Callout({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <div className={calloutBox}>
      <p className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</p>
      <div className="mt-2 text-zinc-700 dark:text-zinc-300">{children}</div>
    </div>
  );
}

const sections = [
  { id: "overview", label: "For developers" },
  { id: "quick-start", label: "Quick start" },
  { id: "slack", label: "Slack" },
  { id: "discord", label: "Discord" },
  { id: "telegram", label: "Telegram" },
  { id: "branches", label: "Branch routing" },
  { id: "api", label: "Message API" },
  { id: "security", label: "Security" },
] as const;

export default function AdminGuidePage() {
  return (
    <div className="max-w-3xl space-y-8 md:space-y-10">
      <h1 className={adminPageTitle}>Developer guide</h1>
      <p className={adminPageIntro}>
        Hook up Slack, Discord, or Telegram once in the admin UI, then call a
        single JSON endpoint from your app, cron jobs, or CI. No SDK required —
        just HTTPS and an API key.
      </p>

      <nav aria-label="On this page" className={tocNav}>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          On this page
        </p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className={tocLink}>
                {s.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-8 md:space-y-10">
        <section id="overview" className={guideSection}>
          <h2 className={sectionTitle}>For developers</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Your integration is always{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
              POST /api/v1/messages
            </code>
            . The server turns your JSON into plain text and posts it through
            whichever chat destinations you configured for this workspace.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">Auth:</strong>{" "}
              API key with{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
                messages:write
              </code>{" "}
              (create under{" "}
              <Link
                href="/admin/api-keys"
                className={linkInline}
              >
                API keys
              </Link>
              ).
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">Routing:</strong>{" "}
              optional{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
                branch
              </code>{" "}
              sends only to destinations that share that branch key (see below).
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">Visibility:</strong>{" "}
              the JSON response includes a{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
                deliveries
              </code>{" "}
              array so you can log per-destination success or errors.
            </li>
          </ul>
        </section>

        <section id="quick-start" className={guideSection}>
          <h2 className={sectionTitle}>
            Quick start
          </h2>
          <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            <li>
              Sign in and open{" "}
              <Link
                href="/admin/destinations"
                className={linkInline}
              >
                Destinations
              </Link>
              — add at least one Slack, Discord, or Telegram target (see
              sections below).
            </li>
            <li>
              Create an API key under{" "}
              <Link
                href="/admin/api-keys"
                className={linkInline}
              >
                API keys
              </Link>
              . Copy it immediately; it is only shown once.
            </li>
            <li>
              Replace the placeholder and run:
              <CodeBlock title="curl — default destinations (no branch)">{`curl -sS -X POST https://YOUR_HOST/api/v1/messages \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"text":"Hello from my service"}'`}</CodeBlock>
            </li>
            <li>
              Prefer a header instead of Bearer? This works too:{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
                X-Api-Key: YOUR_API_KEY
              </code>
              .
            </li>
          </ol>
        </section>

        <section id="slack" className={guideSection}>
          <h2 className={sectionTitle}>
            Slack
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Uses an{" "}
            <a
              href="https://api.slack.com/messaging/webhooks"
              className={linkInline}
              target="_blank"
              rel="noopener noreferrer"
            >
              Incoming Webhook
            </a>
            : one URL per channel. Messages are sent as Slack &quot;text&quot;
            (plain).
          </p>

          <h3 className={subsectionTitle}>
            Configure in Slack
          </h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            <li>
              Slack → your app → <strong className="text-zinc-800 dark:text-zinc-200">Incoming Webhooks</strong> →
              activate → <strong className="text-zinc-800 dark:text-zinc-200">Add New Webhook to Workspace</strong> →
              pick a channel.
            </li>
            <li>
              Copy the webhook URL. It must start with{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
                https://hooks.slack.com/services/
              </code>
              .
            </li>
          </ol>

          <h3 className={subsectionTitle}>
            Configure in this app
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            In{" "}
            <Link
              href="/admin/destinations"
              className={linkInline}
            >
              Destinations
            </Link>
            , choose <strong className="text-zinc-800 dark:text-zinc-200">Slack — Incoming Webhook</strong>, set a
            label (for your own reference), paste the URL, and optionally a branch
            key.
          </p>

          <CodeBlock title="Admin API (session cookie) — create Slack destination">{`POST /api/admin/destinations
Content-Type: application/json

{
  "label": "#incidents",
  "provider": "slack_incoming_webhook",
  "webhookUrl": "https://hooks.slack.com/services/T000/B000/xxxx",
  "branchKey": "incidents"
}`}</CodeBlock>
          <p className="mt-2 text-xs text-zinc-500">
            Omit{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-800">
              provider
            </code>{" "}
            to default to Slack. Omit{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-800">
              branchKey
            </code>{" "}
            for a default destination.
          </p>

          <Callout title="Tip">
            <p>
              One webhook = one channel. For multiple channels, create multiple
              Slack destinations (or use branch keys to pick which webhook(s) get
              each API call).
            </p>
          </Callout>
        </section>

        <section id="discord" className={guideSection}>
          <h2 className={sectionTitle}>
            Discord
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Uses your bot and the{" "}
            <a
              href="https://discord.com/developers/docs/resources/channel#create-message"
              className={linkInline}
              target="_blank"
              rel="noopener noreferrer"
            >
              Create Message
            </a>{" "}
            API. Text is sent as message{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
              content
            </code>{" "}
            (max 2000 characters; longer input is truncated).
          </p>

          <h3 className={subsectionTitle}>
            Configure in Discord
          </h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            <li>
              <a
                href="https://discord.com/developers/applications"
                className={linkInline}
                target="_blank"
                rel="noopener noreferrer"
              >
                Developer Portal
              </a>{" "}
              → your application → <strong className="text-zinc-800 dark:text-zinc-200">Bot</strong> → reset or copy
              the <strong className="text-zinc-800 dark:text-zinc-200">token</strong>.
            </li>
            <li>
              Invite the bot with{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">Send Messages</strong> (and{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">View Channel</strong>) in the server.
            </li>
            <li>
              Enable <strong className="text-zinc-800 dark:text-zinc-200">Developer Mode</strong> (User Settings →
              App Settings → Advanced), then right‑click the target channel →{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">Copy channel ID</strong> (a long numeric string).
            </li>
          </ol>

          <h3 className={subsectionTitle}>
            Configure in this app
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            In Destinations, choose{" "}
            <strong className="text-zinc-800 dark:text-zinc-200">Discord — Bot</strong>, enter label, bot token, and
            channel ID.
          </p>

          <CodeBlock title="Admin API — create Discord destination">{`POST /api/admin/destinations
Content-Type: application/json

{
  "provider": "discord_bot",
  "label": "deploys",
  "botToken": "MTQx…your.bot.token",
  "channelId": "1234567890123456789",
  "branchKey": "deploys"
}`}</CodeBlock>

          <Callout title="If messages don’t appear">
            <p>
              Confirm the bot is in the server, can see the channel, and has
              Send Messages. Error details often come back in{" "}
              <code className="rounded bg-zinc-900/20 px-1 font-mono text-xs dark:bg-zinc-100/20">
                deliveries[].error
              </code>{" "}
              in the API response.
            </p>
          </Callout>
        </section>

        <section id="telegram" className={guideSection}>
          <h2 className={sectionTitle}>
            Telegram
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Uses{" "}
            <a
              href="https://core.telegram.org/bots/api#sendmessage"
              className={linkInline}
              target="_blank"
              rel="noopener noreferrer"
            >
              sendMessage
            </a>{" "}
            with your bot token and a{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
              chat_id
            </code>
            . Text max 4096 characters (longer input is truncated).
          </p>

          <h3 className={subsectionTitle}>
            Configure with BotFather
          </h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            <li>
              Open{" "}
              <a
                href="https://t.me/BotFather"
                className={linkInline}
                target="_blank"
                rel="noopener noreferrer"
              >
                @BotFather
              </a>{" "}
              → <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">/newbot</code> (or use
              an existing bot) → copy the API token (
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
                123456789:AA…
              </code>
              ).
            </li>
            <li>
              Start a chat with the bot, or add it to a group/supergroup and send
              a message so the bot can post there (groups may need the right
              permissions or privacy settings).
            </li>
            <li>
              Get <strong className="text-zinc-800 dark:text-zinc-200">chat_id</strong>: numeric ID from{" "}
              <a
                href="https://core.telegram.org/bots/api#getupdates"
                className={linkInline}
                target="_blank"
                rel="noopener noreferrer"
              >
                getUpdates
              </a>{" "}
              while messaging the bot, or use{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
                @channelusername
              </code>{" "}
              for some public channels.
            </li>
          </ol>

          <h3 className={subsectionTitle}>
            Configure in this app
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            In Destinations, choose{" "}
            <strong className="text-zinc-800 dark:text-zinc-200">Telegram — Bot</strong>, enter label, token, and chat
            ID.
          </p>

          <CodeBlock title="Admin API — create Telegram destination">{`POST /api/admin/destinations
Content-Type: application/json

{
  "provider": "telegram_bot",
  "label": "ops-alerts",
  "botToken": "123456789:AA…",
  "chatId": "-1001234567890",
  "branchKey": "ops"
}`}</CodeBlock>

          <Callout title="chat_id examples">
            <ul className="list-disc space-y-1 pl-4">
              <li>
                Groups/supergroups often use negative IDs like{" "}
                <code className="rounded bg-zinc-900/20 px-1 font-mono text-xs dark:bg-zinc-100/20">
                  -100…
                </code>
                .
              </li>
              <li>
                Public channels may work as{" "}
                <code className="rounded bg-zinc-900/20 px-1 font-mono text-xs dark:bg-zinc-100/20">
                  @YourChannel
                </code>{" "}
                where the Bot API allows it.
              </li>
            </ul>
          </Callout>
        </section>

        <section id="branches" className={guideSection}>
          <h2 className={sectionTitle}>
            Branch routing
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Branch keys connect your API to specific destinations without issuing
            separate API keys per channel.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-800">
            <table className="w-full min-w-[20rem] text-left text-sm text-zinc-600 dark:text-zinc-400">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2">API call</th>
                  <th className="px-3 py-2">Delivers to</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-800 dark:text-zinc-200">
                    No branch
                  </td>
                  <td className="px-3 py-2">
                    Only destinations with an <strong className="text-zinc-800 dark:text-zinc-200">empty</strong> branch
                    key
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-800 dark:text-zinc-200">
                    branch: &quot;alerts&quot;
                  </td>
                  <td className="px-3 py-2">
                    Destinations whose branch key is{" "}
                    <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">alerts</code> (can be multiple apps at
                    once)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <CodeBlock title="Scoped to one branch (JSON body)">{`curl -sS -X POST https://YOUR_HOST/api/v1/messages \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"text":"CPU high on db-1","branch":"alerts"}'`}</CodeBlock>

          <CodeBlock title="Same thing via query string">{`curl -sS -X POST 'https://YOUR_HOST/api/v1/messages?branch=alerts' \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"text":"CPU high on db-1"}'`}</CodeBlock>
          <p className="mt-2 text-xs text-zinc-500">
            If both body and query set{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-800">branch</code>, the{" "}
            <strong className="text-zinc-700 dark:text-zinc-300">body wins</strong>. The{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-800">branch</code> field is not included in
            the text sent to chat.
          </p>
        </section>

        <section id="api" className={guideSection}>
          <h2 className={sectionTitle}>
            Message API
          </h2>
          <p className="mt-2 font-mono text-sm text-zinc-800 dark:text-zinc-200">
            POST /api/v1/messages
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Headers:{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
              Content-Type: application/json
            </code>{" "}
            and either{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
              Authorization: Bearer …
            </code>{" "}
            or{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
              X-Api-Key: …
            </code>
            .
          </p>

          <h3 className={subsectionTitle}>
            Body shapes (we pick the first match)
          </h3>
          <CodeBlock>{`{ "text": "Shipped v2.1" }

{ "message": "Same as text" }

{
  "title": "Deploy",
  "body": "prod — ok"
}

{ "event": "payment", "amount": 99 }   // falls back to JSON.stringify of non-branch fields`}</CodeBlock>

          <h3 className={subsectionTitle}>
            Example response (trimmed)
          </h3>
          <CodeBlock>{`{
  "ok": true,
  "workspaceId": "clx…",
  "branch": null,
  "received": { "text": "Hello" },
  "deliveries": [
    {
      "destinationId": "clx…",
      "provider": "slack_incoming_webhook",
      "label": "#incidents",
      "ok": true
    }
  ],
  "idempotencyKey": null
}`}</CodeBlock>

          <h3 className={subsectionTitle}>
            Status codes &amp; limits
          </h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">200</strong> — request accepted; check{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">deliveries</code> and{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">ok</code> per row.
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">502</strong> — at least one destination was
              targeted and <em>every</em> delivery failed.
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">401 / 403</strong> — missing, wrong, or
              insufficient-scope API key.
            </li>
            <li>
              Text length: Discord{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">2000</strong>, Telegram{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">4096</strong>; Slack follows webhook limits.
            </li>
          </ul>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Optional header{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
              Idempotency-Key
            </code>{" "}
            is echoed in the response; full deduplication is not implemented yet.
          </p>
        </section>

        <section id="security" className={guideSection}>
          <h2 className={sectionTitle}>
            Security
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            <li>
              Treat API keys like passwords. Rotate if leaked; revoke old keys in
              the admin UI.
            </li>
            <li>
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
                AUTH_SECRET
              </code>{" "}
              (server env) encrypts stored webhook URLs and bot tokens — keep it
              long (32+ chars) and secret.
            </li>
            <li>
              Changing{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
                AUTH_SECRET
              </code>{" "}
              breaks existing ciphertext; re-save destinations afterward.
            </li>
          </ul>
        </section>
      </div>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-500">
        <Link href="/admin" className="font-medium text-primary hover:underline">
          ← Back to dashboard
        </Link>
      </p>
    </div>
  );
}
