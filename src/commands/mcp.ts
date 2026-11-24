import { createRequire } from 'node:module';
import { loadDatabaseConfig } from '../config/config.js';
import { loadDatabaseContext } from '../context/db-context.js';
import { createDatabaseAdapter } from '../database/index.js';
import { SchemaCache } from '../schema/cache.js';

/**
 * `dbask mcp`: serves the database tools over MCP on stdio.
 *
 * stdout is the protocol channel, so nothing else may write to it. Anything a
 * dependency prints with console.log is redirected to stderr, and the MCP SDK
 * is loaded here, not at start-up, so ordinary CLI runs never pay for it.
 */
export async function runMcp(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  console.log = (...args: unknown[]): void => console.error(...args);
  console.info = console.log;

  const { createDbaskMcpServer } = await import('../mcp/server.js');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');

  const settings = loadDatabaseConfig(env);
  const database = createDatabaseAdapter(settings.database);
  const schemaCache = new SchemaCache({ ttlMs: settings.schema.cacheTtlMs });

  // The business context is sent to whichever AI app connects, so it is opt-in.
  let businessContext: string | undefined;
  if (env.DBASK_MCP_CONTEXT === 'on') {
    businessContext = (await loadDatabaseContext()).content;
  }

  const version = createRequire(import.meta.url)('../../package.json').version as string;
  const server = createDbaskMcpServer({
    database,
    safety: settings.safety,
    schemaCache,
    businessContext,
    version,
  });

  let closing = false;
  const shutdown = async (code: number): Promise<void> => {
    if (closing) return;
    closing = true;
    await server.close().catch(() => undefined);
    await database.close?.().catch(() => undefined);
    process.exit(code);
  };

  process.once('SIGINT', () => void shutdown(0));
  process.once('SIGTERM', () => void shutdown(0));
  // The client closed our stdin: it is gone.
  process.stdin.once('end', () => void shutdown(0));

  await server.connect(new StdioServerTransport());
  console.error(
    `dbask mcp ready (${settings.database.driver}:${settings.database.name || 'unnamed'}${businessContext ? ', business context on' : ''})`,
  );
}
