---
name: Unpatched glob dependencies
description: Why the preview tooling avoids the braces-based glob dependency chain.
---

Avoid reintroducing the braces-based glob dependency chain when updating preview tooling.

**Why:** On 2026-10-22, GHSA-vfj7-8cjw-p6xm affected every published braces release and listed no patched version. The registry's latest fast-glob and micromatch still depended on it, so upgrading those parents could not resolve the finding.

**How to apply:** Prefer glob tools that do not depend on braces. Recheck the live advisory and registry before reconsidering this constraint; do not silence the finding or invent a patched version.
