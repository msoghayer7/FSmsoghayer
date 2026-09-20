/**
 * Chart-of-accounts codes used as company-wide postings defaults, mirroring
 * how ERPs let a document type fall back to a configured default GL account
 * instead of forcing the user to pick one on every transaction.
 *
 * These are real leaf (postable) accounts from the Saudi unified government
 * chart of accounts (دليل الحساب الحكومي الموحد), picked as the generic
 * default for each posting scenario; users can still override per document.
 * Seeded by database/seeds/seed.ts from data/chart-of-accounts.json.
 */
export const DEFAULT_ACCOUNT_CODES = {
  /** النقد في الصناديق */
  CASH: '311111001',
  /** ذمم دائنة للموردين - الفواتير المعتمدة للدفع */
  ACCOUNTS_PAYABLE: '411110001',
  /** مصروفات السلع والخدمات العامة المقدمة - متداولة */
  PREPAID_EXPENSES: '313211004',
  /** تكلفة الأصل - الآلات والمعدات ما عدا وسائل النقل */
  FIXED_ASSETS: '322320001',
  /** مجمع الاستهلاك - الآلات والمعدات ما عدا وسائل النقل */
  ACCUMULATED_DEPRECIATION: '429130002',
  /** مصروف استهلاك الآلات والمعدات ما عدا وسائل النقل */
  DEPRECIATION_EXPENSE: '231320001',
  /** مكاسب أو خسائر متحققة من بيع الأصول الملموسة (حساب واحد بطبيعة مزدوجة مدين/دائن) */
  GAIN_LOSS_ON_DISPOSAL: '181211001',
} as const;
