# MCP server

`dbask mcp` serves dbask's database tools to any [MCP](https://modelcontextprotocol.io) client over stdio: Claude Desktop, Cursor, Zed, or your own code through an MCP client library in any language. The **client's own model writes the SQL**; dbask gives it a safe, capped, read-only view of your database.

It needs only the [database settings](/guide/configuration#database). **No AI provider or key is needed**, because dbask runs no model in this mode.

## Tools

| Tool | Purpose |
|---|---|
| `list_tables` | List the tables and views in the database. |
| `describe_tables` | Columns, types and keys for up to 10 tables at once. |
| `get_relationships` | Foreign keys, for one table or the whole database. |
| `execute_query` | Run one read-only `SELECT` or `WITH` statement. |
| `explain_query` | Show the execution plan for one such statement, without its rows. |
| `get_business_context` | Your `dbask.md`. Offered only when `DBASK_MCP_CONTEXT=on`. |

All tools are marked read-only. Every call goes through the same checks as the CLI: the SQL validator, the row, size and time limits, and the read-only session. See the [safety model](/guide/safety).

There is no `ask` tool. In an MCP client the client's own model already does that job, and running dbask's agent on top would put a second model in the loop.

## Configure a client

Most clients use the same JSON shape. Put your read-only database details in `env`:

```json
{
  "mcpServers": {
    "dbask": {
      "command": "npx",
      "args": ["-y", "@negusdev/dbask", "mcp"],
      "env": {
        "DB_DRIVER": "mysql",
        "DB_HOST": "127.0.0.1",
        "DB_NAME": "your_database",
        "DB_USER": "readonly_user",
        "DB_PASSWORD": "your_password"
      }
    }
  }
}
```

### Claude Desktop

Add the block above to `claude_desktop_config.json` (Settings, Developer, Edit Config) and restart Claude Desktop.

### Cursor

Add the same block to `.cursor/mcp.json` in your project, or to the global MCP settings.

### Zed

Zed calls MCP servers *context servers*. Add this to Zed's `settings.json` (command palette: `zed: open settings`):

```json
{
  "context_servers": {
    "dbask": {
      "command": "npx",
      "args": ["-y", "@negusdev/dbask", "mcp"],
      "env": {
        "DB_DRIVER": "mysql",
        "DB_HOST": "127.0.0.1",
        "DB_NAME": "your_database",
        "DB_USER": "readonly_user",
        "DB_PASSWORD": "your_password"
      }
    }
  }
}
```

Open **Settings, AI, MCP Servers**: a green dot means the server started. Then name it in your prompt ("using dbask, which tables do I have?"). Zed asks you to confirm each tool call by default, which lets you read the SQL before it runs.

**Zed for Windows with a WSL project.** Zed runs on Windows and cannot start a Linux `node` or a `/path/in/wsl` itself, which shows as a red dot and "context server timeout". Start the server through WSL, passing the variables with `env` inside the command:

```json
{
  "context_servers": {
    "dbask": {
      "command": "wsl.exe",
      "args": [
        "-e", "env",
        "DB_DRIVER=mysql", "DB_HOST=127.0.0.1", "DB_NAME=your_database",
        "DB_USER=readonly_user", "DB_PASSWORD=your_password",
        "npx", "-y", "@negusdev/dbask", "mcp"
      ]
    }
  }
}
```

### From your own code

Any MCP client library can launch `dbask mcp` as a child process and call the tools. The Python client, for example, uses `StdioServerParameters(command="npx", args=["-y", "@negusdev/dbask", "mcp"], env={...})` with `stdio_client`. This gives an application in any language read-only access to the database without a dbask SDK in that language. To run dbask's own agent from other languages you need an HTTP API, which is planned.

## Business context is opt-in

Set `DBASK_MCP_CONTEXT=on` to offer your [`dbask.md`](/guide/context) to the client as the `get_business_context` tool. The file is read from the directory the client starts the server in, and it is sent to whichever AI app connects, so it is off by default.

## Things to know

- **Row contents are untrusted.** A value in your data can contain text aimed at the model ("ignore your instructions..."). The tool descriptions tell the model to treat rows as data, but that is not a guarantee. Use a read-only database account, and remember that the connected app's model sees whatever `execute_query` returns.
- **Results are capped** by `SQL_MAX_ROWS` and `SQL_MAX_RESULT_BYTES`, and a result flagged `truncated` is incomplete. Queries running longer than `SQL_QUERY_TIMEOUT_MS` are cancelled.
- **stdout is the protocol channel.** dbask writes logs to stderr only. If you wrap the command in a script, do not print to stdout.
- **Node 22 or later** must be available to the client, and GUI apps often do not load your shell's PATH. If the server does not start, use the absolute path to `node` instead of `npx`.
