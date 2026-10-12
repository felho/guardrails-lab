# Stage 1-bare

The agent implemented TICKET-142 with no guardrails at all: no CLAUDE.md, no checks, no hooks.
The ticket's ten points are correct. Ask your agent to review the change (the prompt is on the slide) and compare its list with the referee.

Exercises here: 1.2 find what is wrong (your agent reviews, `npm run referee` scores), 4.9 the one-character mutation, 5.3 the reviewer (start your agent in the repo, paste the review prompt).
Score it: `npm run referee`. Next: `npm run stage -- 3-guidance`.
