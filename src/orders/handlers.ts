import _ from 'lodash';
import { currentCustomer } from '../auth.ts';
import type { Customer } from '../customers/repository.ts';
import { badRequest, notFound, type Request, type Response } from '../http.ts';
import { goodsTotal, priceOrder, todayUtc, whyCodeDoesNotApply } from './pricing.ts';
import { buildReceipt } from './receipts.ts';
import {
  addItem,
  discountCodeOf,
  findDiscountCode,
  findOrder,
  findOrdersByStatus,
  productExists,
  removeItem,
  setDiscountCode,
  type Order,
} from './repository.ts';

const DEFAULT_STAFF_TOKEN = 'whs_live_4f9a1c22e7b84d0f9a3e51c0';
const STAFF_TOKEN = process.env.STAFF_TOKEN ?? DEFAULT_STAFF_TOKEN;

export function present(order: Order) {
  return {
    id: order.id,
    status: order.status,
    discountCode: order.discountCode,
    items: order.items,
    ...priceOrder(order, discountCodeOf(order)),
  };
}

/* GET /orders/:id */
export function getOrder(req: Request, id: number): Response {
  const customer = currentCustomer(req);
  if (!customer) return { status: 401, body: { error: 'sign in first' } };
  const order = findOrder(id);
  if (!order || order.customerId !== customer.id) return notFound('order');
  return { status: 200, body: present(order) };
}

/* POST /orders/:id/items  { sku, qty } */
export function addItemToOrder(req: Request, id: number): Response {
  const customer = currentCustomer(req);
  if (!customer) return { status: 401, body: { error: 'sign in first' } };
  const order = findOrder(id);
  if (!order || order.customerId !== customer.id) return notFound('order');
  if (order.status !== 'open') return { status: 409, body: { error: `the order is already ${order.status}` } };

  const item = parseItem(req.body);
  if (typeof item === 'string') return badRequest(item);

  addItem(order.id, item.sku, item.qty);
  return presentCurrent(id, customer);
}

/* The { sku, qty } of a request body, or what is wrong with it. */
function parseItem(body: unknown): { sku: string; qty: number } | string {
  const { sku, qty } = (typeof body === 'object' && body !== null ? body : {}) as { sku?: unknown; qty?: unknown };
  if (typeof sku !== 'string' || !productExists(sku)) return 'unknown product';
  if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > 99) return 'qty must be between 1 and 99';
  return { sku, qty };
}

/* POST /orders/:id/discount  { code } – applies a code, replacing the previous one */
export function applyDiscountCode(req: Request, id: number): Response {
  const customer = currentCustomer(req);
  if (!customer) return { status: 401, body: { error: 'sign in first' } };
  const order = findOrder(id);
  if (!order || order.customerId !== customer.id) return notFound('order');
  if (order.status !== 'open') return { status: 409, body: { error: `the order is already ${order.status}` } };

  const { code } = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as { code?: unknown };
  if (typeof code !== 'string') return badRequest('code must be a string');
  const discount = findDiscountCode(code);
  if (!discount) return badRequest('unknown discount code');
  const refusal = whyCodeDoesNotApply(discount, goodsTotal(order), todayUtc());
  if (refusal) return badRequest(refusal);

  setDiscountCode(order.id, discount.code);
  return presentCurrent(id, customer);
}

/* The order as it is now, after a change. */
function presentCurrent(id: number, customer: Customer): Response {
  const order = findOrder(id);
  if (!order || order.customerId !== customer.id) return notFound('order');
  return { status: 200, body: present(order) };
}

/* DELETE /orders/:id/items/:sku */
export function removeItemFromOrder(req: Request, id: number, sku: string): Response {
  const customer = currentCustomer(req);
  if (!customer) return { status: 401, body: { error: 'sign in first' } };
  const order = findOrder(id);
  if (!order || order.customerId !== customer.id) return notFound('order');
  if (order.status !== 'open') return { status: 409, body: { error: `the order is already ${order.status}` } };

  removeItem(order.id, sku);
  return presentCurrent(id, customer);
}

/* GET /orders/:id/receipt – a plain-text receipt to print */
export function getReceipt(req: Request, id: number): Response {
  const customer = currentCustomer(req);
  if (!customer) return { status: 401, body: { error: 'sign in first' } };
  const receipt = buildReceipt(id, customer);
  if (!receipt) return notFound('order');
  return { status: 200, body: { receipt } };
}

/* GET /warehouse/orders?status=paid – the packing team's list, grouped by customer */
export function listOrdersForWarehouse(req: Request, status: string): Response {
  if (req.headers['x-staff-token'] !== STAFF_TOKEN) return { status: 403, body: { error: 'staff only' } };
  const orders = _.sortBy(findOrdersByStatus(status), ['customerId', 'id']);
  return { status: 200, body: orders.map(present) };
}
