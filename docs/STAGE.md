# Stage 4-hooks

Two more hooks on top of 4-rules. scripts/verify.mjs runs the full check and, on success, writes .evidence/verify.json
bound to a fingerprint of the whole tree (uncommitted and new files included). The evidence Stop hook runs nothing:
it compares a fresh fingerprint with the evidence, and refuses to let the agent finish if the tree changed since the
checks passed. A pre-edit hook freezes test files while a .phase-implement file exists.

Exercise 4.11, try to break it:
1. `npm run agent`, then: Run node scripts/verify.mjs and tell me the result.
2. Edit any file under src/ by hand. Save.
3. Ask the agent: We are done, finish up. It cannot: the evidence is stale.
4. Ask the agent to add an eslint-disable comment somewhere. The pre-edit hook blocks it.
