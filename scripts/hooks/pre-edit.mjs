#!/usr/bin/env node
/*
 * PreToolUse hook for Edit and Write: refuse changes that switch a check off instead of fixing its cause.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { block, CHECK_TOOLS, isProtected, readInput, repoPath, SUPPRESSIONS } from './lib.mjs';

const PACKAGE_JSON = resolve(import.meta.dirname, '..', '..', 'package.json');

const input = await readInput();
const tool = input.tool_input ?? {};
const rel = repoPath(tool.file_path ?? '', input.cwd);
const edits = tool.edits ?? (tool.content === undefined ? [tool] : [{ old_string: '', new_string: tool.content }]);

if (isProtected(rel)) {
  block(`Blocked: ${rel} is part of the checks' configuration or tooling. Fix the code the check complains about; if the check itself is wrong, stop and tell the user.`);
}

for (const { new_string: text = '' } of edits) {
  for (const [re, what] of SUPPRESSIONS) {
    if (re.test(text)) block(`Blocked: this change adds ${what} to ${rel}. Fix the cause of the finding instead; if you think the finding is wrong, stop and tell the user.`);
  }
}

if (rel === 'package.json') checkPackageJson();

function checkPackageJson() {
  const before = readFileSync(PACKAGE_JSON, 'utf8');
  let after = before;
  if (tool.content === undefined) {
    for (const e of edits) after = e.replace_all ? after.split(e.old_string).join(e.new_string) : after.replace(e.old_string, () => e.new_string);
  } else {
    after = tool.content;
  }
  let a, b;
  try {
    [a, b] = [JSON.parse(before), JSON.parse(after)];
  } catch {
    block('Blocked: package.json would not be valid JSON after this change.');
  }
  if (JSON.stringify(a.scripts) !== JSON.stringify(b.scripts)) block('Blocked: the "scripts" section of package.json runs the checks; do not change it.');
  const removed = CHECK_TOOLS.filter((t) => Object.hasOwn(a.devDependencies ?? {}, t) && !Object.hasOwn(b.devDependencies ?? {}, t));
  if (removed.length) block(`Blocked: removing ${removed.join(', ')} would turn a check off.`);
}
