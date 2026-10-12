#!/usr/bin/env node
/*
 * Codex PostToolUse hook for apply_patch: run the fast checks on every file the patch touched and feed the findings
 * back. Codex reads a JSON decision on stdout for this event.
 */
import { spawnSync } from 'node:child_process';
import { parsePatch } from './codex-patch.mjs';
import { readInput, runCheck } from './lib.mjs';

const input = await readInput();
const { files } = parsePatch(input.tool_input?.command);
const exists = (f) => spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', f], { cwd: input.cwd, encoding: 'utf8' }).stdout.trim() !== '';
const failures = files.filter(exists).map((f) => ({ file: f, ...runCheck([f]) })).filter((r) => !r.ok);

if (failures.length) {
  const reason = failures.map((r) => `scripts/check.mjs ${r.file} failed. Fix these before moving on:\n${r.out}`).join('\n\n');
  console.log(JSON.stringify({ decision: 'block', reason }));
}
