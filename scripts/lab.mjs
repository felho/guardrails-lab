#!/usr/bin/env node
/*
 * Lab navigation. Everything a participant runs goes through npm scripts, never raw git:
 *
 *   npm run stages              list the stages of the day
 *   npm run stage -- 4-guarded  switch to a stage (your current work is committed first, nothing is lost)
 *   npm run referee             score the running service with the referee (downloaded on first use)
 *   npm run mutate              a colleague's one-character change at the free-shipping threshold: do the tests notice?
 *   npm run doctor              is this laptop ready?
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const STAGES = [
  ['0-start', 'the untouched lab, the ticket, the doctor'],
  ['1-bare', 'the agent did the ticket with no guardrails (read the diff: what is wrong?)'],
  ['3-guidance', 'a CLAUDE.md: what done means, scope, ask do not guess'],
  ['4-guarded', 'check script, hooks, strict types, lint, audit, secret scan (run the ticket here)'],
  ['4-guarded-ticket', 'the ticket done under the hooks (write your rules here)'],
  ['4-rules', 'ast-grep rules with their own tests, wired into the check'],
  ['4-hooks', 'evidence bound to the tree, frozen tests (try to break it)'],
];
const REFEREE_URL = 'https://aicode.page/lab/referee.mjs';

const root = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).stdout.trim();
if (!root) { console.error('not inside the lab repository'); process.exit(1); }
process.chdir(root);

const git = (...args) => spawnSync('git', args, { encoding: 'utf8' });
const run = (cmd, args, env = {}) => spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env }, shell: process.platform === 'win32' }).status ?? 1;

function stages() {
  const current = git('branch', '--show-current').stdout.trim();
  for (const [name, what] of STAGES) console.log(`${current === name || current === `stage/${name}` ? '→' : ' '} ${name.padEnd(18)} ${what}`);
  console.log('\nswitch with: npm run stage -- <name>');
}

/* Where a stage lives: origin first, then local, under stage/ or as a plain branch. */
function resolveRef(name) {
  const candidates = [`origin/stage/${name}`, `stage/${name}`, `origin/${name}`, name];
  return candidates.find((ref) => git('rev-parse', '--verify', '--quiet', ref).status === 0) ?? null;
}

/* Uncommitted work is committed on the current branch before switching, so nothing is lost. */
function commitWorkInProgress(next) {
  if (!git('status', '--porcelain').stdout.trim()) return;
  const current = git('branch', '--show-current').stdout.trim() || 'detached';
  git('add', '-A');
  git('commit', '-q', '--no-verify', '-m', `WIP on ${current} before switching to ${next}`);
  console.log(`your changes were committed on ${current}, nothing is lost`);
}

function checkout(name, ref) {
  const haveLocal = git('rev-parse', '--verify', '--quiet', name).status === 0;
  const r = haveLocal ? git('checkout', '-q', name) : git('checkout', '-q', '-B', name, ref);
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  console.log(haveLocal ? `back on your branch ${name} (your earlier work on this stage)` : `on ${name} (fresh from ${ref})`);
}

function stage(name) {
  if (!name) { stages(); process.exit(1); }
  const ref = resolveRef(name);
  if (!ref) { console.error(`no such stage: ${name}`); stages(); process.exit(1); }
  commitWorkInProgress(name);
  checkout(name, ref);
  if (run('npm', ['ci', '--no-audit', '--no-fund', '--loglevel=error']) !== 0) process.exit(1);
  if (existsSync('docs/STAGE.md')) console.log(`\n${readFileSync('docs/STAGE.md', 'utf8')}`);
}

async function referee() {
  mkdirSync('.lab', { recursive: true });
  if (!existsSync('.lab/referee.mjs')) {
    const res = await fetch(REFEREE_URL);
    if (!res.ok) { console.error(`cannot download the referee (${res.status})`); process.exit(1); }
    writeFileSync('.lab/referee.mjs', await res.text());
    console.log(`referee downloaded to .lab/referee.mjs`);
  }
  process.exit(run('node', ['.lab/referee.mjs', '--start', 'npm start', ...process.argv.slice(3)]));
}

/* The one-character mutation of exercise 4.9: >= becomes > at the free-shipping threshold, run the tests, restore. */
function mutate() {
  const file = 'src/orders/pricing.ts';
  const before = readFileSync(file, 'utf8');
  if (!before.includes('goods >= FREE_SHIPPING_FROM')) { console.error(`${file} does not contain "goods >= FREE_SHIPPING_FROM"; nothing to mutate`); process.exit(1); }
  writeFileSync(file, before.replace('goods >= FREE_SHIPPING_FROM', 'goods > FREE_SHIPPING_FROM'));
  console.log(`mutated ${file}: "goods >= FREE_SHIPPING_FROM" is now "goods > FREE_SHIPPING_FROM" (free shipping no longer at exactly 50.00)\nrunning the tests...\n`);
  const status = run('npx', ['vitest', 'run']);
  writeFileSync(file, before);
  console.log(`\n${file} restored.`);
  console.log(status === 0 ? 'Every test stayed green: the tests did not notice the change.' : 'A test failed: the tests noticed the change.');
}

const [, , command, arg] = process.argv;
if (command === 'stages') stages();
else if (command === 'stage') stage(arg);
else if (command === 'referee') await referee();
else if (command === 'mutate') mutate();
else { console.error('usage: lab.mjs stages | stage <name> | referee | mutate'); process.exit(1); }
