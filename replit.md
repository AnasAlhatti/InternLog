# InternLog

A browser-local internship journal with daily work entries and weekly reports.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/internlog test` — Vitest unit/component tests
- `pnpm --filter @workspace/internlog test:e2e` — isolated Chromium recovery, native cross-tab locking, and browser-history regressions (builds and serves on port 4173)
- Install the test browser outside Replit with `pnpm --filter @workspace/internlog exec playwright install --with-deps chromium`. CI does this automatically; Replit uses its supplied Chromium.
- Browser tests never use an existing profile or storage state. Failure reports and traces are in `generated-artifacts/internlog/` (also uploaded by CI on failure).
- `pnpm --filter @workspace/internlog typecheck` — app TypeScript check
- InternLog uses its managed `artifacts/internlog: web` workflow.
- No database or account is required for InternLog.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- Journal storage is browser-local; the user explicitly added optional AI weekly summaries on 2026-10-22. Only the selected week's entry details are sent, after confirmation, via the API server to Replit AI Integrations/OpenAI. No journal database or accounts are used.
- Dates represent local calendar days, not UTC timestamps.
- Imported data must validate completely before replacement; failed writes must not update visible state.
- Cross-tab saving deliberately requires Web Locks rather than an unsafe fallback: preventing silent data loss takes priority over support for older browsers.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

- Use a TDD workflow when executing: red, green, refactor.
- Create a GitHub repository and commit gradually at stable milestones.
- Keep authentication and unrelated external app integrations out of scope. Optional AI weekly summaries are now explicitly requested; disclose credit usage and never send notes automatically.
- GitHub is for source control only, not an in-app feature.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
