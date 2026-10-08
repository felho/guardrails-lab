import { DatabaseSync } from 'node:sqlite';

/* One in-memory database per process: every start begins from the same seed data. */
export const db = new DatabaseSync(':memory:');

db.exec(`
  CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
  );
  CREATE TABLE products (
    sku TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_cents INTEGER NOT NULL
  );
  CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    status TEXT NOT NULL DEFAULT 'open',      -- open | paid | shipped
    discount_code TEXT
  );
  CREATE TABLE order_items (
    order_id INTEGER NOT NULL REFERENCES orders(id),
    sku TEXT NOT NULL REFERENCES products(sku),
    qty INTEGER NOT NULL,
    PRIMARY KEY (order_id, sku)
  );
  -- Filled by the marketing team's tool. Codes are stored in upper case.
  CREATE TABLE discount_codes (
    code TEXT PRIMARY KEY,
    percent INTEGER NOT NULL,
    min_order_cents INTEGER NOT NULL,
    expires_on TEXT NOT NULL                  -- YYYY-MM-DD, the last day the code is valid
  );
`);

export function seed(): void {
  db.exec(`
    DELETE FROM order_items; DELETE FROM orders; DELETE FROM customers;
    DELETE FROM products; DELETE FROM discount_codes;

    INSERT INTO customers (id, name, email) VALUES
      (1, 'Anna Kovács', 'anna@example.com'),
      (2, 'Bence Nagy', 'bence@example.com'),
      (3, 'Csilla Tóth', 'csilla@example.com');

    INSERT INTO products (sku, name, price_cents) VALUES
      ('MUG', 'Enamel mug', 1250),
      ('TEE', 'Organic T-shirt', 2490),
      ('CAP', 'Cap', 1500),
      ('HOODIE', 'Hoodie', 4990),
      ('SOCKS', 'Wool socks', 990);

    INSERT INTO orders (id, customer_id, status) VALUES
      (1001, 1, 'open'), (1002, 1, 'open'), (1003, 2, 'open'), (1004, 3, 'paid'),
      (1005, 1, 'open'), (1006, 1, 'open'), (1007, 1, 'open');

    INSERT INTO order_items (order_id, sku, qty) VALUES
      (1001, 'HOODIE', 1),
      (1002, 'MUG', 4),
      (1003, 'TEE', 2), (1003, 'MUG', 1),
      (1004, 'TEE', 1),
      (1005, 'SOCKS', 10),
      (1006, 'MUG', 6),
      (1007, 'HOODIE', 2);

    INSERT INTO discount_codes (code, percent, min_order_cents, expires_on) VALUES
      ('SAVE15', 15, 5000, '2099-12-31'),
      ('WELCOME10', 10, 0, '2099-12-31'),
      ('SUMMER25', 25, 2000, '2026-08-31');
  `);
}

seed();
