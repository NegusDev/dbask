---
layout: home
hero:
  name: dbask
  text: Ask your database in plain language
  tagline: Read-only Text-to-SQL for MySQL, MariaDB and PostgreSQL. A CLI, a TypeScript SDK and an MCP server, with no telemetry and no cloud service.
  actions:
    - theme: brand
      text: Quickstart
      link: /guide/quickstart
    - theme: alt
      text: MCP server
      link: /guide/mcp
    - theme: alt
      text: Safety model
      link: /guide/safety
features:
  - title: Read-only by design
    details: Every query is validated, limited in rows, size and time, and run in a read-only session on the server. Writes and DDL are refused by the database itself.
    link: /guide/safety
  - title: Works with the tools you have
    details: Use the CLI, the TypeScript SDK, or connect Claude Desktop, Cursor or Zed through the MCP server. No AI key is needed for MCP.
    link: /guide/mcp
  - title: Honest about accuracy
    details: A benchmark you can run yourself, with the results, the model and the date. It is a regression check, not a promise about your database.
    link: /guide/evals
  - title: Your data stays yours
    details: No telemetry and no hosted dependency. Only the AI provider you choose sees schema metadata, questions, SQL and results.
    link: /guide/safety#data-handling
---
