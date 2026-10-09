# Stage 1-bare

The agent implemented TICKET-142 with no guardrails at all: no CLAUDE.md, no checks, no hooks.
The ticket's ten points are correct. Read the diff against 0-start and write down what else is wrong.

Exercises here: 1.2 find what is wrong (`git diff 0-start` or the compare link), 4.9 the one-character mutation, 5.3 the reviewer (`npm run agent`, paste the review prompt).
Score it: `npm run referee`. Next: `npm run stage -- 3-guidance`.
