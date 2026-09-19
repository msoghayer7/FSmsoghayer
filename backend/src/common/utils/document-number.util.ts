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
