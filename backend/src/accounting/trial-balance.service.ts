import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { Account } from './entities/account.entity';
import { JournalEntryStatus } from '../common/enums';

export interface TrialBalanceRow {
  code: string;
  name: string;
  level: number;
  debit: number;
  credit: number;
  balance: number;
}

/**
 * Builds a trial balance rolled up to any level (1-7) of the government
 * chart of accounts, using each posted line's precomputed ancestor `path`
 * so no recursive parent lookups are needed at report time.
 */
@Injectable()
export class TrialBalanceService {
  constructor(
    @InjectRepository(JournalEntryLine) private readonly lineRepo: Repository<JournalEntryLine>,
    @InjectRepository(Account) private readonly accountRepo: Repository<Account>,
  ) {}

  async getTrialBalance(level: number, hideZeroBalances: boolean): Promise<TrialBalanceRow[]> {
    const lines = await this.lineRepo.find({
      relations: ['account', 'journalEntry'],
      where: { journalEntry: { status: JournalEntryStatus.POSTED } },
    });

    const totals = new Map<string, { debit: number; credit: number }>();
    for (const line of lines) {
      const acc = line.account;
      const rollupCode = acc.level <= level ? acc.code : acc.path[level - 1] ?? acc.code;
      const current = totals.get(rollupCode) ?? { debit: 0, credit: 0 };
      current.debit += Number(line.debit);
      current.credit += Number(line.credit);
      totals.set(rollupCode, current);
    }

    const codes = [...totals.keys()];
    const accounts = codes.length ? await this.accountRepo.find({ where: { code: In(codes) } }) : [];
    const accountByCode = new Map(accounts.map((a) => [a.code, a]));

    let rows: TrialBalanceRow[] = codes.map((code) => {
      const { debit, credit } = totals.get(code)!;
      const account = accountByCode.get(code);
      return {
        code,
        name: account?.name ?? code,
        level: account?.level ?? level,
        debit: Math.round(debit * 100) / 100,
        credit: Math.round(credit * 100) / 100,
        balance: Math.round((debit - credit) * 100) / 100,
      };
    });

    if (hideZeroBalances) {
      rows = rows.filter((r) => Math.abs(r.debit) > 0.004 || Math.abs(r.credit) > 0.004);
    }

    rows.sort((a, b) => a.code.localeCompare(b.code));
    return rows;
  }
}
