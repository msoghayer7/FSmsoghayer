import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { JournalEntryStatus } from '../common/enums';
import { generateDocumentNumber } from '../common/utils/document-number.util';
import { CreateJournalEntryInput } from './dto/journal-entry.dto';

/**
 * Central general-ledger posting engine. Every module that needs to record
 * accrual/depreciation/contract financial impact goes through here so that
 * the books stay double-entry balanced by construction, not by convention.
 */
@Injectable()
export class JournalEntriesService {
  constructor(
    @InjectRepository(JournalEntry) private readonly entryRepo: Repository<JournalEntry>,
    @InjectRepository(JournalEntryLine) private readonly lineRepo: Repository<JournalEntryLine>,
  ) {}

  findAll(): Promise<JournalEntry[]> {
    return this.entryRepo.find({ relations: ['lines', 'lines.account'], order: { entryDate: 'DESC' } });
  }

  async findOne(id: string): Promise<JournalEntry> {
    const entry = await this.entryRepo.findOne({ where: { id }, relations: ['lines', 'lines.account'] });
    if (!entry) {
      throw new NotFoundException(`Journal entry ${id} not found`);
    }
    return entry;
  }

  /** Creates a balanced entry directly in POSTED status. Throws if debits != credits. */
  async createAndPost(input: CreateJournalEntryInput): Promise<JournalEntry> {
    this.assertBalanced(input);

    const entry = this.entryRepo.create({
      entryNumber: generateDocumentNumber('JE'),
      entryDate: input.entryDate,
      description: input.description,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      createdBy: input.createdBy,
      status: JournalEntryStatus.POSTED,
      postedAt: new Date(),
      lines: input.lines.map((line) =>
        this.lineRepo.create({
          accountId: line.accountId,
          debit: line.debit ?? 0,
          credit: line.credit ?? 0,
          description: line.description,
          departmentId: line.departmentId ?? undefined,
        }),
      ),
    });

    return this.entryRepo.save(entry);
  }

  private assertBalanced(input: CreateJournalEntryInput): void {
    if (!input.lines || input.lines.length < 2) {
      throw new BadRequestException('A journal entry requires at least two lines');
    }
    const totalDebit = input.lines.reduce((sum, l) => sum + (l.debit ?? 0), 0);
    const totalCredit = input.lines.reduce((sum, l) => sum + (l.credit ?? 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new BadRequestException(
        `Journal entry is not balanced: total debit ${totalDebit} != total credit ${totalCredit}`,
      );
    }
    if (totalDebit <= 0) {
      throw new BadRequestException('Journal entry total must be greater than zero');
    }
  }
}
