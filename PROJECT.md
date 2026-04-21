# Post Message CMS

## Purpose (for agents)

This repository is a **message bridge / notification CMS**: admins configure **destinations** (Slack, Discord, Telegram) and **rules** for how incoming API traffic becomes outbound chat messages. The product goal is **low friction for operators** and **predictable, documented APIs for developers**. Persistence uses **Prisma** with **SQLite** initially and **MySQL** for later hosted scale, without rewriting domain logic.

When implementing, prefer: clear admin UX, explicit configuration over magic defaults, idempotent webhooks where possible, and secrets stored server-side only.

---

## Product summary

- **What it is**: A Next.js application that exposes HTTP APIs (and an admin UI) to **register**, **authenticate admins**, **connect third-party chat providers**, and **forward or fan out messages** to those channels.
- **Who it’s for**:
  - **Developers**: simple API keys or signed requests, stable payloads, webhooks for delivery status if needed later.
  - **End users / operators**: guided setup (OAuth or bot tokens per provider), test sends, and visibility into recent deliveries.
- **Differentiators**: easy configuration, flexible routing (one API call → many destinations), provider abstraction so new channels can be added without changing caller integrations.

---

## Core concepts

| Concept | Meaning |
|--------|---------|
| **Admin** | Authenticated user who owns workspaces, API credentials, and provider connections. |
| **Workspace / Project** | Optional tenant boundary; all resources belong to one admin or workspace. |
| **Provider connection** | Authorized link to Slack (workspace/app), Discord (bot + guild/channel), or Telegram (bot). |
| **Destination** | A concrete target: e.g. Slack `#alerts`, Discord channel ID, Telegram chat ID. |
| **Message template** | Optional mapping from API JSON to provider-specific text, blocks, embeds, or parse modes. |
| **Outbound job** | Record of a send attempt: payload snapshot, provider, status, error, timestamps. |

Agents should treat **provider adapters** as the main extension point: normalize “outbound message” internally, map per provider at the edge.

---

## Integrations (initial scope)

### Slack

- Typical patterns: **Incoming Webhooks** (simplest), **Slack app** with `chat.postMessage` (more control).
- Store: bot token or webhook URL **encrypted at rest**; never return full secrets to the client after save.
- UX: “Add to Slack” OAuth flow is ideal long-term; document manual token entry if OAuth is phased.

### Discord

- **Bot token** + **application ID**; post via REST (`/channels/{id}/messages`).
- Validate channel/guild IDs; rate limits apply—queue or backoff in the worker layer.

### Telegram

- **Bot token** from BotFather; `sendMessage` / `sendPhoto` etc. as needed.
- Chat IDs may be negative for groups; document how operators obtain them (e.g. `getUpdates` in dev).

**Shared requirement**: each provider module implements the same internal interface, e.g. `send({ destinationRef, content, metadata }) -> Result`.

---

## Technical stack

| Layer | Choice | Notes |
|-------|--------|--------|
| Framework | **Next.js** (App Router) | Server Components for admin UI; Route Handlers or Server Actions for API and OAuth callbacks. |
| Database | **Prisma + SQLite** (dev/small deploy) | Single `schema.prisma`; access via generated Prisma Client (singleton in server code). |
| Database (later) | **MySQL** | Same Prisma schema and migrations workflow; swap `provider` + `DATABASE_URL`—see below. |
| Auth | Session + credentials or OAuth for admins | HttpOnly cookies for web; API keys with scopes for programmatic access. |
| Background work | Optional queue / cron | For retries and rate limits; start in-process, extract to a worker later if needed. |

### Prisma conventions (agents)

- **Schema**: `prisma/schema.prisma` — models, relations, indexes; no duplicate “shadow” types outside Prisma unless needed for API DTOs.
- **Migrations**: `prisma migrate dev` locally; `prisma migrate deploy` in CI/production. Never hand-edit applied migration SQL without team agreement.
- **Client**: one shared import (e.g. `lib/db.ts` or `lib/prisma.ts`) that avoids instantiating multiple clients in dev hot-reload (classic `globalThis` singleton pattern for Next.js).
- **Runtime**: use **Node.js** runtime for code that calls Prisma (not Edge), unless using Prisma Accelerate/Data Proxy with an Edge-compatible entry—default this project to Node for simplicity.
- **SQLite at runtime (Prisma ORM 7+)**: the generated client expects a **driver adapter**. This app uses `@prisma/adapter-better-sqlite3` + `better-sqlite3`; build `PrismaClient` with that adapter and a filesystem path from `DATABASE_URL` (strip the `file:` prefix). The CLI (`migrate`, `studio`) still reads `DATABASE_URL` via `prisma.config.ts`.

### SQLite → MySQL upgrade path (non-negotiable design constraint)

Goal: moving to MySQL is a **datasource + deployment** change, not an application rewrite.

- **Prisma provider switch**: in `schema.prisma`, change `provider` from `"sqlite"` to `"mysql"` (or `"postgresql"` if you pivot—this project standardizes on **MySQL** for the hosted phase).
- **`DATABASE_URL`**: environment-only; SQLite uses a file URL (e.g. `file:./dev.db`); MySQL uses a standard server URL with credentials and database name.
- **Schema portability**: prefer Prisma types that map cleanly on both sides (`String`, `DateTime`, `Int`, `Boolean`, `Json` where appropriate). Avoid SQLite-only raw SQL in `.$queryRaw` unless gated and tested on MySQL.
- **Migrations**: generate and apply migrations against SQLite first; before cutover, run the same migration history against a **MySQL** database in staging. Resolve any provider-specific drift early (e.g. string length limits, JSON indexing).
- **Data move**: SQLite → MySQL is not automatic; document a one-time **export/import** (script or off-the-shelf ETL) for early adopters. Prisma does not replace a bulk data migration strategy.
- **CI**: optionally run `prisma migrate deploy` against MySQL in a job to catch migration issues before production.

---

## API surface (intended)

Document publicly in `README` or OpenAPI once stable. Conceptual endpoints:

- **Admin auth**: register, login, logout, session refresh, password reset (if email added later).
- **API keys**: create, list (masked), revoke; scope: `messages:write`, `destinations:read`, etc.
- **Providers**: create/update connection, test connection, list destinations (where the API allows).
- **Messages**: `POST /api/v1/messages` (or versioned route) with JSON body; optional `X-Api-Key` or Bearer token.
- **Webhooks (future)**: inbound events from providers or delivery receipts.

**Idempotency**: accept optional `Idempotency-Key` header for `POST /messages` to avoid duplicate posts on retries.

---

## Admin UI (intended)

- Dashboard: connection health, recent deliveries, error rate.
- Wizards: add Slack / Discord / Telegram with copy-paste fields or OAuth.
- Message tester: send a sample payload to a chosen destination.
- Settings: API keys, workspace name, danger zone (delete data).

---

## Security and compliance

- Encrypt provider tokens at rest; rotate keys; audit log for connection changes.
- Validate and size-limit JSON bodies; sanitize content where providers interpret HTML/Markdown.
- Rate limit public API per API key and per IP.
- Principle of least privilege for OAuth scopes and bot permissions.

---

## Repository layout (suggested for greenfield)

Agents may create this structure as implementation proceeds:

```
app/                 # Next.js App Router: admin UI + route handlers
prisma/
  schema.prisma      # Prisma schema (source of truth for DB shape)
  migrations/        # Generated by prisma migrate
lib/
  prisma.ts          # Prisma Client singleton (or lib/db.ts)
  auth/              # Sessions, API key verification
  providers/         # slack/, discord/, telegram/ adapters + shared types
  messages/          # Validation, templating, enqueue/dispatch
```

Keep **provider-specific code** isolated; shared types live in `lib/messages` or `lib/providers/types`. Domain types that mirror persistence should align with Prisma models or thin mappers next to route handlers.

---

## Implementation phases (agent checklist)

1. **Bootstrap**: Next.js, lint/format, env schema, **Prisma + SQLite** (`prisma init`, first migration), Prisma Client singleton, health check route (optional DB ping).
2. **Admin auth**: registration/login, session middleware, protected admin layout.
3. **API keys**: issuance and verification middleware for `POST /api/v1/messages`.
4. **Provider connections**: models + CRUD + encrypted storage; “test message” path per provider.
5. **Dispatch pipeline**: persist outbound job, call adapter, record result, basic retry.
6. **Admin UI**: connections, destinations, tester, recent jobs.
7. **Docs**: OpenAPI or markdown for integrators; operator runbook for each chat app.
8. **MySQL readiness**: staging DB with `provider = "mysql"`, `prisma migrate deploy`, fix any schema/migration drift; document SQLite → MySQL data migration for existing installs.

---

## Out of scope (unless explicitly requested)

- Multi-region HA, full observability stack, mobile apps, end-user chat inside this product, or replacing native Slack/Discord/Telegram clients.

---

## Glossary

- **Bridge**: Accept structured input over HTTP and deliver human-readable notifications to chat systems.
- **CMS (in this name)**: Configuration and content routing system for messages—not a traditional page-based CMS.

---

## Success criteria

- An admin can connect at least one provider and receive a test message within minutes.
- A developer can send one HTTP request with an API key and see the message in the configured channel.
- Switching the database from SQLite to MySQL is a **Prisma provider + `DATABASE_URL` + migration deploy** change, plus a documented **data migration** for existing SQLite files—not an application rewrite.
