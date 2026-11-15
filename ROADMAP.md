# Roadmap

Status as of 0.1.9 (2026-11-15). This is a plan, not a promise: scope can change as we learn. Discuss or propose changes in an issue.

## 0.2.0: use it from anywhere

Goal: a developer can use dbask from their AI app without writing code, can learn it from real documentation, and can trust what it will and won't do.

### 1. MCP server

Let MCP-capable apps (Claude Desktop, Cursor and others) use dbask's database tools directly.

**Design**
- Tools only, over stdio, started with `dbask mcp`. The user's own AI app supplies the model, so no AI provider key is needed.
- Tools mirror what the agent already uses: `list_tables`, `describe_tables`, `get_relationships`, `execute_query` (read-only, row/byte/time limits, same SQL validator), `explain_query`.
- Configuration through the same `DB_*` environment variables; the user passes them in the app's MCP config.
- Tool results are untrusted text: cap sizes, never include credentials, and describe in the docs that row contents can contain instructions aimed at the model.
- An optional `ask` tool (runs the full agent with a configured provider) is **out of scope** for 0.2.0.

**Acceptance criteria**
- Works end to end in Claude Desktop and one other client, against MySQL and PostgreSQL.
- Every tool call goes through the same safety checks as the CLI; a test proves a write, a multi-statement query and an oversized result are rejected.
- Tests use the official MCP client against a fake adapter; no network or database in unit tests.
- A docs page with copy-paste config for each supported client.

**To verify before building:** the current MCP specification and TypeScript SDK (both change), and how clients display tool errors.

### 2. Documentation site

A real docs site instead of one long README.

- Pages: Quickstart, Configuration reference, Providers, Databases, CLI, SDK, MCP server, **Safety model** (what the read-only guarantee covers and does not), Query plan, Evals and benchmarks, Troubleshooting, Contributing.
- Docs live in `docs/` in this repo, built with a static site generator (VitePress or Starlight) and deployed to GitHub Pages. A link checker runs in CI.
- The README shrinks to: what it is, install, first question, links.
- Decide the domain (for example `dbask.dev`) before publishing.

**Acceptance criteria:** a new user can go from zero to a first answer using only the site; every environment variable in the config schema is documented (checked by a test or script).

### 3. Fixes that ship with 0.2.0

See [Known issues and fixes](#known-issues-and-fixes), items marked **P0**.

## Not in 0.2.0

- **SQLite adapter** (decided: not yet).
- **Web playground.** The security surface (a server in front of a database) needs its own design: local-only, bound to 127.0.0.1, token protected. Revisit for 0.3.
- **Column allow/deny list** (hide sensitive columns from the model and block them in SQL). Strong trust feature; planned for 0.3.
- Hosted service, other languages' SDKs.

## Known issues and fixes

Priority: **P0** before 0.2.0, **P1** during the 0.2.x cycle, **P2** when convenient. "Verified" means checked in the repo or registry on 2026-11-15.

### P0

| # | Issue | Evidence | Fix |
|---|---|---|---|
| 1 | GitHub private vulnerability reporting is off, but `CONTRIBUTING.md` tells people to use it. | Verified via the repository API (`enabled: false`). | Enable it under Settings, Code security. Add a short `SECURITY.md`. |
| 2 | Benchmark reference answers are wrong for E23 (and E18 earlier): they expect id columns the question never asks for. | E23 failed 3/3 with the plan off; the agent's rows matched except the extra ids. | Reduce the reference to the columns the question asks for. |
| 3 | E08 and E09 compare column names (`projected`), so harmless alias differences fail them. | Each failed once in the plan-on runs on missing alias names. | Switch to `values` mode like E11, E14, E15. |
| 4 | Eval runner reports a provider stall (timeout) as an agent failure, and cannot show whether the plan gate ever fires. | E02 killed at 90 s in one run was counted as a correctness failure; reports have no plan counters. | Add a distinct timeout status; count plan submissions, rejections and SQL mismatches per case and in summaries. |
| 5 | `CHANGELOG.md` has no `[0.1.9]` link entry and still links to the old repository name. | Verified in the file. | Fix link references; add the changelog check to the release checklist. |
| 6 | Old npm package's deprecation message lacked the `npm uninstall -g sql-ai-harness` step, so following it hits `EEXIST`. | You hit it. | Re-run `npm deprecate` with the uninstall step (done if you already did). |

### P1

| # | Issue | Evidence | Fix |
|---|---|---|---|
| 7 | PostgreSQL views are not listed. | README states it. | List views (read-only) and describe their columns; tests. |
| 8 | The benchmark only runs on MySQL; PostgreSQL has been tested by hand (Neon) but has no eval or integration coverage. | `evals/` has only a MySQL schema. | Postgres variant of the dataset; CI job with a Postgres service for adapter tests. |
| 9 | CI runs only on Ubuntu. Windows is unverified for the terminal UI, process-group timeout kill and paths. | `.github/workflows/test.yml` has a Node matrix on `ubuntu-latest` only. | Add a Windows (and macOS) job for typecheck and tests; fix what it finds. |
| 10 | The off-topic guard is prompt-level. Nothing tests instructions hidden in table or row data, and nothing tests the guard with other models. | Four scope cases (E37-E40) exist; no injection cases. | Add injection cases (instruction in a row, in a column comment); run the scope cases on a second model. |
| 11 | The benchmark is easy: 27/28 with or without the plan, so it cannot show whether the plan helps. | Plan on/off reports, 3 runs each. | Add 10-15 harder cases (ambiguous wording, multi-join, traps); retest plan on/off; run a second model. |
| 12 | The CLI flow has unit tests for argument parsing but no smoke test of the built binary. | `tests/cli-args.test.ts` only. | CI step that runs `dbask --version`, `--help` and an unknown command and checks exit codes. |
| 13 | The context file is still called `sql-ai.md`. | Config and docs. | Accept `dbask.md` as well, keep `sql-ai.md` as a fallback; document both. |
| 14 | Ollama and other local models are untested. | Noted at the first release. | Run the benchmark with one local model and record results. |

### P2

- Define the public SDK surface before 0.2.0 and mark anything experimental (`PlanStats`, `StructuredQueryPlan`, observers).
- Automated dependency updates for the AI SDK packages.
- Decide whether to keep committing benchmark reports to the repository or publish them elsewhere.
- Re-test the default for `AGENT_QUERY_PLAN` after item 11.

## 0.2.0 release checklist

1. All P0 items done; P1 items either done or listed in the changelog as known.
2. Benchmark re-run with `--repeat 3` on the final commit; README result updated.
3. `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm pack:check`.
4. Changelog entry with upgrade notes, including link references.
5. Tag `vX.Y.Z` matching `package.json`; verify the publish and `npm view @negusdev/dbask`.
6. Install the published package on a clean machine and run `dbask --version`, `dbask validate`, one question, and the MCP server in a real client.

## Decisions still open

- Name of the MCP command (`dbask mcp`) and whether it ships in the same package (assumed yes).
- Docs domain and hosting.
- Whether `ask` as an MCP tool belongs in 0.2.x or later.
