# InternLog

A responsive, browser-local internship journal. Record daily work, learning,
blockers, skills, and hours, then prepare an editable weekly report from those
entries. No account or database is required. Reports work without AI; an optional
AI summary uses Replit AI Integrations/OpenAI and is billed to Replit credits.

## Setup

Requires Node.js 24 and pnpm 10.

```sh
pnpm install
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/internlog dev
```

In Replit, use the **InternLog** preview. Its managed workflow supplies the port
and base path automatically. The app lives in `artifacts/internlog`.
The API server processes optional AI summaries but does not store journal data.
Run its managed workflow too when using AI. Outside Replit, route `/api` to the
API server and configure OpenAI through Replit's integration setup; never put
its credentials in browser code.

```sh
pnpm --filter @workspace/internlog test
pnpm --filter @workspace/internlog typecheck
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/internlog build
```

## Features

- Dashboard with entry, hours, skills, and open-blocker totals.
- Create, view, edit, and delete dated entries; hours must be between 0 and 24.
- Search titles, tasks, and learning notes; combine date, skill, and blocker filters.
- Monday–Sunday reports with a readable document preview, editable Markdown,
  weekly totals, clipboard copy, and file download.
- Optional, consent-based AI summaries of the selected week's entries, saved
  locally and included in JSON backups.
- Profile settings, validated JSON backup import/export, and clear-data confirmation.
- Five optional demo entries, including one open and one resolved blocker.
- Keyboard-accessible controls and responsive desktop/mobile navigation.

## Demo

1. Open Settings and choose **Load Sample Data**. Samples are never loaded automatically.
2. Visit Dashboard, then Entries to explore filtering and full entry details.
3. Add a daily entry, edit it, and refresh to see browser persistence.
4. Visit Weekly Report and select a date in the sample week (the current week).
5. Edit the report, copy it, or download Markdown.
6. Export a JSON backup from Settings. To try import safely, keep that backup
   before clearing data; import validates the complete file before asking to replace data.

## Data and limitations

Data is kept in `localStorage` in the current browser and origin. There is no
server sync, account, cross-device access, or automatic backup. Browser-data
deletion, changing browser/device, or moving to another domain can make entries
unavailable. Export backups regularly and keep them somewhere safe. A published
site has a different origin from a development preview; use export/import to move data.

The detailed report is generated deterministically from saved entries. A separate
AI draft can be generated only after confirming the disclosure. AI receives the
selected week's entry details, not the profile, entry IDs, other weeks, or manual
report edits. Always review it for accuracy. Generating a summary does not
overwrite report edits. Saved AI drafts survive reloads and are included in
backups; Clear all data removes them. If their source entries change, they are
marked out of date and excluded from Copy/Download until regenerated.
Edited report previews are temporary; download or copy them before leaving the
page. Entries and profile settings persist. Calendar dates do not use UTC conversion.

Malformed browser data is not silently overwritten. The app displays a recovery
message and prevents ordinary saves until data is explicitly restored or replaced.
Recovery status remains active after dismissing a warning. Settings offers an
exact copy of the damaged storage as a labeled `.txt` recovery file instead of
pretending an empty journal is a valid backup. This recovery file is for manual
rescue and cannot be imported until repaired into valid InternLog JSON.
Quota/access failures leave visible state unchanged and display an error.
Backups contain your work notes and profile, so treat them as private files.

Same-origin tabs coordinate writes using the browser Web Locks API and compare
the saved snapshot before each write. A stale tab cannot save, clear, import, or
load samples over another tab's newer data. Its unsaved form stays visible: copy
any draft first, then use **Reload latest journal** and confirm the reload.
A current browser with Web Locks support on HTTPS (or localhost) is required
for saving; unsupported contexts display an error instead of falling back to
unsafe writes.

Journal contents are not sent automatically. Confirmed AI requests pass through
the API server to OpenAI via Replit AI Integrations; our server does not persist
notes or log prompts/results. Fonts load from Google Fonts, which receives
standard web request information. AI requires internet access and available
credits; failures leave the journal and manual report unchanged.

The public, account-free AI endpoint rejects cross-origin browser requests,
limits inputs to 40 KB / 100 entries, bounds output length, cancels disconnected
requests, and limits paid generations to 40/hour and two concurrent calls per
server process. These process-local limits are abuse mitigations, not a durable
account-level spending cap across server restarts or autoscaling.

## Development workflow

Use TDD: write a focused test, run it and observe failure, implement the smallest
working behavior, run the tests, then refactor while green. Make small, descriptive
milestone commits instead of one final code dump. Unit and component tests use
Vitest, Testing Library, and jsdom. Test-first coverage includes storage failures,
entry validation and mutation, filters, local week boundaries, report totals,
sample data, and form/page interactions.

GitHub Actions runs tests, typechecking, and a production build for pushes and
pull requests. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE).
