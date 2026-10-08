import { staffToken } from '../config.ts';
import { badRequest, field, forbidden, ok, type Request, type Response } from '../http.ts';
import { loadOwnOrder, requireOpen } from './access.ts';
import { priceOrder } from './pricing.ts';
import { buildReceipt } from './receipts.ts';
import { addItem, findOrder, findOrdersByStatus, isOrderStatus, productExists, removeItem, type Order } from './repository.ts';

/* What the API shows of an order: the order itself plus its prices. */
export function present(order: Order) {
  return {
    id: order.id,
    status: order.status,
    discountCode: order.discountCode,
    items: order.items,
    ...priceOrder(order),
  };
}

/* GET /orders/:id */
export function getOrder(req: Request, id: number): Response {
  const own = loadOwnOrder(req, id);
  if (own.ok === false) return own.response;
  return ok(present(own.order));
}

/* POST /orders/:id/items  { sku, qty } */
export function addItemToOrder(req: Request, id: number): Response {
  const own = loadOwnOrder(req, id);
  if (own.ok === false) return own.response;
  const closed = requireOpen(own.order);
  if (closed) return closed;

  const sku = field(req.body, 'sku');
  const qty = field(req.body, 'qty');
  if (typeof sku !== 'string' || !productExists(sku)) return badRequest('unknown product');
  if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > 99) return badRequest('qty must be between 1 and 99');

  addItem(own.order.id, sku, qty);
  return ok(present(findOrder(id) ?? own.order));
}

/* DELETE /orders/:id/items/:sku */
export function removeItemFromOrder(req: Request, id: number, sku: string): Response {
  const own = loadOwnOrder(req, id);
  if (own.ok === false) return own.response;
  const closed = requireOpen(own.order);
  if (closed) return closed;

  removeItem(own.order.id, sku);
  return ok(present(findOrder(id) ?? own.order));
}

/* GET /orders/:id/receipt – a plain-text receipt to print */
export function getReceipt(req: Request, id: number): Response {
  const own = loadOwnOrder(req, id);
  if (own.ok === false) return own.response;
  return ok({ receipt: buildReceipt(own.order, own.customer) });
}

/* GET /warehouse/orders?status=paid – the packing team's list, grouped by customer */
export function listOrdersForWarehouse(req: Request, status: string): Response {
  const token = staffToken();
  if (!token || req.headers['x-staff-token'] !== token) return forbidden('staff only');
  if (!isOrderStatus(status)) return badRequest('status must be open, paid or shipped');

  const orders = findOrdersByStatus(status).sort((a, b) => a.customerId - b.customerId || a.id - b.id);
  return ok(orders.map(present));
}
