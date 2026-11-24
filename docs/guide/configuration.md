# Configuration

dbask reads `.env` in the current working directory plus the process environment. The repository's `.env.example` is a full template. The setup wizard (`dbask init`) writes the file for you.

Values in the process environment are used as given. The list below is checked against the configuration code, so every variable the code reads is documented here.

## AI provider

| Variable | Purpose | Default |
|---|---|---|
| `AI_PROVIDER` | One of `openrouter`, `google`, `groq`, `cerebras`, `ollama`, `deepseek`. | `openrouter` |
| `AI_MODEL` | Exact model ID accepted by the provider. | *required* |
| `OPENROUTER_API_KEY` | OpenRouter credential. | none |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Gemini credential. | none |
| `GROQ_API_KEY` | Groq credential. | none |
| `CEREBRAS_API_KEY` | Cerebras credential. | none |
| `DEEPSEEK_API_KEY` | DeepSeek credential. | none |
| `OLLAMA_BASE_URL` | Ollama endpoint. | `http://localhost:11434/v1` |
| `AI_SITE_URL` | Optional OpenRouter app URL metadata. | none |
| `AI_SITE_NAME` | Optional OpenRouter app name metadata. | `dbask` |

Only the key for the selected provider is needed. See [AI providers](/guide/providers).

## Database

| Variable | Purpose | Default |
|---|---|---|
| `DB_DRIVER` | `mysql` (also MariaDB) or `postgres`. | `mysql` |
| `DB_HOST` | Hostname or IP. | `127.0.0.1` |
| `DB_PORT` | Port. Empty means the driver default. | `3306` for mysql, `5432` for postgres |
| `DB_SSL` | `disable`; `require` (encrypt, do not verify the certificate); or `verify-full` (encrypt and verify; set `NODE_EXTRA_CA_CERTS` for a private CA). | `disable` |
| `DB_NAME` | Database name. | *required* |
| `DB_USER` | Username. **Use a restricted read-only account.** | *required* |
| `DB_PASSWORD` | Password. Set it privately. | *required* |

See [Databases](/guide/databases).

## Limits

| Variable | Purpose | Default |
|---|---|---|
| `SQL_MAX_ROWS` | Maximum rows returned per query. | `500` |
| `SQL_QUERY_TIMEOUT_MS` | Per-query timeout in milliseconds. The query is cancelled on the server. | `10000` |
| `SQL_MAX_RESULT_BYTES` | Maximum result payload size in bytes. | `1048576` |
| `AGENT_MAX_STEPS` | Maximum agent loop steps (1 to 20). | `8` |
| `AGENT_QUERY_PLAN` | `on` requires a schema-checked [query plan](/guide/query-plan) before SQL runs; `off` skips it. | `off` |
| `SCHEMA_CACHE_TTL_MS` | Schema cache lifetime in milliseconds. | `300000` (5 minutes) |

Start from the `.env.example` values and tune against your own database. Higher limits increase both resource use and the amount of data exposed to the model.

## MCP server

| Variable | Purpose | Default |
|---|---|---|
| `DBASK_MCP_CONTEXT` | `on` offers `dbask.md` to the connected MCP client as the `get_business_context` tool. It is sent to whichever AI app connects, so it is off by default. | `off` |

`dbask mcp` reads only the [database](#database) and [limits](#limits) settings (`SQL_*` and `SCHEMA_CACHE_TTL_MS`), and needs no AI provider. See [MCP server](/guide/mcp).

## Terminal and diagnostics

| Variable | Purpose | Default |
|---|---|---|
| `NO_COLOR` | Set to `1` to turn terminal colors off. | unset |
| `FORCE_COLOR` | Set to `1` to keep colors when output is piped. | unset |
| `SQL_AI_TRACE_JSON` | Set to `1` to print a machine-readable trace line for the [eval runner](/guide/evals). Not needed for normal use. | unset |
