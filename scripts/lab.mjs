#!/usr/bin/env node
/*
 * Lab navigation. Everything a participant runs goes through npm scripts, never raw git:
 *
 *   npm run stages              list the stages of the day
 *   npm run stage -- 4-guarded  switch to a stage (your current work is committed first, nothing is lost)
 *   npm run referee             score the running service with the referee (downloaded on first use)
 *   npm run agent               start Claude Code with a fresh, lab-only configuration
 *   npm run agent:codex         same for Codex CLI
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

function stage(name) {
  if (!name) { stages(); process.exit(1); }
  const ref = git('rev-parse', '--verify', '--quiet', `origin/stage/${name}`).status === 0 ? `origin/stage/${name}`
    : git('rev-parse', '--verify', '--quiet', `stage/${name}`).status === 0 ? `stage/${name}`
    : git('rev-parse', '--verify', '--quiet', `origin/${name}`).status === 0 ? `origin/${name}`
    : git('rev-parse', '--verify', '--quiet', name).status === 0 ? name : null;
  if (!ref) { console.error(`no such stage: ${name}`); stages(); process.exit(1); }

  if (git('status', '--porcelain').stdout.trim()) {
    const current = git('branch', '--show-current').stdout.trim() || 'detached';
    git('add', '-A');
    git('commit', '-q', '--no-verify', '-m', `WIP on ${current} before switching to ${name}`);
    console.log(`your changes were committed on ${current}, nothing is lost`);
  }
  if (git('rev-parse', '--verify', '--quiet', name).status === 0 && git('branch', '--show-current').stdout.trim() !== name) {
    const r = git('checkout', '-q', name);
    if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
    console.log(`back on your branch ${name} (your earlier work on this stage)`);
  } else {
    const r = git('checkout', '-q', '-B', name, ref);
    if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
    console.log(`on ${name} (fresh from ${ref})`);
  }
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

function agent(which) {
  if (which === 'codex') {
    mkdirSync('.lab/codex-home', { recursive: true });
    console.log('Codex with a lab-only home (.lab/codex-home). First time: it will ask you to log in.');
    process.exit(run('codex', process.argv.slice(4), { CODEX_HOME: `${root}/.lab/codex-home` }));
  }
  mkdirSync('.lab/claude-config', { recursive: true });
  if (!existsSync('.lab/claude-config/settings.json')) writeFileSync('.lab/claude-config/settings.json', '{}\n');
  console.log('Claude Code with a lab-only configuration (.lab/claude-config): no personal CLAUDE.md, rules, hooks or memory. First time it may ask you to log in.');
  process.exit(run('claude', process.argv.slice(4), { CLAUDE_CONFIG_DIR: `${root}/.lab/claude-config` }));
}

const [, , command, arg] = process.argv;
if (command === 'stages') stages();
else if (command === 'stage') stage(arg);
else if (command === 'referee') await referee();
else if (command === 'agent') agent(arg);
else { console.error('usage: lab.mjs stages | stage <name> | referee | agent claude|codex'); process.exit(1); }
