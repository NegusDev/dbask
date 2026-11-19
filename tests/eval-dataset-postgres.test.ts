import { readFileSync } from 'node:fs';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  evaluateEquivalence,
  type BenchmarkCase,
  type ToolEvent,
} from '../evals/runners/run-benchmark.js';

/**
 * Checks that the PostgreSQL edition of the forex evaluation dataset
 * (schema.postgres.sql) loads and gives the expected results in
 * questions.json when each reference query is run against it. Runs only when
 * a PostgreSQL server is configured (same TEST_PG_* variables as
 * postgres-adapter.test.ts). Everything is created in a private schema that
 * is dropped afterwards, so no existing table in the database is touched.
 */
const host = process.env.TEST_PG_HOST;
const describeDb = host ? describe : describe.skip;
const SCHEMA = 'eval_dataset_it';

// Dates come back as the server formats them (as in PostgresAdapter), not as JS Dates.
const RAW_TEXT_TYPE_OIDS = new Set([1082, 1114, 1184]);
const types = {
  getTypeParser: ((oid: number, format?: 'text' | 'binary') =>
    RAW_TEXT_TYPE_OIDS.has(oid)
      ? (value: string) => value
      : pg.types.getTypeParser(oid, format)) as never,
};

const dataset = 'evals/datasets/forex-management';
const cases = JSON.parse(readFileSync(`${dataset}/questions.json`, 'utf8')) as BenchmarkCase[];
const schemaSql = readFileSync(`${dataset}/schema.postgres.sql`, 'utf8');

describeDb('forex evaluation dataset (PostgreSQL)', () => {
  let client: pg.Client;

  beforeAll(async () => {
    client = new pg.Client({
      host: host ?? '',
      port: Number(process.env.TEST_PG_PORT ?? 5432),
      database: process.env.TEST_PG_DATABASE ?? '',
      user: process.env.TEST_PG_USER ?? '',
      password: process.env.TEST_PG_PASSWORD ?? '',
      types,
    });
    await client.connect();
    await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE; CREATE SCHEMA ${SCHEMA};`);
    // Only the private schema is on the path, so the file's unqualified
    // DROP TABLE / CREATE TABLE statements cannot reach any other table.
    await client.query(`SET search_path TO ${SCHEMA}`);
    await client.query(schemaSql);
  });

  afterAll(async () => {
    await client?.query('RESET search_path');
    await client?.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await client?.end();
  });

  it('only creates tables inside the private schema', async () => {
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = $1`,
      [SCHEMA],
    );
    expect(rows[0].n).toBe(27);
  });

  for (const testCase of cases.filter((c) => c.reference_sql && c.expected_result)) {
    it(`${testCase.id}: reference query matches the expected result`, async () => {
      const { rows } = await client.query(testCase.reference_sql as string);
      const event: ToolEvent = {
        source: 'dbask',
        type: 'tool-end',
        name: 'execute_query',
        success: true,
        databaseExecutionAttempted: true,
        data: { rows },
      };

      const verdict = evaluateEquivalence({ ...testCase, checks: ['equivalence'] }, [event]);
      expect(verdict.details ?? [], verdict.reason).toEqual([]);
      expect(verdict.status).toBe('passed');
    });
  }
});
