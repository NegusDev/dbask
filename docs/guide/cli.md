# Command line

```bash
dbask "How much revenue last month?"                      # natural (default)
dbask --mode technical "How much revenue last month?"     # answer + SQL
dbask --mode debug "How much revenue last month?"         # answer + tool traces
```

`dbask ask "..."` is the same as `dbask "..."`. Use it for a one-word question or inside older scripts. The shorthand flags `--technical` and `--debug` also work.

## Commands

| Command | What it does |
|---|---|
| `dbask "question"` | Answer a question. |
| `dbask init [--force]` | Setup wizard that writes `.env`. |
| `dbask validate [--skip-provider]` | Check configuration, database and (optionally) the AI provider. |
| `dbask mcp` | Serve the database tools to an MCP client. See [MCP server](/guide/mcp). |
| `dbask --version`, `dbask --help` | Version and usage. |

## Response modes

| Mode | Output |
|---|---|
| `natural` | A concise, business-friendly answer. |
| `technical` | The answer plus the SQL that was run. |
| `debug` | The answer plus tool-call diagnostics and timings. Start here when an answer looks wrong. |

## Terminal output

In an interactive terminal the CLI shows a progress spinner, renders the answer's Markdown (tables, bold, code, lists) and, in debug mode, prints the tool trace with symbols, highlighted SQL, the submitted query plan and any plan warnings.

When output is piped or redirected nothing changes except the formatting: you get the plain Markdown answer and the plain `[tool]` / `[done]` trace. Set `NO_COLOR=1` to turn colors off, or `FORCE_COLOR=1` to keep them in a pipe.

## How the agent answers

The agent can use `list_tables`, `describe_table`, `describe_tables`, `get_relationships`, `execute_query` and `explain_query`. It must complete a **global foreign-key discovery** call before it can execute SQL, so it has the relationship map while planning joins. SQL execution is capped at three attempts per question, so it can correct an invalid query without retrying forever.

These controls improve behavior, but they do not prove every join or aggregation matches the business meaning of a question. Databases with undeclared relationships, or complex SQL, still need live testing.

Schema metadata (table listings, descriptions, foreign keys) is cached in memory for five minutes by default and cleared when the process exits. Query results are never cached. See `SCHEMA_CACHE_TTL_MS` in [Configuration](/guide/configuration).
