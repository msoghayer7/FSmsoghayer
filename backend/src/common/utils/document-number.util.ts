/**
 * Generates a human-readable, collision-safe document number without needing
 * a DB sequence (fine for this MVP; swap for a real sequence in production).
 */
export function generateDocumentNumber(prefix: string): string {
  const now = new Date();
  const stamp = now
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14);
  const random = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${stamp}${random}`;
}

/**
 * Sequential journal entry number: last two digits of the fiscal year
 * followed by a 5-digit zero-padded sequence that resets each fiscal year
 * (e.g. fiscal year 2026, entry 1 -> "2600001"). The sequence itself is
 * allocated atomically per fiscal year — see FiscalYearsService.
 */
export function formatJournalEntryNumber(fiscalYear: number, sequence: number): string {
  const yy = String(fiscalYear % 100).padStart(2, '0');
  const seq = String(sequence).padStart(5, '0');
  return `${yy}${seq}`;
}
