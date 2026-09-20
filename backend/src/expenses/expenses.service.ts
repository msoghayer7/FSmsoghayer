import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { ExpenseAccrualSchedule } from './entities/expense-accrual-schedule.entity';
import {
  AccrualPeriodStatus,
  ExpenseRecognitionMethod,
  ExpenseStatus,
  JournalEntryStatus,
  JournalSourceType,
} from '../common/enums';
import { generateDocumentNumber } from '../common/utils/document-number.util';
import { generateMonthlySchedule } from '../common/utils/period-schedule.util';
import { DEFAULT_ACCOUNT_CODES } from '../common/constants/default-accounts';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { JournalEntriesService, JournalEntryPostedPayload, JOURNAL_ENTRY_POSTED_EVENT } from '../accounting/journal-entries.service';
import { AccountsService } from '../accounting/accounts.service';
import { ContractsService } from '../contracts/contracts.service';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense) private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(ExpenseAccrualSchedule) private readonly scheduleRepo: Repository<ExpenseAccrualSchedule>,
    private readonly journalEntries: JournalEntriesService,
    private readonly accounts: AccountsService,
    private readonly contracts: ContractsService,
  ) {}

  findAll(): Promise<Expense[]> {
    return this.expenseRepo.find({
      order: { createdAt: 'DESC', schedule: { periodStart: 'ASC' } },
    });
  }

  async findOne(id: string): Promise<Expense> {
    const expense = await this.expenseRepo.findOne({
      where: { id },
      order: { schedule: { periodStart: 'ASC' } },
    });
    if (!expense) {
      throw new NotFoundException(`Expense ${id} not found`);
    }
    return expense;
  }

  async create(dto: CreateExpenseDto): Promise<Expense> {
    let partnerId = dto.partnerId;
    let expenseAccountId = dto.expenseAccountId;

    if (dto.contractId) {
      const contract = await this.contracts.findOne(dto.contractId);
      partnerId = partnerId ?? contract.partnerId;
      expenseAccountId = expenseAccountId ?? contract.defaultExpenseAccountId ?? undefined;
    }

    if (!partnerId) {
      throw new BadRequestException('partnerId is required (or derive it from a contractId)');
    }
    if (!expenseAccountId) {
      throw new BadRequestException('expenseAccountId is required (or set a default on the linked contract)');
    }

    const payableAccountId = dto.payableAccountId ?? (await this.defaultAccountId(DEFAULT_ACCOUNT_CODES.ACCOUNTS_PAYABLE));

    let schedule: { periodLabel: string; periodStart: string; periodEnd: string; amount: number }[];
    let prepaidAccountId: string | undefined;

    if (dto.recognitionMethod === ExpenseRecognitionMethod.IMMEDIATE) {
      schedule = [
        {
          periodLabel: dto.invoiceDate.slice(0, 7),
          periodStart: dto.accrualStartDate,
          periodEnd: dto.accrualEndDate,
          amount: dto.totalAmount,
        },
      ];
    } else {
      schedule = generateMonthlySchedule(dto.accrualStartDate, dto.accrualEndDate, dto.totalAmount);
      prepaidAccountId = dto.prepaidAccountId ?? (await this.defaultAccountId(DEFAULT_ACCOUNT_CODES.PREPAID_EXPENSES));
    }

    const expense = this.expenseRepo.create({
      expenseNumber: generateDocumentNumber('EXP'),
      contractId: dto.contractId,
      partnerId,
      description: dto.description,
      category: dto.category,
      totalAmount: dto.totalAmount,
      currency: dto.currency ?? 'SAR',
      invoiceNumber: dto.invoiceNumber,
      invoiceDate: dto.invoiceDate,
      accrualStartDate: dto.accrualStartDate,
      accrualEndDate: dto.accrualEndDate,
      recognitionMethod: dto.recognitionMethod,
      expenseAccountId,
      prepaidAccountId,
      payableAccountId,
      departmentId: dto.departmentId,
      status: ExpenseStatus.DRAFT,
      schedule: schedule.map((s) =>
        this.scheduleRepo.create({
          periodLabel: s.periodLabel,
          periodStart: s.periodStart,
          periodEnd: s.periodEnd,
          amount: s.amount,
          status: AccrualPeriodStatus.PENDING,
        }),
      ),
    });

    return this.expenseRepo.save(expense);
  }

  /** Business approval: drafts the initial GL entry (full expense, or prepaid asset for straight-line). Awaits GL approval to take effect. */
  async approve(id: string, userId?: string): Promise<Expense> {
    const expense = await this.findOne(id);
    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new BadRequestException(`Cannot approve an expense in status ${expense.status}`);
    }

    if (expense.recognitionMethod === ExpenseRecognitionMethod.IMMEDIATE) {
      const entry = await this.journalEntries.create({
        entryDate: expense.invoiceDate,
        description: `Expense recognized: ${expense.description} (${expense.expenseNumber})`,
        sourceType: JournalSourceType.EXPENSE_INITIAL,
        sourceId: expense.id,
        createdBy: userId,
        lines: [
          { accountId: expense.expenseAccountId, debit: expense.totalAmount, description: expense.description },
          { accountId: expense.payableAccountId!, credit: expense.totalAmount, description: expense.description },
        ],
      });

      await this.scheduleRepo.update({ expenseId: expense.id }, { journalEntryId: entry.id });
      expense.initialJournalEntryId = entry.id;
    } else {
      const entry = await this.journalEntries.create({
        entryDate: expense.invoiceDate,
        description: `Prepaid expense recorded: ${expense.description} (${expense.expenseNumber})`,
        sourceType: JournalSourceType.EXPENSE_INITIAL,
        sourceId: expense.id,
        createdBy: userId,
        lines: [
          { accountId: expense.prepaidAccountId!, debit: expense.totalAmount, description: expense.description },
          { accountId: expense.payableAccountId!, credit: expense.totalAmount, description: expense.description },
        ],
      });

      expense.initialJournalEntryId = entry.id;
    }

    expense.status = ExpenseStatus.APPROVED;
    return this.expenseRepo.save(expense);
  }

  /** Drafts the recognition entry for one accrual period of a straight-line expense; awaits GL approval. */
  async recognizePeriod(expenseId: string, scheduleId: string, userId?: string): Promise<Expense> {
    const expense = await this.findOne(expenseId);
    if (expense.recognitionMethod !== ExpenseRecognitionMethod.STRAIGHT_LINE) {
      throw new BadRequestException('Only straight-line expenses have periods to recognize individually');
    }
    if (expense.status !== ExpenseStatus.APPROVED) {
      throw new BadRequestException(`Expense must be APPROVED before recognizing periods (current: ${expense.status})`);
    }
    if (!expense.initialJournalEntryId) {
      throw new BadRequestException('The initial prepaid entry has not been created yet');
    }
    const initialEntry = await this.journalEntries.findOne(expense.initialJournalEntryId);
    if (initialEntry.status !== JournalEntryStatus.POSTED) {
      throw new BadRequestException('The initial prepaid entry must be approved before recognizing periods');
    }

    const period = expense.schedule.find((s) => s.id === scheduleId);
    if (!period) {
      throw new NotFoundException(`Schedule period ${scheduleId} not found on this expense`);
    }
    if (period.status !== AccrualPeriodStatus.PENDING) {
      throw new BadRequestException(`Period ${period.periodLabel} is already ${period.status}`);
    }

    const entry = await this.journalEntries.create({
      entryDate: period.periodEnd,
      description: `Accrual recognition ${period.periodLabel}: ${expense.description} (${expense.expenseNumber})`,
      sourceType: JournalSourceType.EXPENSE_ACCRUAL,
      sourceId: period.id,
      createdBy: userId,
      lines: [
        { accountId: expense.expenseAccountId, debit: period.amount, description: `${expense.description} - ${period.periodLabel}` },
        { accountId: expense.prepaidAccountId!, credit: period.amount, description: `${expense.description} - ${period.periodLabel}` },
      ],
    });

    await this.scheduleRepo.update(period.id, { status: AccrualPeriodStatus.AWAITING_APPROVAL, journalEntryId: entry.id });

    return this.findOne(expenseId);
  }

  /** Reacts to a journal entry being approved: finalizes the schedule row / expense status it belongs to. */
  @OnEvent(JOURNAL_ENTRY_POSTED_EVENT)
  async onJournalEntryPosted(payload: JournalEntryPostedPayload): Promise<void> {
    if (!payload.sourceId) return;

    if (payload.sourceType === JournalSourceType.EXPENSE_INITIAL) {
      const expense = await this.expenseRepo.findOne({ where: { id: payload.sourceId } });
      if (!expense) return;
      if (expense.recognitionMethod === ExpenseRecognitionMethod.IMMEDIATE) {
        await this.scheduleRepo.update({ expenseId: expense.id }, { status: AccrualPeriodStatus.POSTED });
        expense.status = ExpenseStatus.POSTED;
        await this.expenseRepo.save(expense);
      }
      return;
    }

    if (payload.sourceType === JournalSourceType.EXPENSE_ACCRUAL) {
      const period = await this.scheduleRepo.findOne({ where: { id: payload.sourceId } });
      if (!period) return;
      await this.scheduleRepo.update(period.id, { status: AccrualPeriodStatus.POSTED });

      const expense = await this.findOne(period.expenseId);
      const allPosted = expense.schedule.every((s) => s.status === AccrualPeriodStatus.POSTED);
      if (allPosted) {
        expense.status = ExpenseStatus.POSTED;
        await this.expenseRepo.save(expense);
      }
    }
  }

  private async defaultAccountId(code: string): Promise<string> {
    const account = await this.accounts.findByCode(code);
    if (!account) {
      throw new BadRequestException(
        `No account with code ${code} found; run the seed script or configure this account explicitly`,
      );
    }
    return account.id;
  }
}
