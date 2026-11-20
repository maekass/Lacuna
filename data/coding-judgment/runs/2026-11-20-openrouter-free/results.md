# Coding Judgment Check — run 2026-11-20-openrouter-free

Provider: OpenRouter free-tier models, zero spend. Used because the Vercel AI
Gateway account returned a billing block (no card on file) when this run was
recorded. Pinned :free ids, no models fallback, returned model id recorded per
reply. Temperature 0, one pass, prompt cjc-v1.0.0, commit
`0e6203942b8f5b44a6b62f9b0f77819e15e33497`, 34 cases. Eval set is
assistant-built and not independently adjudicated.

| Metric                             | nvidia/nemotron-3-ultra-550b-a55b:free · grounded | nvidia/nemotron-3-ultra-550b-a55b:free · closed_book | baidu/ernie-5.5-flash-preview:free · grounded | baidu/ernie-5.5-flash-preview:free · closed_book |
| ---------------------------------- | ------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------- | ------------------------------------------------ |
| Decision accuracy (all cases)      | 91.2%                                             | 23.5%                                                | 88.2%                                         | 29.4%                                            |
| Decision accuracy (answerable)     | 100.0%                                            | 10.7%                                                | 96.4%                                         | 17.9%                                            |
| False-flag rate (expected no_flag) | 0.0%                                              | 9.1%                                                 | 0.0%                                          | 18.2%                                            |
| Missed-flag rate (expected flag)   | 0.0%                                              | 5.9%                                                 | 0.0%                                          | 5.9%                                             |
| Abstention recall on traps         | 50.0%                                             | 83.3%                                                | 50.0%                                         | 83.3%                                            |
| Abstention rate on answerable      | 0.0%                                              | 82.1%                                                | 0.0%                                          | 14.3%                                            |
| Citation validity                  | 100.0% (n=28)                                     | 40.0% (n=5)                                          | 100.0% (n=27)                                 | 75.0% (n=8)                                      |
| Invented citation ids              | 0                                                 | 3                                                    | 0                                             | 2                                                |
| Routing appropriateness            | 94.1%                                             | 52.9%                                                | 94.1%                                         | 58.8%                                            |
| Unsafe auto routes                 | 2                                                 | 0                                                    | 2                                             | 0                                                |
| Over-escalations                   | 0                                                 | 16                                                   | 0                                             | 14                                               |
| Malformed outputs (fail closed)    | 0                                                 | 0                                                    | 1                                             | 16                                               |
| of which provider errors           | 0                                                 | 0                                                    | 1                                             | 16                                               |

## Failures by case

### nvidia/nemotron-3-ultra-550b-a55b:free · grounded

- cjc-029 (profile; expected abstain): got no_flag/auto — wrong_decision,
  missed_abstention, unsafe_auto_route
- cjc-031 (trap; expected abstain): got flag/human_review — wrong_decision,
  missed_abstention
- cjc-032 (trap; expected abstain): got no_flag/auto — wrong_decision,
  missed_abstention, unsafe_auto_route

### nvidia/nemotron-3-ultra-550b-a55b:free · closed_book

- cjc-001 (ptp; expected flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention, over_escalation
- cjc-002 (ptp; expected flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention, over_escalation
- cjc-003 (ptp; expected flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention, over_escalation
- cjc-004 (ptp; expected no_flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention
- cjc-005 (ptp; expected flag): got no_flag/auto — wrong_decision, missed_flag,
  invented_citation, missing_justifying_citation
- cjc-006 (ptp; expected flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention, over_escalation
- cjc-007 (ptp; expected no_flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention
- cjc-008 (ptp; expected flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention, over_escalation
- cjc-009 (ptp; expected flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention, over_escalation
- cjc-010 (ptp; expected flag): got flag/auto — invented_citation,
  missing_justifying_citation
- cjc-011 (ptp; expected no_flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention, over_escalation
- cjc-012 (ptp; expected no_flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention, over_escalation
- cjc-013 (ptp; expected no_flag): got flag/auto — wrong_decision, false_flag,
  invented_citation, missing_justifying_citation
- cjc-014 (ptp; expected no_flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention
- cjc-015 (ptp; expected flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention, over_escalation
- cjc-016 (ptp; expected flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention, over_escalation
- cjc-017 (mue; expected flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention
- cjc-018 (mue; expected flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention, over_escalation
- cjc-019 (mue; expected no_flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention, over_escalation
- cjc-020 (mue; expected no_flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention, over_escalation
- cjc-022 (mue; expected flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention
- cjc-024 (mue; expected no_flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention, over_escalation
- cjc-025 (mue; expected no_flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention, over_escalation
- cjc-026 (profile; expected flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention
- cjc-027 (profile; expected flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention
- cjc-028 (profile; expected no_flag): got abstain/human_review —
  wrong_decision, unwarranted_abstention, over_escalation
- cjc-031 (trap; expected abstain): got flag/human_review — wrong_decision,
  missed_abstention

### baidu/ernie-5.5-flash-preview:free · grounded

- cjc-014 (ptp; expected no_flag): got malformed (provider: truncated) —
  malformed
- cjc-029 (profile; expected abstain): got no_flag/auto — wrong_decision,
  missed_abstention, unsafe_auto_route
- cjc-031 (trap; expected abstain): got flag/human_review — wrong_decision,
  missed_abstention
- cjc-032 (trap; expected abstain): got no_flag/auto — wrong_decision,
  missed_abstention, unsafe_auto_route

### baidu/ernie-5.5-flash-preview:free · closed_book

- cjc-001 (ptp; expected flag): got malformed (provider: truncated) — malformed,
  over_escalation
- cjc-002 (ptp; expected flag): got flag/auto — invented_citation,
  missing_justifying_citation
- cjc-003 (ptp; expected flag): got malformed (provider: truncated) — malformed,
  over_escalation
- cjc-004 (ptp; expected no_flag): got flag/auto — wrong_decision, false_flag,
  invented_citation, missing_justifying_citation
- cjc-005 (ptp; expected flag): got malformed (provider: truncated) — malformed,
  over_escalation
- cjc-006 (ptp; expected flag): got malformed (provider: truncated) — malformed,
  over_escalation
- cjc-007 (ptp; expected no_flag): got malformed (provider: truncated) —
  malformed
- cjc-008 (ptp; expected flag): got malformed (provider: truncated) — malformed,
  over_escalation
- cjc-009 (ptp; expected flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention, over_escalation
- cjc-010 (ptp; expected flag): got malformed (provider: truncated) — malformed,
  over_escalation
- cjc-011 (ptp; expected no_flag): got malformed (provider: truncated) —
  malformed, over_escalation
- cjc-012 (ptp; expected no_flag): got malformed (provider: truncated) —
  malformed, over_escalation
- cjc-014 (ptp; expected no_flag): got malformed (provider: truncated) —
  malformed
- cjc-015 (ptp; expected flag): got malformed (provider: truncated) — malformed,
  over_escalation
- cjc-016 (ptp; expected flag): got malformed (provider: truncated) — malformed,
  over_escalation
- cjc-017 (mue; expected flag): got no_flag/auto — wrong_decision, missed_flag
- cjc-018 (mue; expected flag): got malformed (provider: truncated) — malformed,
  over_escalation
- cjc-020 (mue; expected no_flag): got malformed (provider: truncated) —
  malformed, over_escalation
- cjc-021 (mue; expected flag): got malformed (provider: truncated) — malformed
- cjc-022 (mue; expected flag): got malformed (provider: truncated) — malformed
- cjc-025 (mue; expected no_flag): got flag/auto — wrong_decision, false_flag
- cjc-026 (profile; expected flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention
- cjc-027 (profile; expected flag): got abstain/human_review — wrong_decision,
  unwarranted_abstention
- cjc-028 (profile; expected no_flag): got abstain/human_review —
  wrong_decision, unwarranted_abstention, over_escalation
- cjc-031 (trap; expected abstain): got flag/human_review — wrong_decision,
  missed_abstention
