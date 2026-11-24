# TypeScript SDK

The package exports its public SDK from `@negusdev/dbask`. Import from the package entry point; internal `src/` paths are not part of the public API.

```ts
import {
  Agent,
  createAiProvider,
  createDatabaseAdapter,
  loadConfig,
} from "@negusdev/dbask";

const config = loadConfig();

// Picks MySqlAdapter or PostgresAdapter from DB_DRIVER.
// You can also construct MySqlAdapter / PostgresAdapter directly.
const database = createDatabaseAdapter(config.database);

const provider = createAiProvider(config.ai);

const agent = new Agent(
  provider,
  { database, safety: config.safety },
  { maxSteps: config.agent.maxSteps, responseMode: "natural" },
);

try {
  const result = await agent.ask("List active users");
  console.log(result.text);
} finally {
  await database.close();
}
```

The SDK accepts any `DatabaseAdapter` implementation. Custom adapters must preserve the safety expectations: read-only intent, row, byte and timeout limits, and bounded SQL attempts per question.

## SDK stability

Everything exported from `@negusdev/dbask` is in one of two tiers. Experimental items are marked `@experimental` in their documentation, so editors show it.

| Tier | Exports |
|---|---|
| **Stable** | `Agent`, `createAiProvider`, `createDatabaseAdapter`, `loadConfig`, `MySqlAdapter`, `PostgresAdapter`; types `AgentOptions`, `AgentResult`, `AiProviderName`, `AppConfig`, `ColumnInfo`, `DatabaseAdapter`, `DatabaseConnectionConfig`, `DatabaseContext`, `MySqlAdapterConfig`, `PostgresAdapterConfig`, `QueryExecutionOptions`, `QueryPlan`, `QueryResult`, `RelationshipInfo`, `ResponseMode`, `SqlDialect`, `SqlSafetyPolicy`, `TableInfo`, `TableSchema`, `ToolContext` |
| **Experimental** | `SchemaCache`, `SdkAiProvider`, `AgentObserver`, `AgentToolEvent`, `AiProvider`, `ModelProvider`, `ModelRequest`, `ModelResponse`, `PlanStats`, `SqlToolResult`, `StructuredQueryPlan` |
| **Experimental members of stable types** | `AgentOptions.requirePlan`, `AgentOptions.observer`, `AgentResult.plan`, `AgentResult.raw`, `TableInfo.kind`, `ToolContext.schemaCache` |

What the tiers promise while the version is 0.x:

- **Stable:** removing or renaming an export, removing a field, or changing what something means happens only in a minor release (0.2 to 0.3), never in a patch, and is listed in the changelog. Adding things is not a breaking change: new optional fields, new union members (such as a new provider name) and new exports can appear in any release. Write code that tolerates unknown values in unions.
- **Experimental:** may change or disappear in any release, including a patch. Changes are still listed in the changelog.

Notes:

- `QueryPlan` is the database's EXPLAIN output, returned by `DatabaseAdapter.explainQuery`. `StructuredQueryPlan` is the plan a model submits when `requirePlan` is on. They are different things.
- The provider layer (`AiProvider` and the `Model*` types) uses types from the Vercel AI SDK, so it can change when that package has a major release. Create providers with `createAiProvider` and pass the result to `Agent`; do not implement `AiProvider` yourself yet.
- `loadConfig` reads environment variables (`DB_*`, `AI_*`, `AGENT_*`). If you build your own configuration instead, you can construct adapters and providers directly and skip it.
- A test (`tests/public-api.test.ts`) lists these tiers and fails when an export is added, removed or moved without choosing a tier, so this table and the code cannot drift apart silently.

## Using dbask from other languages

There is no SDK for languages other than TypeScript yet. Applications in any language can already use the [MCP server](/guide/mcp) through an MCP client library, which gives them read-only database tools. A local HTTP API that runs the full agent is planned; see the [roadmap](https://github.com/NegusDev/dbask/blob/dev/ROADMAP.md).
