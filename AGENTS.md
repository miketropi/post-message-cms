<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Repository context (for agents)

- **Architecture, data model, routing, and implementation snapshot:** [PROJECT.md](./PROJECT.md) — read this before large changes.
- **User-facing setup, env vars, curl examples:** [README.md](./README.md).
- **In-repo developer guide (examples, branch routing):** `/admin/guide` in the app (source: `app/admin/guide/page.tsx`).

When touching messaging or providers, start from `lib/messages/dispatch.ts` and `lib/providers/`.

CLAUDE.md → points here.
