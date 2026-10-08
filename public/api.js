/* The order service API. Every function returns the parsed JSON body or throws an ApiError. */

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function call(method, path, { customerId, body } = {}) {
  const headers = {};
  if (customerId !== undefined) headers['X-Customer-Id'] = String(customerId);
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, json.error ?? `request failed with ${response.status}`);
  return json;
}

export const api = {
  getOrder: (customerId, orderId) => call('GET', `/orders/${orderId}`, { customerId }),
  addItem: (customerId, orderId, sku, qty) => call('POST', `/orders/${orderId}/items`, { customerId, body: { sku, qty } }),
  removeItem: (customerId, orderId, sku) => call('DELETE', `/orders/${orderId}/items/${sku}`, { customerId }),
  getReceipt: (customerId, orderId) => call('GET', `/orders/${orderId}/receipt`, { customerId }),
};
