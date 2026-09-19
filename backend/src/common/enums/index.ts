export enum UserRole {
  ADMIN = 'ADMIN',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  PROCUREMENT = 'PROCUREMENT',
  VIEWER = 'VIEWER',
}

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
}

export enum JournalSourceType {
  MANUAL = 'MANUAL',
  CONTRACT = 'CONTRACT',
  EXPENSE_ACCRUAL = 'EXPENSE_ACCRUAL',
  ASSET_ACQUISITION = 'ASSET_ACQUISITION',
  ASSET_DEPRECIATION = 'ASSET_DEPRECIATION',
  ASSET_DISPOSAL = 'ASSET_DISPOSAL',
}

export enum PartnerType {
  VENDOR = 'VENDOR',
  CUSTOMER = 'CUSTOMER',
  BOTH = 'BOTH',
}

export enum ContractType {
  SERVICE = 'SERVICE',
  LEASE = 'LEASE',
  SUPPLY = 'SUPPLY',
  MAINTENANCE = 'MAINTENANCE',
  CONSULTING = 'CONSULTING',
  OTHER = 'OTHER',
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  RENEWED = 'RENEWED',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
}

export enum BillingFrequency {
  ONE_TIME = 'ONE_TIME',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUAL = 'SEMI_ANNUAL',
  ANNUAL = 'ANNUAL',
}

export enum ExpenseRecognitionMethod {
  IMMEDIATE = 'IMMEDIATE',
  STRAIGHT_LINE = 'STRAIGHT_LINE',
}

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED',
  CANCELLED = 'CANCELLED',
}

export enum AccrualPeriodStatus {
  PENDING = 'PENDING',
  POSTED = 'POSTED',
  CANCELLED = 'CANCELLED',
}

export enum DepreciationMethod {
  STRAIGHT_LINE = 'STRAIGHT_LINE',
}

export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  FULLY_DEPRECIATED = 'FULLY_DEPRECIATED',
  DISPOSED = 'DISPOSED',
}
