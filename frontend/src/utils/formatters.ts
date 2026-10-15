/**
 * Utility functions for formatting financial values with strict precision.
 */

export function formatPrice(price: number | undefined | null): string {
  if (price === undefined || price === null || isNaN(price)) return '--.--';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatQuantity(quantity: number | undefined | null, maxDecimals = 6): string {
  if (quantity === undefined || quantity === null || isNaN(quantity)) return '--.--';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  }).format(quantity);
}

export function formatTotal(price: number, quantity: number): string {
  if (!price || !quantity || isNaN(price) || isNaN(quantity)) return '0.00';
  // Avoid precision blowout for visual display
  const total = Math.round(price * quantity * 100) / 100;
  return formatPrice(total);
}

export function formatTimestamp(timestamp: number | undefined | null): string {
  if (!timestamp) return '--:--:--';
  const date = new Date(timestamp);
  return date.toTimeString().split(' ')[0] || date.toLocaleTimeString();
}

export function formatTimeWithMs(timestamp: number | undefined | null): string {
  if (!timestamp) return '--:--:--';
  const date = new Date(timestamp);
  const time = date.toTimeString().split(' ')[0] || date.toLocaleTimeString();
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${time}.${ms}`;
}
