import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { Department } from '../organization/entities/department.entity';
import { BusinessPartner } from '../organization/entities/business-partner.entity';
import { Account } from '../accounting/entities/account.entity';
import { JournalEntry } from '../accounting/entities/journal-entry.entity';
import { JournalEntryLine } from '../accounting/entities/journal-entry-line.entity';
import { Contract } from '../contracts/entities/contract.entity';
import { ContractLine } from '../contracts/entities/contract-line.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { ExpenseAccrualSchedule } from '../expenses/entities/expense-accrual-schedule.entity';
import { AssetCategory } from '../assets/entities/asset-category.entity';
import { FixedAsset } from '../assets/entities/fixed-asset.entity';
import { AssetDepreciationSchedule } from '../assets/entities/asset-depreciation-schedule.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'fsm_user',
  password: process.env.DB_PASSWORD ?? 'fsm_password',
  database: process.env.DB_DATABASE ?? 'fsm_erp',
  synchronize: true,
  entities: [
    User,
    Department,
    BusinessPartner,
    Account,
    JournalEntry,
    JournalEntryLine,
    Contract,
    ContractLine,
    Expense,
    ExpenseAccrualSchedule,
    AssetCategory,
    FixedAsset,
    AssetDepreciationSchedule,
  ],
});
