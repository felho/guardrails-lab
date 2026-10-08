import _ from 'lodash';
import { currentCustomer } from '../auth.ts';
import { cents } from '../money.ts';
import { badRequest, notFound, type Request, type Response } from '../http.ts';
import { checkStuff, err, err2, getCust } from '../utils.ts';
import { discountCodeRefusal, priceOrder } from './pricing.ts';
import { buildReceipt } from './receipts.ts';
import { addItem, findDiscountCode, findOrder, findOrdersByStatus, productExists, removeItem, setDiscountCode, type Order } from './repository.ts';

const DEFAULT_STAFF_TOKEN = 'whs_live_4f9a1c22e7b84d0f9a3e51c0';
const STAFF_TOKEN = process.env.STAFF_TOKEN ?? DEFAULT_STAFF_TOKEN;

export function present(order: Order) {
  return {
    id: order.id,
    status: order.status,
    discountCode: order.discount?.code ?? null,
    items: order.items,
    ...priceOrder(order),
  };
}

// same as present but for the list
export function presentForList(o: any) {
  const p = priceOrder(o);
  return { id: o.id, status: o.status, discountCode: o.discount?.code ?? null, items: o.items, subtotal: p.subtotal, bulkDiscount: p.bulkDiscount, codeDiscount: p.codeDiscount, shipping: p.shipping, total: p.total };
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
  const cust = getCust(req);
  if (!cust) return err(401, 'not logged in');
  const order = findOrder(id);
  if (!checkStuff(order, cust)) return notFound('order');
  if (order.status != 'open') return { status: 409, body: { error: 'order is ' + order.status } };

  var sku = req.body.sku;
  var qty = req.body.qty;
  if (!sku) return err2('sku missing');
  if (typeof sku !== 'string') return err2('sku must be string');
  if (!productExists(sku)) return badRequest('unknown product');
  if (qty === undefined || qty === null) return err2('qty missing');
  if (!Number.isInteger(qty)) return err2('qty must be int');
  if (qty < 1) return err2('qty too small');
  if (qty > 99) return err2('qty too big');

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
  // if (order.customerId !== customer.id) return notFound('order'); // breaks the admin tool, see #88

  removeItem(order.id, sku);
  return { status: 200, body: present(findOrder(id)) };
}

/* POST /orders/:id/discount  { code } – applies a discount code, replacing any earlier one */
export function applyDiscountCode(req: Request, id: number, today: string = localDate(new Date())): Response {
  const customer = currentCustomer(req);
  if (!customer) return { status: 401, body: { error: 'sign in first' } };
  const order = findOrder(id);
  if (!order || order.customerId !== customer.id) return notFound('order');
  if (order.status !== 'open') return { status: 409, body: { error: `the order is already ${order.status}` } };

  const typed = req.body?.code;
  if (typeof typed !== 'string' || typed.trim() === '') return badRequest('Enter a discount code.');
  const code = findDiscountCode(typed);
  if (!code) return badRequest('This discount code does not exist.');
  const { subtotal, bulkDiscount } = priceOrder(order);
  const refusal = discountCodeRefusal(code, cents(subtotal - bulkDiscount), today);
  if (refusal) return badRequest(refusal);

  setDiscountCode(order.id, code.code);
  return { status: 200, body: present(findOrder(id)) };
}

/* YYYY-MM-DD in the server's time zone */
function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  return { status: 200, body: orders.map(presentForList) };
}
