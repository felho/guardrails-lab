#!/usr/bin/env node
/*
 * Doctor: is this laptop ready for the lab? One line per check, exit 1 if anything is red.
 *   node scripts/doctor.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const checks = [];
const check = (name, fn) => { try { const r = fn(); checks.push([name, true, r]); } catch (e) { checks.push([name, false, e.message]); } };
const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' }); if (r.status !== 0) throw new Error((r.stderr || r.stdout || `${cmd} failed`).trim().split('\n')[0]); return (r.stdout || '').trim(); };

check('node >= 22.18', () => { const [maj, min] = process.versions.node.split('.').map(Number); if (maj < 22 || (maj === 22 && min < 18)) throw new Error(`node ${process.versions.node}`); return process.versions.node; });
check('npm', () => run('npm', ['--version']));
check('git', () => run('git', ['--version']));
check('node_modules installed', () => { if (!existsSync('node_modules')) throw new Error('run: npm ci'); return 'ok'; });
check('typecheck', () => { run('npx', ['tsc', '--noEmit']); return 'ok'; });
check('tests', () => run('npx', ['vitest', 'run']).match(/Tests\s+(.*)/)?.[1] ?? 'ok');
check('coding agent (claude or codex)', () => { for (const c of ['claude', 'codex']) { const r = spawnSync(c, ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' }); if (r.status === 0) return `${c} ${r.stdout.trim()}`; } throw new Error('neither claude nor codex on PATH'); });

let red = 0;
for (const [name, ok, detail] of checks) { if (!ok) red++; console.log(`${ok ? '✓' : '✗'} ${name}${detail ? `  ${detail}` : ''}`); }
console.log(red ? `\n${red} check(s) red.` : '\nAll green. You are ready.');
process.exit(red ? 1 : 0);
