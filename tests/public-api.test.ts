import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as sdk from '../src/index.js';

/**
 * The public SDK surface and its stability tiers (docs/guide/sdk.md, "SDK
 * stability"). Adding, removing or moving an export fails this test on purpose:
 * pick a tier for it, update the lists below and the docs table, and add a
 * changelog entry if a stable export changed.
 */
const STABLE = [
  // Runtime values
  'Agent',
  'createAiProvider',
  'createDatabaseAdapter',
  'loadConfig',
  'MySqlAdapter',
  'PostgresAdapter',
  // Types
  'AgentOptions',
  'AgentResult',
  'AiProviderName',
  'AppConfig',
  'ColumnInfo',
  'DatabaseAdapter',
  'DatabaseConnectionConfig',
  'DatabaseContext',
  'MySqlAdapterConfig',
  'PostgresAdapterConfig',
  'QueryExecutionOptions',
  'QueryPlan',
  'QueryResult',
  'RelationshipInfo',
  'ResponseMode',
  'SqlDialect',
  'SqlSafetyPolicy',
  'TableInfo',
  'TableSchema',
  'ToolContext',
];

const EXPERIMENTAL = [
  'SchemaCache',
  'SdkAiProvider',
  'AgentObserver',
  'AgentToolEvent',
  'AiProvider',
  'ModelProvider',
  'ModelRequest',
  'ModelResponse',
  'PlanStats',
  'SqlToolResult',
  'StructuredQueryPlan',
];

/** Members of stable types that are experimental: [file, member name]. */
const EXPERIMENTAL_MEMBERS: Array<[string, string]> = [
  ['src/core/agent/agent.ts', 'requirePlan'],
  ['src/core/agent/agent.ts', 'observer'],
  ['src/core/agent/agent.ts', 'raw'],
  ['src/core/agent/agent.ts', 'plan'],
  ['src/core/types/index.ts', 'kind'],
  ['src/core/types/index.ts', 'schemaCache'],
];

const RUNTIME_EXPORTS = [
  'Agent',
  'createAiProvider',
  'createDatabaseAdapter',
  'loadConfig',
  'MySqlAdapter',
  'PostgresAdapter',
  'SchemaCache',
  'SdkAiProvider',
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

/** Names exported by src/index.ts, read from its export clauses. */
function declaredExports(): string[] {
  const text = readFileSync('src/index.ts', 'utf8');
  expect(text).not.toMatch(/export\s*\*/); // a star export would hide new names

  const names: string[] = [];
  for (const match of text.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}\s*from/g)) {
    for (const part of (match[1] ?? '').split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) names.push(name);
    }
  }
  return names.sort();
}

const files = sourceFiles('src');

/** The doc comment directly above `export <kind> Name`, or '' if there is none. */
function docCommentOf(name: string): string | undefined {
  const declaration = new RegExp(`export\\s+(?:declare\\s+)?(?:abstract\\s+)?(?:class|interface|type|function|const)\\s+${name}\\b`);

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const match = declaration.exec(text);
    if (!match) continue;
    const before = text.slice(0, match.index);
    return /\/\*\*(?:(?!\*\/)[\s\S])*\*\/\s*$/.exec(before)?.[0] ?? '';
  }
  return undefined;
}

describe('public SDK entry point', () => {
  it('exports exactly the runtime values listed here', () => {
    expect(Object.keys(sdk).sort()).toEqual([...RUNTIME_EXPORTS].sort());
  });

  it('puts every export in exactly one stability tier', () => {
    expect(declaredExports()).toEqual([...STABLE, ...EXPERIMENTAL].sort());
    expect(STABLE.filter((name) => EXPERIMENTAL.includes(name))).toEqual([]);
    expect(new Set([...STABLE, ...EXPERIMENTAL]).size).toBe(STABLE.length + EXPERIMENTAL.length);
  });

  it('marks experimental exports with @experimental and stable ones without', () => {
    for (const name of EXPERIMENTAL) {
      const comment = docCommentOf(name);
      expect(comment, `${name} has no declaration found in src/`).not.toBeUndefined();
      expect(comment, `${name} should carry @experimental`).toContain('@experimental');
    }

    for (const name of STABLE) {
      const comment = docCommentOf(name);
      expect(comment, `${name} has no declaration found in src/`).not.toBeUndefined();
      expect(comment, `${name} is stable but carries @experimental`).not.toContain('@experimental');
    }
  });

  it('marks experimental members of stable types', () => {
    for (const [file, member] of EXPERIMENTAL_MEMBERS) {
      const text = readFileSync(file, 'utf8');
      const at = text.search(new RegExp(`\\n\\s+${member}\\?:`));
      expect(at, `${member} not found in ${file}`).toBeGreaterThan(-1);
      const before = text.slice(0, at + 1);
      const comment = /\/\*\*(?:(?!\*\/)[\s\S])*\*\/\s*$/.exec(before)?.[0] ?? '';
      expect(comment, `${file}: ${member} should carry @experimental`).toContain('@experimental');
    }
  });

  it('builds the quickstart objects', () => {
    expect(sdk.Agent).toBeDefined();
    expect(sdk.createAiProvider).toBeTypeOf('function');
    expect(sdk.loadConfig).toBeTypeOf('function');
    expect(sdk.createDatabaseAdapter).toBeTypeOf('function');
    expect(sdk.MySqlAdapter).toBeDefined();
    expect(sdk.PostgresAdapter).toBeDefined();
  });
});
