import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDbaskMcpServer, MAX_TOOL_TEXT_CHARS } from '../src/mcp/server.js';
import type { DatabaseAdapter, SqlSafetyPolicy } from '../src/core/types/index.js';

const safety: SqlSafetyPolicy = { readOnly: true, maxRows: 7, queryTimeoutMs: 1234, maxResultBytes: 4321 };

function fakeAdapter(overrides: Partial<DatabaseAdapter> = {}): DatabaseAdapter {
  return {
    dialect: 'mysql',
    listTables: vi.fn(async () => [{ name: 'customers', kind: 'table' as const }, { name: 'ann', kind: 'view' as const }]),
    describeTable: vi.fn(async (name: string) => ({
      name,
      columns: [{ name: 'id', type: 'int', nullable: false, key: 'PRI' }],
    })),
    getRelationships: vi.fn(async () => [
      { table: 'orders', column: 'customer_id', referencedTable: 'customers', referencedColumn: 'id' },
    ]),
    executeQuery: vi.fn(async () => ({ rows: [{ n: 1 }], rowCount: 1, executionTimeMs: 1, truncated: false })),
    explainQuery: vi.fn(async (sql: string) => ({ sql, plan: [{ id: 1 }] })),
    ...overrides,
  } as DatabaseAdapter;
}

const open: Client[] = [];

async function connect(database: DatabaseAdapter, businessContext?: string): Promise<Client> {
  const server = createDbaskMcpServer({ database, safety, businessContext, version: '0.0.0-test' });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  open.push(client);
  return client;
}

function text(result: Awaited<ReturnType<Client['callTool']>>): string {
  const content = result.content as Array<{ type: string; text?: string }>;
  return content.map((part) => part.text ?? '').join('');
}

afterEach(async () => {
  await Promise.all(open.splice(0).map((client) => client.close()));
});

describe('dbask MCP server', () => {
  it('offers the five database tools, all marked read-only', async () => {
    const client = await connect(fakeAdapter());
    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'describe_tables',
      'execute_query',
      'explain_query',
      'get_relationships',
      'list_tables',
    ]);
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint, tool.name).toBe(true);
      expect(tool.annotations?.destructiveHint, tool.name).toBe(false);
    }
  });

  it('offers get_business_context only when context is supplied', async () => {
    const without = await connect(fakeAdapter());
    expect((await without.listTools()).tools.map((tool) => tool.name)).not.toContain('get_business_context');

    const withContext = await connect(fakeAdapter(), 'A "term" is a school term.');
    expect((await withContext.listTools()).tools.map((tool) => tool.name)).toContain('get_business_context');
    expect(text(await withContext.callTool({ name: 'get_business_context', arguments: {} }))).toBe('A "term" is a school term.');
  });

  it('lists, describes and relates tables through the adapter', async () => {
    const adapter = fakeAdapter();
    const client = await connect(adapter);

    expect(JSON.parse(text(await client.callTool({ name: 'list_tables', arguments: {} })))).toEqual([
      { name: 'customers', kind: 'table' },
      { name: 'ann', kind: 'view' },
    ]);

    const described = JSON.parse(text(await client.callTool({ name: 'describe_tables', arguments: { tables: ['customers'] } })));
    expect(described[0].name).toBe('customers');

    const relationships = JSON.parse(text(await client.callTool({ name: 'get_relationships', arguments: {} })));
    expect(relationships[0].referencedTable).toBe('customers');
  });

  it('runs a SELECT with the configured limits', async () => {
    const adapter = fakeAdapter();
    const client = await connect(adapter);

    const result = await client.callTool({ name: 'execute_query', arguments: { sql: 'SELECT 1 AS n' } });

    expect(result.isError).toBeFalsy();
    expect(JSON.parse(text(result)).rows).toEqual([{ n: 1 }]);
    expect(adapter.executeQuery).toHaveBeenCalledWith('SELECT 1 AS n', { maxRows: 7, timeoutMs: 1234, maxResultBytes: 4321 });
  });

  it('passes the truncated flag through so the client can tell a result is incomplete', async () => {
    const adapter = fakeAdapter({
      executeQuery: vi.fn(async () => ({ rows: [{ n: 1 }], rowCount: 1, executionTimeMs: 1, truncated: true })),
    });
    const client = await connect(adapter);

    expect(JSON.parse(text(await client.callTool({ name: 'execute_query', arguments: { sql: 'SELECT n FROM t' } }))).truncated).toBe(true);
  });

  it.each([
    ['a write', "INSERT INTO customers (name) VALUES ('x')"],
    ['an update', "UPDATE customers SET name = 'x'"],
    ['a delete', 'DELETE FROM customers'],
    ['DDL', 'DROP TABLE customers'],
    ['a multi-statement query', 'SELECT 1; DELETE FROM customers'],
    ['a locking read', 'SELECT * FROM customers FOR UPDATE'],
    ['a file write', "SELECT 1 INTO OUTFILE '/tmp/x'"],
    ['SLEEP()', 'SELECT SLEEP(5)'],
  ])('rejects %s before it reaches the database', async (_label, sql) => {
    const adapter = fakeAdapter();
    const client = await connect(adapter);

    const result = await client.callTool({ name: 'execute_query', arguments: { sql } });

    expect(result.isError).toBe(true);
    expect(text(result).length).toBeGreaterThan(0);
    expect(adapter.executeQuery).not.toHaveBeenCalled();
  });

  it('rejects an unsafe query for explain_query as well', async () => {
    const adapter = fakeAdapter();
    const client = await connect(adapter);

    const result = await client.callTool({ name: 'explain_query', arguments: { sql: 'DELETE FROM customers' } });

    expect(result.isError).toBe(true);
    expect(adapter.explainQuery).not.toHaveBeenCalled();
  });

  it('explains a valid query', async () => {
    const client = await connect(fakeAdapter());
    const result = await client.callTool({ name: 'explain_query', arguments: { sql: 'SELECT * FROM customers' } });

    expect(result.isError).toBeFalsy();
    expect(JSON.parse(text(result)).plan).toEqual([{ id: 1 }]);
  });

  it('reports a database failure as a tool error instead of crashing', async () => {
    const adapter = fakeAdapter({
      executeQuery: vi.fn(async () => {
        throw new Error('Query timed out after 1234 ms and was cancelled.');
      }),
    });
    const client = await connect(adapter);

    const result = await client.callTool({ name: 'execute_query', arguments: { sql: 'SELECT 1' } });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain('timed out');

    // The server is still usable afterwards.
    expect((await client.callTool({ name: 'list_tables', arguments: {} })).isError).toBeFalsy();
  });

  it('cuts an oversized tool result and says so', async () => {
    const big = Array.from({ length: 20_000 }, (_, i) => ({ name: `table_${i}_${'x'.repeat(30)}`, kind: 'table' as const }));
    const client = await connect(fakeAdapter({ listTables: vi.fn(async () => big) }));

    const out = text(await client.callTool({ name: 'list_tables', arguments: {} }));

    expect(out.length).toBeLessThan(MAX_TOOL_TEXT_CHARS + 200);
    expect(out).toContain('[truncated');
  });

  it('rejects invalid input without calling the database', async () => {
    const adapter = fakeAdapter();
    const client = await connect(adapter);

    const outcome = await client
      .callTool({ name: 'describe_tables', arguments: { tables: [] } })
      .then((result) => result.isError === true, () => true);

    expect(outcome).toBe(true);
    expect(adapter.describeTable).not.toHaveBeenCalled();
  });

  it('tells the client that row values are untrusted', async () => {
    const client = await connect(fakeAdapter());
    const { tools } = await client.listTools();

    expect(tools.find((tool) => tool.name === 'execute_query')?.description).toMatch(/never instructions/);
  });
});
