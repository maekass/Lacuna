# License Variables — How to Customize

Your `LICENSE` file is a personalized **Business Source License 1.1** (BUSL 1.1)
with adaptable parameters. This document explains how to swap values for
different contexts (incorporation, re-licensing, fork attribution,
dual-licensing offers).

---

## Required: Fill These Before First Distribution

Replace every `{{PLACEHOLDER}}` in `LICENSE` before publishing publicly.
Search-and-replace is safe — placeholders use double curly braces so they won't
collide with license prose.

| Placeholder            | What to put                             | Example                   |
| ---------------------- | --------------------------------------- | ------------------------- |
| `{{COPYRIGHT_HOLDER}}` | Your real legal name (DBA model)        | `Jane Q. Smith`           |
| `{{CONTACT_EMAIL}}`    | Reachable inbox for licensing inquiries | `licensing@lacuna.health` |

### Quick command (macOS / Linux)

```bash
# From repo root
sed -i '' 's/{{COPYRIGHT_HOLDER}}/Your Legal Name/g' LICENSE
sed -i '' 's/{{CONTACT_EMAIL}}/mps5cy@virginia.edu/g' LICENSE
```

---

## Adaptable Parameters — When to Change Each

### 1. Licensor (line 11)

| Situation                    | Change to                           |
| ---------------------------- | ----------------------------------- |
| Personal sole-prop (current) | `Lacuna (a DBA of Jane Smith)`      |
| Single-member LLC            | `Lacuna Labs, LLC`                  |
| C-Corp post-incorporation    | `Lacuna, Inc.`                      |
| Acquired by another entity   | New entity name + assignment notice |

### 2. Licensed Work (line 14)

Update the descriptive name if the product scope expands beyond women's health
(e.g., "and adjacent verticals" or "Healthcare Intelligence Platform").

### 3. Additional Use Grant (lines 19–60) — The Strategic Lever

This is your **competitive moat definition**. Edit carefully — it determines who
can use your code commercially without paying.

**Three-prong test for Competitive Offering:**

| Prong                     | What it does                | When to loosen / tighten                                 |
| ------------------------- | --------------------------- | -------------------------------------------------------- |
| (i) Replicates frameworks | Names your IP explicitly    | Add new modules as you ship them                         |
| (ii) Commercial basis     | Defines "competing" as paid | Loosen → permits more usage; tighten → captures freemium |
| (iii) Sector targeting    | Names protected verticals   | Expand as you enter new markets                          |

**All three must be true** for usage to be prohibited. This is intentionally
narrow.

#### Common edits:

- **Adding a new analytical module** → add its name to prong (i)
- **Entering adjacent vertical** → add to prong (iii) sector list
- **Permitting specific partner** → add named exception in the "Permitted
  production uses" block
- **Restricting AI training** → add
  `(iv) used to train, fine-tune, or distill machine learning models` to prong
  definition

### 4. Change Date (line 62)

Current: **May 30, 2030** (4 years from May 30, 2026 publication).

**BUSL 1.1 caps this at 4 years** — you cannot legally extend beyond this
without modifying the license itself (which voids the BUSL trademark). Options:

| Length                 | Strategy                         |
| ---------------------- | -------------------------------- |
| 4 years (max, current) | Maximum commercial runway        |
| 2 years                | Faster open-source goodwill      |
| 1 year                 | Signals near-term OSS commitment |

### 5. Change License (line 68)

Must be GPLv2-compatible. Options ranked by permissiveness:

| License                  | Effect after Change Date                   |
| ------------------------ | ------------------------------------------ |
| **Apache 2.0** (current) | Maximum adoption + patent grant            |
| **MIT**                  | Maximum simplicity                         |
| **MPL 2.0**              | File-level copyleft                        |
| **GPL v3**               | Strong copyleft                            |
| **AGPL v3**              | SaaS copyleft (keeps moat post-conversion) |

---

## Dual-Licensing Workflow

BUSL is designed for **dual licensing**. When a commercial customer wants to do
something the Additional Use Grant prohibits, you can sell them a separate
commercial license.

### Suggested commercial-license tiers:

| Tier       | Annual Fee   | Permits                                  |
| ---------- | ------------ | ---------------------------------------- |
| Evaluation | $0 (90 days) | Full commercial use for evaluation       |
| Startup    | $5K–$25K     | Single-product commercial use, < $1M ARR |
| Growth     | $50K–$150K   | Multi-product, < $10M ARR                |
| Enterprise | Custom       | Unlimited, source-modification rights    |
| OEM        | Custom       | Sublicensing rights                      |

These are not in the LICENSE file (intentionally — pricing is negotiated).
Reference them in `COMMERCIAL.md` or a sales page.

---

## Common License Patterns

### Pattern A: Pure BUSL (current)

Source-available, converts to OSS in 4 years. Best for VC-track companies.

### Pattern B: BUSL + Trademark Policy

Add `TRADEMARKS.md` defining how the "Lacuna" name can be used. Prevents bad
forks from confusing users.

### Pattern C: BUSL Core + MIT Tooling

Keep the LICENSE file as-is for the main repo. Add per-package `LICENSE` files
(MIT or Apache 2.0) for subdirectories you want maximally permissive (e.g., SDK,
CLI, examples).

### Pattern D: Contributor License Agreement (CLA)

If accepting external contributions, add `CONTRIBUTING.md` requiring
contributors to sign a CLA assigning copyright to you. Without this, you cannot
change the license later (every contributor would need to consent).

---

## Switching to a Different License Entirely

If you decide BUSL is the wrong fit, see the migration guide:

| From → To                     | Difficulty | Notes                                          |
| ----------------------------- | ---------- | ---------------------------------------------- |
| BUSL → MIT                    | Easy       | You hold copyright; just replace LICENSE       |
| BUSL → Apache 2.0             | Easy       | Same                                           |
| BUSL → AGPL                   | Easy       | Same                                           |
| BUSL → Proprietary            | Easy       | Remove LICENSE, add EULA                       |
| BUSL → BUSL (different terms) | Easy       | Edit Additional Use Grant; bumps a new version |

**Constraint:** Once you publish a version under BUSL, that version's Change
Date is locked. New versions can have new terms, but old versions still convert
per their original Change Date.

---

## Legal Disclaimer

This file describes how to customize a license template. It is **not legal
advice**. Before commercial distribution, especially before fundraising or
accepting paid customers under BUSL, consult an attorney familiar with
open-source/source-available licensing.

Recommended resources:

- [Heather Meeker's BUSL guide](https://heathermeeker.com/2020/05/27/the-business-source-license/)
- [MariaDB BUSL FAQ](https://mariadb.com/bsl-faq-mariadb/)
- [OSI license list (for Change License selection)](https://opensource.org/licenses)

---

## Quick Reference: File Locations

| File                           | Purpose                            |
| ------------------------------ | ---------------------------------- |
| `LICENSE`                      | The legal license text (BUSL 1.1)  |
| `LICENSE_VARIABLES.md`         | This file — customization guide    |
| `COMMERCIAL.md` _(optional)_   | Commercial license pricing/contact |
| `TRADEMARKS.md` _(optional)_   | Trademark usage policy             |
| `CONTRIBUTING.md` _(optional)_ | Contributor agreement              |
