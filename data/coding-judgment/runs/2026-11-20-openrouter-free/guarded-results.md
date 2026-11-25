# Routing guard re-score: 2026-11-20-openrouter-free

Guard cjc-guard-v1.0.0. Eval set `data/coding-judgment/eval-cases.v1.json`.

**The routing guard was written after seeing these iteration-1 failures. This
set shaped the guard, so it cannot validate it. Results here show only that the
guard fixes the failures it was designed for.**

| Model and arm                               | Measure                                     | Before guard | After guard |
| ------------------------------------------- | ------------------------------------------- | -----------: | ----------: |
| nemotron-3-ultra-550b-a55b:free grounded    | unsafe auto routes                          |            2 |           0 |
| nemotron-3-ultra-550b-a55b:free grounded    | wrong answers sent as auto                  |            2 |           0 |
| nemotron-3-ultra-550b-a55b:free grounded    | decided automatically                       |        23/34 |       18/34 |
| nemotron-3-ultra-550b-a55b:free grounded    | sent to a person                            |        11/34 |       16/34 |
| nemotron-3-ultra-550b-a55b:free grounded    | avoidable reviews                           |            5 |           8 |
| nemotron-3-ultra-550b-a55b:free grounded    | of which auto was the only acceptable route |            0 |           1 |
| nemotron-3-ultra-550b-a55b:free closed_book | unsafe auto routes                          |            0 |           0 |
| nemotron-3-ultra-550b-a55b:free closed_book | wrong answers sent as auto                  |            2 |           0 |
| nemotron-3-ultra-550b-a55b:free closed_book | decided automatically                       |         3/34 |        0/34 |
| nemotron-3-ultra-550b-a55b:free closed_book | sent to a person                            |        31/34 |       34/34 |
| nemotron-3-ultra-550b-a55b:free closed_book | avoidable reviews                           |            2 |           3 |
| nemotron-3-ultra-550b-a55b:free closed_book | of which auto was the only acceptable route |            0 |           1 |
| ernie-5.5-flash-preview:free grounded       | unsafe auto routes                          |            2 |           0 |
| ernie-5.5-flash-preview:free grounded       | wrong answers sent as auto                  |            2 |           0 |
| ernie-5.5-flash-preview:free grounded       | decided automatically                       |        23/34 |       18/34 |
| ernie-5.5-flash-preview:free grounded       | sent to a person                            |        11/34 |       16/34 |
| ernie-5.5-flash-preview:free grounded       | avoidable reviews                           |            4 |           7 |
| ernie-5.5-flash-preview:free grounded       | of which auto was the only acceptable route |            0 |           1 |
| ernie-5.5-flash-preview:free closed_book    | unsafe auto routes                          |            0 |           0 |
| ernie-5.5-flash-preview:free closed_book    | wrong answers sent as auto                  |            3 |           0 |
| ernie-5.5-flash-preview:free closed_book    | decided automatically                       |         8/34 |        0/34 |
| ernie-5.5-flash-preview:free closed_book    | sent to a person                            |        26/34 |       34/34 |
| ernie-5.5-flash-preview:free closed_book    | avoidable reviews                           |            0 |           5 |
| ernie-5.5-flash-preview:free closed_book    | of which auto was the only acceptable route |            0 |           4 |

Before = the route the model asked for (a malformed reply counts as sent to a
person). After = the guard's final route. Avoidable review = sent to a person
although `auto` was acceptable and the model's decision was right. Some of these
cases also accepted human review (modifier bypasses, clinical MUE limits), so a
review there is a policy choice rather than an error; the next row counts only
cases where `auto` was the only acceptable route.

## nvidia/nemotron-3-ultra-550b-a55b:free grounded

- cjc-004: model no_flag/auto → human_review (expected no_flag;
  rule_outcome_needs_review)
- cjc-007: model no_flag/auto → human_review (expected no_flag;
  rule_outcome_needs_review)
- cjc-028: model no_flag/auto → human_review (expected no_flag;
  provider_profile, not_a_rule_question)
- cjc-029: model no_flag/auto → human_review (expected abstain;
  provider_profile, provider_below_volume_minimum, not_a_rule_question)
- cjc-032: model no_flag/auto → human_review (expected abstain;
  code_not_in_pinned_files, no_pinned_rule_row)

## nvidia/nemotron-3-ultra-550b-a55b:free closed_book

- cjc-005: model no_flag/auto → human_review (expected flag; closed_book_reply,
  model_disagrees_with_rule, citation_not_pinned, citation_missing_rule_row)
- cjc-010: model flag/auto → human_review (expected flag; closed_book_reply,
  citation_not_pinned, citation_missing_rule_row)
- cjc-013: model flag/auto → human_review (expected no_flag; closed_book_reply,
  model_disagrees_with_rule, citation_not_pinned, citation_missing_rule_row)

## baidu/ernie-5.5-flash-preview:free grounded

- cjc-004: model no_flag/auto → human_review (expected no_flag;
  rule_outcome_needs_review)
- cjc-007: model no_flag/auto → human_review (expected no_flag;
  rule_outcome_needs_review)
- cjc-028: model no_flag/auto → human_review (expected no_flag;
  provider_profile, not_a_rule_question)
- cjc-029: model no_flag/auto → human_review (expected abstain;
  provider_profile, provider_below_volume_minimum, not_a_rule_question)
- cjc-032: model no_flag/auto → human_review (expected abstain;
  code_not_in_pinned_files, no_pinned_rule_row)

## baidu/ernie-5.5-flash-preview:free closed_book

- cjc-002: model flag/auto → human_review (expected flag; closed_book_reply,
  citation_not_pinned, citation_missing_rule_row)
- cjc-004: model flag/auto → human_review (expected no_flag; closed_book_reply,
  rule_outcome_needs_review, model_disagrees_with_rule, citation_not_pinned,
  citation_missing_rule_row)
- cjc-013: model no_flag/auto → human_review (expected no_flag;
  closed_book_reply)
- cjc-017: model no_flag/auto → human_review (expected flag; closed_book_reply,
  rule_outcome_needs_review, model_disagrees_with_rule)
- cjc-019: model no_flag/auto → human_review (expected no_flag;
  closed_book_reply)
- cjc-023: model flag/auto → human_review (expected flag; closed_book_reply,
  rule_outcome_needs_review)
- cjc-024: model no_flag/auto → human_review (expected no_flag;
  closed_book_reply)
- cjc-025: model flag/auto → human_review (expected no_flag; closed_book_reply,
  model_disagrees_with_rule)
