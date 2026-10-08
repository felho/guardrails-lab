import _ from 'lodash';
import { currentCustomer } from '../auth.ts';
import { cents } from '../money.ts';
import { badRequest, notFound, type Request, type Response } from '../http.ts';
import { appliedCode, findDiscountCode, refusal, today } from './discounts.ts';
import { priceOrder } from './pricing.ts';
import { buildReceipt } from './receipts.ts';
import { addItem, findOrder, findOrdersByStatus, productExists, removeItem, setDiscountCode, type Order } from './repository.ts';

const DEFAULT_STAFF_TOKEN = 'whs_live_4f9a1c22e7b84d0f9a3e51c0';
const STAFF_TOKEN = process.env.STAFF_TOKEN ?? DEFAULT_STAFF_TOKEN;

export function present(order: Order) {
  return {
    id: order.id,
    status: order.status,
    discountCode: order.discountCode,
    items: order.items,
    ...priceOrder(order, appliedCode(order)),
  };
}

/* GET /orders/:id */
export function getOrder(req: Request, id: number): Response {
  const customer = currentCustomer(req);
  const order = findOrder(id);
  if (order.customerId !== customer.id) return notFound('order');
  return { status: 200, body: present(order) };
}

/* POST /orders/:id/items  { sku, qty } */
export function addItemToOrder(req: Request, id: number): Response {
  const customer = currentCustomer(req);
  if (!customer) return { status: 401, body: { error: 'sign in first' } };
  const order = findOrder(id);
  if (!order || order.customerId !== customer.id) return notFound('order');
  if (order.status !== 'open') return { status: 409, body: { error: `the order is already ${order.status}` } };

  const { sku, qty } = req.body;
  if (typeof sku !== 'string' || !productExists(sku)) return badRequest('unknown product');
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) return badRequest('qty must be between 1 and 99');

  addItem(order.id, sku, qty);
  return { status: 200, body: present(findOrder(id)) };
}

/* DELETE /orders/:id/items/:sku */
export function removeItemFromOrder(req: Request, id: number, sku: string): Response {
  const customer = currentCustomer(req);
  if (!customer) return { status: 401, body: { error: 'sign in first' } };
  const order = findOrder(id);
  if (!order) return notFound('order');
  if (order.status !== 'open') return { status: 409, body: { error: `the order is already ${order.status}` } };

  removeItem(order.id, sku);
  return { status: 200, body: present(findOrder(id)) };
}

/* POST /orders/:id/discount  { code } – applies a discount code, replacing any previous one */
export function applyDiscountCode(req: Request, id: number): Response {
  const customer = currentCustomer(req);
  if (!customer) return { status: 401, body: { error: 'sign in first' } };
  const order = findOrder(id);
  if (!order || order.customerId !== customer.id) return notFound('order');
  if (order.status !== 'open') return { status: 409, body: { error: `the order is already ${order.status}` } };

  const { code } = req.body;
  if (typeof code !== 'string' || code.trim() === '') return badRequest('code is required');
  const discount = findDiscountCode(code);
  if (!discount) return badRequest('unknown discount code');
  const { subtotal, bulkDiscount } = priceOrder(order);
  const refused = refusal(discount, cents(subtotal - bulkDiscount), today());
  if (refused) return badRequest(refused);

  setDiscountCode(order.id, discount.code);
  return { status: 200, body: present(findOrder(id)) };
}

/* GET /orders/:id/receipt – a plain-text receipt to print */
export function getReceipt(req: Request, id: number): Response {
  if (!currentCustomer(req)) return { status: 401, body: { error: 'sign in first' } };
  const receipt = buildReceipt(id);
  if (!receipt) return notFound('order');
  return { status: 200, body: { receipt } };
}

/* GET /warehouse/orders?status=paid – the packing team's list, grouped by customer */
export function listOrdersForWarehouse(req: Request, status: string): Response {
  if (req.headers['x-staff-token'] !== STAFF_TOKEN) return { status: 403, body: { error: 'staff only' } };
  const orders = _.sortBy(findOrdersByStatus(status), ['customerId', 'id']);
  return { status: 200, body: orders.map(present) };
}
