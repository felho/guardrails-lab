#!/usr/bin/env node
/*
 * PreToolUse hook for Bash: refuse --no-verify and commands that modify the checks' configuration or tooling.
 * A heuristic, not a sandbox: it looks for a protected path together with something that writes.
 */
import { block, CHECK_TOOLS, readInput } from './lib.mjs';

const PROTECTED_IN_COMMAND = /(^|[\s'"=:(/])(scripts|\.claude|rules|rule-tests|\.evidence)(\/|\s|$|['"])|(\.phase-implement|sgconfig\.ya?ml|eslint\.config\.|tsconfig[\w.-]*\.json|\.secretlint|\.npmrc|vite(st)?\.config\.|package\.json)/i;
const WRITES = [
  /(^|[^\d&>])>/,
  /\b(rm|rmdir|mv|cp|tee|touch|truncate|chmod|chown|ln|dd|rsync|unlink|patch|install)\b/,
  /\bsed\b[^|;&]*\s-[a-zA-Z]*i/,
  /\bperl\b[^|;&]*\s-[a-zA-Z]*i/,
  /\bgit\s+(checkout|restore|reset|rm|mv|apply|stash|clean|am|cherry-pick|revert|merge|rebase|pull)\b/,
  /\b(writeFile|appendFile|rmSync|unlink|rename|copyFile|cpSync|createWriteStream|truncate|mkdir|symlink)/,
  /\bnpm\s+(pkg|set-script)\b/,
];

const { tool_input: { command = '' } = {} } = await readInput();
const cmd = command.replace(/\d*>\s*\/dev\/null|\d*>&\d/g, '');

if (/--no-verify\b/.test(cmd) || /\bgit\b[^;&|]*\bcommit\b[^;&|]*\s-[a-zA-Z]*n\b/.test(cmd)) {
  block('Blocked: --no-verify skips the checks. Make them pass instead.');
}
if (/\bnpm\s+(pkg\s+(set|delete)\s+scripts|set-script)\b/.test(cmd)) {
  block('Blocked: the "scripts" section of package.json runs the checks; do not change it.');
}
const uninstall = /\bnpm\s+(uninstall|remove|rm|un|r)\s+(.*)/.exec(cmd);
if (uninstall && CHECK_TOOLS.some((t) => uninstall[2].split(/\s+/).includes(t))) {
  block('Blocked: uninstalling a check tool turns a check off.');
}
if (PROTECTED_IN_COMMAND.test(cmd) && WRITES.some((re) => re.test(cmd))) {
  block("Blocked: this command looks like it modifies the checks' configuration, scripts/ or .claude/. Fix the code instead; if a check is wrong, stop and tell the user.");
}
