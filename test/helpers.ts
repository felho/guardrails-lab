import type { Request } from '../src/http.ts';

export const TEST_STAFF_TOKEN = 'test-staff-token';
process.env.STAFF_TOKEN = TEST_STAFF_TOKEN;

export function request({ customer, body = {} }: { customer?: number; body?: unknown } = {}): Request {
  return {
    method: 'GET',
    path: '/',
    headers: customer === undefined ? {} : { 'x-customer-id': String(customer) },
    body,
  };
}

export function staffRequest(): Request {
  return { method: 'GET', path: '/', headers: { 'x-staff-token': TEST_STAFF_TOKEN }, body: {} };
}
