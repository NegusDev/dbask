# Benchmark reports

Every `.md` file here is the output of one `pnpm eval` run (or of a `--repeat` set plus its `-summary.md`). The matching `.json` files are not committed. This page says which reports are safe to cite, which are history, and when to commit a new one. Keep it in the same pull request as any report you add.

File names are `<UTC timestamp>-<tag>.md`. With `--repeat N` you get `<tag>_r1.md` … `_rN.md` and one `<tag>-summary.md`. Every report header records the model, database (and driver), commit, step limit and query-plan flag; two reports are comparable only if all of those match except the one thing you are testing.

## What backs the claims we make

| Claim | Evidence | Reports |
|---|---|---|
| README: "39 of 40 in every run (97.5%), 10 of 10 refusal checks" (`gemini-3.5-flash-lite`, MySQL, plan off) | 3 runs, commit `b1bef13f` | `2026-11-12T09-43-45…plan_off_r1`, `…09-50-30…plan_off_r2`, `…09-57-14…plan_off_r3`, `…09-57-14…plan_off-summary` |
| The query plan gave no accuracy gain, about +0.7 tool calls and +30% median latency (same model, MySQL) | plan on vs plan off, 3 runs each, same commit | the plan-off set above, and `2026-11-12T06-39-54…plan_on_r1`, `…06-48-38…plan_on_r2`, `…06-59-06…plan_on_r3`, `…06-59-06…plan_on-summary` |

The one failing case in those runs was E23, whose reference answer was wrong. That was fixed afterwards (#26), so a new run on the current dataset is expected to differ from these reports.

**No PostgreSQL accuracy figure exists yet.** See "PostgreSQL" below.

## All reports

| Reports | What they are | Status |
|---|---|---|
| `2026-11-06…baseline`, `…baseline_v2`, `…baseline_v3`, `2026-11-08…baseline_4`, `2026-11-09…baseline_v5`, `2026-11-11…baseline_v6` | First baselines while the dataset grew from 30 to 36 cases and the runner and agent changed. `baseline_v3` has 4 provider errors. | **History.** Different dataset and code; do not cite. |
| `2026-11-11…smoke_r1`, `…smoke_r2`, `…smoke-summary` | 3-case runs that checked `--repeat` and the summary format. | **Not a result.** |
| `2026-11-12…plan_on_r1-r3`, `…plan_on-summary` | 40 cases, MySQL, `gemini-3.5-flash-lite`, plan on, 3 runs. | **Citable** (comparison above). |
| `2026-11-12…plan_off_r1-r3`, `…plan_off-summary` | Same, plan off. | **Citable**; backs the README figure. |
| `2026-11-17…p0` | 3 cases (E08, E09, E23), MySQL, plan off, one run, commit `5e38c31e`. | **Spot check** that the reference-answer fixes work. Not a benchmark. |
| `2026-11-17…smoke` | 3 cases on PostgreSQL. | **Not a result.** |
| `2026-11-17…postgress`, `…postgress_plan_on`, `…postgress_plan_on_r1` | 40 cases, PostgreSQL, `gemini-3.5-flash-lite`; plan off once, plan on twice (single runs). | **Supporting only.** Single runs; see "PostgreSQL". |
| `2026-11-18T06-17-53…postgress_plan_on_r1` | All 40 cases ended in provider errors; nothing was scored. | **Discarded run.** Kept only because it is already committed; ignore it. |
| `2026-11-18T10-27…`, `…10-42…`, `…11-00…postgress_plan_on_r1-r3`, `…postgress_plan_on-summary` | 3 runs on PostgreSQL, plan on, **`gemini-3.1-flash-lite`**; run 3 has 5 provider errors; 1 to 4 timeouts per run. | **Not comparable** to anything else here (different model, no plan-off counterpart). |

(The tag `postgress` is a typo that is now part of the file names; new reports should not copy it.)

## PostgreSQL

What the reports do show: the PostgreSQL edition of the dataset works. There were no PostgreSQL-specific SQL errors in any run, and on `gemini-3.5-flash-lite` single runs scored the same as MySQL.

What they cannot show: a plan-on versus plan-off difference, or an accuracy figure. The plan-off report is one run on 3.5; the three-run repeat uses 3.1 and is plan on only. To get a number, run a plan-off `--repeat 3` and a plan-on `--repeat 3` on PostgreSQL with the same model, commit and settings.

## When to commit a report

- Commit a report only if something cites it: a README or docs claim, a changelog line, or a pull request that relies on it. Add its row to this index in the same pull request, saying what it backs.
- Do not commit runs where most cases ended in provider errors (the summary says "re-run these"), 3-case smoke runs, or runs you replaced with a clean re-run. Delete them instead of committing them.
- Quote a figure only from a `--repeat 3` set (or more) with no provider errors, and give model, database, plan flag and date next to it. One run is a spot check.
- Never put two models, two databases or two plan settings in the same comparison.
- Use a tag that says what differs, in lowercase with hyphens: `mysql-plan-off`, `pg-plan-on-gemini-3-1`. Fix typos before running, since the tag is part of the file name.
- The `.json` reports stay uncommitted (they are in `.gitignore`).
