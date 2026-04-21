# Post Message CMS

HTTP API and admin UI to **forward messages into chat apps**. Today it supports **Slack** via [Incoming Webhooks](https://api.slack.com/messaging/webhooks); the architecture is meant to add Discord, Telegram, and more without changing caller integrations.

Product goals, concepts, and roadmap are in **[PROJECT.md](./PROJECT.md)**.

## Stack

- **Next.js** (App Router), **React**, **TypeScript**, **Tailwind CSS**
- **Prisma ORM 7** + **SQLite** locally (`DATABASE_URL` file); schema is intended to move to **MySQL** later with the same migrations workflow
- **Admin auth**: email/password, JWT session cookie (`AUTH_SECRET`)
- **Public API**: API keys (`messages:write`) scoped to a **workspace**
- **Slack**: webhook URLs stored **encrypted at rest** (key derived from `AUTH_SECRET`)

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
2. **Admin → Destinations** — add a Slack Incoming Webhook URL (`https://hooks.slack.com/services/...`).
3. **Admin → API keys** — create a key (shown once).
4. Send a message:

```bash
curl -sS -X POST http://localhost:3000/api/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"text":"Hello from Post Message CMS"}'
```

Optional: `X-Api-Key: YOUR_API_KEY` instead of `Authorization`. Optional header: `Idempotency-Key` (echoed in the JSON response; full deduplication not implemented yet).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite file URL, e.g. `file:./prisma/dev.db`. For MySQL later, use a `mysql://` URL after changing the Prisma `provider`. |
| `AUTH_SECRET` | Yes | At least **32 characters**. Signs admin session JWTs and derives encryption for stored webhook URLs. |

Copy from `.env.example` and fill in values. Do not commit `.env`.

**Important:** Rotating `AUTH_SECRET` invalidates existing **encrypted** Slack webhook secrets in the database; re-save or re-add destinations if you change it.

## API

### `GET /api/health`

JSON health check; includes a trivial database query when the app can connect.

### `POST /api/v1/messages`

Authenticates with an API key, then delivers to **all enabled Slack destinations** for that key’s workspace.

**Request body:** JSON. The service maps common shapes to Slack `text`:

- `text` (string)
- or `message` (string)
- or `title` + `body` (strings, formatted with a title line)
- otherwise a compact `JSON.stringify` of the body

**Responses:**

- **200** — Delivery attempted; see `deliveries` (per destination `ok` / `error`). If there are no Slack destinations, `deliveries` is empty and a `notice` explains that.
- **401 / 403** — Missing/invalid API key or missing `messages:write` scope.
- **400** — Non-JSON body.
- **502** — At least one destination was configured and **every** delivery failed (details in `deliveries`).

Admin JSON routes under `/api/admin/*` use the **session cookie** (sign in via the web UI); they are not meant for API-key access.

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
