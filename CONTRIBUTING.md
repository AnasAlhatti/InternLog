# Contributing to InternLog

1. Fork or branch the repository and install dependencies with `pnpm install`.
2. Write a failing test that describes the bug or new behavior.
3. Implement the smallest change, get the test passing, then refactor.
4. Run `pnpm --filter @workspace/internlog test` and
   `pnpm --filter @workspace/internlog typecheck`.
5. Check keyboard use and mobile layout for UI changes.
6. Make small descriptive commits and open a pull request explaining the change.

Keep the first version browser-local. Do not add authentication, AI, a database,
analytics, or external services without discussing the scope first.
Never commit personal backups, secrets, `.env` files, generated output, or
`node_modules`. Preserve calendar dates as `YYYY-MM-DD` local dates and validate
all imported backups before replacing saved data.
