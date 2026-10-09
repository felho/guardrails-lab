# Guardrails lab · order service

The hands-on repository of the course day on guardrails: one small order service (customers, orders, a bulk discount,
shipping, an in-memory database), one open ticket (`docs/TICKET-142.md`), and the guardrails we put around one
coding agent, stage by stage.

## Before the day (homework)

You need Node 24 LTS (npm comes with it), git, and your coding agent (Claude Code or Codex CLI) signed in and working. No admin rights, nothing global.

```bash
git clone https://github.com/felho/guardrails-lab.git
cd guardrails-lab
npm ci
npm run doctor
```

`doctor` prints one line per check and ends with "All green. You are ready." Send a screenshot of its output to the organisers. If something is red, tell us before the day.

## On the day: every step is an npm script

| Command | What it does |
|---|---|
| `npm run stages` | lists the stages of the day and marks where you are |
| `npm run stage -- <name>` | switches to a stage (e.g. `npm run stage -- 4-guarded`); your current work is committed first, nothing is lost |
| `npm run referee` | scores the service with the referee: 23 black-box checks over HTTP |
| `npm run doctor` | is this laptop ready? |
| `npm test`, `npm start` | the unit tests, the service on http://localhost:3000 |

Every stage prints its own short note (`docs/STAGE.md`) when you switch to it: what is new, which exercise runs here, what comes next.

Use your own coding agent (Claude Code, Codex CLI) as you normally do, started inside the repository. Be aware that your personal configuration (a global CLAUDE.md, rules, hooks) also shapes what the agent does here, so your result may differ from the reference; every stage branch holds the reference implementation of the step, so you can always compare.

## The lab itself

A small order service with an HTTP API and no user interface (the `messy` and `nice` branches add a web page). `npm start` serves it on http://localhost:3000. The database is in memory and starts from the same seed every time: three customers (Anna, Bence, Csilla), five products (mug, tee, cap, hoodie, socks), seven orders, three discount codes. Signing in is a header: `X-Customer-Id: 1` means you are Anna.

| Request | What it does |
|---|---|
| `GET /orders/1002` | the order, priced: items, subtotal, bulk discount, shipping, total |
| `POST /orders/1002/items` `{"sku":"CAP","qty":1}` | adds an item to an open order |
| `DELETE /orders/1002/items/MUG` | removes an item |
| `GET /orders/1002/receipt` | a plain-text receipt with the customer's name and email |
| `GET /warehouse/orders?status=open` | the packing team's list, with an `X-Staff-Token` header |
| `POST /orders/1002/discount` `{"code":"SAVE15"}` | applies a discount code: this is the ticket, and it exists only on the stages where the ticket is done |

Pricing: ten or more of one product gives 5% off that line, five or more socks 10%; shipping is 4.90 and free from 50.00 of goods; a discount code takes its percentage off the goods after the bulk discount, and free shipping is decided after that. Every amount is a whole number of cents, rounded half up (`docs/money.md`).

```bash
npm start
curl -H 'X-Customer-Id: 1' localhost:3000/orders/1002
curl -H 'X-Customer-Id: 1' -H 'Content-Type: application/json' \
     -d '{"sku":"CAP","qty":1}' localhost:3000/orders/1002/items
```

The lab is small on purpose, 459 lines at the start, so that a participant can take it in within minutes and the planted defects (missing ownership checks, SQL built from strings, two crashes) can be found by reading.

The lab is derived from Konrad's guardrails lab (aicode.page/lab); the referee is his and stays outside the repository on purpose.

## For organisers

How the branches relate, and how to change things without breaking a stage:

- `main` is Konrad's lab exactly as downloaded, one commit, never edited. It is the reference: the referee's baseline, and the place to drop a new version of his lab to see what changed.
- `stage/0-start` is our root: the lab plus the shared tooling (`scripts/lab.mjs`, `scripts/doctor.mjs`, this README). The stages build on each other in a chain: `0-start` → `1-bare` and `3-guidance` → `4-guarded` → `4-guarded-ticket` → `4-rules` → `4-hooks`. `messy` and `nice` branch from `main`.
- **Shared tooling changes go on `stage/0-start`, then merge forward through the whole chain.** Git has no "shared file across branches"; a fix made on one stage stays there. After each merge check `git diff --name-only --diff-filter=U` before adding anything, so no conflict marker gets committed.
- **Test tooling on `stage/4-guarded` or later, not on `0-start`.** From `4-guarded` on, `npm run check` lints every `.mjs` file in the repository, our scripts included: complexity at most 10 per function, and the security plugin rejects file operations with non-literal paths. On `0-start` there is no lint, so a script that is green there can turn the later stages red, and the agent cannot fix it because the hooks protect `scripts/`.
- **A new version of Konrad's lab** goes on `main` first, then forward through the same chain. Unlike tooling, it touches the lab's own files, which the agent-built stages have already changed, so expect conflicts, and re-run `npm run check` and `npm run referee` on every stage to confirm the numbers quoted on the slides still hold. If the ticket text changes, `1-bare` and `4-guarded-ticket` must be regenerated with the agent, because they are answers to that exact text. Bring his changes in once before the day and freeze; the slides, the compare links and the stage notes all point at these branches.
- Agent runs that produce a stage are made headless with an empty configuration directory (`CLAUDE_CONFIG_DIR` pointing at an empty folder), so the only guidance is the repository's. Participants use their own agents with their own configuration; that is accepted, the stage branches are the reference. If `CLAUDE.md` makes the agent ask a question, a headless run just ends; put the answers in the prompt.
