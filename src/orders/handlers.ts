import { staffToken } from '../config.ts';
import { findDiscountCode } from '../discounts/repository.ts';
import { badRequest, field, forbidden, ok, type Request, type Response } from '../http.ts';
import { loadOwnOrder, requireOpen } from './access.ts';
import { codeRefusal, goodsTotal, priceOrder, today } from './pricing.ts';
import { buildReceipt } from './receipts.ts';
import { addItem, findOrder, findOrdersByStatus, isOrderStatus, productExists, removeItem, setDiscountCode, type Order } from './repository.ts';

/* What the API shows of an order: the order itself plus its prices. */
export function present(order: Order) {
  const day = today();
  const totals = priceOrder(order, day);
  return {
    id: order.id,
    status: order.status,
    discountCode: order.discount?.code ?? null,
    // why the applied code gives no discount right now, e.g. after items were removed
    discountCodeProblem: order.discount ? codeRefusal(order.discount, goodsTotal(totals), day) ?? null : null,
    items: order.items,
    ...totals,
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

/* POST /orders/:id/discount  { code } – applies a discount code, replacing any earlier one */
export function applyDiscountCode(req: Request, id: number): Response {
  const own = loadOwnOrder(req, id);
  if (own.ok === false) return own.response;
  const closed = requireOpen(own.order);
  if (closed) return closed;

  const input = field(req.body, 'code');
  if (typeof input !== 'string' || input.trim() === '') return badRequest('enter a discount code');
  const code = findDiscountCode(input);
  if (!code) return badRequest(`there is no discount code ${input.trim()}`);
  const day = today();
  const refusal = codeRefusal(code, goodsTotal(priceOrder({ ...own.order, discount: null }, day)), day);
  if (refusal) return badRequest(refusal);

  setDiscountCode(own.order.id, code.code);
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
