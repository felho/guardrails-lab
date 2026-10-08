import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import { text } from 'node:stream/consumers';

export type Request = {
  method: string;
  path: string;
  headers: IncomingHttpHeaders;
  body: unknown;
};

export type Response = {
  status: number;
  body?: unknown;
};

export async function readBody(req: IncomingMessage): Promise<unknown> {
  const raw = await text(req);
  return raw ? (JSON.parse(raw) as unknown) : {};
}

export const notFound = (what: string): Response => ({ status: 404, body: { error: `${what} not found` } });
export const badRequest = (error: string): Response => ({ status: 400, body: { error } });
