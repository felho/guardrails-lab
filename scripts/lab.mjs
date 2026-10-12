#!/usr/bin/env node
/*
 * Lab navigation. Everything a participant runs goes through npm scripts, never raw git:
 *
 *   npm run stages              list the stages of the day
 *   npm run stage -- 4-guarded  switch to a stage (your current work is committed first, nothing is lost)
 *   npm run referee             score the running service with the referee (downloaded on first use)
 *   npm run mutate              a colleague's one-character change at the free-shipping threshold (then: npm test)
 *   npm run restore             undo the mutation
 *   npm run lock-rules          after you wrote your own rules: the hooks protect rules/, rule-tests/ and sgconfig.yml
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
  console.log(`your changes were committed on ${current}, nothing is lost (return with: npm run stage -- ${current.replace(/^stage\//, '')})`);
}

/* A participant's own branch for a stage: the one npm run stage created, or the clone's default stage/<name>. */
function localBranch(name) {
  return [name, `stage/${name}`].find((b) => git('rev-parse', '--verify', '--quiet', `refs/heads/${b}`).status === 0) ?? null;
}

function checkout(name, ref) {
  const local = localBranch(name);
  const r = local ? git('checkout', '-q', local) : git('checkout', '-q', '-B', name, ref);
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  const ownWork = local && git('rev-list', '--count', `${ref}..${local}`).stdout.trim() !== '0';
  console.log(local ? `back on your branch ${local}${ownWork ? ' (with your saved work)' : ''}` : `on ${name} (fresh from ${ref})`);
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

/* The one-character mutation of exercise 4.9: >= becomes > at the free-shipping threshold. Run the tests yourself. */
const PRICING = 'src/orders/pricing.ts';

function mutate() {
  const before = readFileSync(PRICING, 'utf8');
  const threshold = /(\w+) >= FREE_SHIPPING_FROM/;
  const hit = before.match(threshold);
  if (!hit) { console.error(`${PRICING} has no "<goods> >= FREE_SHIPPING_FROM" comparison; nothing to mutate (already mutated? npm run restore)`); process.exit(1); }
  writeFileSync(PRICING, before.replace(threshold, `${hit[1]} > FREE_SHIPPING_FROM`));
  console.log(`mutated ${PRICING}: "${hit[0]}" is now "${hit[1]} > FREE_SHIPPING_FROM" (free shipping no longer at exactly 50.00)\n`);
  run('git', ['status', '--short']);
  console.log('\nnow: npm test        do the tests notice?\nthen: npm run restore');
}

/* The exact reverse of mutate(), so it works whatever git state the file is in (a WIP commit may contain the mutation). */
function restore() {
  const before = readFileSync(PRICING, 'utf8');
  const mutated = /(\w+) > FREE_SHIPPING_FROM/;
  const hit = before.match(mutated);
  if (!hit) { console.log(`${PRICING} is not mutated; nothing to restore.`); return; }
  writeFileSync(PRICING, before.replace(mutated, `${hit[1]} >= FREE_SHIPPING_FROM`));
  console.log(`${PRICING} restored: "${hit[0]}" is again "${hit[1]} >= FREE_SHIPPING_FROM".`);
  run('git', ['status', '--short']);
}

/*
 * After the rules exercise: the agent wrote rules/ and rule-tests/; from now on the hooks must treat them like the
 * check's own configuration, so no agent can loosen a rule to make code pass. Idempotent; only works where the
 * hooks exist (from the 4-guarded stage on).
 */
function lockRules() {
  const lib = 'scripts/hooks/lib.mjs';
  const bash = 'scripts/hooks/pre-bash.mjs';
  if (!existsSync(lib) || !existsSync(bash)) { console.error('no hooks on this stage (scripts/hooks/lib.mjs, pre-bash.mjs); switch to 4-guarded or later'); process.exit(1); }
  let changed = 0;
  let l = readFileSync(lib, 'utf8');
  if (!l.includes('/^rules(')) {
    l = l.replace("  /^\\.claude(\\/|$)/,\n", "  /^\\.claude(\\/|$)/,\n  /^rules(\\/|$)/,\n  /^rule-tests(\\/|$)/,\n  /^sgconfig\\.ya?ml$/,\n");
    changed++;
  }
  if (!l.includes("'@ast-grep/cli'")) { l = l.replace("'vitest']", "'vitest', '@ast-grep/cli']"); changed++; }
  if (!l.includes('ast-grep-ignore')) { l = l.replace("  [/secretlint-disable/, 'a secretlint-disable comment'],\n", "  [/secretlint-disable/, 'a secretlint-disable comment'],\n  [/ast-grep-ignore/, 'an ast-grep-ignore comment'],\n"); changed++; }
  writeFileSync(lib, l);
  let b = readFileSync(bash, 'utf8');
  if (!b.includes('|rules|rule-tests')) { b = b.replace('(scripts|\\.claude)', '(scripts|\\.claude|rules|rule-tests)').replace('(eslint\\.config\\.|', '(sgconfig\\.ya?ml|eslint\\.config\\.|'); changed++; }
  writeFileSync(bash, b);
  if (!changed) { console.log('the rules are already locked'); return; }
  console.log('locked: the hooks now protect rules/, rule-tests/ and sgconfig.yml, and treat @ast-grep/cli as a check tool.\n(this edited scripts/hooks/lib.mjs and scripts/hooks/pre-bash.mjs; that is expected)\nTry it: ask your agent to loosen a rule, and watch the hook refuse.');
}

const [, , command, arg] = process.argv;
if (command === 'stages') stages();
else if (command === 'stage') stage(arg);
else if (command === 'referee') await referee();
else if (command === 'mutate') mutate();
else if (command === 'restore') restore();
else if (command === 'lock-rules') lockRules();
else { console.error('usage: lab.mjs stages | stage <name> | referee | mutate | restore | lock-rules'); process.exit(1); }
