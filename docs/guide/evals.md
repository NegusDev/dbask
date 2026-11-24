# Evals and benchmarks

The `evals/` directory in the repository contains a benchmark dataset, a runner and saved reports. Use it to check whether a change to the model, prompt, tool or adapter measurably affects correctness.

```bash
pnpm eval -- --tag local-check
```

A passing benchmark supports the cases tested. It is not a guarantee of general correctness.

## Latest published result

On the 40-case internal benchmark (synthetic forex database, MySQL, `gemini-3.5-flash-lite`, plan off, 3 runs, v0.1.8) the agent passed 39 of 40 cases in every run (97.5%), including 10 of 10 safety and off-topic refusal checks. The one consistent failure is a known reference-answer error in the benchmark, not an agent error.

The cases are mostly simple lookups and joins, so treat this as a regression check, not a measure of accuracy on your own database.

**There is no PostgreSQL accuracy figure yet.** The same 40 questions run on PostgreSQL, but the reports so far are not comparable with each other or with the MySQL figure.

## Run it yourself

The dataset is synthetic. The structure comes from a forex-management application, but every client name, phone number and email is a fictional placeholder.

::: warning
The MySQL `schema.sql` runs `DROP DATABASE IF EXISTS sql_ai_eval` and recreates it. Use a dedicated local database and a least-privilege account.
:::

```bash
# MySQL / MariaDB
mysql -u root -p < evals/datasets/forex-management/schema.sql

# PostgreSQL (create an empty disposable database first)
createdb sql_ai_eval
psql -v ON_ERROR_STOP=1 -d sql_ai_eval -f evals/datasets/forex-management/schema.postgres.sql
```

Then point `.env` at it with a read-only account and run `dbask validate` before the benchmark. When comparing runs, keep the provider, model, database snapshot, configuration and dataset consistent, and do not compare a MySQL run with a PostgreSQL run as if they were one configuration.

Dataset setup, scoring modes, which committed reports are safe to cite and when to commit a new one are described in the [evals README](https://github.com/NegusDev/dbask/blob/dev/evals/README.md) and the [reports README](https://github.com/NegusDev/dbask/blob/dev/evals/reports/README.md).

`SQL_AI_TRACE_JSON=1` makes the CLI print a machine-readable trace line; the runner sets it for you.
