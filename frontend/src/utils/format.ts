export function formatCurrency(value: number, currency = 'SAR'): string {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}
