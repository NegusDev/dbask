import { z } from 'zod';

const emptyInput = z.object({}).strict();

/** Input schemas for the database tools, shared by the agent and the MCP server. */
export const toolInputSchemas = {
  list_tables: emptyInput,
  describe_tables: z.object({
    tables: z.array(z.string().min(1)).min(1).max(10),
  }),
  describe_table: z.object({
    table: z
      .string()
      .min(1)
      .describe("The exact database table name to inspect."),
  }),
  get_relationships: z.object({
    table: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Optional table name. Omit to inspect all foreign-key relationships.",
      ),
  }),
  execute_query: z.object({
    sql: z.string().min(1).describe("A read-only SELECT or WITH SQL query."),
  }),
  explain_query: z.object({
    sql: z
      .string()
      .min(1)
      .describe("A read-only SELECT or WITH SQL query to explain."),
  }),
};
