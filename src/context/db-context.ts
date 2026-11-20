import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import type { DatabaseContext } from '../core/types/index.js';

export const DEFAULT_DATABASE_CONTEXT_FILE = 'dbask.md';

/** The file name before 0.2.0. It is no longer read; `validate` warns when it is found. */
export const LEGACY_DATABASE_CONTEXT_FILE = 'sql-ai.md';

/**
 * Returns the path of a leftover pre-0.2.0 context file in `cwd`, or undefined.
 * This only checks that the file exists; it never loads or uses its content.
 */
export async function findLegacyContextFile(cwd: string = process.cwd()): Promise<string | undefined> {
  const path = resolve(cwd, LEGACY_DATABASE_CONTEXT_FILE);

  try {
    await access(path, constants.F_OK);
    return path;
  } catch {
    return undefined;
  }
}

export interface DatabaseContextLoaderOptions {
  cwd?: string;
  fileName?: string;
}

/**
 * Loads optional, user-authored business/domain context for the connected database.
 * Missing context is normal and never prevents the harness from running.
 */
export async function loadDatabaseContext(
  options: DatabaseContextLoaderOptions = {},
): Promise<DatabaseContext> {
  const cwd = options.cwd ?? process.cwd();
  const fileName = options.fileName ?? DEFAULT_DATABASE_CONTEXT_FILE;
  const path = resolve(cwd, fileName);

  try {
    await access(path, constants.R_OK);
    const content = (await readFile(path, 'utf8')).trim();

    if (!content) return {};

    return { content, source: path };
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error
      ? (error as { code?: string }).code
      : undefined;

    if (code === 'ENOENT') return {};

    throw error;
  }
}
