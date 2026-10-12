#!/usr/bin/env node
/*
 * Codex PreToolUse hook for apply_patch: the same refusals as pre-edit.mjs, read out of the patch text.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePatch } from './codex-patch.mjs';
import { block, CHECK_TOOLS, isProtected, readInput, repoPath, SUPPRESSIONS } from './lib.mjs';

const PACKAGE_JSON = resolve(import.meta.dirname, '..', '..', 'package.json');
const KEY_LINE = /^\s*"([^"]+)"\s*:/;

const input = await readInput();
const { files, added, removed } = parsePatch(input.tool_input?.command);
const rels = files.map((f) => repoPath(f, input.cwd));

const protectedFile = rels.find(isProtected);
if (protectedFile) {
  block(`Blocked: ${protectedFile} is part of the checks' configuration or tooling. Fix the code the check complains about; if the check itself is wrong, stop and tell the user.`);
}

for (const [re, what] of SUPPRESSIONS) {
  if (re.test(added)) block(`Blocked: this change adds ${what} to ${rels.join(', ')}. Fix the cause of the finding instead; if you think the finding is wrong, stop and tell the user.`);
}

if (rels.includes('package.json')) checkPackageJson();

/* Keys of the JSON lines a patch adds or removes; a patch cannot be re-parsed as JSON, so this looks at the keys. */
function keysOf(text) {
  return text.split('\n').map((line) => KEY_LINE.exec(line)?.[1]).filter(Boolean);
}

function checkPackageJson() {
  const scripts = new Set(Object.keys(JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')).scripts ?? {}));
  if (keysOf(`${added}\n${removed}`).some((k) => scripts.has(k))) {
    block('Blocked: the "scripts" section of package.json runs the checks; do not change it.');
  }
  const tool = keysOf(removed).find((k) => CHECK_TOOLS.includes(k));
  if (tool) block(`Blocked: removing ${tool} would turn a check off.`);
}
