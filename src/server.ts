import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readBody, type Request, type Response } from './http.ts';
import { addItemToOrder, getOrder, getReceipt, listOrdersForWarehouse, removeItemFromOrder } from './orders/handlers.ts';

type Route = [method: string, path: RegExp, handle: (req: Request, match: RegExpMatchArray, query: URLSearchParams) => Response];

const routes: Route[] = [
  ['GET', /^\/orders\/(\d+)$/, (req, m) => getOrder(req, Number(m[1]))],
  ['POST', /^\/orders\/(\d+)\/items$/, (req, m) => addItemToOrder(req, Number(m[1]))],
  ['DELETE', /^\/orders\/(\d+)\/items\/([A-Z]+)$/, (req, m) => removeItemFromOrder(req, Number(m[1]), m[2] ?? '')],
  ['GET', /^\/orders\/(\d+)\/receipt$/, (req, m) => getReceipt(req, Number(m[1]))],
  ['GET', /^\/warehouse\/orders$/, (req, _m, q) => listOrdersForWarehouse(req, q.get('status') ?? 'paid')],
];

async function respond(incoming: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(incoming.url ?? '/', 'http://localhost');
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
}

const server = createServer((incoming, res) => {
  void respond(incoming, res);
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`order service on http://localhost:${String(port)}`);
});
