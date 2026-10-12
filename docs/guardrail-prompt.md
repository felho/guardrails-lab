# The guardrail prompt

The prompt that built this stage, verbatim. The slide shows a shortened version; this is what the agent ran on top of
3-guidance to produce scripts/check.mjs, the four hooks and the strict tsconfig. Homework: run it on a repository of yours.

```text
Set up guardrails in this repo so that every change you make is checked automatically and you see the errors immediately.

Constraints of this lab: the laptops only have Node 24 and npm, no admin rights, no bash, no Python. Every tool must be an npm devDependency, pinned in package-lock.json; every script must be a Node script (.mjs), never a shell script. Do not add native addons.

Checks, at the strictest reasonable setting:
- type checking with full null safety (tsconfig strict);
- ESLint with typescript-eslint's strict, type-aware rule set, and eslint-plugin-security;
- complexity at most 10 per function;
- npm audit at level high;
- a secret scan of the working tree with secretlint.

All of it behind one script: scripts/check.mjs. With a file name as argument it runs the fast checks on that file (types, lint, complexity) and must finish in a few seconds. Without arguments it runs everything, tests included. Exit non-zero on any finding. Add "check": "node scripts/check.mjs" to package.json scripts.

Claude Code hooks in .claude/settings.json, each a Node script under scripts/hooks/:
- PostToolUse on Edit and Write: run scripts/check.mjs on the edited file; on failure exit 2 and print the errors to stderr;
- PreToolUse on Edit and Write: reject with exit 2 any change that disables a check instead of fixing its cause: eslint-disable comments, @ts-ignore, @ts-expect-error, casts to any, and edits to the checks' configuration, to scripts/ and to .claude/;
- PreToolUse on Bash: reject --no-verify and commands that modify the same protected files;
- Stop: run the full check; if it fails, exit 2 with the failures on stderr so you keep working, at most five rounds in a row (track the round count in a temp file keyed by session id, honour stop_hook_active), then let the human take over.

Test each hook once with a hand-written JSON input before you rely on it.

Then run the full check and fix everything it finds in the existing code. Silence nothing; if you think a finding is wrong, say so instead. At the end, list briefly what the checks found and what you changed.
```
