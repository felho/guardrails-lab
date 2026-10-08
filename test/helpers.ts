import type { Request } from '../src/http.ts';

export function request({ customer, body = {} }: { customer?: number; body?: unknown } = {}): Request {
  return {
    method: 'GET',
    path: '/',
    headers: customer === undefined ? {} : { 'x-customer-id': String(customer) },
    body,
  };
}
