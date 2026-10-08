#!/usr/bin/env node
/*
 * PostToolUse hook for Edit and Write: run the fast checks on the edited file and report findings to Claude.
 */
import { block, readInput, runCheck } from './lib.mjs';

const input = await readInput();
const file = input.tool_input?.file_path;
if (file) {
  const { ok, out } = runCheck([file]);
  if (!ok) block(`scripts/check.mjs ${file} failed. Fix these before moving on:\n${out}`);
}
