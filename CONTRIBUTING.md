# Contributing to dbask

Thanks for helping. This project is a small, safety-focused layer between an AI model and a read-only relational database, so changes are judged on correctness and safety first, features second.

## Ground rules

- **Read-only is a hard guarantee.** Nothing may make the agent write to, alter or administer a database. Changes that loosen the SQL validator, row/byte/time limits, or the read-only checks need a clear reason and tests.
- **No telemetry.** The harness sends nothing anywhere except to the database and the AI provider the user configured. Don't add analytics, crash reporting or phone-home checks.
- **Never commit secrets.** No API keys, passwords, connection strings or real customer data in code, tests, evals, reports or screenshots. The eval database is synthetic; keep it that way.
- Be kind. Assume good intent in reviews and issues.

## Getting set up

Requirements: Node.js 22 or newer and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/NegusDev/dbask.git
cd dbask
pnpm install
pnpm typecheck
pnpm test
```

Run the CLI from source with `pnpm dev ask "your question"` (use `--mode debug` to see tool calls). You need a `.env` for that; `dbask init` or `.env.example` shows the variables. Unit tests need neither a database nor an API key.

## Dependency updates

Dependabot opens grouped pull requests every Monday: one for the AI SDK (`ai`, `@ai-sdk/*`, `@openrouter/ai-sdk-provider`), one for other runtime dependencies, one for dev dependencies, and one for GitHub Actions. They are never merged automatically.

- Read the release notes for anything beyond a patch bump, and check that CI is green on Linux, macOS and Windows.
- **AI SDK updates also need a smoke run**, because they can change how models are called and CI cannot see that (the benchmark needs API keys). With your own key configured, run `pnpm eval -- --tag deps --only E02,E04,E06,E24,E31,E37` on the branch and compare with the last report for those cases in `evals/reports/`. Paste the summary in the pull request. This is a smoke check, not a benchmark.
- A major version bump of any dependency is its own pull request with a changelog entry if user-visible behavior changes.
The adapter integration tests run only when a server is configured, and skip themselves otherwise: set `TEST_PG_HOST`, `TEST_PG_PORT`, `TEST_PG_DATABASE`, `TEST_PG_USER`, `TEST_PG_PASSWORD` for PostgreSQL, and the same names with `TEST_MYSQL_` for MySQL or MariaDB. Use a disposable database; the tests create and drop objects prefixed `hit_` (and a private schema on PostgreSQL). CI runs them against PostgreSQL 16, MySQL 8.4 and MariaDB 11.

## Branches and pull requests

1. Fork the repo and branch from `dev` (not `main`). Use a descriptive name: `feat/…`, `fix/…`, `docs/…`.
2. Keep each pull request to one concern. A bug fix plus a refactor is two PRs.
3. Open the PR against `dev`. Describe *what* changed and *why*, and call out anything that changes behavior for existing users (config, defaults, output format, public API).
4. CI runs typecheck and tests. Both must pass.
5. A maintainer reviews and merges. Maintainers handle releases.

Commit messages: short imperative subject (`Add DeepSeek provider`), a body when the reason isn't obvious.

## What a good change includes

- **Tests** for new behavior and for the bug you fixed (the test should fail without your change). Tests live in `tests/` and use [Vitest](https://vitest.dev). Prefer fakes for the database and model; see `tests/agent-query-plan.test.ts` for the pattern.
- **Types.** `pnpm typecheck` must be clean. No `any` to get around an error.
- **Docs.** Update the docs in `docs/guide/` (and the short `README.md` if the install or first-run steps change) when you add or change a setting, command, provider or public export. A test fails if an environment variable the code reads is missing from `docs/guide/configuration.md`; new variables also go in `.env.example`.
- **Public API care.** Anything exported from `src/index.ts` is public. Don't rename or remove exports without discussion.

## Common contributions

### Add an AI provider

1. Add the provider to the enum and key handling in `src/config/config.ts`.
2. Add a `case` in `src/ai/factory.ts` (the compiler flags a missing case).
3. Add it to the lists in `src/commands/init.ts`, `.env.example` and the README tables.
4. Add a config test, for example that the missing key produces a clear error.

### Add a database

Implement the `DatabaseAdapter` interface and register it in `src/database/factory.ts`. The SQL validator and tokenizer are dialect-aware (`src/safety/`), so a new dialect needs tokenizer and validator tests covering its quoting and comment rules. Test against a real database before asking for review, and say which version you used.

### Change the agent's behavior or prompt

Prompt and tool changes are easy to get subtly wrong. Please:

- Add or update tests in `tests/agent-*.test.ts`.
- Run the evals (below) before and after, with the same model, and include the numbers in the PR. One run is noisy, so use `--repeat 3` or more.

## Running the evals

The benchmark runs real questions through the CLI against a seeded, synthetic MySQL database and scores the answers. It needs a database and a model key, so contributors run it only for changes that affect agent behavior. See [`evals/README.md`](evals/README.md) for setup.

```bash
GIT_COMMIT=$(git rev-parse HEAD) pnpm eval -- --tag my_change --repeat 3
pnpm eval -- --tag one_case --only E18          # a single case
```

Don't commit report files unless a maintainer asks for them.

## Reporting bugs

Open an issue with: what you ran, what you expected, what happened, your Node version, database and version, AI provider and model. Run with `--mode debug` and paste the trace, removing anything private (hostnames, names, data values).

## Reporting security problems

Please **don't** open a public issue for a vulnerability, for example a query that gets past the read-only checks or a way to leak credentials. Use GitHub's private vulnerability reporting (the repository's **Security** tab, then **Report a vulnerability**) with steps to reproduce. You'll get an acknowledgement, and we'll agree a fix and disclosure plan.

## License

By contributing you agree that your contributions are licensed under the project's [ISC License](LICENSE).
