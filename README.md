# Post Message CMS

HTTP API and admin UI to **forward messages into chat apps**. Supported destinations today:

- **Slack** — [Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- **Discord** — [Create Message](https://discord.com/developers/docs/resources/channel#create-message) (bot token + channel ID)
- **Telegram** — [sendMessage](https://core.telegram.org/bots/api#sendmessage) (bot token + `chat_id`)

The same **`POST /api/v1/messages`** integration fans out to every enabled destination for the API key’s workspace. See **[PROJECT.md](./PROJECT.md)** for product scope and deeper architecture notes.

## Stack

- **Next.js** (App Router), **React**, **TypeScript**, **Tailwind CSS**
- **Prisma ORM 7** + **SQLite** locally (`DATABASE_URL` file); schema is intended to move to **MySQL** later with the same migrations workflow
- **Admin auth**: email/password, JWT session cookie (`AUTH_SECRET`)
- **Public API**: API keys (`messages:write`) scoped to a **workspace**
- **Secrets**: Webhook URLs and bot credentials stored **encrypted at rest** (key derived from `AUTH_SECRET`)

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
2. **Admin → Destinations** — add **Slack**, **Discord**, and/or **Telegram** (see sections below).
3. **Admin → API keys** — create a key (shown once).
4. Send a message:

```bash
curl -sS -X POST http://localhost:3000/api/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"text":"Hello from Post Message CMS"}'
```

Optional: `X-Api-Key: YOUR_API_KEY` instead of `Authorization`. Optional header: `Idempotency-Key` (echoed in the JSON response; full deduplication not implemented yet).

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

Copy from `.env.example` and fill in values. Do not commit `.env`.

**Important:** Rotating `AUTH_SECRET` invalidates existing **encrypted** destination secrets in the database; re-add destinations if you change it.

## API

### `GET /api/health`

JSON health check; includes a trivial database query when the app can connect.

### `POST /api/v1/messages`

Authenticates with an API key, then delivers to **all enabled destinations** (Slack, Discord, Telegram) for that key’s workspace.

**Request body:** JSON. The service maps common shapes to plain text (Slack `text`, Discord `content`, Telegram `text`):

- `text` (string)
- or `message` (string)
- or `title` + `body` (strings, formatted with a title line)
- otherwise a compact `JSON.stringify` of the body

Length limits when sending: **Discord** truncates to **2000** characters; **Telegram** to **4096**; Slack follows Incoming Webhook limits.

**Responses:**

- **200** — Delivery attempted; see `deliveries` (per destination `ok` / `error`). If there are no destinations, `deliveries` is empty and a `notice` explains that.
- **401 / 403** — Missing/invalid API key or missing `messages:write` scope.
- **400** — Non-JSON body.
- **502** — At least one destination was configured and **every** delivery failed (details in `deliveries`).

### Admin: `POST /api/admin/destinations`

Session cookie required. JSON body examples:

**Slack (default if `provider` omitted):**

```json
{
  "label": "#alerts",
  "webhookUrl": "https://hooks.slack.com/services/..."
}
```

**Discord:**

```json
{
  "provider": "discord_bot",
  "label": "Announcements",
  "botToken": "your.bot.token",
  "channelId": "1234567890123456789"
}
```

**Telegram:**

```json
{
  "provider": "telegram_bot",
  "label": "Ops chat",
  "botToken": "123456789:AA...",
  "chatId": "-1001234567890"
}
```

(`chatId` may also be a public channel username such as `@mychannel`.)

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

- Set `DATABASE_URL`, `AUTH_SECRET`, and run **`prisma migrate deploy`** (or equivalent) before `npm run start`.
- `postinstall` runs **`prisma generate`**; the generated client is written under `app/generated/prisma` (see `.gitignore`).
- Use a **Node** runtime for routes that use Prisma and the SQLite adapter (not Edge).

## License

Private / unlicensed unless you add a `LICENSE` file.
