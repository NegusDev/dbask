# Troubleshooting

## Database connection fails

- Verify host, port, database name, username and password.
- Confirm the database accepts connections from the machine running dbask.
- Confirm the account can inspect tables and read the required data.
- Check firewall rules and database allowlists.
- Hosted PostgreSQL (Neon, Supabase, RDS and similar) usually requires TLS: set `DB_SSL=require`. Poolers such as pgbouncer in transaction mode work, because each query is a self-contained transaction.
- PostgreSQL tables outside `public` appear as `schema.table` in `list_tables`; the agent is told to use names exactly as listed.

## Provider authentication or model errors

- Confirm `AI_PROVIDER` matches the provider whose key you configured.
- Verify `AI_MODEL` is the exact model ID the provider expects.
- Check that the API key is active and has quota and access to the model.
- For Ollama, verify the endpoint is reachable and the model is installed.
- Run `dbask validate`. It sends one tiny request to the provider and reports whether the key, model and network path work. (`init` only tests the database.)

## The answer is incorrect or incomplete

- Run with `--mode technical` or `--mode debug` to inspect the SQL and tool activity.
- Inspect the relevant table definitions and foreign keys.
- Review [dbask.md](/guide/context) for outdated or ambiguous rules.
- Narrow the question with dates, statuses or business definitions.
- Verify the generated SQL and results directly against the database.
- Add a representative case to `evals/` if the failure is repeatable.

## Configuration is not found

- Run the command from the directory containing `.env`, or set the variables in the process environment.
- Confirm variable names match `.env.example`, and see [Configuration](/guide/configuration).
- Check that `AI_MODEL` and the selected provider's credentials are set.

## A query times out

The query is cancelled on the server and the error says `Query timed out after N ms and was cancelled.` Raise `SQL_QUERY_TIMEOUT_MS` if the query is legitimate, or ask a narrower question.

## MCP server does not start

- In Zed, a red dot with "context server timeout" usually means the client could not launch the command. On Windows with a WSL project, see [Zed for Windows with a WSL project](/guide/mcp#zed).
- Run the command in a terminal with the same environment. A working server prints `dbask mcp ready (...)` on stderr and then waits for input.
- GUI apps often do not load your shell's PATH. Use the absolute path to `node` (Node 22 or later) if `npx` or `node` is not found.
- `dbask mcp` takes no arguments. Configure it with `DB_*` variables.
