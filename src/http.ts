import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';

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
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

/* One helper per outcome, so every handler answers in the same shape. */
export const ok = (body: unknown): Response => ({ status: 200, body });
export const badRequest = (error: string): Response => ({ status: 400, body: { error } });
export const unauthorized = (): Response => ({ status: 401, body: { error: 'sign in first' } });
export const forbidden = (error: string): Response => ({ status: 403, body: { error } });
export const notFound = (what: string): Response => ({ status: 404, body: { error: `${what} not found` } });
export const conflict = (error: string): Response => ({ status: 409, body: { error } });

/* Reads a field of a JSON body without trusting its shape. */
export function field(body: unknown, name: string): unknown {
  if (typeof body !== 'object' || body === null) return undefined;
  return (body as Record<string, unknown>)[name];
}
