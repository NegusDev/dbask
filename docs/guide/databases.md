# Databases

| Database | Status |
|---|---|
| MySQL / MariaDB | Available. Tables, views, and MariaDB system-versioned tables. |
| PostgreSQL | Available. Tables, partitioned tables, views, materialized views, and schemas. |
| SQLite | Not in 0.2.0. |
| Others | Implement the `DatabaseAdapter` interface from the [SDK](/guide/sdk). |

Set `DB_DRIVER` to `mysql` (MariaDB uses the same driver) or `postgres`. Connection settings are in [Configuration](/guide/configuration#database).

## Use a read-only account

Create a dedicated user with only the privileges dbask needs: `SELECT` on the tables it may see. Do not give it access to unrelated databases, sensitive tables or columns.

```sql
-- MySQL / MariaDB
CREATE USER 'dbask_ro'@'%' IDENTIFIED BY 'a-strong-password';
GRANT SELECT ON your_database.* TO 'dbask_ro'@'%';
```

```sql
-- PostgreSQL
CREATE ROLE dbask_ro LOGIN PASSWORD 'a-strong-password';
GRANT CONNECT ON DATABASE your_database TO dbask_ro;
GRANT USAGE ON SCHEMA public TO dbask_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO dbask_ro;
```

Adjust the host part and schema names to your setup. A read-only account is one layer; see the [Safety model](/guide/safety) for the others.

## Differences between the adapters

| | MySQL / MariaDB | PostgreSQL |
|---|---|---|
| Read-only enforcement | `READ ONLY` session and transaction, always rolled back | `READ ONLY` transaction, always rolled back |
| Timeout | Query is cancelled on the server with `KILL QUERY` | `statement_timeout` |
| Large results | Fetched fully, then limited to `SQL_MAX_ROWS` | Streamed through a cursor, so oversized results are never fully loaded |
| Multiple statements | Refused by the SQL validator | Refused by the validator and by the server (extended protocol) |
| Views | Listed | Listed, including materialized views |

Results that hit the row or size limit are flagged `truncated`, and the agent is told not to present them as complete.

## Foreign keys

The agent plans joins from **declared** foreign keys. If your database relies on undeclared relationships (common in older systems), say so in [dbask.md](/guide/context), because dbask cannot discover them.
