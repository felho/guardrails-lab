/*
 * Shared helpers for the Claude Code hooks in .claude/settings.json.
 */
import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function readInput() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  return JSON.parse(raw);
}

/* Exit 2: Claude Code blocks the tool call (Pre) or feeds stderr back to Claude (Post, Stop). */
export function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

export function runCheck(args) {
  const r = spawnSync(process.execPath, [resolve(root, 'scripts', 'check.mjs'), ...args], { cwd: root, encoding: 'utf8' });
  return { ok: r.status === 0, out: `${r.stdout}${r.stderr}`.trim() };
}

/* The checks' own configuration and tooling: changing these weakens the checks instead of fixing the code. */
const PROTECTED = [
  /^scripts(\/|$)/,
  /^\.claude(\/|$)/,
  /^\.evidence(\/|$)/,
  /^\.phase-implement$/,
  /^rules(\/|$)/,
  /^rule-tests(\/|$)/,
  /^sgconfig\.ya?ml$/,
  /^eslint\.config\.[cm]?[jt]s$/,
  /^tsconfig[\w.-]*\.json$/,
  /^\.secretlint/,
  /^\.npmrc$/,
  /^vite(st)?\.config\.[cm]?[jt]s$/,
];

export function repoPath(file, cwd = process.cwd()) {
  const abs = isAbsolute(file) ? file : resolve(cwd, file);
  return relative(root, abs).split('\\').join('/');
}

export const isProtected = (rel) => PROTECTED.some((re) => re.test(rel.toLowerCase()));

/* Fragments that switch a check off in the code itself. */
export const SUPPRESSIONS = [
  [/eslint-disable|eslint-enable|\/[*/]\s*eslint\s+[\w@/-]+\s*:/, 'an eslint-disable / inline eslint config comment'],
  [/@ts-ignore/, '@ts-ignore'],
  [/@ts-expect-error/, '@ts-expect-error'],
  [/@ts-nocheck/, '@ts-nocheck'],
  [/secretlint-disable/, 'a secretlint-disable comment'],
  [/ast-grep-ignore/, 'an ast-grep-ignore comment'],
  [/\bas\s+any\b|<any>/, 'a cast to any'],
];

/* The devDependencies that run the checks: removing one turns a check off. */
export const CHECK_TOOLS = ['eslint', '@eslint/js', 'typescript-eslint', 'eslint-plugin-security', 'globals', 'secretlint', '@secretlint/secretlint-rule-preset-recommend', 'typescript', 'vitest', '@ast-grep/cli'];
