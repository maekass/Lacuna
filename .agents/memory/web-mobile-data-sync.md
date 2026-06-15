---
name: Web & mobile share data by copy, not link
description: Lacuna web and mobile are independent artifacts with SEPARATE dataset copies; changing one does not update the other.
---

The Lacuna web app and the Expo mobile app are independent artifacts. They do
NOT share a backend or runtime data source — the mobile app bundles its own
static copy of the deal/company/acquirer dataset, and the web app reads its own
copy. Neither calls the other's (or the Express API's) endpoints for that core
data.

**Why:** Mobile ships as a self-contained Expo app (more robust for a prototype
than fetching a dev API), and web is static-first. The split is deliberate.

**How to apply:** Any change to the deals/companies/acquirers dataset must be
applied to BOTH copies (the web `lacuna` data dir AND the `lacuna-mobile` `data/`
copy) or the two apps silently drift apart. If true single-source-of-truth is
ever needed, point the mobile app at the live API instead of a bundled copy
(this is the bigger "shared data" option, distinct from the footer cross-link).
