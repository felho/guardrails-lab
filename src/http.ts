import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';

export type Request = {
  method: string;
  path: string;
  headers: IncomingHttpHeaders;
  body: any;
};

export type Response = {
  status: number;
  body?: unknown;
};

export async function readBody(req: IncomingMessage): Promise<any> {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

export const notFound = (what: string): Response => ({ status: 404, body: { error: `${what} not found` } });
export const badRequest = (error: string): Response => ({ status: 400, body: { error } });
