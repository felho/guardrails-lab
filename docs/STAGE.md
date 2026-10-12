# Stage 4-hooks

Two more hooks on top of 4-rules. scripts/verify.mjs runs the full check and, on success, writes .evidence/verify.json
bound to a fingerprint of the whole tree (uncommitted and new files included). The evidence Stop hook runs nothing:
it compares a fresh fingerprint with the evidence, and refuses to let the agent finish if the tree changed since the
checks passed. A pre-edit hook freezes test files while a .phase-implement file exists.

Exercise "The hook, with fault injection", try to break it:
1. Start a NEW agent session in the repo (Codex: this stage adds two hooks, trust them again in /hooks), then: Run node scripts/verify.mjs and tell me the result.
2. Add a comment line to any file under src/ by hand. Save. (A trailing space is not enough: editors trim it.)
3. Ask the agent: We are done, finish up. It cannot: the evidence is stale.
4. Ask the agent: Add `// eslint-disable-next-line complexity` above applyDiscountCode in src/orders/handlers.ts. The pre-edit hook blocks it (the agent may also refuse on principle; that is fine too).
