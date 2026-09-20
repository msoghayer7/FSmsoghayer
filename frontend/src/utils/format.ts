/**
 * 'ar-SA' renders Eastern Arabic digits (٠١٢٣) by default; '-u-nu-latn' forces
 * Western digits (0123) while keeping Arabic currency/number wording.
 */
const NUMERIC_LOCALE = 'ar-SA-u-nu-latn';

export function formatCurrency(value: number, currency = 'SAR'): string {
  return new Intl.NumberFormat(NUMERIC_LOCALE, { style: 'currency', currency, maximumFractionDigits: 2 }).format(
    value,
  );
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(NUMERIC_LOCALE, { maximumFractionDigits }).format(value);
}
