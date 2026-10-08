# Order service

Read `docs/money.md` before touching prices. Every amount is whole cents, rounded half up with `percentOf()`.

## Done means

- `npm run check` is green (types, lint, tests). Do not call the work done before it is.
- Every point of the ticket has a test that would fail without the change.
- Nothing outside the ticket's scope changed. If you see an unrelated problem, list it at the end; do not fix it silently.

## Scope

- Do not edit files under `test/` while implementing, except to add tests for the ticket. If an existing test is wrong, say so and stop.
- Do not edit `scripts/`, `.claude/` or the check configuration.

## When unsure

Ask, do not guess. A ticket point that allows two readings is a question for the user, not a coin toss.
