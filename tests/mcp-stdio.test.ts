import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

/**
 * Starts the real `dbask mcp` process and speaks raw JSON-RPC to it. The point is
 * the protocol channel: stdout must carry protocol messages and nothing else,
 * and the server must start without any AI provider settings.
 */
describe('dbask mcp over stdio', () => {
  it('writes only JSON-RPC to stdout, needs no AI settings, and exits when stdin closes', async () => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/cli.ts', 'mcp'], {
      cwd: root,
      env: {
        PATH: process.env.PATH ?? '',
        SystemRoot: process.env.SystemRoot ?? '',
        DOTENV_CONFIG_PATH: resolve(root, 'does-not-exist.env'),
        DB_DRIVER: 'mysql',
        DB_HOST: '127.0.0.1',
        DB_PORT: '1', // nothing listens here, so database calls fail fast
        DB_NAME: 'nothing',
        DB_USER: 'nobody',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => { stderr += chunk; });

    const send = (message: unknown): void => { child.stdin.write(`${JSON.stringify(message)}\n`); };
    const messages = (): Array<Record<string, any>> =>
      stdout.split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line) as Record<string, any>);
    const waitFor = async (id: number): Promise<Record<string, any>> => {
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        const found = messages().find((message) => message.id === id);
        if (found) return found;
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error(`No response with id ${id}.\nstdout: ${stdout}\nstderr: ${stderr}`);
    };

    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'raw', version: '1' } } });
    const init = await waitFor(1);
    expect(init.result.serverInfo.name).toBe('dbask');
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });

    send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const list = await waitFor(2);
    expect(list.result.tools.map((tool: { name: string }) => tool.name)).toContain('execute_query');

    send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'execute_query', arguments: { sql: 'DELETE FROM customers' } } });
    expect((await waitFor(3)).result.isError).toBe(true);

    // A call that reaches the (unreachable) database must fail cleanly, not break the channel.
    send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'list_tables', arguments: {} } });
    expect((await waitFor(4)).result.isError).toBe(true);

    child.stdin.end();
    const [code] = (await once(child, 'exit')) as [number | null];

    // Every line on stdout was a JSON-RPC message (messages() would have thrown otherwise).
    for (const message of messages()) expect(message.jsonrpc).toBe('2.0');
    expect(code).toBe(0);
    expect(stderr).toContain('dbask mcp ready');
  }, 60_000);
});
