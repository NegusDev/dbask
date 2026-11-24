# Business context (dbask.md)

Place a `dbask.md` file in the working directory to explain business terms and rules that are not obvious from table and column names. It supplements schema discovery; it does not replace it.

```markdown
# Database Context

## Overview

This database belongs to a school management system. It stores students,
parents, teachers, classes, enrollments, and payments.

## Business Rules

- Only active enrollments represent currently enrolled students.
- Completed payments are considered successful payments.
- Cancelled payments should not be included in revenue calculations.
```

A starter template ships in the repository as [`dbask.example.md`](https://github.com/NegusDev/dbask/blob/dev/dbask.example.md).

## What to put in it

- What the system is, in a sentence or two.
- Which statuses count as "active", "paid" or "completed".
- Relationships that are not declared as foreign keys.
- Columns that look the same but mean different things.

Keep the rules accurate and current. Incorrect or ambiguous context can produce confidently wrong answers even when the generated SQL is valid.

## Where it goes

The file is added to the agent's instructions, so it is sent to your AI provider with each question. Do not put secrets in it. Over MCP it is shared only if you set `DBASK_MCP_CONTEXT=on`; see [MCP server](/guide/mcp).

## Upgrading from sql-ai.md

The file was called `sql-ai.md` before 0.2.0. dbask no longer reads that name. Rename it to `dbask.md`; `dbask validate` warns when it finds an unread `sql-ai.md`.
