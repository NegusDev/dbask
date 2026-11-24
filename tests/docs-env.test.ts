import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

/** Every environment variable the code reads: the config schema's keys plus direct env.X lookups. */
function environmentVariables(): string[] {
  const names = new Set<string>();

  const config = readFileSync(join(root, 'src/config/config.ts'), 'utf8');
  const schema = config.slice(config.indexOf('const envSchema'), config.indexOf('export interface AppConfig'));
  for (const match of schema.matchAll(/^\s{2}([A-Z][A-Z0-9_]+):/gm)) names.add(match[1] as string);

  for (const file of sourceFiles(join(root, 'src'))) {
    for (const match of readFileSync(file, 'utf8').matchAll(/\benv\.([A-Z][A-Z0-9_]+)/g)) {
      names.add(match[1] as string);
    }
  }

  // TERM is read to detect a dumb terminal; it is the shell's variable, not a dbask setting.
  names.delete('TERM');
  return [...names].sort();
}

describe('configuration docs', () => {
  const page = readFileSync(join(root, 'docs/guide/configuration.md'), 'utf8');
  const variables = environmentVariables();

  it('finds the variables it is supposed to check', () => {
    // Guards against the scan silently matching nothing.
    expect(variables).toEqual(expect.arrayContaining(['AI_PROVIDER', 'DB_PASSWORD', 'SQL_MAX_ROWS', 'DBASK_MCP_CONTEXT']));
    expect(variables.length).toBeGreaterThan(20);
  });

  it.each(variables)('documents %s', (name) => {
    expect(page, `${name} is read by the code but not documented in docs/guide/configuration.md`).toContain(`\`${name}\``);
  });
});
