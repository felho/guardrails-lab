# Order service · TypeScript

A small order service: customers, orders, a bulk discount and shipping, with a web page to look at an order.

```bash
npm install
npm test          # unit tests
npm start         # http://localhost:3000
```

Open http://localhost:3000 for the order page. The API:

```bash
curl -H 'X-Customer-Id: 1' localhost:3000/orders/1002
curl -H 'X-Customer-Id: 1' -H 'Content-Type: application/json' \
     -d '{"sku":"CAP","qty":1}' localhost:3000/orders/1002/items
curl -H 'X-Customer-Id: 1' -H 'Content-Type: application/json' \
     -d '{"code":"save15"}' localhost:3000/orders/1007/discount
```

The data is in memory and starts from the same seed every time the server starts. The warehouse endpoints need `STAFF_TOKEN` in the environment.

## Layout

- `src/server.ts` routes, `src/static.ts` serves `public/`
- `src/orders/handlers.ts` one function per endpoint; every order handler loads the order through `src/orders/access.ts`
- `src/orders/repository.ts`, `src/customers/repository.ts`, `src/discounts/repository.ts` all SQL, always parameterised
- `src/orders/pricing.ts` the price rules, `src/money.ts` cents and rounding (see `docs/money.md`)
- `public/` the web page: `app.js` holds the state, `components/` one file per component, `api.js` the calls
- `test/` one file per module

The open ticket is `docs/TICKET-142.md`.
