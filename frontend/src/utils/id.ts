/**
 * Generates unique identifiers for orders, accounts, and requests.
 */
export function generateOrderId(prefix = 'ord'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${timestamp}-${random}`;
}

export function generateAccountId(prefix = 'usr'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${timestamp}-${random}`;
}
