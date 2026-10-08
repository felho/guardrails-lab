import { createServer } from 'node:http';
import { PORT } from './config.ts';
import { readBody, type Request, type Response } from './http.ts';
import { addItemToOrder, applyDiscountCode, getOrder, getReceipt, listOrdersForWarehouse, removeItemFromOrder } from './orders/handlers.ts';
import { staticFile } from './static.ts';

type Route = [method: string, path: RegExp, handle: (req: Request, match: RegExpMatchArray, query: URLSearchParams) => Response];

/* One line per endpoint; the handlers live in src/orders/handlers.ts. */
const routes: Route[] = [
  ['GET', /^\/orders\/(\d+)$/, (req, m) => getOrder(req, Number(m[1]))],
  ['POST', /^\/orders\/(\d+)\/items$/, (req, m) => addItemToOrder(req, Number(m[1]))],
  ['DELETE', /^\/orders\/(\d+)\/items\/([A-Z]+)$/, (req, m) => removeItemFromOrder(req, Number(m[1]), m[2])],
  ['POST', /^\/orders\/(\d+)\/discount$/, (req, m) => applyDiscountCode(req, Number(m[1]))],
  ['GET', /^\/orders\/(\d+)\/receipt$/, (req, m) => getReceipt(req, Number(m[1]))],
  ['GET', /^\/warehouse\/orders$/, (req, _m, q) => listOrdersForWarehouse(req, q.get('status') ?? 'paid')],
];

const server = createServer(async (incoming, res) => {
  const url = new URL(incoming.url ?? '/', 'http://localhost');

  if (incoming.method === 'GET') {
    const file = await staticFile(url.pathname);
    if (file) {
      res.writeHead(200, { 'Content-Type': file.type });
      res.end(file.content);
      return;
    }
  }

  let out: Response = { status: 404, body: { error: 'no such route' } };
  try {
    for (const [method, path, handle] of routes) {
      const m = url.pathname.match(path);
      if (m && incoming.method === method) {
        const req: Request = { method, path: url.pathname, headers: incoming.headers, body: await readBody(incoming) };
        out = handle(req, m, url.searchParams);
        break;
      }
    }
  } catch (err) {
    console.error(err);
    out = { status: 500, body: { error: 'internal error' } };
  }
  res.writeHead(out.status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(out.body ?? {}));
});

server.listen(PORT, () => console.log(`order service on http://localhost:${PORT}`));
