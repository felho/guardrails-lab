# Order service · TypeScript

A small order service for the guardrails lab: customers, orders, a bulk discount and shipping.

```bash
npm install
npm test          # unit tests
npm start         # http://localhost:3000
```

Try it:

```bash
curl -H 'X-Customer-Id: 1' localhost:3000/orders/1002
curl -H 'X-Customer-Id: 1' -H 'Content-Type: application/json' \
     -d '{"sku":"CAP","qty":1}' localhost:3000/orders/1002/items
```

The data is in memory and starts from the same seed every time the server starts.

The open ticket is `docs/TICKET-142.md`.
