import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { JournalEntriesService } from './journal-entries.service';
import { JournalEntriesController } from './journal-entries.controller';
import { TrialBalanceService } from './trial-balance.service';
import { TrialBalanceController } from './trial-balance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Account, JournalEntry, JournalEntryLine])],
  providers: [AccountsService, JournalEntriesService, TrialBalanceService],
  controllers: [AccountsController, JournalEntriesController, TrialBalanceController],
  exports: [TypeOrmModule, AccountsService, JournalEntriesService],
})
export class AccountingModule {}
