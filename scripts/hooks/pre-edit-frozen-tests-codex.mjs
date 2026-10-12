#!/usr/bin/env node
/*
 * Codex PreToolUse on apply_patch: while .phase-implement exists, test files are read-only (the Codex twin of
 * pre-edit-frozen-tests.mjs). Fails closed: an unreadable patch or any error refuses the edit. An input in the
 * Claude Code shape (file_path) is handed to pre-edit-frozen-tests.mjs itself.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { parsePatch } from './codex-patch.mjs';
import { readInput, repoPath, root } from './lib.mjs';

const TEST_FILE = /(^|\/)(test|tests|spec|__tests__)\/|\.(test|spec)\.[cm]?[jt]sx?$/i;
const ORIGINAL = resolve(import.meta.dirname, 'pre-edit-frozen-tests.mjs');

function refuse(message) {
  console.error(message);
  process.exit(2);
}

try {
  const input = await readInput();
  const tool = input.tool_input ?? {};
  if (tool.command === undefined) {
    const r = spawnSync(process.execPath, [ORIGINAL], { input: JSON.stringify(input), encoding: 'utf8' });
    process.stderr.write(r.stderr ?? '');
    process.exit(r.status ?? 2);
  }
  const patch = parsePatch(Array.isArray(tool.command) ? tool.command.join('\n') : String(tool.command));
  if (patch.unreadable) refuse('Blocked: this edit names no file the hook can read, so it cannot be checked.');
  const r = spawnSync('git', ['ls-files', '--cached', '--others', '--', '.phase-implement'], { cwd: root, encoding: 'utf8' });
  if (r.error || r.status !== 0) refuse('cannot tell whether tests are frozen (git failed); refusing the edit');
  if (r.stdout.trim() && patch.files.some((f) => TEST_FILE.test(repoPath(f, input.cwd)))) {
    refuse('Tests are frozen while you implement. If a test is wrong, tell the user.');
  }
} catch (e) {
  refuse(`cannot check this edit (${e.message}); refusing it`);
}
