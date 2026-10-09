# Guardrails lab · order service

The hands-on repository of the course day on guardrails: one small order service (customers, orders, a bulk discount,
shipping, an in-memory database), one open ticket (`docs/TICKET-142.md`), and the guardrails we put around one
coding agent, stage by stage.

## Before the day (homework)

You need Node 24 LTS (npm comes with it), git, and your coding agent (Claude Code or Codex CLI) signed in. No admin rights, nothing global.

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
| `npm run agent` | starts Claude Code with a fresh, lab-only configuration (no personal CLAUDE.md, rules, hooks or memory) |
| `npm run agent:codex` | the same for Codex CLI |
| `npm run referee` | scores the service with the referee: 23 black-box checks over HTTP |
| `npm run doctor` | is this laptop ready? |
| `npm test`, `npm start` | the unit tests, the service on http://localhost:3000 |

Every stage prints its own short note (`docs/STAGE.md`) when you switch to it: what is new, which exercise runs here, what comes next.

The agent's configuration lives outside the repository, under `~/.cache/guardrails-lab/`, so the only guidance it sees is what the repository holds. The first `npm run agent` may ask you to log in; your subscription is used.

## The lab itself

```bash
curl -H 'X-Customer-Id: 1' localhost:3000/orders/1002
curl -H 'X-Customer-Id: 1' -H 'Content-Type: application/json' \
     -d '{"sku":"CAP","qty":1}' localhost:3000/orders/1002/items
```

The data is in memory and starts from the same seed every time the server starts. The money rules are in `docs/money.md`.

The lab is derived from Konrad's guardrails lab (aicode.page/lab); the referee is his and stays outside the repository on purpose.
