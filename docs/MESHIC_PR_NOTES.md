# MeshIC PR Review Notes

Review this branch as a trust-layer remediation, not a feature expansion.

The intended behavioral change is fail-closed: where the old system emitted a precise value from an invalid entity mapping, proxy, unsupported fallback, or semantically mismatched calculation, the branch prefers a withheld/null state until authoritative input is available.

Pay particular attention to:

1. SEC issuer identity validation and acquired-target year bounds.
2. CMS weighted reimbursement arithmetic and removal of undocumented fallbacks.
3. Revenue-only CAGR semantics.
4. Evidence grade vs record utility separation.
5. OAIS removal from the decision surface.
6. New strict MeshIC PR gate.

Do not restore invalidated computed artifacts merely to make dashboards look populated. Regenerate them from the hardened pipelines or keep them withheld.
