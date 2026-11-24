# Quickstart

You need **Node.js 22 or later**, a MySQL, MariaDB or PostgreSQL database with a read-only account, and credentials for one [AI provider](/guide/providers). To use dbask from an AI app instead, skip to the [MCP server](/guide/mcp); it needs no AI key.

## 1. Configure

Run the setup wizard in the directory where you want the configuration stored:

```bash
npx @negusdev/dbask init
```

It asks for the database type, host, port, name, user and password, the AI provider and exact model ID, an API key (or a base URL for Ollama), and the agent step limit, SQL row limit and schema-cache lifetime.

It tests the **database connection** and lists tables before saving. It does **not** send a request to the AI provider, so a successful `init` does not prove the key or model ID is right. The next step checks that.

If `.env` already exists, the wizard asks before updating dbask settings and keeps unrelated entries. Skip the question with `--force`:

```bash
npx @negusdev/dbask init --force
```

Keep `.env` private and out of version control. The wizard writes it with restrictive permissions where the system supports it.

## 2. Check your setup

```bash
npx @negusdev/dbask validate
```

`validate` checks your configuration, connects to the database, confirms the account can see tables and foreign keys, and sends **one tiny request** to your AI provider to confirm the key and model work. It never reads table data and never runs model-written SQL.

```text
[ok]   Configuration: provider=openrouter, model=openai/gpt-4o-mini
[ok]   Database connection: Connected to 127.0.0.1:3306/mydb; 27 tables visible.
[ok]   Foreign keys: 42 declared relationships found.
[ok]   AI provider: openrouter answered using model openai/gpt-4o-mini.
[skip] Business context (dbask.md): No dbask.md found. This is optional.
```

Each line reports `[ok]`, `[warn]`, `[fail]` or `[skip]`. The command exits with a non-zero status if anything fails, so it works in scripts and CI. Use `--skip-provider` to check only the configuration and database.

## 3. Ask a question

```bash
npx @negusdev/dbask "How many students are enrolled?"
```

## 4. Install globally (optional)

```bash
npm install --global @negusdev/dbask
dbask "List active users"
```

## Next

- Tune [limits and settings](/guide/configuration).
- Explain your business terms in [dbask.md](/guide/context) so answers match what you mean.
- Read the [safety model](/guide/safety) before pointing dbask at real data.
