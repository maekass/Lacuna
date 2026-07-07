# Demo scripts — deal spine v1

Shareable paths built on **Modern Fertility → Ro** (`/deals/deal2`, `FEATURED_DEAL_ID`).

---

## 90-second recruiter walkthrough

1. Open **Hub** — point to three triage CTAs and pipeline strip (dataset date + build SHA).
2. Click **Start diligence** → `/deals/deal2`.
3. Scroll: valuation block (disclosed estimate + note), strategic rationale, evidence ladder.
4. Click **Copy link** — paste in chat to show permalink.
5. **View in network** — target node highlighted on ForceNetwork.
6. **Export brief** — Markdown with citations lands on clipboard.

**Closing line:** “One verified deal, full provenance, export-ready — educational demo, not live feeds.”

---

## 3 min — Corp VC voiceover

| Step | Screen | Talk track |
| ---- | ------ | ---------- |
| 1 | Hub triage | “Three entry ramps: diligence, equity, methods — same dataset, different workflows.” |
| 2 | Deal detail header | “Ro acquired Modern Fertility — telehealth + at-home fertility testing.” |
| 3 | Valuation | “~$225M estimate with honest disclosure note — not all deals have disclosed values.” |
| 4 | Evidence ladder | “Press-sourced secondary tier; we flag single-source limits before you trust multiples.” |
| 5 | Comparables | “Same-sector peers within ±3 years — small n, descriptive only.” |
| 6 | Acquirer context | “Ro’s other deals in dataset — buyer pattern, not prediction.” |
| 7 | Export brief | “One-click diligence memo for Gamma or email — citations included.” |

---

## 3 min — Health equity voiceover

| Step | Screen | Talk track |
| ---- | ------ | ---------- |
| 1 | Hub → **Evidence & equity** | “Patient empowerment dimensions on public data — not clinical outcomes.” |
| 2 | `/deals/deal2` rationale | “Access to at-home fertility testing — equity angle on reach vs. clinic-only care.” |
| 3 | Evidence limitations | “Single-source press — we say what we don’t know.” |
| 4 | Related → Research | “Crosswalk to health equity section for policy framing.” |

---

## 3 min — Engineering voiceover

| Step | Screen | Talk track |
| ---- | ------ | ---------- |
| 1 | Hub pipeline strip | “`provenance.lastUpdated`, Vercel build SHA, optional SEC cron status.” |
| 2 | `/deals#data-pipelines` | “Staging in Postgres (`lacuna_deals`) — promotion checklist before verified JSON.” |
| 3 | Promotion checklist | “Dual-source gates from runbook — auto-checks where parse quality allows.” |
| 4 | Methods → causal DAG | “Heuristics labeled; small-n everywhere.” |
| 5 | `GET /api/health` | “Liveness for monitors — see docs/MONITORING.md.” |

---

## 3 min — Portfolio / methods reviewer

| Step | Screen | Talk track |
| ---- | ------ | ---------- |
| 1 | Methods footnote | “n=59 verified; candidates separate until promoted.” |
| 2 | Deal detail evidence ladder | “Tier classification from source string — filing vs press.” |
| 3 | Comparables table | “Sector + year window — no synthetic deals.” |
| 4 | Limitations footer on export | “Educational only — BUSL 1.1.” |

---

## Smoke checklist (pre-demo)

- [ ] `/api/health` → 200
- [ ] `/deals/deal2` loads with evidence ladder
- [ ] Hub triage CTAs resolve
- [ ] `/deals?highlight=c1#network` emphasizes Modern Fertility node
- [ ] Export brief copies Markdown
