# InternLog

A browser-local internship journal with daily work entries and weekly reports.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/internlog test` — Vitest unit/component tests
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

- InternLog is frontend-only and browser-local by explicit user request.
- Dates represent local calendar days, not UTC timestamps.
- Imported data must validate completely before replacement; failed writes must not update visible state.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

- Use a TDD workflow when executing: red, green, refactor.
- Create a GitHub repository and commit gradually at stable milestones.
- Keep v1 free of authentication, external app integrations, AI, and paid services.
- GitHub is for source control only, not an in-app feature.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
