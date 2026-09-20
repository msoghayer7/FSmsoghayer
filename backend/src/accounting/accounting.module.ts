import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { FiscalYear } from './entities/fiscal-year.entity';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { JournalEntriesService } from './journal-entries.service';
import { JournalEntriesController } from './journal-entries.controller';
import { TrialBalanceService } from './trial-balance.service';
import { TrialBalanceController } from './trial-balance.controller';
import { FiscalYearsService } from './fiscal-years.service';
import { FiscalYearsController } from './fiscal-years.controller';
import { AccountStatementService } from './account-statement.service';
import { AccountStatementController } from './account-statement.controller';
import { ReportsExportService } from './reports-export.service';
import { JournalEntriesImportService } from './journal-entries-import.service';

@Module({
  imports: [TypeOrmModule.forFeature([Account, JournalEntry, JournalEntryLine, FiscalYear])],
  providers: [
    AccountsService,
    JournalEntriesService,
    TrialBalanceService,
    FiscalYearsService,
    AccountStatementService,
    ReportsExportService,
    JournalEntriesImportService,
  ],
  controllers: [
    AccountsController,
    JournalEntriesController,
    TrialBalanceController,
    FiscalYearsController,
    AccountStatementController,
  ],
  exports: [TypeOrmModule, AccountsService, JournalEntriesService, FiscalYearsService, AccountStatementService],
})
export class AccountingModule {}
