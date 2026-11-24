#!/usr/bin/env node
// Smoke test for the built CLI (run `pnpm build` first). It starts dist/cli.js
// the way a user would and checks exit codes and the first lines of output for
// the paths that need no database and no AI provider. Used in CI on Linux,
// macOS and Windows.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'dist', 'cli.js');
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

// An empty working directory (no .env) and no configuration in the environment.
const cwd = mkdtempSync(path.join(tmpdir(), 'dbask-smoke-'));
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) =>
      !/^(DB_|AI_|SQL_|AGENT_|OPENAI|ANTHROPIC|GOOGLE|DEEPSEEK|OPENROUTER|OLLAMA|NO_COLOR|FORCE_COLOR)/i.test(key),
  ),
);

function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    env,
    encoding: 'utf8',
    timeout: 30_000,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error,
  };
}

const failures = [];
function check(name, args, expectations) {
  const result = run(args);
  const problems = [];

  if (result.error) problems.push(`could not run: ${result.error.message}`);
  if (result.status !== expectations.status) {
    problems.push(`exit code ${result.status}, expected ${expectations.status}`);
  }
  for (const [stream, pattern] of expectations.contains ?? []) {
    if (!pattern.test(result[stream])) problems.push(`${stream} does not match ${pattern}`);
  }
  if (expectations.emptyStdout && result.stdout !== '') problems.push('stdout is not empty');
  // A crash prints a stack trace; a handled error does not.
  if (/\bat .*\(node:|TypeError|ReferenceError|Cannot find module/.test(result.stdout + result.stderr)) {
    problems.push('output looks like an unhandled crash');
  }

  if (problems.length > 0) {
    failures.push(name);
    console.error(`FAIL ${name}\n  ${problems.join('\n  ')}`);
    console.error(`  stdout: ${JSON.stringify(result.stdout.slice(0, 300))}`);
    console.error(`  stderr: ${JSON.stringify(result.stderr.slice(0, 300))}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

try {
  check('--version prints the package version', ['--version'], {
    status: 0,
    contains: [['stdout', new RegExp(`^${version.replace(/\./g, '\\.')}\\s*$`)]],
  });
  check('--help shows usage', ['--help'], { status: 0, contains: [['stdout', /Usage:[\s\S]*dbask/]] });
  check('no arguments show usage', [], { status: 0, contains: [['stdout', /Usage:/]] });
  check('unknown command is an error', ['frobnicate'], { status: 1, contains: [['stderr', /Unknown command: frobnicate/]] });
  check('unknown option is an error', ['--nope'], { status: 1, contains: [['stderr', /Unknown option: --nope/]] });
  check('ask without a question is an error', ['ask'], { status: 1, contains: [['stderr', /question is required/]] });
  check('mcp rejects extra arguments', ['mcp', '--nope'], { status: 1, contains: [['stderr', /takes no arguments/]] });
  // With stdin closed the server starts, finds the client gone and exits 0. stdout
  // is the protocol channel, so it must stay empty when no message was exchanged.
  check('mcp starts without AI settings and keeps stdout clean', ['mcp'], {
    status: 0,
    emptyStdout: true,
    contains: [['stderr', /dbask mcp ready/]],
  });
  check('validate without configuration fails cleanly', ['validate'], {
    status: 1,
    contains: [['stdout', /Configuration/]],
  });
} finally {
  rmSync(cwd, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\n${failures.length} smoke check(s) failed.`);
  process.exit(1);
}
console.log('\nAll smoke checks passed.');
