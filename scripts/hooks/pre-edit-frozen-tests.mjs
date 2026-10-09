#!/usr/bin/env node
/* PreToolUse on Edit/Write: while .phase-implement exists, test files are read-only. */
import { spawnSync } from 'node:child_process';
import { repoPath, root } from './lib.mjs';

const TEST_FILE = /(^|\/)(test|tests|spec|__tests__)\/|\.(test|spec)\.[cm]?[jt]sx?$/i;

let input = '';
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  let file = '';
  try { file = JSON.parse(input).tool_input?.file_path ?? ''; } catch { /* no json */ }
  const rel = repoPath(file);
  const r = spawnSync('git', ['ls-files', '--cached', '--others', '--', '.phase-implement'], { cwd: root, encoding: 'utf8' });
  if (r.error || r.status !== 0) { console.error('cannot tell whether tests are frozen (git failed); refusing the edit'); process.exit(2); }
  if (r.stdout.trim() && TEST_FILE.test(rel)) {
    console.error('Tests are frozen while you implement. If a test is wrong, tell the user.');
    process.exit(2);
  }
  process.exit(0);
});
