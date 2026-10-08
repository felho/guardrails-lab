import { db } from '../db.ts';
import { cents, type Cents } from '../money.ts';

export type OrderStatus = 'open' | 'paid' | 'shipped';

export type OrderItem = {
  sku: string;
  qty: number;
  unitPrice: Cents;
};

export type Order = {
  id: number;
  customerId: number;
  status: OrderStatus;
  discountCode: string | null;
  items: OrderItem[];
};

type OrderRow = { id: number; customer_id: number; status: OrderStatus; discount_code: string | null };
type ItemRow = { sku: string; qty: number; price_cents: number };

/* Every query takes its values as parameters; SQL is never built from strings. */

export function findOrder(id: number): Order | undefined {
  const row = db.prepare('SELECT id, customer_id, status, discount_code FROM orders WHERE id = ?').get(id) as OrderRow | undefined;
  return row ? toOrder(row) : undefined;
}

export function findOrdersByStatus(status: OrderStatus): Order[] {
  const rows = db.prepare('SELECT id, customer_id, status, discount_code FROM orders WHERE status = ? ORDER BY id').all(status) as OrderRow[];
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

export function productExists(sku: string): boolean {
  return db.prepare('SELECT 1 FROM products WHERE sku = ?').get(sku) !== undefined;
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return value === 'open' || value === 'paid' || value === 'shipped';
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
