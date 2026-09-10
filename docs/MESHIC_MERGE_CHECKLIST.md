# MeshIC Merge Checklist

- [ ] `npm run validate:dataset` completes without errors.
- [ ] `npx tsx scripts/meshic-data-gate.ts --strict` has zero RED findings.
- [ ] Vercel/build checks pass.
- [ ] Invalidated SEC/CMS/growth artifacts remain fail-closed unless regenerated from authoritative sources.
- [ ] No UI path silently substitutes illustrative/fallback values for withheld decision-grade data.
- [ ] Public labels distinguish provenance strength, completeness, statistical uncertainty, and model calibration.
- [ ] `dealValue / totalFunding` is never described as investor/fund MOIC.
- [ ] OAIS composite score remains withheld until outcome calibration exists.
- [ ] Any newly introduced economic number has a source and an explicit vintage/as-of field or an explicit research-only label.
