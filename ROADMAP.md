# Roadmap

Status as of 2026-11-20. Released: 0.1.9. Everything marked done below is merged to `dev` and will ship in 0.2.0. This is a plan, not a promise: scope can change as we learn. Discuss or propose changes in an issue.

**Where we are:** all P0 fixes and the P1 fixes that don't need new benchmark work are done. Remaining before 0.2.0: the MCP server, the docs site, and two P2 tasks (SDK stability tiers, dependency updates). Benchmark and eval work is **paused** (decided 2026-11-19); the items it blocks are marked below.

## 0.2.0: use it from anywhere

Goal: a developer can use dbask from their AI app without writing code, can learn it from real documentation, and can trust what it will and won't do.

### 1. MCP server

Let MCP-capable apps (Claude Desktop, Cursor and others) use dbask's database tools directly.

**Design**
- Tools only, over stdio, started with `dbask mcp` (decided). It ships in the same package (decided), so the MCP SDK is loaded with a dynamic import and ordinary CLI runs never pay for it. The user's own AI app supplies the model, so no AI provider key is needed.
- stdout is the protocol channel: nothing else may write to it. Logs and any terminal styling go to stderr; a test starts the server and checks that stdout contains only protocol messages.
- Tools mirror what the agent already uses: `list_tables`, `describe_tables`, `get_relationships`, `execute_query` (read-only, row/byte/time limits, same SQL validator), `explain_query`.
- Configuration through the same `DB_*` environment variables; the user passes them in the app's MCP config.
- Tool results are untrusted text: cap sizes, never include credentials, and describe in the docs that row contents can contain instructions aimed at the model.
- **No `ask` tool in the MCP server** (decided 2026-11-22). In an MCP client the client's own model already writes the SQL; running dbask's agent as well would put two models in the loop. The cross-language integration path for developers who want dbask's agent is a local HTTP API (`dbask serve`), designed separately (see "Beyond 0.2.0").

**Acceptance criteria**
- Works end to end in Claude Desktop and one other client, against MySQL and PostgreSQL. *Verified so far: the official Node and Python MCP clients against MariaDB; Claude Desktop, PostgreSQL and a second desktop client still to check by hand.*
- Every tool call goes through the same safety checks as the CLI; a test proves a write, a multi-statement query and an oversized result are rejected.
- Tests use the official MCP client against a fake adapter; no network or database in unit tests.
- A docs page with copy-paste config for each supported client.

**To verify before building:** the current MCP specification and TypeScript SDK (both change), and how clients display tool errors.

### 2. Documentation site

A real docs site instead of one long README.

- Pages: Quickstart, Configuration reference, Providers, Databases, CLI, SDK, MCP server, **Safety model** (what the read-only guarantee covers and does not), Query plan, Evals and benchmarks, Troubleshooting, Contributing.
- Docs live in `docs/` in this repo, built with a static site generator (VitePress or Starlight) and deployed with GitHub Actions. A link checker runs in CI.
- The README shrinks to: what it is, install, first question, links.
- **Hosting:** start on GitHub Pages at `negusdev.github.io/dbask` (free, same repo and CI). Set the site's base path from one setting (`/dbask/` now, `/` on a custom domain) so moving is a one-line change; GitHub redirects the old URLs once a custom domain is configured.
- **Domains:** `dbask.dev` is available (checked 2026-11-20) and is the long-term address; buy it before the docs launch publicly. `dbask.vercel.app` is also available if per-PR preview deploys are wanted later. Note that Vercel project URLs are `*.vercel.app`, not `vercel.com`.

**Status:** built (VitePress in `docs/`, `.github/workflows/docs.yml`, README shortened). Still to do by hand: enable GitHub Pages (Settings > Pages > Source: GitHub Actions), a first deploy from `main`, and buying `dbask.dev` (then set the repository variable `DOCS_BASE` to `/`).

**Acceptance criteria:** a new user can go from zero to a first answer using only the site; every environment variable in the config schema is documented (checked by `tests/docs-env.test.ts`).

### 3. SDK stability and maintenance (P2 tasks, required for 0.2.0)

- **Stability tiers for the SDK** (see [P2](#p2)). The public entry point is `src/index.ts`; each export is labelled stable or experimental.
- **Dependency updates** with Dependabot, grouped, never auto-merged.

### 4. Fixes that ship with 0.2.0

See [Known issues and fixes](#known-issues-and-fixes). All P0 items are done.

## Not in 0.2.0

- **SQLite adapter** (decided: not yet).
- **Ollama and other local models** (P1 item 14; decided: 0.3).
- **Web playground.** The security surface (a server in front of a database) needs its own design: local-only, bound to 127.0.0.1, token protected. Revisit for 0.3.
- **Column allow/deny list** (hide sensitive columns from the model and block them in SQL). Strong trust feature; planned for 0.3.
- Hosted service, other languages' SDKs.

## Beyond 0.2.0

The vision: a developer can add a natural-language interface to an existing, non-AI information system in any language, without an SDK per language (and later a chat or voice front end on top). MCP serves AI apps; the universal door for application code is a **local HTTP/JSON API** (`dbask serve`) that runs the full agent. It needs its own design before any code:
- **Tenant and user scoping.** A read-only database account is not enough once end users chat with the data: model-written SQL must not cross tenants or reach sensitive columns. Options to evaluate: per-request database role, scoped views, required filters checked by the validator; the column allow/deny list (0.3) belongs here.
- **Conversation memory** for follow-up questions (the agent answers one question at a time today) and streaming responses.
- **Security of the server itself:** bind to 127.0.0.1 by default, token auth, CORS, rate limits.
- **Voice** stays a client concern (speech to text, then the API, then text to speech).

## Known issues and fixes

Priority: **P0** before 0.2.0, **P1** during the 0.2.x cycle, **P2** when convenient. "Verified" means checked in the repo or registry on 2026-11-15. Status as of 2026-11-20.

### P0

| # | Issue | Evidence | Fix | Status |
|---|---|---|---|---|
| 1 | GitHub private vulnerability reporting is off, but `CONTRIBUTING.md` tells people to use it. | Verified via the repository API (`enabled: false`). | Enable it under Settings, Code security. Add a short `SECURITY.md`. | **Done** (enabled by maintainer). |
| 2 | Benchmark reference answers are wrong for E23 (and E18 earlier): they expect id columns the question never asks for. | E23 failed 3/3 with the plan off; the agent's rows matched except the extra ids. | Reduce the reference to the columns the question asks for. | **Done** (#26). |
| 3 | E08 and E09 compare column names (`projected`), so harmless alias differences fail them. | Each failed once in the plan-on runs on missing alias names. | Switch to `values` mode like E11, E14, E15. | **Done** (#26). |
| 4 | Eval runner reports a provider stall (timeout) as an agent failure, and cannot show whether the plan gate ever fires. | E02 killed at 90 s in one run was counted as a correctness failure; reports have no plan counters. | Add a distinct timeout status; count plan submissions, rejections and SQL mismatches per case and in summaries. | **Done** (#26). Timeouts still count as failures, shown separately. |
| 5 | `CHANGELOG.md` has no `[0.1.9]` link entry and still links to the old repository name. | Verified in the file. | Fix link references; add the changelog check to the release checklist. | **Done** (#26). |
| 6 | Old npm package's deprecation message lacked the `npm uninstall -g sql-ai-harness` step, so following it hits `EEXIST`. | You hit it. | Re-run `npm deprecate` with the uninstall step (done if you already did). | **Done** (by maintainer). |

### P1

| # | Issue | Evidence | Fix | Status |
|---|---|---|---|---|
| 7 | PostgreSQL views are not listed. | README states it. | List views (read-only) and describe their columns; tests. | **Done**: PostgreSQL (#27), MySQL and MariaDB (views and MariaDB system-versioned tables). |
| 8 | The benchmark only runs on MySQL; PostgreSQL has no eval coverage. | `evals/` had only a MySQL schema. | Postgres variant of the dataset; CI job with a Postgres service for adapter tests. | **Done** (#27). CI already had a PostgreSQL service for adapter tests (this row overstated the gap); the eval dataset and a test of its reference queries were added. No usable Postgres accuracy figure yet, see below. |
| 9 | CI runs only on Ubuntu. Windows is unverified for the terminal UI, process-group timeout kill and paths. | `.github/workflows/test.yml` has a Node matrix on `ubuntu-latest` only. | Add a Windows (and macOS) job for typecheck and tests; fix what it finds. | **Done** (#27). macOS and Windows both pass. |
| 10 | The off-topic guard is prompt-level. Nothing tests instructions hidden in table or row data, and nothing tests the guard with other models. | Four scope cases (E37-E40) exist; no injection cases. | Add injection cases (instruction in a row, in a column comment); run the scope cases on a second model. | **Paused** (evals on hold). |
| 11 | The benchmark is easy: 27/28 with or without the plan, so it cannot show whether the plan helps. | Plan on/off reports, 3 runs each. | Add 10-15 harder cases (ambiguous wording, multi-join, traps); retest plan on/off; run a second model. | **Paused** (evals on hold). |
| 12 | The CLI flow has unit tests for argument parsing but no smoke test of the built binary. | `tests/cli-args.test.ts` only. | CI step that runs `dbask --version`, `--help` and an unknown command and checks exit codes. | **Done** (#27): `pnpm smoke`. |
| 13 | The context file is still called `sql-ai.md`. | Config and docs. | Accept `dbask.md` as well, keep `sql-ai.md` as a fallback; document both. | **Done** (#28) as a plain rename to `dbask.md` with **no** fallback (decided). The old file is silently ignored; the changelog carries an upgrade note. |
| 14 | Ollama and other local models are untested. | Noted at the first release. | Run the benchmark with one local model and record results. | **Moved to 0.3.** |

### P2

| Task | Decision | Done when |
|---|---|---|
| **Public SDK surface.** | Three tiers. **Stable:** `Agent`, `AgentOptions`, `AgentResult` (without `plan`), `ResponseMode`, `createDatabaseAdapter` and both adapters, `DatabaseAdapter` and the schema types, `AiProvider` and `createAiProvider`. **Experimental:** `PlanStats`, `StructuredQueryPlan`, `AgentResult.plan`, `AgentOptions.requirePlan`, `AgentObserver`, `AgentToolEvent`, `TableInfo.kind`, and internals that leaked into the exports (`SchemaCache`, `SdkAiProvider`, the `ModelProvider` family). **To review:** `loadConfig`/`AppConfig` (ties the SDK to the environment-variable shape) and the `QueryPlan` (EXPLAIN) versus `StructuredQueryPlan` naming. | Every export carries a stability tag (`@experimental` TSDoc where it applies); a stability table is in the docs; a test snapshots the export list so any change is deliberate; the 0.x policy is written down (stable items change only in a minor release with a changelog entry, experimental items may change in any release). |
| **Automated dependency updates.** | Dependabot, not Renovate. One group for `ai`, `@ai-sdk/*` and `@openrouter/ai-sdk-provider`; one for dev dependencies; plus GitHub Actions. A cooldown of a few days before new releases are proposed. Never auto-merge AI SDK bumps: CI cannot detect behavior changes there because the benchmark needs API keys, so reviewing such a PR includes a local `pnpm eval -- --only ...` smoke run. | `.github/dependabot.yml` is merged and the first grouped PR arrives; CONTRIBUTING notes the review rule. |
| **Benchmark reports.** | Keep committing them to `evals/reports/`. Commit only runs that are cited; do not commit runs that were entirely provider errors or smoke runs. Keep `evals/reports/README.md` as an index saying which run backs each claim in the README. | The index exists and covers the current reports. |
| Re-test the default for `AGENT_QUERY_PLAN`. | **Skipped for now:** depends on P1 items 10 and 11, which are paused. | Revisit when evals resume. |

### Paused: eval and benchmark work

Paused on 2026-11-19. When it resumes, in this order:

1. A plan-off `--repeat 3` on PostgreSQL with the **same model** as the existing plan-on repeat. The Postgres reports from #27 mix `gemini-3.5-flash-lite` (plan off, single runs) with `gemini-3.1-flash-lite` (plan on, three runs), so plan on versus off cannot be compared and no Postgres accuracy figure should be quoted. The README's 97.5% is MySQL only.
2. Oracle clean-up in the forex dataset: E21 (`projected` mode fails on alias names; candidate for `values`), E19 (expects amounts the question does not ask for), E17 (expected two rows) and E12 (the agent returned 789954, expected 150; check whether the question or the agent is at fault).
3. P1 items 10 and 11, then the `AGENT_QUERY_PLAN` default re-test.

## 0.2.0 release checklist

1. P0 done (it is). P1: items 10 and 11 are paused and listed in the changelog as known.
2. MCP server and docs site shipped (acceptance criteria above); SDK stability tiers and Dependabot merged.
3. Benchmark re-run with `--repeat 3` on the final commit **if evals have resumed**; otherwise the README keeps the 0.1.8 MySQL figure with its date and model, clearly labelled.
4. `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm smoke`, `pnpm pack:check`.
5. Changelog entry with upgrade notes (including the `sql-ai.md` to `dbask.md` rename) and link references.
6. Tag `vX.Y.Z` matching `package.json`; verify the publish and `npm view @negusdev/dbask`.
7. Install the published package on a clean machine and run `dbask --version`, `dbask validate`, one question, and `dbask mcp` in a real client.

## Decisions

Made:
- The MCP command is `dbask mcp`, in the same package (2026-11-20).
- No `ask` tool in the MCP server; the HTTP API is the path for dbask's own agent (2026-11-22). `dbask.md` is offered over MCP only as an opt-in `get_business_context` tool (`DBASK_MCP_CONTEXT=on`).
- Docs start on GitHub Pages; `dbask.dev` is the long-term domain (2026-11-20).
- No SQLite in 0.2.0; Ollama and local models move to 0.3.
- `sql-ai.md` is renamed to `dbask.md` with no fallback (2026-11-17). `dbask validate` warns when it finds an unread `sql-ai.md` (nothing is loaded from it).
- MySQL and MariaDB list views, and CI runs the adapter tests against MySQL 8.4 and MariaDB 11 (2026-11-20).
- Eval and benchmark work is paused (2026-11-19).
- MySQL and MariaDB timeouts cancel the query on the server (2026-11-21).
- MySQL and MariaDB statements run in a READ ONLY session and transaction (2026-11-22).

