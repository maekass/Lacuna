# Oncology Claim-Integrity Monitor

## Purpose and scope

The monitor lets an analyst record a dated, investor-facing oncology claim,
attach public evidence, and compare that claim with sources available as of a
stated cutoff. The output is an evidence-consistency classification after human
review.

The monitor does not determine intent, fraud, legal liability, clinical
validity, or investment merit. It is not connected to acquisition probability,
valuation, exit similarity, company ranking, or clinical-trial-success models.

## Definitions

- **Exact claim.** The wording the analyst captured. It is not replaced by a
  paraphrase.
- **Claim date.** The date the claim was made.
- **Evidence cutoff.** The latest publication date that may count in the as-of
  comparison. It cannot precede the claim date.
- **Subsequent evidence.** A source published after the evidence cutoff. It is
  stored and shown separately.
- **Primary source.** A registry record, peer-reviewed paper, regulatory
  document, or company filing the analyst marks as primary. The analyst’s mark
  is part of the record.

## Evidence hierarchy

1. Regulatory documents and clinical-trial registry records for status and
   endpoint language.
2. Peer-reviewed publications.
3. Company filings.
4. Conference abstracts, investor presentations, and press releases.
5. Patents, reimbursement sources, and other materials as context.

Hierarchy is a reading aid. It is not a numeric score.

## Temporal evaluation

Comparison uses evidence with a publication date on or before the evidence
cutoff. A later publication is labeled **subsequent evidence** even if the
analyst selected another relationship. A missing publication date is not treated
as available on the claim date.

Later outcomes must not be used to imply that an earlier claim was knowingly
false.

## Classification methodology

Rules live in `src/lib/oncology/claimIntegrity/analysis.ts`. They suggest one
classification. `requiresHumanReview` is always true. A human reviewer approves
the stored classification.

| Condition                                                                                                 | Suggested classification                          |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| No as-of evidence                                                                                         | Insufficient public evidence                      |
| Claim says an endpoint was met and primary-source text says the prespecified primary endpoint was not met | Inconsistent with source evidence                 |
| Exploratory, subgroup, or post hoc wording is presented as a primary result                               | Post hoc or subgroup dependence                   |
| Comparative wording without head-to-head or active-comparator evidence                                    | Cross-trial comparison limitation                 |
| Approval, breakthrough, or regulatory-agreement wording without a regulatory document                     | Regulatory characterization could not be verified |
| Evidence limitations ask for specialist review                                                            | Requires specialist review                        |
| Support covers only part of a compound claim, or support and contradiction are both present               | Partially substantiated                           |
| Only contextual records                                                                                   | Material context may be missing                   |
| Support without a primary source available by the claim date                                              | Insufficient public evidence                      |
| Primary-source support and no rule above                                                                  | Substantiated (still requires approval)           |

## Human review

Draft records can be edited and can gain evidence. Submit moves a record to
pending review. Another signed reviewer may approve, request changes, or
archive. The creator cannot approve their own record. Approval requires reviewer
rationale, at least one as-of evidence record, and a primary supporting source
when the classification is substantiated. Each action is written to the audit
log.

## Known limitations

- The running app stores records in process memory unless a later change
  connects the SQL migration. A restart clears unsaved process memory.
- Rules match explicit phrases. They do not read a full protocol.
- Company, asset, and trial identifiers are optional text. They are not foreign
  keys into the verified M&A tables.
- AI drafts, when stored, are labeled drafts. This version does not call a model
  from the claim route.

## Prohibited uses

Do not use a classification as a fraud finding, a deception score, a clinical
recommendation, or an investment recommendation. Do not feed it into exit,
valuation, ranking, or trial-success models.

Scientific weakness is not equivalent to fraud. A missing public source is not
proof that evidence does not exist. Cross-trial comparisons are generally weaker
than properly designed head-to-head evidence. Legal or regulatory escalation
requires qualified counsel.

## Correction and company response

An analyst may archive a record and open a replacement draft. The prior audit
trail remains. A company response should be attached as evidence with its own
publication date, not used to overwrite the exact claim.

## Privacy

Do not paste confidential information, non-public patient data, or material
non-public information into claims, excerpts, or summaries. Sources should be
public URLs.
