export type UserRole = 'ADMIN' | 'FINANCE_MANAGER' | 'ACCOUNTANT' | 'PROCUREMENT' | 'VIEWER';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'MIXED' | 'OFF_BALANCE' | 'OTHER';
export type AccountBalanceSide = 'DEBIT' | 'CREDIT' | 'BOTH' | 'OFF_BALANCE' | 'OTHER';

export interface Account {
  id: string;
  code: string;
  name: string;
  level: number;
  parentCode?: string | null;
  type: AccountType;
  balanceSide: AccountBalanceSide;
  isPostable: boolean;
  statementType?: string | null;
  isActive: boolean;
}

export interface JournalEntryLine {
  id: string;
  account: Account;
  debit: number;
  credit: number;
  description?: string;
}

export type JournalEntryStatus = 'DRAFT' | 'POSTED';

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  status: JournalEntryStatus;
  sourceType: string;
  createdBy?: string;
  approvedBy?: string;
  postedAt?: string;
  createdAt: string;
  lines: JournalEntryLine[];
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  level: number;
  debit: number;
  credit: number;
  balance: number;
}

export interface EntityProfile {
  id: string;
  entityName: string;
  entityNumber?: string | null;
  fiscalYearStartMonth: number;
  currency: string;
  address?: string | null;
}

export type FiscalYearStatus = 'OPEN' | 'CLOSED';

export interface FiscalYear {
  id: string;
  yearNumber: number;
  startDate: string;
  endDate: string;
  status: FiscalYearStatus;
  closedAt?: string | null;
  closedBy?: string | null;
}

export interface Department {
  id: string;
  code: string;
  name: string;
}

export type PartnerType = 'VENDOR' | 'CUSTOMER' | 'BOTH';

export interface BusinessPartner {
  id: string;
  code: string;
  name: string;
  type: PartnerType;
  taxNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export type ContractType = 'SERVICE' | 'LEASE' | 'SUPPLY' | 'MAINTENANCE' | 'CONSULTING' | 'OTHER';
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'RENEWED' | 'EXPIRED' | 'TERMINATED';
export type BillingFrequency = 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';

export interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  partner: BusinessPartner;
  partnerId: string;
  type: ContractType;
  startDate: string;
  endDate: string;
  totalValue: number;
  currency: string;
  billingFrequency: BillingFrequency;
  paymentTermsDays: number;
  autoRenew: boolean;
  status: ContractStatus;
  departmentId?: string;
  defaultExpenseAccountId?: string;
  notes?: string;
}

export type ExpenseRecognitionMethod = 'IMMEDIATE' | 'STRAIGHT_LINE';
export type ExpenseStatus = 'DRAFT' | 'APPROVED' | 'POSTED' | 'CANCELLED';
export type AccrualPeriodStatus = 'PENDING' | 'AWAITING_APPROVAL' | 'POSTED' | 'CANCELLED';

export interface ExpenseAccrualSchedule {
  id: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  status: AccrualPeriodStatus;
  journalEntryId?: string;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  contractId?: string;
  partner: BusinessPartner;
  partnerId: string;
  description: string;
  category?: string;
  totalAmount: number;
  currency: string;
  invoiceNumber?: string;
  invoiceDate: string;
  accrualStartDate: string;
  accrualEndDate: string;
  recognitionMethod: ExpenseRecognitionMethod;
  expenseAccount: Account;
  status: ExpenseStatus;
  initialJournalEntryId?: string;
  schedule: ExpenseAccrualSchedule[];
}

export type AssetStatus = 'ACTIVE' | 'FULLY_DEPRECIATED' | 'DISPOSED';

export interface AssetCategory {
  id: string;
  name: string;
  defaultUsefulLifeMonths: number;
  assetAccount: Account;
  depreciationExpenseAccount: Account;
  accumulatedDepreciationAccount: Account;
}

export interface AssetDepreciationSchedule {
  id: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  bookValue: number;
  status: AccrualPeriodStatus;
  journalEntryId?: string;
}

export interface FixedAsset {
  id: string;
  assetNumber: string;
  name: string;
  category: AssetCategory;
  categoryId: string;
  acquisitionDate: string;
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  status: AssetStatus;
  acquisitionJournalEntryId?: string;
  disposalDate?: string;
  disposalProceeds?: number;
  disposalJournalEntryId?: string;
  schedule: AssetDepreciationSchedule[];
}
