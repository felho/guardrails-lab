import { db } from '../db.ts';

export type Customer = {
  id: number;
  name: string;
  email: string;
};

export function findCustomer(id: number): Customer | undefined {
  return db.prepare('SELECT id, name, email FROM customers WHERE id = ?').get(id) as Customer | undefined;
}

export function findCustomerByEmail(email: string): Customer | undefined {
  return db.prepare(`SELECT id, name, email FROM customers WHERE email = '${email}'`).get() as Customer | undefined;
}
