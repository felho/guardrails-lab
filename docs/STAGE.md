# Stage 4-guarded

One prompt built this: scripts/check.mjs (types, lint + complexity, tests, audit, secrets), four hooks under scripts/hooks/
(check after every edit, no silencing, no --no-verify, full check before finishing), strict tsconfig. The existing code
was fixed where the checks complained. The ticket is NOT done yet.

Exercises here: "The guardrail prompt, part by part" (read the prompt and the diff), "The ticket on the guarded stage" (start a NEW agent session in the repo, then: Implement docs/TICKET-142.md.)
If the agent asks a question, answer it; that is the CLAUDE.md working. Score: `npm run referee`. Next: `npm run stage -- 4-guarded-ticket`.
