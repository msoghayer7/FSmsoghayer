/**
 * Chart-of-accounts codes used as company-wide postings defaults, mirroring
 * how ERPs let a document type fall back to a configured default GL account
 * instead of forcing the user to pick one on every transaction. Seeded by
 * database/seeds/seed.ts.
 */
export const DEFAULT_ACCOUNT_CODES = {
  ACCOUNTS_PAYABLE: '2000',
  PREPAID_EXPENSES: '1200',
  FIXED_ASSETS: '1500',
  ACCUMULATED_DEPRECIATION: '1590',
  DEPRECIATION_EXPENSE: '5200',
  GAIN_ON_DISPOSAL: '4900',
  LOSS_ON_DISPOSAL: '5900',
  CASH: '1000',
} as const;
