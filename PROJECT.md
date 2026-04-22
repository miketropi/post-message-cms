# Post Message CMS

## Purpose (for agents)

This repository is a **message bridge / notification CMS**: operators configure **destinations** (where messages go) and—optionally—**branches** (named routes). Developers call **`POST /api/v1/messages`** with an API key; the app fans out to every matching destination. Product goals: **low friction for operators**, **stable HTTP API for integrators**, and **secrets only on the server** (encrypted at rest where stored in the DB).

**Prisma** + **SQLite** in development; the schema is designed so **MySQL** can replace SQLite via datasource config and migrations later.

**Authoritative architecture notes for automation:** this file. **Operator quickstart and curl examples:** [README.md](./README.md). **Cursor/IDE note:** [AGENTS.md](./AGENTS.md) links here.

When implementing, prefer: explicit config over hidden defaults, validate external input, and keep **provider code** in `lib/providers/{slack,discord,telegram}/` behind a small dispatch layer (`lib/messages/dispatch.ts`).

---

## What is implemented (snapshot)

| Area | Status |
|------|--------|
| **Admin auth** | Register, login, logout; JWT session cookie (`AUTH_SECRET`); **forgot/reset password** (tokens in DB + email when SMTP is configured) |
| **User profile** | `User.firstName`, `lastName`, `bio`; **Account** admin page; **Gravatar** for avatar in shell |
| **Workspaces** | One default workspace on register; all API keys and destinations are workspace-scoped |
| **API keys** | `ApiKey` with `messages:write`; list masked; **POST `/api/v1/messages`** uses `Authorization: Bearer` or `X-Api-Key` |
| **Destinations** | `Destination` per workspace: **Slack** (`slack_incoming_webhook`, Incoming Webhook URL), **Discord** (`discord_bot`, bot + channel), **Telegram** (`telegram_bot`, bot + `chat_id`); `secretEncrypted` (AES-256-GCM, key from `AUTH_SECRET`); `publicMeta` for display |
| **Branch routing** | Optional `Destination.branchKey` (slug). API callers set **`branch`** in JSON and/or `?branch=` query; `lib/messages/routing.ts` strips routing keys before text formatting. If `branch` is omitted, only destinations with **`branchKey: null`** (default) receive the message. See `assertValidRequestBranch` / `BRANCH_KEY_PATTERN` |
| **Dispatch** | `dispatchIncomingMessage(workspaceId, body, { branch })` → `deliverPlainTextToDestination` per row; `jsonBodyToPlainText` in `lib/messages/format.ts` |
| **Admin test send** | **POST** `/api/admin/destinations/[id]/test` with `{ "text": "..." }` (session auth) reuses `deliverPlainTextToDestination` |
| **Admin UI** | `AdminShell` (sidebar, mobile nav, Lucide): Dashboard, **API keys**, **Destinations**, **Developer guide** (`/admin/guide`); **Account** in user menu |
| **Email** | Optional **Nodemailer** (`lib/mail.ts`): if `SMTP_HOST` + `SMTP_FROM` are set, password-reset and related emails send; otherwise flows may skip or degrade gracefully (check call sites) |
| **Health** | `GET /api/health` |

**Not** implemented as durable **outbound job** rows (no `OutboundJob` model yet); delivery results are **returned in the API response** only. Idempotency header is **echoed** but not fully enforced for duplicate suppression.

---

## Product summary (unchanged intent)

- **What it is**: Next.js app with an admin UI and JSON APIs to connect chat providers and **forward** or **fan out** messages.
- **Developers**: API keys, versioned `POST /api/v1/messages`, optional branch routing.
- **Operators**: Web UI to create keys, add destinations (Slack / Discord / Telegram), optional `branchKey`, and a developer guide.

---

## Core concepts (data model)

| Concept | Meaning |
|--------|--------|
| **User** | Admin account. Fields include `email`, `passwordHash`, optional `firstName`, `lastName`, `bio`. |
| **Password reset** | `PasswordResetToken`: hashed token, `expiresAt`, ties to `User`. |
| **Workspace** | Tenant boundary: `name`, `userId`, owns `ApiKey`s and `Destination`s. |
| **ApiKey** | Programmatic auth: `keyHash` (sha256 of raw key), `publicLabel`, `scopes` JSON (default `messages:write`). |
| **Destination** | One outbound target: `provider` string, `label`, `secretEncrypted`, optional `publicMeta`, optional **`branchKey`**, `enabled`. |
| **Default vs branch** | Destinations with **`branchKey: null`** receive traffic when the API does **not** specify a `branch`. Destinations with a set `branchKey` only receive traffic when the request’s **`branch`** matches ( body `branch` and/or `?branch=`). |
| **Message template (future)** | `PROJECT` originally described templates; current code uses a shared **plain-text** mapping for all providers. |

**Provider string constants** live in `lib/providers/types.ts`: `PROVIDER_SLACK_INCOMING_WEBHOOK`, `PROVIDER_DISCORD_BOT`, `PROVIDER_TELEGRAM_BOT`.

---

## Integrations (implemented vs future)

| Provider | Transport in code | Secret shape |
|----------|-------------------|--------------|
| **Slack** | Incoming Webhook `POST` URL | Encrypted single URL string |
| **Discord** | Bot REST `POST /channels/{id}/messages` | Encrypted JSON `botToken` + `channelId` |
| **Telegram** | Bot `POST .../sendMessage` | Encrypted JSON `botToken` + `chatId` |

**Future** (per original vision): Slack OAuth / `chat.postMessage`, message templates, idempotent dedupe, background workers, webhooks for delivery receipts.

**Shared pattern**: add a provider constant, implement send in `lib/providers/<name>/`, extend `deliverPlainTextToDestination` and the Prisma `findMany` `provider in [...]` list in `dispatchIncomingMessage` if a new `Destination.provider` is introduced.

---

## Technical stack

| Layer | Choice | Notes |
|-------|--------|--------|
| Framework | **Next.js** (App Router) | RSC for admin; Route Handlers for APIs |
| ORM / DB | **Prisma 7** + **SQLite** | `prisma/schema.prisma`; **MySQL** later: switch `datasource` + `DATABASE_URL` |
| Prisma client | `lib/prisma.ts` | **Driver adapter** `@prisma/adapter-better-sqlite3`; **production** uses `globalThis` singleton; **development** recreates client to avoid stale model delegates after `migrate`/`generate` |
| Output | `app/generated/prisma` | Created by `prisma generate` (`postinstall` / `build`); gitignored under `app/generated` |
| Config | `prisma.config.ts` + `.env` | `DATABASE_URL`; CLI loads via dotenv in config |
| Auth (browser) | **jose** HS256 in HttpOnly cookie | `AUTH_SECRET` (min 32 chars) |
| Auth (API) | API key | Hash lookup on `ApiKey` |

### SQLite → MySQL (constraint)

- Portable Prisma types; no SQLite-only `.$queryRaw` without MySQL testing.
- Rotating `AUTH_SECRET` **breaks** decryption of `secretEncrypted` for destinations—operators must re-save or re-add connections.

### Environment (agent checklist)

- **Required:** `DATABASE_URL`, `AUTH_SECRET` (see `.env.example`).
- **Optional email:** `SMTP_HOST`, `SMTP_FROM`, and related vars for password and notification mail.

---

## API surface (as built)

| Endpoint | Auth | Role |
|----------|------|------|
| `POST /api/v1/messages` | API key | Fan-out to destinations for key’s workspace; optional **`branch`** in body or query; response includes `deliveries`, `branch` |
| `GET /api/health` | None | Liveness + DB check |
| `GET/POST /api/admin/*` | Session cookie | CRUD for keys/destinations; see route tree under `app/api/admin/` |
| `POST /api/admin/destinations/:id/test` | Session | Test message to a single destination |

**Developer-facing narrative** and examples: **`/admin/guide`** and [README.md](./README.md).

**Idempotency:** `Idempotency-Key` may be echoed in responses; treat **full** deduplication as future work.

---

## Admin UI (as built)

- **Shell**: `app/admin/admin-shell.tsx` — responsive sidebar, `lucide-react`, user block with **Account** and Gravatar.
- **Routes**: `/admin` (dashboard), `/admin/api-keys`, `/admin/destinations`, `/admin/guide`, `/admin/account` (and related client forms).
- **Auth pages** (not under `/admin` matcher): `login`, `register`, `forgot-password`, `reset-password`.

`middleware.ts` only protects **`/admin/*`** (session required).

---

## Security notes

- **Encrypt** destination secrets; never return full secrets after create.
- **Hash** API keys; only show raw key once at creation.
- **Password reset** tokens stored hashed; expiry enforced in server actions.
- **Rate limits / IP allowlists**: not built into core yet—add at edge or middleware if required.

---

## Repository layout (important paths)

```
app/
  admin/                 # AdminShell, pages (dashboard, api-keys, destinations, guide, account)
  api/                   # v1/messages, health, admin/*
  register|login|forgot-password|reset-password
lib/
  prisma.ts
  auth/                  # session, jwt, password, actions, password reset tokens/actions, profile
  api-keys.ts
  admin-api.ts
  secrets.ts             # encrypt/decrypt for destination payload strings
  mail.ts
  gravatar.ts
  cn.ts
  messages/              # dispatch.ts, format.ts, routing.ts
  providers/             # types.ts; slack/, discord/, telegram/
prisma/
  schema.prisma
  migrations/
prisma.config.ts
PROJECT.md
README.md
AGENTS.md
```

---

## Success criteria (product)

- An admin can add at least one destination and receive traffic from **`POST /api/v1/messages`**.
- A developer can integrate with **one** HTTP contract (same payload; optional `branch`).
- **MySQL** cutover is primarily **Prisma datasource + migrations + data migration** for SQLite files, not a rewrite of business logic.

---

## Glossary

- **Bridge**: HTTP in → chat APIs out.
- **CMS (name)**: Configuration for message *routing*—not a page CMS.
- **Branch**: Named slice of destinations, selected by API `branch` to avoid sending every message to every channel.
