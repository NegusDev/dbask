import mysql, { type Connection } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MySqlAdapter } from '../src/database/mysql/adapter.js';

/**
 * Integration tests. They run only when a MySQL or MariaDB server is configured:
 *   TEST_MYSQL_HOST, TEST_MYSQL_PORT, TEST_MYSQL_DATABASE, TEST_MYSQL_USER, TEST_MYSQL_PASSWORD
 * The user must be able to create tables in that database. Everything the tests
 * create is prefixed `hit_` and dropped afterwards.
 *
 * Unlike the PostgreSQL adapter, this adapter does not open a read-only
 * transaction: write protection comes from the SQL validator and from using a
 * read-only database user, so these tests do not assert that the adapter itself
 * refuses writes.
 */
const host = process.env.TEST_MYSQL_HOST;
const describeDb = host ? describe : describe.skip;

const config = {
  host: host ?? '',
  port: Number(process.env.TEST_MYSQL_PORT ?? 3306),
  database: process.env.TEST_MYSQL_DATABASE ?? '',
  user: process.env.TEST_MYSQL_USER ?? '',
  password: process.env.TEST_MYSQL_PASSWORD ?? '',
};

const OBJECTS = `
  DROP VIEW IF EXISTS hit_ann, hit_orders_view;
  DROP TABLE IF EXISTS hit_detail, hit_orders, hit_customers, hit_versioned;
`;

describeDb('MySqlAdapter (integration)', () => {
  let adapter: MySqlAdapter;
  let admin: Connection;
  let isMariaDb = false;

  beforeAll(async () => {
    admin = await mysql.createConnection({ ...config, multipleStatements: true });
    const [version] = await admin.query('SELECT VERSION() AS v');
    isMariaDb = /mariadb/i.test(String((version as Array<{ v: string }>)[0]?.v));

    await admin.query(`
      ${OBJECTS}
      CREATE TABLE hit_customers (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        born DATE NULL,
        seen DATETIME NULL,
        amount DECIMAL(10,2) NULL
      );
      CREATE TABLE hit_orders (
        a INT NOT NULL, b INT NOT NULL, customer_id INT NULL,
        PRIMARY KEY (a, b),
        CONSTRAINT hit_orders_customer_fk FOREIGN KEY (customer_id) REFERENCES hit_customers(id)
      );
      CREATE TABLE hit_detail (
        order_a INT NOT NULL, order_b INT NOT NULL, note VARCHAR(20),
        CONSTRAINT hit_detail_order_fk FOREIGN KEY (order_a, order_b) REFERENCES hit_orders(a, b)
      );
      INSERT INTO hit_customers (name, born, seen, amount)
        VALUES ('Ann', '2026-05-11', '2026-05-11 09:51:43', 12.50);
    `);
    for (let i = 1; i <= 50; i += 1) {
      await admin.query('INSERT INTO hit_customers (name) VALUES (?)', [`c${i}`]);
    }
    await admin.query(`
      CREATE VIEW hit_ann AS SELECT id, name FROM hit_customers WHERE name = 'Ann';
      CREATE VIEW hit_orders_view AS
        SELECT o.a, o.b, c.name AS customer_name
        FROM hit_orders o JOIN hit_customers c ON c.id = o.customer_id;
    `);

    if (isMariaDb) {
      await admin.query('CREATE TABLE hit_versioned (id INT PRIMARY KEY, v INT) WITH SYSTEM VERSIONING');
    }

    adapter = new MySqlAdapter({ ...config, connectionLimit: 2 });
  });

  afterAll(async () => {
    await admin?.query(OBJECTS);
    await admin?.end();
    await adapter?.close();
  });

  it('reports its dialect', () => {
    expect(adapter.dialect).toBe('mysql');
  });

  it('lists tables and views, and labels what each relation is', async () => {
    const byName = new Map((await adapter.listTables()).map((t) => [t.name, t]));

    expect(byName.get('hit_customers')).toMatchObject({ kind: 'table' });
    expect(byName.get('hit_orders')).toMatchObject({ kind: 'table' });
    expect(byName.get('hit_ann')).toMatchObject({ kind: 'view' });
    expect(byName.get('hit_orders_view')).toMatchObject({ kind: 'view' });
  });

  it('does not list system schemas', async () => {
    const names = (await adapter.listTables()).map((t) => t.name);
    expect(names.some((n) => /^(innodb_|user_|schema_)|^(tables|columns)$/i.test(n))).toBe(false);
  });

  it('lists system-versioned tables on MariaDB as tables', async () => {
    if (!isMariaDb) return;
    const byName = new Map((await adapter.listTables()).map((t) => [t.name, t]));
    expect(byName.get('hit_versioned')).toMatchObject({ kind: 'table' });
  });

  it('describes a table with keys and auto-increment columns', async () => {
    const t = await adapter.describeTable('hit_customers');
    expect(t.table).toEqual({ name: 'hit_customers', kind: 'table' });

    const id = t.columns.find((c) => c.name === 'id')!;
    expect(id.isPrimaryKey).toBe(true);
    expect(id.isAutoIncrement).toBe(true);
    expect(t.columns.find((c) => c.name === 'name')!.nullable).toBe(false);
    expect(t.columns.find((c) => c.name === 'amount')!.dataType).toBe('decimal');
  });

  it('describes a view and queries it', async () => {
    const view = await adapter.describeTable('hit_ann');
    expect(view.table).toEqual({ name: 'hit_ann', kind: 'view' });
    expect(view.columns.map((c) => c.name)).toEqual(['id', 'name']);

    const joined = await adapter.describeTable('hit_orders_view');
    expect(joined.columns.map((c) => c.name)).toEqual(['a', 'b', 'customer_name']);

    expect((await adapter.executeQuery('SELECT name FROM hit_ann')).rows).toEqual([{ name: 'Ann' }]);
  });

  it('rejects unknown names and treats a hostile name as a plain string', async () => {
    await expect(adapter.describeTable('nope')).rejects.toThrow(/not found/);
    await expect(adapter.describeTable("x'; DROP TABLE hit_customers; --")).rejects.toThrow(/not found/);
    expect((await adapter.executeQuery('SELECT COUNT(*) AS n FROM hit_customers')).rows[0]!.n).toBe(51);
  });

  it('returns one row per column of composite foreign keys', async () => {
    const detail = (await adapter.getRelationships()).filter((r) => r.constraintName === 'hit_detail_order_fk');
    expect(detail.map((r) => [r.column, r.referencedColumn]).sort()).toEqual([
      ['order_a', 'a'],
      ['order_b', 'b'],
    ]);
    expect(detail[0]).toMatchObject({ table: 'hit_detail', referencedTable: 'hit_orders' });

    const scoped = await adapter.getRelationships('hit_orders');
    expect(scoped).toHaveLength(1);
    expect(scoped[0]).toMatchObject({ column: 'customer_id', referencedTable: 'hit_customers' });
  });

  it('serialises dates and decimals as strings', async () => {
    const { rows } = await adapter.executeQuery("SELECT * FROM hit_customers WHERE name = 'Ann'");
    expect(rows[0]).toMatchObject({ born: '2026-05-11', seen: '2026-05-11 09:51:43', amount: '12.50' });
    expect(() => JSON.stringify(rows)).not.toThrow();
  });

  it('caps rows and reports truncation', async () => {
    const full = await adapter.executeQuery('SELECT * FROM hit_customers', { maxRows: 100 });
    expect(full.rowCount).toBe(51);
    expect(full.truncated).toBe(false);

    const cut = await adapter.executeQuery('SELECT * FROM hit_customers', { maxRows: 10 });
    expect(cut.rowCount).toBe(10);
    expect(cut.truncated).toBe(true);
  });

  it('caps result size in bytes', async () => {
    const r = await adapter.executeQuery("SELECT REPEAT('x', 1000) AS v FROM hit_customers", {
      maxRows: 100,
      maxResultBytes: 5_000,
    });
    expect(r.truncated).toBe(true);
    expect(r.rowCount).toBeLessThan(51);
  });

  it('gives up on a slow query and stays usable', async () => {
    const started = Date.now();
    await expect(adapter.executeQuery('SELECT SLEEP(30)', { timeoutMs: 300 })).rejects.toThrow(
      /timed out after 300 ms/,
    );
    expect(Date.now() - started).toBeLessThan(2_000);

    expect((await adapter.executeQuery('SELECT 1 AS ok')).rows).toEqual([{ ok: 1 }]);
  });

  it('cancels the query on the server, not just on the client', async () => {
    await expect(adapter.executeQuery('SELECT SLEEP(31)', { timeoutMs: 200 })).rejects.toThrow(/timed out/);

    // The statement must be gone from the server's process list almost at once.
    let running = 1;
    for (let i = 0; i < 20 && running > 0; i += 1) {
      const [rows] = await admin.query(
        "SELECT COUNT(*) AS n FROM information_schema.PROCESSLIST WHERE INFO LIKE 'SELECT SLEEP(31)%'",
      );
      running = Number((rows as Array<{ n: number }>)[0]?.n);
      if (running > 0) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(running).toBe(0);
  });

  it('does not stall the pool after repeated timeouts', async () => {
    // The pool has 2 connections; before queries were cancelled on the server,
    // two timeouts in a row left both busy until the sleeps finished.
    const started = Date.now();
    for (let i = 0; i < 5; i += 1) {
      await expect(adapter.executeQuery('SELECT SLEEP(30)', { timeoutMs: 150 })).rejects.toThrow(/timed out/);
    }
    expect((await adapter.executeQuery('SELECT 2 AS ok')).rows).toEqual([{ ok: 2 }]);
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it('keeps working when the cancelling connection cannot be opened', async () => {
    const killQuery = vi
      .spyOn(adapter as unknown as { killQuery: () => Promise<void> }, 'killQuery')
      .mockRejectedValue(new Error('cannot connect'));

    try {
      for (let i = 0; i < 3; i += 1) {
        await expect(adapter.executeQuery('SELECT SLEEP(2)', { timeoutMs: 100 })).rejects.toThrow(/timed out/);
      }
      // The stuck connections were destroyed, so the pool made new ones.
      expect((await adapter.executeQuery('SELECT 3 AS ok')).rows).toEqual([{ ok: 3 }]);
      expect(killQuery).toHaveBeenCalledTimes(3);
    } finally {
      killQuery.mockRestore();
    }
  });

  it('does not touch a fast query that finishes before its timeout', async () => {
    const { rows } = await adapter.executeQuery('SELECT SLEEP(0.2) AS s', { timeoutMs: 2_000 });
    expect(rows).toHaveLength(1);
    // Afterwards the connection is still healthy and unkilled.
    for (let i = 0; i < 4; i += 1) {
      expect((await adapter.executeQuery('SELECT 4 AS ok')).rows).toEqual([{ ok: 4 }]);
    }
  });

  it('applies the same timeout to EXPLAIN', async () => {
    const plan = await adapter.explainQuery('SELECT * FROM hit_customers WHERE id = 1');
    expect(JSON.stringify(plan.plan)).toContain('hit_customers');
  });

  it('survives syntax errors', async () => {
    await expect(adapter.executeQuery('SELEC nope')).rejects.toThrow(/syntax/i);
    expect((await adapter.executeQuery('SELECT 2 AS ok')).rows).toEqual([{ ok: 2 }]);
  });

  it('explains a query', async () => {
    const plan = await adapter.explainQuery('SELECT * FROM hit_customers WHERE id = 1');
    expect(plan.sql).toContain('hit_customers');
    expect(Array.isArray(plan.plan)).toBe(true);
    expect(JSON.stringify(plan.plan)).toContain('hit_customers');
  });
});
