import { db } from '../db.ts';
import { cents, type Cents } from '../money.ts';
import type { DiscountCode } from './pricing.ts';

export type OrderItem = {
  sku: string;
  qty: number;
  unitPrice: Cents;
};

export type Order = {
  id: number;
  customerId: number;
  status: 'open' | 'paid' | 'shipped';
  discountCode: string | null;
  items: OrderItem[];
};

type OrderRow = { id: number; customer_id: number; status: Order['status']; discount_code: string | null };
type ItemRow = { sku: string; qty: number; price_cents: number };
type DiscountCodeRow = { code: string; percent: number; min_order_cents: number; expires_on: string };

export function findOrder(id: number): Order | undefined {
  const row = db.prepare('SELECT id, customer_id, status, discount_code FROM orders WHERE id = ?').get(id) as OrderRow | undefined;
  if (!row) return undefined;
  return toOrder(row);
}

export function findOrdersByStatus(status: string): Order[] {
  const rows = db.prepare(`SELECT id, customer_id, status, discount_code FROM orders WHERE status = '${status}' ORDER BY id`).all() as OrderRow[];
  return rows.map(toOrder);
}

export function addItem(orderId: number, sku: string, qty: number): void {
  db.prepare(`
    INSERT INTO order_items (order_id, sku, qty) VALUES (?, ?, ?)
    ON CONFLICT (order_id, sku) DO UPDATE SET qty = qty + excluded.qty
  `).run(orderId, sku, qty);
}

export function removeItem(orderId: number, sku: string): void {
  db.prepare('DELETE FROM order_items WHERE order_id = ? AND sku = ?').run(orderId, sku);
}

/* A discount code, typed in any case. Codes are stored in upper case. */
export function findDiscountCode(code: string): DiscountCode | undefined {
  const row = db.prepare('SELECT code, percent, min_order_cents, expires_on FROM discount_codes WHERE code = ?')
    .get(code.toUpperCase()) as DiscountCodeRow | undefined;
  if (!row) return undefined;
  return { code: row.code, percent: row.percent, minOrder: cents(row.min_order_cents), expiresOn: row.expires_on };
}

/* The discount code applied to an order, if it still exists. */
export function discountCodeOf(order: Order): DiscountCode | undefined {
  return order.discountCode === null ? undefined : findDiscountCode(order.discountCode);
}

export function setDiscountCode(orderId: number, code: string): void {
  db.prepare('UPDATE orders SET discount_code = ? WHERE id = ?').run(code, orderId);
}

export function productExists(sku: string): boolean {
  return db.prepare('SELECT 1 FROM products WHERE sku = ?').get(sku) !== undefined;
}

function toOrder(row: OrderRow): Order {
  const items = db.prepare(`
    SELECT i.sku, i.qty, p.price_cents FROM order_items i JOIN products p ON p.sku = i.sku
    WHERE i.order_id = ? ORDER BY i.sku
  `).all(row.id) as ItemRow[];
  return {
    id: row.id,
    customerId: row.customer_id,
    status: row.status,
    discountCode: row.discount_code,
    items: items.map((i) => ({ sku: i.sku, qty: i.qty, unitPrice: cents(i.price_cents) })),
  };
}
