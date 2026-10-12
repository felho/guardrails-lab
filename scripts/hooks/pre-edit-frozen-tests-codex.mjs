#!/usr/bin/env node
/* Codex PreToolUse on apply_patch: while .phase-implement exists, test files are read-only (the Codex twin of pre-edit-frozen-tests.mjs). */
import { spawnSync } from 'node:child_process';
import { parsePatch } from './codex-patch.mjs';
import { readInput, repoPath, root } from './lib.mjs';

const TEST_FILE = /(^|\/)(test|tests|spec|__tests__)\/|\.(test|spec)\.[cm]?[jt]sx?$/i;

const input = await readInput();
const { files } = parsePatch(input.tool_input?.command);
const r = spawnSync('git', ['ls-files', '--cached', '--others', '--', '.phase-implement'], { cwd: root, encoding: 'utf8' });
if (r.error || r.status !== 0) { console.error('cannot tell whether tests are frozen (git failed); refusing the edit'); process.exit(2); }
if (r.stdout.trim() && files.some((f) => TEST_FILE.test(repoPath(f, input.cwd)))) {
  console.error('Tests are frozen while you implement. If a test is wrong, tell the user.');
  process.exit(2);
}
