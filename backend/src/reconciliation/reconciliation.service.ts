import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reconciliation } from './entities/reconciliation.entity';
import { ReconciliationItem } from './entities/reconciliation-item.entity';
import { ReconciliationStatus } from '../common/enums';
import { generateDocumentNumber } from '../common/utils/document-number.util';
import { CreateReconciliationDto, AddReconciliationItemDto } from './dto/create-reconciliation.dto';
import { AccountStatementService } from '../accounting/account-statement.service';

export interface ReconciliationSummary extends Reconciliation {
  adjustedBalance: number;
  difference: number;
}

@Injectable()
export class ReconciliationService {
  constructor(
    @InjectRepository(Reconciliation) private readonly repo: Repository<Reconciliation>,
    @InjectRepository(ReconciliationItem) private readonly itemRepo: Repository<ReconciliationItem>,
    private readonly accountStatement: AccountStatementService,
  ) {}

  async findAll(): Promise<ReconciliationSummary[]> {
    const rows = await this.repo.find({ order: { createdAt: 'DESC' } });
    return rows.map((r) => this.withSummary(r));
  }

  async findOne(id: string): Promise<ReconciliationSummary> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Reconciliation ${id} not found`);
    }
    return this.withSummary(row);
  }

  async create(dto: CreateReconciliationDto): Promise<ReconciliationSummary> {
    const statement = await this.accountStatement.getStatement(dto.accountId, undefined, dto.periodEnd);

    const reconciliation = this.repo.create({
      reconciliationNumber: generateDocumentNumber('REC'),
      type: dto.type,
      accountId: dto.accountId,
      referenceLabel: dto.referenceLabel,
      periodEnd: dto.periodEnd,
      glBalance: statement.closingBalance,
      externalBalance: dto.externalBalance,
      notes: dto.notes,
      status: ReconciliationStatus.DRAFT,
    });

    const saved = await this.repo.save(reconciliation);
    return this.withSummary(saved);
  }

  async addItem(reconciliationId: string, dto: AddReconciliationItemDto): Promise<ReconciliationSummary> {
    const reconciliation = await this.getEntity(reconciliationId);
    if (reconciliation.status === ReconciliationStatus.COMPLETED) {
      throw new BadRequestException('لا يمكن إضافة بنود لمطابقة مكتملة');
    }
    await this.itemRepo.save(this.itemRepo.create({ reconciliationId, description: dto.description, amount: dto.amount }));
    return this.findOne(reconciliationId);
  }

  async removeItem(reconciliationId: string, itemId: string): Promise<ReconciliationSummary> {
    const reconciliation = await this.getEntity(reconciliationId);
    if (reconciliation.status === ReconciliationStatus.COMPLETED) {
      throw new BadRequestException('لا يمكن حذف بنود من مطابقة مكتملة');
    }
    await this.itemRepo.delete({ id: itemId, reconciliationId });
    return this.findOne(reconciliationId);
  }

  async complete(id: string, userId?: string): Promise<ReconciliationSummary> {
    const reconciliation = await this.getEntity(id);
    if (reconciliation.status === ReconciliationStatus.COMPLETED) {
      throw new BadRequestException('المطابقة مكتملة بالفعل');
    }
    reconciliation.status = ReconciliationStatus.COMPLETED;
    reconciliation.completedBy = userId;
    reconciliation.completedAt = new Date();
    const saved = await this.repo.save(reconciliation);
    return this.withSummary(saved);
  }

  async reopen(id: string): Promise<ReconciliationSummary> {
    const reconciliation = await this.getEntity(id);
    reconciliation.status = ReconciliationStatus.DRAFT;
    reconciliation.completedBy = null;
    reconciliation.completedAt = null;
    const saved = await this.repo.save(reconciliation);
    return this.withSummary(saved);
  }

  private async getEntity(id: string): Promise<Reconciliation> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Reconciliation ${id} not found`);
    }
    return row;
  }

  private withSummary(r: Reconciliation): ReconciliationSummary {
    const itemsTotal = (r.items ?? []).reduce((sum, i) => sum + Number(i.amount), 0);
    const adjustedBalance = Math.round((Number(r.glBalance) + itemsTotal) * 100) / 100;
    const difference = Math.round((Number(r.externalBalance) - adjustedBalance) * 100) / 100;
    return { ...r, adjustedBalance, difference };
  }
}
