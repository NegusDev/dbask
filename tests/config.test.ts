import { describe, expect, it } from 'vitest';
import { loadConfig, loadDatabaseConfig } from '../src/config/config.js';

const base = { AI_PROVIDER: 'groq', AI_MODEL: 'm', GROQ_API_KEY: 'k' };

describe('database config', () => {
  it('defaults to MySQL on 3306 without TLS', () => {
    const { database } = loadConfig(base);
    expect(database).toMatchObject({ driver: 'mysql', port: 3306, ssl: 'disable' });
  });

  it('defaults to 5432 for postgres', () => {
    expect(loadConfig({ ...base, DB_DRIVER: 'postgres' }).database.port).toBe(5432);
  });

  it('treats an empty DB_PORT as unset and honours an explicit one', () => {
    expect(loadConfig({ ...base, DB_DRIVER: 'postgres', DB_PORT: '' }).database.port).toBe(5432);
    expect(loadConfig({ ...base, DB_DRIVER: 'postgres', DB_PORT: '6543' }).database.port).toBe(6543);
  });

  it('accepts TLS modes and rejects unknown ones', () => {
    expect(loadConfig({ ...base, DB_SSL: 'verify-full' }).database.ssl).toBe('verify-full');
    expect(() => loadConfig({ ...base, DB_SSL: 'yes' })).toThrow();
  });

  it('requires DEEPSEEK_API_KEY for deepseek', () => {
       expect(() => loadConfig({ AI_PROVIDER: 'deepseek', AI_MODEL: 'm' })).toThrow(/DEEPSEEK_API_KEY/);
  });
});

describe('agent config', () => {
  it('leaves the query plan off by default and allows turning it on', () => {
    expect(loadConfig(base).agent.queryPlan).toBe(false);
    expect(loadConfig({ ...base, AGENT_QUERY_PLAN: 'on' }).agent.queryPlan).toBe(true);
    expect(() => loadConfig({ ...base, AGENT_QUERY_PLAN: 'maybe' })).toThrow();
  });
});

describe('loadDatabaseConfig (no AI provider needed)', () => {
  it('works with no AI settings at all', () => {
    expect(() => loadConfig({})).toThrow();
    const settings = loadDatabaseConfig({ DB_DRIVER: 'postgres', DB_NAME: 'app', DB_USER: 'ro' });
    expect(settings.database).toMatchObject({ driver: 'postgres', port: 5432, name: 'app', user: 'ro' });
    expect(settings.safety).toEqual({
      readOnly: true,
      maxRows: 500,
      queryTimeoutMs: 10_000,
      maxResultBytes: 1_048_576,
    });
  });

  it('returns the same database, safety and schema values as loadConfig', () => {
    const env = { ...base, DB_HOST: 'db', DB_PORT: '3307', SQL_MAX_ROWS: '25', SCHEMA_CACHE_TTL_MS: '1000' };
    const full = loadConfig(env);
    expect(loadDatabaseConfig(env)).toEqual({ database: full.database, safety: full.safety, schema: full.schema });
  });

  it('still validates the database settings', () => {
    expect(() => loadDatabaseConfig({ DB_SSL: 'yes' })).toThrow();
    expect(() => loadDatabaseConfig({ SQL_MAX_ROWS: '0' })).toThrow();
  });
});
