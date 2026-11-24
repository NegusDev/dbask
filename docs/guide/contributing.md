# Contributing

This project is a small, safety-focused layer between an AI model and a read-only relational database, so changes are judged on correctness and safety first, features second. The full guide is [CONTRIBUTING.md](https://github.com/NegusDev/dbask/blob/dev/CONTRIBUTING.md) in the repository.

## Ground rules

- **Read-only is a hard guarantee.** Nothing may make the agent write to, alter or administer a database. Changes that loosen the SQL validator, the limits or the read-only checks need a clear reason and tests.
- **No telemetry.** Nothing is sent anywhere except to the database and the AI provider the user configured.
- **Never commit secrets.** No API keys, passwords, connection strings or real customer data in code, tests, evals, reports or screenshots.

## Getting set up

You need Node.js 22 or newer and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/NegusDev/dbask.git
cd dbask
pnpm install
pnpm typecheck
pnpm test
```

Run the CLI from source with `pnpm dev "your question"` (use `--mode debug` to see tool calls). Unit tests need neither a database nor an API key. The MySQL and PostgreSQL integration tests run when the `TEST_MYSQL_*` and `TEST_PG_*` variables are set, as in CI.

## Working on these docs

The site is built with [VitePress](https://vitepress.dev) from the `docs/` folder.

```bash
pnpm docs:dev      # live preview
pnpm docs:build    # production build; a broken internal link fails it
```

A test checks that every environment variable the code reads is documented in [Configuration](/guide/configuration).

## Project layout

```text
src/
  ai/             Provider factory and provider interfaces
  commands/       CLI commands, including the init wizard and `dbask mcp`
  config/         Environment and .env loading
  context/        Optional business context loading (dbask.md)
  core/agent/     Agent loop and observability interfaces
  core/tools/     Schema and SQL tools exposed to the agent
  mcp/            MCP server exposing the database tools
  database/       Database adapters (MySQL, PostgreSQL)
  safety/         SQL validation, policy checks, execution limits
  schema/         In-memory schema metadata cache
  cli.ts          CLI entry point
  index.ts        Public TypeScript SDK exports
docs/             This site
evals/            Benchmark dataset, runner, and reports
tests/            Automated tests
```
