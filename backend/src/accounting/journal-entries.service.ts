import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { FiscalYearStatus, JournalEntryStatus } from '../common/enums';
import { generateDocumentNumber } from '../common/utils/document-number.util';
import { CreateJournalEntryInput } from './dto/journal-entry.dto';
import { FiscalYearsService } from './fiscal-years.service';

export const JOURNAL_ENTRY_POSTED_EVENT = 'journal-entry.posted';

export interface JournalEntryPostedPayload {
  journalEntryId: string;
  sourceType: string;
  sourceId?: string;
}

/**
 * Central general-ledger posting engine. Every module that needs to record
 * accrual/depreciation/contract financial impact goes through here so that
 * the books stay double-entry balanced by construction, not by convention.
 *
 * Entries are always created as DRAFT. They only take financial effect once
 * an authorized user calls `approve`, which flips them to POSTED and emits
 * `journal-entry.posted` so the originating module (expenses/assets/...) can
 * finalize its own downstream state (e.g. mark an accrual period POSTED).
 */
@Injectable()
export class JournalEntriesService {
  constructor(
    @InjectRepository(JournalEntry) private readonly entryRepo: Repository<JournalEntry>,
    @InjectRepository(JournalEntryLine) private readonly lineRepo: Repository<JournalEntryLine>,
    private readonly events: EventEmitter2,
    private readonly fiscalYears: FiscalYearsService,
  ) {}

  findAll(status?: JournalEntryStatus): Promise<JournalEntry[]> {
    return this.entryRepo.find({
      where: status ? { status } : {},
      relations: ['lines', 'lines.account'],
      order: { entryDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<JournalEntry> {
    const entry = await this.entryRepo.findOne({ where: { id }, relations: ['lines', 'lines.account'] });
    if (!entry) {
      throw new NotFoundException(`Journal entry ${id} not found`);
    }
    return entry;
  }

  /** Creates a balanced entry in DRAFT status. Throws if debits != credits or the date falls in a closed/undefined fiscal year. */
  async create(input: CreateJournalEntryInput): Promise<JournalEntry> {
    this.assertBalanced(input);
    await this.assertFiscalYearOpen(input.entryDate);

    const entry = this.entryRepo.create({
      entryNumber: generateDocumentNumber('JE'),
      entryDate: input.entryDate,
      description: input.description,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      createdBy: input.createdBy,
      status: JournalEntryStatus.DRAFT,
      lines: input.lines.map((line) =>
        this.lineRepo.create({
          accountId: line.accountId,
          debit: line.debit ?? 0,
          credit: line.credit ?? 0,
          description: line.description,
        }),
      ),
    });

    return this.entryRepo.save(entry);
  }

  /** Approves a DRAFT entry: makes it POSTED and notifies listeners of the resulting financial effect. */
  async approve(id: string, userId?: string): Promise<JournalEntry> {
    const entry = await this.findOne(id);
    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new BadRequestException(`Journal entry ${entry.entryNumber} is already ${entry.status}`);
    }
    await this.assertFiscalYearOpen(entry.entryDate);

    const totalDebit = entry.lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = entry.lines.reduce((sum, l) => sum + Number(l.credit), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new BadRequestException('Journal entry is not balanced and cannot be approved');
    }

    entry.status = JournalEntryStatus.POSTED;
    entry.postedAt = new Date();
    entry.approvedBy = userId;
    const saved = await this.entryRepo.save(entry);

    this.events.emit(JOURNAL_ENTRY_POSTED_EVENT, {
      journalEntryId: saved.id,
      sourceType: saved.sourceType,
      sourceId: saved.sourceId,
    } as JournalEntryPostedPayload);

    return saved;
  }

  private async assertFiscalYearOpen(entryDate: string): Promise<void> {
    const year = await this.fiscalYears.findYearForDate(entryDate);
    if (!year) {
      throw new BadRequestException(`لا توجد سنة مالية مُعرَّفة تغطي تاريخ ${entryDate}`);
    }
    if (year.status === FiscalYearStatus.CLOSED) {
      throw new BadRequestException(`السنة المالية ${year.yearNumber} مقفلة، لا يمكن إنشاء أو اعتماد قيود ضمنها`);
    }
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
