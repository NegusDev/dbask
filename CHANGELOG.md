# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com), and the project uses [Semantic Versioning](https://semver.org) (0.x: minor versions may change behavior).

## [Unreleased]

### Added
- **MCP server: `dbask mcp`.** Serves `list_tables`, `describe_tables`, `get_relationships`, `execute_query` and `explain_query` over stdio to any MCP client (Claude Desktop, Cursor, or a client library in any language). It needs only the `DB_*` settings, no AI provider or key, and every call goes through the same SQL validator, limits and read-only session as the CLI. `DBASK_MCP_CONTEXT=on` also offers `dbask.md` as a `get_business_context` tool (off by default, because it is sent to the connecting app). There is no `ask` tool: the client's own model answers questions. See the README, "MCP server". The MCP SDK is loaded only by this command.
- **Views.** `list_tables` now includes views and `describe_table` describes them, on PostgreSQL (also materialized views) and on MySQL and MariaDB. Each entry carries `kind` (`table`, `view` or, on PostgreSQL, `materialized_view`); `TableInfo.kind` is optional and experimental. Writes through a view are still refused on PostgreSQL by the read-only transaction; on MySQL and MariaDB write protection is, as before, the SQL validator plus a read-only database user. MariaDB system-versioned tables, which were being skipped, are now listed as tables.
- `dbask validate` warns when it finds an old `sql-ai.md` and no `dbask.md`, telling you to rename it. Nothing is read from the old file.

### Fixed
- **MySQL and MariaDB query timeouts now cancel the query.** Before, a timed-out query kept running on the server and kept its pooled connection busy, so a few timeouts in a row could stall every later query. The adapter now sends `KILL QUERY` from a separate short-lived connection (a `SELECT`-only user can do this on its own queries) and, if the kill fails or the server does not respond within 3 seconds, discards the connection so the pool recovers. The error is `Query timed out after N ms and was cancelled.` Unchanged for queries that finish in time.

### Changed
- **Documentation site.** The docs are now a VitePress site built from `docs/` (Quickstart, Configuration, AI providers, Databases, Command line, Business context, MCP server, TypeScript SDK, Safety model, Query plan, Evals, Troubleshooting, Contributing), published to GitHub Pages at `negusdev.github.io/dbask` from `main`. The README is now a short intro with install, first question and links; `DOCUMENTATION.md` is a pointer to the site. A test fails if an environment variable the code reads is not documented.
- **MySQL and MariaDB statements now run in a READ ONLY session and transaction**, always rolled back, as PostgreSQL already did. The server itself now refuses writes and DDL (error 1792) even if the SQL validator misses one. Reads are unaffected; a read-only database account is still recommended.
- **SDK stability tiers.** Every export is now labelled stable or experimental (see the docs site, "SDK stability"). Experimental: `SchemaCache`, `SdkAiProvider`, `AgentObserver`, `AgentToolEvent`, `AiProvider`, `ModelProvider`, `ModelRequest`, `ModelResponse`, `PlanStats`, `SqlToolResult`, `StructuredQueryPlan`, and the members `AgentOptions.requirePlan`, `AgentOptions.observer`, `AgentResult.plan`, `AgentResult.raw`, `TableInfo.kind`, `ToolContext.schemaCache`. Nothing changed in behavior or types; these may now change in any release, and everything else follows the stable policy. If you implement `AiProvider` yourself, expect it to change with the AI SDK.
- **The business context file is now `dbask.md`** (was `sql-ai.md`), and the template is `dbask.example.md`. `sql-ai.md` is no longer read.

### Development
- `tests/docs-env.test.ts` checks every environment variable is documented; `.github/workflows/docs.yml` builds the site (dead internal links fail it), checks external links, and deploys from `main`.
- `tests/mcp-server.test.ts` runs the server against the official MCP client and a fake adapter (including rejected writes, multi-statement and `SLEEP()` queries, and result-size cut-off); `tests/mcp-stdio.test.ts` starts the real process and checks stdout carries only JSON-RPC and that no AI settings are needed. `pnpm smoke` also checks `dbask mcp`.
- The database tools' input schemas moved to `src/core/tools/schemas.ts`, shared by the agent and the MCP server; `loadDatabaseConfig` loads the database settings without an AI provider (internal).
- `tests/public-api.test.ts` lists the SDK's exports and tiers and fails when an export is added, removed or moved without choosing a tier, or when an `@experimental` tag is missing or misplaced.
- `evals/reports/README.md` indexes the committed benchmark reports (which ones back a claim, which are history or not comparable) and says when a report should be committed.
- Dependabot (`.github/dependabot.yml`): weekly grouped updates for the AI SDK packages, other runtime and dev dependencies, and GitHub Actions, with a release cooldown. Nothing auto-merges; CONTRIBUTING describes the review rules, including a smoke run for AI SDK updates.
- CI runs the adapter integration tests against PostgreSQL 16, MySQL 8.4 and MariaDB 11 (`tests/mysql-adapter.test.ts` is new; see CONTRIBUTING for the `TEST_MYSQL_*` variables).
- CI now also runs typecheck, tests, build and a CLI smoke test (`pnpm smoke`: `--version`, `--help`, unknown command and option, `ask` without a question, `validate` without configuration) on macOS and Windows, and the smoke test on Linux. `.gitattributes` keeps LF line endings on every platform.
- PostgreSQL edition of the forex evaluation dataset (`schema.postgres.sql`), a test that runs every reference query against it, and the database driver in report headers. See `evals/README.md`.
- Benchmark: corrected the reference answer for E23 (it required id columns the question never asks for) and switched E08 and E09 to value comparison so harmless alias differences no longer fail them.
- Benchmark runner: a case killed at the time limit now shows as `timeout` (its own row in the report summary and its own verdict in `--repeat` summaries) instead of looking like a wrong answer; it is still scored as a failure. Reports also count plan submissions, rejections and SQL blocked for leaving the plan, per case and in total, and the JSON report carries a `plan` object for each case.

### Upgrade notes
- If you use a business context file, rename `sql-ai.md` to `dbask.md` before upgrading. Without the rename the agent runs with no business context, and no error is shown.

## [0.1.9] - 2026-11-14

### Changed
- **Renamed from `sql-ai-harness` to `dbask`.** The npm package is now `@negusdev/dbask` (the unscoped name `dbask` was blocked by npm's name-similarity check) and the command is `dbask`. The `sql-ai-harness` command is **not** kept as an alias: it would collide with the old package's file when installing over it (`EEXIST`). If you have the old package installed globally, run `npm uninstall -g sql-ai-harness` before `npm i -g @negusdev/dbask`. You can now ask without the subcommand: `dbask "who owes us money?"` (`dbask ask "…"` still works). Mistyped options and one-word mistyped commands now print an error instead of being sent to the model, and `dbask --version` and `--help` were added. Environment variables, the `sql-ai.md` context file and the SDK API are unchanged; update imports from `"sql-ai-harness"` to `"@negusdev/dbask"`. The structured debug events now use `source: "dbask"`.

## [0.1.8] - 2026-11-13

### Added
- **DeepSeek provider.** Set `AI_PROVIDER=deepseek` and `DEEPSEEK_API_KEY`.
- **Optional query plan** (`AGENT_QUERY_PLAN=on`, or `requirePlan: true` in the SDK). The agent submits a structured plan (tables, columns, joins, filters) that is checked against your real schema before any SQL runs; the SQL may then read only the planned tables. Unknown tables or columns and unconnected tables are rejected, joins that are not declared foreign keys produce warnings, and plan submissions are capped at 4. `AgentResult.plan` reports submitted, accepted, rejected and SQL-mismatch counts. New exports: `StructuredQueryPlan`, `PlanStats`.
- **Terminal UI.** Progress spinner with the current step, Markdown answers rendered for the terminal (aligned tables that wrap instead of cutting ids, bold, code, lists), highlighted SQL, and a clearer `--mode debug` trace that shows the plan, plan warnings and plan counts. `validate` uses symbols and color. Piped or redirected output is unchanged; `NO_COLOR` and `FORCE_COLOR` are honored.
- `CONTRIBUTING.md`.

### Changed
- **The query plan is off by default.** On the 40-case benchmark it added about 0.7 tool calls and roughly 30% median latency per question without improving accuracy. Turn it on with `AGENT_QUERY_PLAN=on` if you want the agent's assumptions visible. (SDK: `new Agent(..., { requirePlan: true })`; the SDK default is also off.)
- **The agent stays on topic.** It now declines questions that are not about the connected database (arithmetic, general knowledge, writing, instruction overrides) without calling tools or querying, and treats text found in table names, column names or row values as data, not instructions.
- **The agent always ends with an answer.** The last step is reserved for the final answer, and a run that cannot finish returns `AgentResult.incomplete`; the CLI prints it as an error and exits with code 1. Write requests are refused up front.
- Updated the Vercel AI SDK packages.

### Development
- Evaluation: 40-case dataset (adds four off-topic cases), value-based result comparison, tolerant answer checks, refusal scoring, provider-error retries excluded from scores, `--repeat N` with a cross-run summary, `--only`, process-group timeout kill, and run settings (model, commit, max steps, plan flag) in report headers.
- Benchmark result for this release: 39 of 40 cases passed in every one of three runs (`gemini-3.5-flash-lite`, synthetic database). The one consistent failure is a known reference-answer error, not an agent error. See the README for caveats.

### Upgrade notes
- No action needed for the CLI. If you script `submit_query_plan` directly, the plan shape changed: `fields` is a list of `{table, column}` and `joins` a list of `{left, right}`.

## [0.1.7] - 2026-11-05

### Added
- PostgreSQL support (tables, partitioned tables and schemas; views are not listed yet).
- `validate` command to check configuration, database connection, foreign keys, AI provider and `sql-ai.md`.

For earlier releases, see the [commit history](https://github.com/NegusDev/dbask/commits/dev) and the npm release list.

[Unreleased]: https://github.com/NegusDev/dbask/compare/v0.1.9...HEAD
[0.1.9]: https://github.com/NegusDev/dbask/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/NegusDev/dbask/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/NegusDev/dbask/releases/tag/v0.1.7
