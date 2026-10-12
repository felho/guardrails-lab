#!/usr/bin/env node
/*
 * Codex PreToolUse hook for apply_patch: the same refusals as pre-edit.mjs, read out of the patch text.
 * Fails closed: a patch the parser cannot read is refused rather than let through.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePatch } from './codex-patch.mjs';
import { block, CHECK_TOOLS, isProtected, readInput, repoPath, SUPPRESSIONS } from './lib.mjs';

const PACKAGE_JSON = resolve(import.meta.dirname, '..', '..', 'package.json');
const KEY_LINE = /^\s*"([^"]+)"\s*:/;

const input = await readInput();
const tool = input.tool_input ?? {};
// Codex sends apply_patch text in tool_input.command; a file_path/content shape (Edit/Write style) is accepted too.
const patch = tool.command !== undefined
  ? parsePatch(tool.command)
  : { files: tool.file_path ? [tool.file_path] : [], added: tool.new_string ?? tool.content ?? '', removed: '', unreadable: !tool.file_path };
const rels = patch.files.map((f) => repoPath(f, input.cwd));

if (patch.unreadable) block('Blocked: this edit names no file the hook can read, so it cannot be checked. Use a plain apply_patch with "*** Update File:" headers.');

const protectedFile = rels.find(isProtected);
if (protectedFile) {
  block(`Blocked: ${protectedFile} is part of the checks' configuration or tooling. Fix the code the check complains about; if the check itself is wrong, stop and tell the user.`);
}

for (const [re, what] of SUPPRESSIONS) {
  if (re.test(patch.added)) block(`Blocked: this change adds ${what} to ${rels.join(', ')}. Fix the cause of the finding instead; if you think the finding is wrong, stop and tell the user.`);
}

if (rels.some((r) => r.toLowerCase() === 'package.json')) checkPackageJson();

/* Keys of the JSON lines a patch adds; a patch cannot be re-parsed as JSON, so this looks at the keys. */
function keysOf(text) {
  return text.split('\n').map((line) => KEY_LINE.exec(line)?.[1]).filter(Boolean);
}

/* Only additions are allowed in package.json (a new devDependency); a removed line can only weaken the checks. */
function checkPackageJson() {
  if (patch.removed.trim()) block('Blocked: this change removes or rewrites lines of package.json. The checks\' scripts and tools must stay; adding a devDependency is fine.');
  const scripts = new Set(Object.keys(JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')).scripts ?? {}));
  const keys = keysOf(patch.added);
  if (keys.includes('scripts') || keys.some((k) => scripts.has(k))) {
    block('Blocked: the "scripts" section of package.json runs the checks; do not change it.');
  }
  const tool = keys.find((k) => CHECK_TOOLS.includes(k));
  if (tool) block(`Blocked: ${tool} is one of the check tools; do not change its entry.`);
}
