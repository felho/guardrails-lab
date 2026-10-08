/* Amounts arrive as whole cents; the client only formats them. */
export function formatCents(amount) {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  return `${sign}€${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
