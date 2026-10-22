---
name: Draft safety scope
description: Why unfinished work is tab-scoped and how recovery interacts with cross-tab protection
---

Keep draft ownership tab-local rather than putting unfinished edits in a single shared browser draft slot.

**Why:** Shared draft slots would let one tab overwrite another tab's unsaved notes, defeating the journal's deliberate cross-tab conflict protection. Recovery must not silently authorize overwriting a changed saved entry.

**How to apply:** Keep drafts separate from committed journal data and backups. A recovered edit based on an older saved entry requires explicit review before saving; reloading to obtain current journal data must not discard the recoverable draft.
