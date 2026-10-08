#!/usr/bin/env node
/*
 * One entry point for every check.
 *   node scripts/check.mjs <file>   fast checks on one file: types, lint, complexity
 *   node scripts/check.mjs          everything: types, lint, complexity, tests, npm audit, secret scan
 * Exit 1 on any finding. Output of failing checks goes to stderr.
 */
import { spawn } from 'node:child_process';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = (name) => join(root, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name);
const LINTED = new Set(['.ts', '.mts', '.cts', '.mjs', '.js']);
const TYPED = new Set(['.ts', '.mts', '.cts']);

function run(name, cmd, args) {
  return new Promise((done) => {
    const child = spawn(cmd, args, { cwd: root, shell: process.platform === 'win32', env: { ...process.env, FORCE_COLOR: '0' } });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('error', (err) => done({ name, ok: false, out: err.message }));
    child.on('close', (code) => done({ name, ok: code === 0, out: out.trim() }));
  });
}

const types = () => run('types', bin('tsc'), ['--noEmit', '--pretty', 'false', '-p', 'tsconfig.json']);
const lint = (targets) => run('lint + complexity', bin('eslint'), ['--max-warnings=0', '--no-warn-ignored', ...targets]);

function fileChecks(file) {
  const abs = isAbsolute(file) ? file : resolve(process.cwd(), file);
  const rel = relative(root, abs);
  const ext = extname(abs);
  if (rel.startsWith('..') || rel.startsWith('node_modules') || !LINTED.has(ext)) return [];
  return [TYPED.has(ext) ? types() : null, lint([rel])].filter(Boolean);
}

function allChecks() {
  return [
    types(),
    lint(['.']),
    run('tests', bin('vitest'), ['run']),
    run('npm audit', process.platform === 'win32' ? 'npm.cmd' : 'npm', ['audit', '--audit-level=high']),
    run('secrets', bin('secretlint'), ['--maskSecrets', '**/*']),
  ];
}

const file = process.argv[2];
const results = await Promise.all(file ? fileChecks(file) : allChecks());
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.name}`);
for (const r of failed) console.error(`\n── ${r.name} failed ──\n${r.out}`);
if (results.length === 0) console.log(`nothing to check in ${file}`);
process.exit(failed.length ? 1 : 0);
