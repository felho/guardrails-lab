#!/usr/bin/env node
/* Stop hook: the agent may finish only with valid evidence for the current tree. */
import { spawnSync } from 'node:child_process';
let input = '';
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  let active = false;
  try { active = JSON.parse(input).stop_hook_active === true; } catch { /* no json */ }
  const r = spawnSync('node', ['scripts/verify.mjs', '--check'], { encoding: 'utf8' });
  if (r.status === 0) process.exit(0);
  if (active) { console.error('still no valid evidence after one round; handing over to the human'); process.exit(0); }
  console.error(`You cannot finish yet. ${r.stderr.trim()}\nRun: node scripts/verify.mjs`);
  process.exit(2);
});
