#!/usr/bin/env node
/*
 * Stop hook: run the full check; while it fails, send Claude back to work, at most MAX_ROUNDS times in a row.
 * The round count per session lives in one state file under node_modules/.cache (a fixed path, so no file name
 * is built from hook input).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { block, readInput, runCheck } from './lib.mjs';

const MAX_ROUNDS = 5;
const STATE_DIR = resolve(import.meta.dirname, '..', '..', 'node_modules', '.cache', 'claude-hooks');
const STATE_FILE = resolve(STATE_DIR, 'stop-rounds.json');

function load() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function save(state) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state));
}

const input = await readInput();
const session = String(input.session_id ?? 'unknown');
const state = new Map(Object.entries(load()));
// stop_hook_active is false when Claude stops after a user turn: a new series of rounds begins.
const rounds = input.stop_hook_active ? Number(state.get(session) ?? 0) : 0;

const { ok, out } = runCheck([]);
if (ok || rounds >= MAX_ROUNDS) {
  state.delete(session);
  save(Object.fromEntries(state));
  if (!ok) {
    console.log(JSON.stringify({ systemMessage: `npm run check still fails after ${MAX_ROUNDS} rounds; over to you.\n${out}` }));
  }
  process.exit(0);
}
state.set(session, rounds + 1);
save(Object.fromEntries(state));
block(`npm run check fails (round ${rounds + 1} of ${MAX_ROUNDS}). Fix the cause, do not silence it; if a finding is wrong, say so to the user:\n${out}`);
