# Routing guard re-score: 2026-11-23-heldout-openrouter-free

Guard cjc-guard-v1.0.0. Eval set
`data/coding-judgment/eval-cases.v2-heldout.json`.

**Held-out set frozen (cases, labels and SHA-256) in commit aaa9837 before any
model call on it; the guard was committed in 302c3d9. It changed once after this
run, in 720f778: one spelling pattern in the question-text screen was rewritten
(the word for a payment for referrals now allows an optional hyphen, kick-?back)
to pass a repo lint. Re-scoring the recorded replies with the changed guard
gives the same route, reasons and deciding rows on every case. The same
assistant wrote the guard and these cases, so they test new codes, dates, payers
and profiles within known failure types, not failure types nobody anticipated.
Labels are assistant-built and not adjudicated by a coder.**

| Model and arm                            | Measure                                     | Before guard | After guard |
| ---------------------------------------- | ------------------------------------------- | -----------: | ----------: |
| nemotron-3-ultra-550b-a55b:free grounded | unsafe auto routes                          |            6 |           0 |
| nemotron-3-ultra-550b-a55b:free grounded | wrong answers sent as auto                  |            6 |           0 |
| nemotron-3-ultra-550b-a55b:free grounded | decided automatically                       |        24/37 |       15/37 |
| nemotron-3-ultra-550b-a55b:free grounded | sent to a person                            |        13/37 |       22/37 |
| nemotron-3-ultra-550b-a55b:free grounded | avoidable reviews                           |            3 |           6 |
| nemotron-3-ultra-550b-a55b:free grounded | of which auto was the only acceptable route |            0 |           2 |
| ernie-5.5-flash-preview:free grounded    | unsafe auto routes                          |            6 |           0 |
| ernie-5.5-flash-preview:free grounded    | wrong answers sent as auto                  |            6 |           0 |
| ernie-5.5-flash-preview:free grounded    | decided automatically                       |        25/37 |       15/37 |
| ernie-5.5-flash-preview:free grounded    | sent to a person                            |        12/37 |       22/37 |
| ernie-5.5-flash-preview:free grounded    | avoidable reviews                           |            2 |           6 |
| ernie-5.5-flash-preview:free grounded    | of which auto was the only acceptable route |            0 |           2 |

Before = the route the model asked for (a malformed reply counts as sent to a
person). After = the guard's final route. Avoidable review = sent to a person
although `auto` was acceptable and the model's decision was right. Some of these
cases also accepted human review (modifier bypasses, clinical MUE limits), so a
review there is a policy choice rather than an error; the next row counts only
cases where `auto` was the only acceptable route.

## nvidia/nemotron-3-ultra-550b-a55b:free grounded

- cjc-106: model no_flag/auto → human_review (expected no_flag;
  rule_outcome_needs_review)
- cjc-120: model no_flag/auto → human_review (expected no_flag;
  provider_profile, not_a_rule_question)
- cjc-121: model no_flag/auto → human_review (expected no_flag;
  provider_profile, not_a_rule_question)
- cjc-123: model no_flag/auto → human_review (expected abstain;
  provider_profile, provider_below_volume_minimum, not_a_rule_question)
- cjc-124: model no_flag/auto → human_review (expected abstain;
  provider_profile, provider_below_volume_minimum, not_a_rule_question)
- cjc-125: model flag/auto → human_review (expected abstain;
  service_date_outside_window)
- cjc-127: model no_flag/auto → human_review (expected abstain;
  code_not_in_pinned_files, no_pinned_rule_row)
- cjc-128: model no_flag/auto → human_review (expected abstain;
  code_not_in_pinned_files, no_pinned_rule_row)
- cjc-129: model no_flag/auto → human_review (expected abstain;
  code_not_in_pinned_files, no_pinned_rule_row)

## baidu/ernie-5.5-flash-preview:free grounded

- cjc-106: model no_flag/auto → human_review (expected no_flag;
  rule_outcome_needs_review)
- cjc-107: model no_flag/auto → human_review (expected no_flag;
  rule_outcome_needs_review)
- cjc-120: model no_flag/auto → human_review (expected no_flag;
  provider_profile, not_a_rule_question)
- cjc-121: model no_flag/auto → human_review (expected no_flag;
  provider_profile, not_a_rule_question)
- cjc-123: model no_flag/auto → human_review (expected abstain;
  provider_profile, provider_below_volume_minimum, not_a_rule_question)
- cjc-124: model no_flag/auto → human_review (expected abstain;
  provider_profile, provider_below_volume_minimum, not_a_rule_question)
- cjc-125: model flag/auto → human_review (expected abstain;
  service_date_outside_window)
- cjc-127: model no_flag/auto → human_review (expected abstain;
  code_not_in_pinned_files, no_pinned_rule_row)
- cjc-128: model no_flag/auto → human_review (expected abstain;
  code_not_in_pinned_files, no_pinned_rule_row)
- cjc-129: model no_flag/auto → human_review (expected abstain;
  code_not_in_pinned_files, no_pinned_rule_row)
