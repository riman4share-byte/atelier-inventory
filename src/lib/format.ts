/**
 * Money and number formatting.
 *
 * The atelier trades in AED. Amounts are shown with the currency and grouped
 * thousands so a five-figure price is readable at a glance and cannot be
 * misread as a four-figure one. Arabic locales use Arabic-Indic digits, which
 * is what an Arabic reader expects.
 */
export function formatMoney(value: number, language = 'en'): string {
  const locale = language.startsWith('ar') ? 'ar-AE' : 'en-AE';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // A runtime without full ICU still has to show something sensible.
    return `AED ${value.toFixed(2)}`;
  }
}

/** A plain grouped number, for counts and quantities. */
export function formatNumber(value: number, language = 'en'): string {
  const locale = language.startsWith('ar') ? 'ar-AE' : 'en-AE';
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
}
