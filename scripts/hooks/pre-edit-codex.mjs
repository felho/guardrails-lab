#!/usr/bin/env node
/*
 * Codex PreToolUse hook for apply_patch: the same refusals as pre-edit.mjs, read out of the patch text.
 * Fails closed: a patch the parser cannot read is refused rather than let through. An input in the Claude Code
 * shape (file_path, edits or content) is handed to pre-edit.mjs itself.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePatch } from './codex-patch.mjs';
import { block, CHECK_TOOLS, isProtected, readInput, repoPath, SUPPRESSIONS } from './lib.mjs';

const PACKAGE_JSON = resolve(import.meta.dirname, '..', '..', 'package.json');
const PRE_EDIT = resolve(import.meta.dirname, 'pre-edit.mjs');
const KEY_LINE = /^\s*"([^"]+)"\s*:/;

const input = await readInput();
const tool = input.tool_input ?? {};

if (tool.command === undefined) {
  const r = spawnSync(process.execPath, [PRE_EDIT], { input: JSON.stringify(input), encoding: 'utf8' });
  process.stderr.write(r.stderr ?? '');
  process.exit(r.status ?? 2);
}

const patch = parsePatch(tool.command);
const rels = patch.ops.map((o) => ({ ...o, rel: repoPath(o.file, input.cwd) }));

if (patch.unreadable) block('Blocked: this edit names no file the hook can read, so it cannot be checked. Use a plain apply_patch with "*** Update File:" headers.');

const protectedFile = rels.find((o) => isProtected(o.rel));
if (protectedFile) {
  block(`Blocked: ${protectedFile.rel} is part of the checks' configuration or tooling. Fix the code the check complains about; if the check itself is wrong, stop and tell the user.`);
}

for (const [re, what] of SUPPRESSIONS) {
  if (re.test(patch.added)) block(`Blocked: this change adds ${what} to ${rels.map((o) => o.rel).join(', ')}. Fix the cause of the finding instead; if you think the finding is wrong, stop and tell the user.`);
}

const pkg = rels.filter((o) => o.rel.toLowerCase() === 'package.json');
if (pkg.length) checkPackageJson(pkg);

/* Keys of the JSON lines a patch adds; a patch cannot be re-parsed as JSON, so this looks at the keys. */
function keysOf(text) {
  return text.split('\n').map((line) => KEY_LINE.exec(line)?.[1]).filter(Boolean);
}

/* package.json may only gain lines inside an Update (a new devDependency); anything else can only weaken the checks. */
function checkPackageJson(ops) {
  if (ops.some((o) => o.op !== 'update')) block('Blocked: package.json may not be added, deleted or moved; the checks live there.');
  if (patch.removed.trim()) block('Blocked: this change removes or rewrites lines of package.json. The checks\' scripts and tools must stay; adding a devDependency is fine.');
  const scripts = new Set(Object.keys(JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')).scripts ?? {}));
  const keys = keysOf(patch.added);
  if (keys.includes('scripts') || keys.some((k) => scripts.has(k))) {
    block('Blocked: the "scripts" section of package.json runs the checks; do not change it.');
  }
  const checkTool = keys.find((k) => CHECK_TOOLS.includes(k));
  if (checkTool) block(`Blocked: ${checkTool} is one of the check tools; do not change its entry.`);
}
