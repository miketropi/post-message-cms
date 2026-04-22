# Post Message CMS

HTTP API and admin UI to **forward messages into chat apps**. Supported destinations today:

- **Slack** — [Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- **Discord** — [Create Message](https://discord.com/developers/docs/resources/channel#create-message) (bot token + channel ID)
- **Telegram** — [sendMessage](https://core.telegram.org/bots/api#sendmessage) (bot token + `chat_id`)

The same **`POST /api/v1/messages`** integration delivers to **default** destinations (no branch key) for the API key’s workspace, or to destinations that match an optional **`branch`** (JSON body or query). Each accepted request is **logged in the database** (request body, resolved text, per-destination results) so you can debug deliveries and **retry** failures from the admin UI—without changing the public API response shape.

Deeper product and architecture notes live in **[PROJECT.md](./PROJECT.md)**.

## Stack

- **Next.js** (App Router), **React**, **TypeScript**, **Tailwind CSS**
- **Prisma ORM 7** + **SQLite** locally (`DATABASE_URL` file); schema is intended to move to **MySQL** later with the same migration workflow
- **Admin auth**: email/password, JWT session cookie (`AUTH_SECRET`)
- **Public API**: API keys (`messages:write`) scoped to a **workspace**
- **Secrets**: Webhook URLs and bot credentials stored **encrypted at rest** (key derived from `AUTH_SECRET`)
- **Message log**: `Message` + `Delivery` rows, workspace **`messageRetentionDays`** (default 30) for old-row cleanup

## Prerequisites

- **Node.js** (LTS recommended)
- A toolchain that can build **native addons** (for `better-sqlite3`), e.g. Xcode Command Line Tools on macOS

## Quick start

```bash
npm install
cp .env.example .env
# Edit .env: set AUTH_SECRET (min 32 characters), e.g. openssl rand -base64 32
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. **Register** an admin account (creates a default workspace).
2. **Admin → Destinations** — add **Slack**, **Discord**, and/or **Telegram** (see sections below). Use an optional **branch key** per destination to route API calls to specific channels; leave it empty for **default** destinations that receive unscoped messages.
3. **Admin → API keys** — create a key (shown once).
4. **Send a test message** (below). Then open **Admin → Messages** to see the log, per-destination status, and **retry** if something failed.

```bash
curl -sS -X POST http://localhost:3000/api/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"text":"Hello from Post Message CMS"}'
```

**Branch routing:** send only to destinations with that branch key (e.g. `alerts`):

```bash
curl -sS -X POST 'http://localhost:3000/api/v1/messages?branch=alerts' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"text":"Alerts only"}'
```

Or include `"branch":"alerts"` in the JSON body (body wins if both are set). The `branch` field is stripped before message text is computed, so it does not appear in the chat line.

**Headers:** you can use **`X-Api-Key: YOUR_API_KEY`** instead of `Authorization`. Optional: **`Idempotency-Key`** — stored on the **message log** when present; **duplicate suppression** (skip second send) is not implemented yet, so do not rely on it for safety-critical deduplication.

### Discord setup (summary)

1. [Discord Developer Portal](https://discord.com/developers/applications) → your application → **Bot** → reset/copy the **token**.
2. **OAuth2 → URL Generator** (or install link): grant `bot` scope and **Send Messages** (and **View Channel**) for your guild; invite the bot.
3. In Discord: **User Settings → Advanced → Developer Mode** on → right‑click the **target channel** → **Copy channel ID**.
4. Paste token + channel ID in **Admin → Destinations** (Discord). The token is stored encrypted and cannot be viewed again in the UI.

### Telegram setup (summary)

1. Open [@BotFather](https://t.me/BotFather) → **`/newbot`** (or use an existing bot) → copy the **API token** (`123456789:AA…`).
2. Start a chat with the bot, or add it to a group/supergroup and send a message (groups may need **privacy mode** / admin rights depending on your use case).
3. Obtain **chat_id**: numeric ID from [`getUpdates`](https://core.telegram.org/bots/api#getupdates) (or helper bots), or use **`@channelusername`** for public channels where the API allows it.
4. In **Admin → Destinations**, choose **Telegram — Bot** and paste token + chat ID. The token is stored encrypted and is not shown again in the UI.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite file URL, e.g. `file:./prisma/dev.db`. For MySQL later, use a `mysql://` URL after changing the Prisma `provider`. |
| `AUTH_SECRET` | Yes | At least **32 characters**. Signs admin session JWTs and derives encryption for stored destination secrets. |
| `CRON_SECRET` | No | If set, enables **`POST /api/admin/cleanup`** via `Authorization: Bearer <CRON_SECRET>` (no browser session). Generate a long random value (e.g. `openssl rand -base64 32`). |

Copy from `.env.example` and fill in values. Do not commit `.env`.

**Important:** Rotating `AUTH_SECRET` invalidates existing **encrypted** destination secrets in the database; re-add destinations if you change it.

**Optional (email for password reset, etc.):** if your `.env.example` lists SMTP variables, set them so forgot-password emails can send in production.

## API overview

### `GET /api/health`

JSON health check; includes a trivial database query when the app can connect.

### `POST /api/v1/messages`

Authenticates with an API key, then delivers to enabled destinations for that key’s workspace:

- **No `branch`:** destinations with an **empty** branch key only (default fan-out).
- **`branch` set** (JSON property and/or `?branch=` query): destinations whose **branch key** matches only. JSON `branch` takes precedence over the query string when both are present.

**Request body:** JSON. The service maps common shapes to plain text:

- `text` (string)
- or `message` (string)
- or `title` + `body` (strings, formatted with a title line)
- optional `branch` (string, slug: letter/digit start, then letters, digits, `_`, `-`, max 63 chars)
- otherwise a compact `JSON.stringify` of the body (routing keys like `branch` are omitted from this stringify path when other fields remain)

**Side effect (non-blocking):** after delivery, the app **persists** a `Message` row and one `Delivery` row per target (status, HTTP code, error, duration). If the database write fails, the HTTP response to the client is still normal (errors are logged server-side only).

**Responses:**

- **200** — Delivery attempted; see `deliveries` (per destination `ok` / `error`). Response includes `branch` (`null` if default routing). If there are no matching destinations, `deliveries` is empty and a `notice` explains that.
- **401 / 403** — Missing/invalid API key or missing `messages:write` scope.
- **400** — Non-JSON body.
- **502** — At least one destination was configured and **every** delivery failed (details in `deliveries`).

Length limits when sending: **Discord** truncates to **2000** characters; **Telegram** to **4096**; Slack follows Incoming Webhook limits.

### Admin APIs (session cookie)

All of these require a **logged-in** admin; pass cookies from the browser or the same session you use for `/admin/*`.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/admin/messages` | Paginated list with filters (`workspaceId`, `page`, `limit`, `branch`, `status`, `from`, `to` ISO dates). List omits `rawBody` for size. |
| `GET` | `/api/admin/messages/:id` | Full message + deliveries (includes `rawBody`—admin only). |
| `POST` | `/api/admin/messages/:id/retry` | Re-sends to destinations whose **latest** attempt **failed** (enabled targets only). Returns a shape similar to `POST /api/v1/messages` for the retry batch. |
| `POST` | `/api/admin/cleanup` | Deletes old `Message` rows (and cascade `Delivery` rows) per workspace **`messageRetentionDays`**. **Session** (browser) or **`Authorization: Bearer` + `CRON_SECRET`**. See [Scheduled cleanup (you configure this)](#scheduled-cleanup-you-configure-this). |
| `GET` / `POST` | `/api/admin/destinations` | List/create destinations (see below). |
| `POST` | `/api/admin/destinations/:id/test` | Test send a string to a single destination. |

### Admin: `POST /api/admin/destinations` (create)

Session cookie required. JSON body examples:

**Slack (default if `provider` omitted):**

```json
{
  "label": "#alerts",
  "webhookUrl": "https://hooks.slack.com/services/...",
  "branchKey": "alerts"
}
```

(`branchKey` optional; omit for a default destination.)

**Discord:**

```json
{
  "provider": "discord_bot",
  "label": "Announcements",
  "botToken": "your.bot.token",
  "channelId": "1234567890123456789",
  "branchKey": "announcements"
}
```

**Telegram:**

```json
{
  "provider": "telegram_bot",
  "label": "Ops chat",
  "botToken": "123456789:AA...",
  "chatId": "-1001234567890",
  "branchKey": "ops"
}
```

(`chatId` may also be a public channel username such as `@mychannel`.)

## Message log, retention, and production ops

- **UI:** **Admin → Messages** lists recent requests; open a row for full text, raw JSON, and per-destination results. **Retry failed destinations** when the last attempt for that destination is failed.
- **Retention window:** each workspace has **`messageRetentionDays`** (default **30** in the Prisma schema). The app only **stores** that number—it does not delete data on a timer by itself.
- **Runtime:** use a **Node.js** server (not Edge) for routes that use Prisma and the SQLite driver—same as the rest of the app (see [Deployment notes](#deployment-notes)).

### Scheduled cleanup (you configure this)

**The app does not run cleanup automatically.** There is no background job inside the process that prunes old messages on a schedule.

**What you do in production:** configure something *outside* the app to call **`POST /api/admin/cleanup`** when you want (e.g. once per day). Examples: `cron` on a server, **Vercel Cron**, **GitHub Actions** `schedule`, **Kubernetes CronJob**, a hosted scheduler, etc.

**What the endpoint does when called:** for each affected workspace, it deletes `Message` rows (and their `Delivery` rows via CASCADE) with `createdAt` older than that workspace’s **`messageRetentionDays`**.

**Auth — two options:**

1. **Browser / admin session** (same as other admin APIs). Optional JSON: `{ "workspaceId": "..." }`. If you omit `workspaceId`, the same “default workspace for this user” rule applies as for other admin routes.

2. **Automation — set `CRON_SECRET` in the environment** and call with  
   `Authorization: Bearer <value-matching-CRON_SECRET>`.  
   - JSON **`{ "workspaceId": "..." }`** — clean **only** that workspace (no user ownership check; use only in trusted environments).  
   - **Empty body `{}` or no `workspaceId`** — clean **all** workspaces in the database, each using its own retention day count.  
   A wrong or missing `Bearer` token when `CRON_SECRET` is set returns **401** (it does not fall back to session).

**Example (cron, all workspaces):**

```bash
curl -sS -X POST "https://your-host.example.com/api/admin/cleanup" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Example (single workspace):** same headers, body `{ "workspaceId": "clx..." }`.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create/apply migrations (dev) |
| `npm run db:deploy` | Apply migrations (CI/production) |
| `npm run db:studio` | Prisma Studio |

## Deployment notes

- Set `DATABASE_URL`, `AUTH_SECRET`, and run **`npx prisma migrate deploy`** (or `npm run db:deploy`) before `npm run start`.
- `postinstall` runs **`prisma generate`**; the generated client is written under `app/generated/prisma` (see `.gitignore`).
- Use a **Node** runtime for routes that use Prisma and the SQLite adapter (not Edge).
- **Message retention in production** is not automatic; see [Scheduled cleanup (you configure this)](#scheduled-cleanup-you-configure-this).

## License

Private / unlicensed unless you add a `LICENSE` file.
