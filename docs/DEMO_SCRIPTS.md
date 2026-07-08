# Demo scripts — Review Console (Phase E)

Portfolio walkthrough for the **ingest → review → promote** path. Live app:
https://lacuna-maekass.vercel.app

**Data honesty:** Staging candidates in Postgres are **not** verified deals
until promoted with attested fields. Hub counts show verified JSON only.

---

## 2-minute reviewer path (production)

**Prereqs:** Postgres + reviewer auth configured — see
[REVIEW_CONSOLE.md](./REVIEW_CONSOLE.md).

| Step | Action              | URL / control                                                                      |
| ---- | ------------------- | ---------------------------------------------------------------------------------- |
| 1    | Open Review Console | [/deals#review](https://lacuna-maekass.vercel.app/deals#review)                    |
| 2    | Sign in             | **Sign in with GitHub** (allowlisted) or API key                                   |
| 3    | Pick a candidate    | **Open dossier** on any M&A queue card                                             |
| 4    | Enrich (optional)   | **Enrich** when parse quality is `keyword_only` / `partial`                        |
| 5    | Attest fields       | Sector, HQ, founded year, secondary source URL                                     |
| 6    | Preview diff        | Scroll to **Promotion preview** — verify companies / acquirers / acquisitions diff |
| 7    | Promote             | **Promote to verified dataset**                                                    |
| 8    | Land on spine       | **View verified deal** → deal detail; **View in network graph** → `/deals#network` |

**Talking point:** “Candidates never inflate hub analytics — promotion is a
deliberate human gate with a JSON diff preview.”

---

## Local demo (development)

```bash
docker compose up -d
npm run db:migrate
npm run dev
```

1. Visit http://localhost:3000/deals#review
2. In dev, review APIs work without production OAuth when `DATABASE_URL` is set.
3. Staging dossier: `/deals/staging/<deal_id>`

Seed or ingest candidates:

```bash
npm run sec:ingest-efts   # bounded WH keyword filter
# or import CSV:
npm run deals:import-csv -- --file=data/staging/deals_candidates.csv
```

---

## Static-mode promote (GitHub Action)

When Vercel runs `LACUNA_DATA_MODE=static`, the app cannot write
`dataset.verified.json` at promote time. Use the manual workflow instead:

1. Approve + attest in Review Console (marks row `approved` in Postgres).
2. GitHub → **Actions** → **Promote approved deals** → **Run workflow**.
3. Workflow opens a PR with dataset diff when the verified universe grows.

---

## Hub / methods footnote (E6)

- Hub and Methods show **N verified · M staging candidates** with definitions.
- Queue metrics API: `GET /api/deals/pending/metrics` (aggregate counts only).

---

## Related docs

- [REVIEWER_PROMOTION_GUIDE.md](./REVIEWER_PROMOTION_GUIDE.md) — field checklist
- [DATA_BOUNDARIES.md](./DATA_BOUNDARIES.md) — three-tier data model
- [EPIC_REVIEW_CONSOLE.md](./EPIC_REVIEW_CONSOLE.md) — Phase E issue map
