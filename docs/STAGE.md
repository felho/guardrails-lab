# Stage 4-rules

Two sentences became checks: "SQL is never built from strings" and "a function in src/orders/ that loads an order
checks its owner". Each is an ast-grep rule in rules/ with its own must-flag and must-pass case in rule-tests/, and
both are wired into scripts/check.mjs by the human (the agent cannot edit it).

The scan found five problems. The agent fixed four (two SQL queries, remove-item ownership, and the helper behind
the receipt), then stopped on the fifth: fixing the receipt meant changing one line of an existing test, which
CLAUDE.md forbids without asking. The human allowed that one line. npm run check is green; 45 tests.

The referee now passes all 23 checks.

Exercises here: 4.8 the helper gap, 4.9 mutation (note: run that on 1-bare, here the ticket's tests catch it).
Score: `npm run referee`. Next: `npm run stage -- 4-hooks`.
