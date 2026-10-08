// misc helpers
import { findCustomer } from './customers/repository.ts';

export function getCust(req: any) {
  var id = Number(req.headers['x-customer-id']);
  if (isNaN(id)) return null;
  return findCustomer(id);
}

// returns true if ok
export function checkStuff(order: any, cust: any) {
  if (!order) return false;
  if (!cust) return false;
  return true;
}

export function err(status: number, msg: string) {
  return { status: status, body: { error: msg } };
}

export function err2(msg: string) {
  return { status: 400, body: { message: msg } };
}

// TODO: remove, not used anymore?
export function formatMoney(c: number) {
  return (c / 100).toFixed(2) + ' EUR';
}
