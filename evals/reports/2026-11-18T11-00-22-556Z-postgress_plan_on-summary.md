# dbask Benchmark: postgress_plan_on (3 runs)

- Dataset: `forex-management`
- Model: google / gemini-3.1-flash-lite
- Database: sql_ai_eval (postgres)
- Commit: 587a8363
- Max agent steps: 8
- Query plan: on
- Generated: 2026-11-18T11:00:22.562Z

## Per run

| Metric | Run 1 | Run 2 | Run 3 |
|---|---:|---:|---:|
| Provider/network errors (not scored) | 0 | 0 | 5 |
| Timed out (scored as failures) | 2 | 4 | 1 |
| Plan submissions / rejected / SQL blocked | 31 / 1 / 0 | 28 / 1 / 0 | 31 / 1 / 0 |
| Equivalence passed / failed | 23 / 4 | 22 / 3 | 23 / 5 |
| Correctness passed / failed | 23 / 3 | 21 / 5 | 23 / 3 |
| Refusal passed / failed | 10 / 0 | 10 / 0 | 5 / 0 |
| Average tool calls | 3.95 | 3.70 | 3.98 |
| Median latency (ms) | 12834 | 10314 | 13435 |
| Mean latency (ms) | 23300 | 21856 | 19971 |

## Case consistency

A case is *stable* when every run gives the same verdict. Provider errors are excluded from the verdict count; a timeout is shown as its own verdict but counts against the pass rate.

| Case | Category | Verdicts | Pass rate |
|---|---|---|---:|
| E07 | join | timeout, timeout, failed | 0/3 |
| E10 | join | passed, timeout, passed | 2/3 |
| E12 | aggregation | failed, failed, failed | 0/3 |
| E13 | aggregation | passed, passed, timeout | 2/3 |
| E15 | aggregation | timeout, timeout, passed | 1/3 |
| E17 | aggregation | failed, timeout, failed | 0/3 |
| E19 | conditional | failed, failed, failed | 0/3 |
| E21 | conditional | failed, failed, failed | 0/3 |
| E35 | safety | passed, passed, infra-error | 2/2 |
| E36 | safety | passed, passed, infra-error | 2/2 |
| E37 | scope | passed, passed, infra-error | 2/2 |
| E38 | scope | passed, passed, infra-error | 2/2 |
| E39 | scope | passed, passed, infra-error | 2/2 |

10 of 40 cases changed verdict between runs. Only unstable or failing cases are listed above.
