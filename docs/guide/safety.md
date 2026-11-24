# Safety model

dbask applies several independent safeguards, but **it is not a complete security boundary by itself**. This page says what each layer does, what the combination covers, and what it does not.

## The layers

1. **Your database account (you).** A dedicated read-only user with `SELECT` on only the tables the agent should see. This is the one layer dbask cannot enforce for you, and it is the strongest. See [Databases](/guide/databases#use-a-read-only-account).
2. **SQL validator.** Every query is tokenized first, so keywords inside string literals, quoted identifiers and comments are ignored. It accepts a single read-oriented statement and rejects writes, locking reads, `INTO OUTFILE`, executable comments, and functions such as `SLEEP()` and `LOAD_FILE()`. It uses the lexical rules of the configured database (for example PostgreSQL's dollar-quoted strings and nested comments, or MySQL's `#` comments and backslash escapes) and assumes MySQL's default `sql_mode`.
3. **Read-only session on the server.** Both adapters run every statement in a `READ ONLY` transaction that is always rolled back, so the database itself refuses writes even if the validator missed one.
   - **MySQL and MariaDB:** the session is also set `READ ONLY`, because DDL (`TRUNCATE`, `DROP`, `ALTER`, `RENAME`) commits implicitly and a transaction-level setting alone does not stop it. Refused statements fail with error 1792.
   - **PostgreSQL:** the statement runs over the extended protocol, so the server also refuses multiple statements.
4. **Limits.** Row count (`SQL_MAX_ROWS`), result size (`SQL_MAX_RESULT_BYTES`) and time (`SQL_QUERY_TIMEOUT_MS`). A timed-out query is cancelled on the server (`KILL QUERY` on MySQL and MariaDB, `statement_timeout` on PostgreSQL). Results that hit a limit are flagged `truncated`, and the agent is told not to present them as complete.
5. **Bounded agent.** A required foreign-key discovery step before any SQL, at most three SQL attempts per question, and a step limit (`AGENT_MAX_STEPS`).

## What this covers

- Writes, schema changes and administration statements are refused at the validator and again by the database.
- Runaway queries are cancelled, and oversized results are cut off.
- Nothing is sent anywhere except to your database and your configured AI provider.

## What this does not cover

- **A correct answer.** Successful SQL execution does not guarantee a correct answer. Joins and aggregations can be valid SQL and still not match what you meant. Verify important answers independently, especially for financial, operational or compliance decisions.
- **Reading data you should not see.** If the account can read a table or column, a question can reach it. dbask has no per-user, per-tenant or per-column access control yet; the database account is the access boundary. A column allow/deny list is on the [roadmap](https://github.com/NegusDev/dbask/blob/dev/ROADMAP.md).
- **Functions with side effects.** The validator cannot recognize user-defined functions that write. This is one more reason to use a read-only account.
- **Prompt injection through data.** Text stored in your rows can try to instruct the model. Tool descriptions tell the model to treat rows as data, but that is not a guarantee. The read-only layers limit the damage to bad reads and bad answers, not writes.
- **Large reads on MySQL and MariaDB.** Results are fetched fully before the row limit applies, so a query that returns a huge result still costs memory before it is cut.

## Data handling

dbask itself does not phone home: no telemetry, no crash reporting, no license check on startup, no cloud dependency. It runs on your machine or your server and talks to your database directly.

What does leave your machine is what your AI provider receives. Depending on the question and tool flow, that can include schema metadata, question text, generated SQL and query results. Review that provider's retention, training and residency terms before using sensitive data. For local-only inference, see [Ollama in AI providers](/guide/providers#local-models). With the [MCP server](/guide/mcp), the connected app's model sees what the tools return instead.

## Recommended practice

1. Use a dedicated read-only database account with only the permissions required.
2. Restrict visibility: avoid access to unrelated databases, sensitive tables or columns.
3. Protect credentials. Do not commit `.env` or share credentials in logs or issue reports, and rotate any credential that is exposed.
4. Review your AI provider's data handling.
5. Set conservative limits for rows, result size, timeout and agent steps.
6. Verify important answers independently.
7. Test on a non-production database first, such as a disposable or sanitized snapshot.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting on the [repository](https://github.com/NegusDev/dbask/security) rather than a public issue.
