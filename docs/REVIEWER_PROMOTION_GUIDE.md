# Reviewer promotion guide (E2)

Use this when promoting a staging candidate (Postgres `lacuna_deals`) into the
verified dataset (`src/data/dataset.verified.json`).

**Key rule:** Verified rows require **reviewer-attested** fields (sector, HQ,
founded year, secondary source). Nothing is inferred from keywords or ML.

---

## UI path (preferred)

1. Open `/deals#data-pipelines`
2. In **SEC candidate review queue**, click **Open dossier**
3. On `/deals/staging/[dealId]`:
   - Complete the **Promotion checklist**
   - Fill **Promotion fields**
   - Confirm **Verified JSON preview** shows _Ready to merge_
4. Click **Approve & add to verified**
5. Open the verified deal link: `/deals/[acquisitionId]`

---

## What to enter (minimum)

- **Secondary source URL**: independent corroboration (not the same SEC filing)
- If the **target company is new** to the verified dataset:
  - Target **sector** (allowed set)
  - Target **HQ**
  - Target **founded year**
  - Target **description** (required only when no Item 2.01 excerpt exists)
- If the **acquirer is new** to the verified dataset:
  - Acquirer **sector**
  - Acquirer **HQ**

---

## How to know you’re done

The preview panel must show:

- `missingFields`: empty
- `validationErrors`: empty
- Status badge: **Ready to merge**

If not, fill the missing fields (or add the secondary URL) before promoting.
