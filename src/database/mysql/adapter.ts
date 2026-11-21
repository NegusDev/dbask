import mysql, {
  type ConnectionOptions,
  type Pool,
  type PoolOptions,
  type RowDataPacket,
} from 'mysql2/promise';
import type {
  ColumnInfo,
  DatabaseAdapter,
  DatabaseSslMode,
  QueryExecutionOptions,
  QueryPlan,
  QueryResult,
  RelationshipInfo,
  TableInfo,
  TableSchema,
} from '../../core/types/index.js';
import { limitRows } from '../result-limits.js';

export interface MySqlAdapterConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionLimit?: number;
  /**
   * TLS mode. `require` encrypts without verifying the server certificate;
   * `verify-full` also verifies it. Defaults to `disable`.
   */
  ssl?: DatabaseSslMode;
}

/** Maps information_schema TABLE_TYPE to the kind shown to the model. */
function relationKind(tableType: unknown): 'table' | 'view' {
  return tableType === 'VIEW' ? 'view' : 'table';
}

/** How long a cancelled query may take to report back before its connection is dropped. */
const KILL_GRACE_MS = 3_000;

export class MySqlAdapter implements DatabaseAdapter {
  readonly dialect = 'mysql' as const;
  private readonly pool: Pool;
  /** Used to open the short-lived connection that cancels a timed-out query. */
  private readonly connectionOptions: ConnectionOptions;

  constructor(config: MySqlAdapterConfig) {
    const connectionOptions: ConnectionOptions = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      dateStrings: true,
    };

    if (config.ssl === 'require') {
      connectionOptions.ssl = { rejectUnauthorized: false };
    } else if (config.ssl === 'verify-full') {
      connectionOptions.ssl = { rejectUnauthorized: true };
    }

    const poolOptions: PoolOptions = {
      ...connectionOptions,
      connectionLimit: config.connectionLimit ?? 5,
      waitForConnections: true,
      enableKeepAlive: true,
    };

    this.connectionOptions = connectionOptions;
    this.pool = mysql.createPool(poolOptions);
  }

  async listTables(): Promise<TableInfo[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `
      SELECT TABLE_NAME AS table_name, TABLE_TYPE AS table_type
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE IN ('BASE TABLE', 'SYSTEM VERSIONED', 'VIEW')
      ORDER BY TABLE_NAME ASC
      `,
    );

    return rows.map((row) => ({
      name: String(row.table_name),
      kind: relationKind(row.table_type),
    }));
  }

  async describeTable(table: string): Promise<TableSchema> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      `
      SELECT
        c.COLUMN_NAME AS column_name,
        c.DATA_TYPE AS data_type,
        c.IS_NULLABLE AS is_nullable,
        c.COLUMN_DEFAULT AS column_default,
        c.COLUMN_KEY AS column_key,
        c.EXTRA AS extra,
        t.TABLE_TYPE AS table_type
      FROM information_schema.COLUMNS c
      JOIN information_schema.TABLES t
        ON t.TABLE_SCHEMA = c.TABLE_SCHEMA
       AND t.TABLE_NAME = c.TABLE_NAME
      WHERE c.TABLE_SCHEMA = DATABASE()
        AND c.TABLE_NAME = ?
      ORDER BY c.ORDINAL_POSITION ASC
      `,
      [table],
    );

    if (rows.length === 0) {
      throw new Error(`Table "${table}" was not found in the current database.`);
    }

    const columns: ColumnInfo[] = rows.map((row) => ({
      name: String(row.column_name),
      dataType: String(row.data_type),
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      isPrimaryKey: row.column_key === 'PRI',
      isAutoIncrement: String(row.extra ?? '').toLowerCase().includes('auto_increment'),
    }));

    return {
      table: { name: table, kind: relationKind(rows[0]?.table_type) },
      columns,
    };
  }

  async getRelationships(table?: string): Promise<RelationshipInfo[]> {
    const conditions = [
      'TABLE_SCHEMA = DATABASE()',
      'REFERENCED_TABLE_SCHEMA = DATABASE()',
    ];
    const params: string[] = [];

    if (table) {
      conditions.push('TABLE_NAME = ?');
      params.push(table);
    }

    const [rows] = await this.pool.execute<RowDataPacket[]>(
      `
      SELECT
        TABLE_NAME AS table_name,
        COLUMN_NAME AS column_name,
        REFERENCED_TABLE_NAME AS referenced_table,
        REFERENCED_COLUMN_NAME AS referenced_column,
        CONSTRAINT_NAME AS constraint_name
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE ${conditions.join(' AND ')}
        AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME ASC, COLUMN_NAME ASC
      `,
      params,
    );

    return rows.map((row) => ({
      table: String(row.table_name),
      column: String(row.column_name),
      referencedTable: String(row.referenced_table),
      referencedColumn: String(row.referenced_column),
      constraintName: String(row.constraint_name),
    }));
  }

  async executeQuery(sql: string, options: QueryExecutionOptions = {}): Promise<QueryResult> {
    const maxRows = options.maxRows ?? 500;
    const timeoutMs = options.timeoutMs ?? 10_000;
    const maxResultBytes = options.maxResultBytes ?? 1_048_576;
    const startedAt = performance.now();

    const rawRows = await this.queryWithTimeout(sql, timeoutMs);

    const fetched = Array.isArray(rawRows)
      ? (rawRows as RowDataPacket[]).map((row) => ({ ...row }))
      : [];

    const { rows, truncated } = limitRows(fetched, maxRows, maxResultBytes);

    return {
      rows,
      rowCount: rows.length,
      executionTimeMs: Math.round(performance.now() - startedAt),
      truncated,
    };
  }

  async explainQuery(sql: string): Promise<QueryPlan> {
    const rows = await this.queryWithTimeout(`EXPLAIN ${sql}`, 10_000);

    return {
      sql,
      plan: rows,
    };
  }

  /**
   * Runs one statement and cancels it on the server when `timeoutMs` passes.
   *
   * The mysql2 `timeout` option only stops waiting on the client: the server
   * keeps running the query and the pooled connection stays busy until it
   * finishes, so a few slow queries could stall the whole adapter. Here the
   * statement runs on a connection we hold, and when the timer fires a second
   * connection sends `KILL QUERY` for it (a user may always kill their own
   * statements). If that fails, or the cancelled query does not report back
   * within a few seconds, the held connection is destroyed so the pool can
   * replace it and the caller still gets the timeout error; the server may
   * then finish the query on its own.
   */
  private async queryWithTimeout(sql: string, timeoutMs: number): Promise<unknown> {
    const connection = await this.pool.getConnection();
    const threadId = connection.threadId;
    const timeoutError = (cause?: unknown): Error =>
      new Error(`Query timed out after ${timeoutMs} ms and was cancelled.`, { cause });

    let timedOut = false;
    let destroyed = false;
    let kill: Promise<void> | undefined;
    let giveUp: ((error: Error) => void) | undefined;
    let backstop: NodeJS.Timeout | undefined;

    const abandon = (): void => {
      if (destroyed) return;
      destroyed = true;
      connection.destroy();
      giveUp?.(timeoutError());
    };

    const abandoned = new Promise<never>((_, reject) => {
      giveUp = reject;
    });
    abandoned.catch(() => undefined);

    const timer = setTimeout(() => {
      timedOut = true;
      kill = this.killQuery(threadId).catch(abandon);
      backstop = setTimeout(abandon, KILL_GRACE_MS);
    }, timeoutMs);

    const query = connection.query(sql);
    // If we stop waiting for it, its eventual failure must not go unhandled.
    query.catch(() => undefined);

    try {
      const [rows] = await Promise.race([query, abandoned]);
      // MySQL 8 answers an interrupted SLEEP() with a normal result rather than
      // an error, so a result that arrives after the timeout fired is not valid.
      if (timedOut) throw timeoutError();
      return rows;
    } catch (error) {
      if (timedOut) throw error instanceof Error && error.message.startsWith('Query timed out') ? error : timeoutError(error);
      throw error;
    } finally {
      clearTimeout(timer);
      clearTimeout(backstop);
      // Let a kill that is still in flight finish before the connection goes
      // back to the pool, or it could cancel the next query that reuses it.
      await kill;
      if (!destroyed) connection.release();
    }
  }

  /** Cancels the statement running on `threadId` from a separate connection. */
  private async killQuery(threadId: number): Promise<void> {
    const killer = await mysql.createConnection({ ...this.connectionOptions, connectTimeout: 3_000 });

    try {
      await killer.query(`KILL QUERY ${Number(threadId)}`);
    } finally {
      await killer.end().catch(() => killer.destroy());
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
