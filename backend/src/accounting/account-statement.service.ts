import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { Account } from './entities/account.entity';
import { JournalEntryStatus } from '../common/enums';

export interface LedgerLine {
  entryId: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface AccountStatement {
  account: Account;
  from: string | null;
  to: string | null;
  openingBalance: number;
  lines: LedgerLine[];
  closingBalance: number;
}

/** كشف حساب: كل الحركات المرحّلة على حساب واحد ضمن فترة، برصيد متحرك (مدين - دائن تراكميًا). */
@Injectable()
export class AccountStatementService {
  constructor(
    @InjectRepository(JournalEntryLine) private readonly lineRepo: Repository<JournalEntryLine>,
    @InjectRepository(Account) private readonly accountRepo: Repository<Account>,
  ) {}

  async getStatement(accountId: string, from?: string, to?: string): Promise<AccountStatement> {
    const account = await this.accountRepo.findOneBy({ id: accountId });
    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    let openingBalance = 0;
    if (from) {
      const priorLines = await this.lineRepo.find({
        relations: ['journalEntry'],
        where: { accountId, journalEntry: { status: JournalEntryStatus.POSTED, entryDate: LessThan(from) } },
      });
      openingBalance = priorLines.reduce((sum, l) => sum + Number(l.debit) - Number(l.credit), 0);
    }

    const allLines = await this.lineRepo.find({
      relations: ['journalEntry'],
      where: { accountId, journalEntry: { status: JournalEntryStatus.POSTED } },
    });

    const periodLines = allLines
      .filter((l) => (!from || l.journalEntry.entryDate >= from) && (!to || l.journalEntry.entryDate <= to))
      .sort((a, b) => a.journalEntry.entryDate.localeCompare(b.journalEntry.entryDate) || a.journalEntry.entryNumber.localeCompare(b.journalEntry.entryNumber));

    let running = openingBalance;
    const lines: LedgerLine[] = periodLines.map((l) => {
      running = Math.round((running + Number(l.debit) - Number(l.credit)) * 100) / 100;
      return {
        entryId: l.journalEntry.id,
        entryNumber: l.journalEntry.entryNumber,
        entryDate: l.journalEntry.entryDate,
        description: l.description ?? l.journalEntry.description,
        debit: Number(l.debit),
        credit: Number(l.credit),
        runningBalance: running,
      };
    });

    return {
      account,
      from: from ?? null,
      to: to ?? null,
      openingBalance: Math.round(openingBalance * 100) / 100,
      lines,
      closingBalance: running,
    };
  }
}
