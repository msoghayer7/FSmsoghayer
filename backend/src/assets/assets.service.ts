import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FixedAsset } from './entities/fixed-asset.entity';
import { AssetDepreciationSchedule } from './entities/asset-depreciation-schedule.entity';
import { AccrualPeriodStatus, AssetStatus, JournalSourceType } from '../common/enums';
import { generateDocumentNumber } from '../common/utils/document-number.util';
import { generateStraightLinePeriods } from '../common/utils/period-schedule.util';
import { DEFAULT_ACCOUNT_CODES } from '../common/constants/default-accounts';
import { CreateFixedAssetDto, DisposeAssetDto } from './dto/create-asset.dto';
import { AssetCategoriesService } from './asset-categories.service';
import { JournalEntriesService } from '../accounting/journal-entries.service';
import { AccountsService } from '../accounting/accounts.service';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(FixedAsset) private readonly assetRepo: Repository<FixedAsset>,
    @InjectRepository(AssetDepreciationSchedule) private readonly scheduleRepo: Repository<AssetDepreciationSchedule>,
    private readonly categories: AssetCategoriesService,
    private readonly journalEntries: JournalEntriesService,
    private readonly accounts: AccountsService,
  ) {}

  findAll(): Promise<FixedAsset[]> {
    return this.assetRepo.find({
      order: { createdAt: 'DESC', schedule: { periodStart: 'ASC' } },
    });
  }

  async findOne(id: string): Promise<FixedAsset> {
    const asset = await this.assetRepo.findOne({
      where: { id },
      order: { schedule: { periodStart: 'ASC' } },
    });
    if (!asset) {
      throw new NotFoundException(`Fixed asset ${id} not found`);
    }
    return asset;
  }

  async create(dto: CreateFixedAssetDto): Promise<FixedAsset> {
    const category = await this.categories.findOne(dto.categoryId);
    const usefulLifeMonths = dto.usefulLifeMonths ?? category.defaultUsefulLifeMonths;
    const salvageValue = dto.salvageValue ?? 0;
    const depreciableBase = dto.acquisitionCost - salvageValue;

    if (depreciableBase < 0) {
      throw new BadRequestException('salvageValue cannot exceed acquisitionCost');
    }

    const periods = generateStraightLinePeriods(dto.acquisitionDate, usefulLifeMonths, depreciableBase);

    let accumulated = 0;
    const schedule = periods.map((p) => {
      accumulated += p.amount;
      return this.scheduleRepo.create({
        periodLabel: p.periodLabel,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        depreciationAmount: p.amount,
        accumulatedDepreciation: accumulated,
        bookValue: dto.acquisitionCost - accumulated,
        status: AccrualPeriodStatus.PENDING,
      });
    });

    const asset = this.assetRepo.create({
      assetNumber: generateDocumentNumber('AST'),
      name: dto.name,
      categoryId: dto.categoryId,
      vendorId: dto.vendorId,
      acquisitionDate: dto.acquisitionDate,
      acquisitionCost: dto.acquisitionCost,
      salvageValue,
      usefulLifeMonths,
      departmentId: dto.departmentId,
      location: dto.location,
      status: AssetStatus.ACTIVE,
      assetAccountId: category.assetAccountId,
      depreciationExpenseAccountId: category.depreciationExpenseAccountId,
      accumulatedDepreciationAccountId: category.accumulatedDepreciationAccountId,
      schedule,
    });

    return this.assetRepo.save(asset);
  }

  /** Posts the acquisition entry: Dr Fixed Asset / Cr Accounts Payable. Required before depreciating. */
  async recordAcquisition(id: string, payableAccountId?: string, userId?: string): Promise<FixedAsset> {
    const asset = await this.findOne(id);
    if (asset.acquisitionJournalEntryId) {
      throw new BadRequestException('Acquisition has already been recorded for this asset');
    }

    const resolvedPayableAccountId = payableAccountId ?? (await this.defaultAccountId(DEFAULT_ACCOUNT_CODES.ACCOUNTS_PAYABLE));

    const entry = await this.journalEntries.createAndPost({
      entryDate: asset.acquisitionDate,
      description: `Asset acquisition: ${asset.name} (${asset.assetNumber})`,
      sourceType: JournalSourceType.ASSET_ACQUISITION,
      sourceId: asset.id,
      createdBy: userId,
      lines: [
        { accountId: asset.assetAccountId, debit: asset.acquisitionCost, description: asset.name },
        { accountId: resolvedPayableAccountId, credit: asset.acquisitionCost, description: asset.name },
      ],
    });

    asset.acquisitionJournalEntryId = entry.id;
    return this.assetRepo.save(asset);
  }

  /** Posts one period's depreciation: Dr Depreciation Expense / Cr Accumulated Depreciation. */
  async postDepreciationPeriod(assetId: string, scheduleId: string, userId?: string): Promise<FixedAsset> {
    const asset = await this.findOne(assetId);
    if (!asset.acquisitionJournalEntryId) {
      throw new BadRequestException('Record the acquisition entry before posting depreciation');
    }
    if (asset.status === AssetStatus.DISPOSED) {
      throw new BadRequestException('Cannot depreciate a disposed asset');
    }

    const period = asset.schedule.find((s) => s.id === scheduleId);
    if (!period) {
      throw new NotFoundException(`Schedule period ${scheduleId} not found on this asset`);
    }
    if (period.status !== AccrualPeriodStatus.PENDING) {
      throw new BadRequestException(`Period ${period.periodLabel} is already ${period.status}`);
    }

    const entry = await this.journalEntries.createAndPost({
      entryDate: period.periodEnd,
      description: `Depreciation ${period.periodLabel}: ${asset.name} (${asset.assetNumber})`,
      sourceType: JournalSourceType.ASSET_DEPRECIATION,
      sourceId: period.id,
      createdBy: userId,
      lines: [
        {
          accountId: asset.depreciationExpenseAccountId,
          debit: period.depreciationAmount,
          description: `${asset.name} - ${period.periodLabel}`,
        },
        {
          accountId: asset.accumulatedDepreciationAccountId,
          credit: period.depreciationAmount,
          description: `${asset.name} - ${period.periodLabel}`,
        },
      ],
    });

    await this.scheduleRepo.update(period.id, { status: AccrualPeriodStatus.POSTED, journalEntryId: entry.id });

    const refreshed = await this.findOne(assetId);
    const allPosted = refreshed.schedule.every((s) => s.status !== AccrualPeriodStatus.PENDING);
    if (allPosted) {
      refreshed.status = AssetStatus.FULLY_DEPRECIATED;
      await this.assetRepo.save(refreshed);
    }

    return this.findOne(assetId);
  }

  /**
   * Disposes an asset: reverses accumulated depreciation and cost, books
   * cash/receivable for proceeds, and recognizes the resulting gain or loss.
   * Balanced by construction: accCost - accDep = bookValue = accDep + proceeds - (cost + gainLoss).
   */
  async disposeAsset(id: string, dto: DisposeAssetDto, userId?: string): Promise<FixedAsset> {
    const asset = await this.findOne(id);
    if (asset.status === AssetStatus.DISPOSED) {
      throw new BadRequestException('Asset is already disposed');
    }

    const accumulatedDepreciation = asset.schedule
      .filter((s) => s.status === AccrualPeriodStatus.POSTED)
      .reduce((sum, s) => sum + s.depreciationAmount, 0);
    const bookValue = asset.acquisitionCost - accumulatedDepreciation;
    const gainLoss = Math.round((dto.proceeds - bookValue) * 100) / 100;

    const cashAccountId = await this.defaultAccountId(DEFAULT_ACCOUNT_CODES.CASH);
    const lines: { accountId: string; debit?: number; credit?: number; description: string }[] = [];

    if (accumulatedDepreciation > 0) {
      lines.push({ accountId: asset.accumulatedDepreciationAccountId, debit: accumulatedDepreciation, description: asset.name });
    }
    if (dto.proceeds > 0) {
      lines.push({ accountId: cashAccountId, debit: dto.proceeds, description: `Disposal proceeds - ${asset.name}` });
    }
    if (gainLoss > 0) {
      lines.push({
        accountId: await this.defaultAccountId(DEFAULT_ACCOUNT_CODES.GAIN_ON_DISPOSAL),
        credit: gainLoss,
        description: `Gain on disposal - ${asset.name}`,
      });
    } else if (gainLoss < 0) {
      lines.push({
        accountId: await this.defaultAccountId(DEFAULT_ACCOUNT_CODES.LOSS_ON_DISPOSAL),
        debit: -gainLoss,
        description: `Loss on disposal - ${asset.name}`,
      });
    }
    lines.push({ accountId: asset.assetAccountId, credit: asset.acquisitionCost, description: asset.name });

    const entry = await this.journalEntries.createAndPost({
      entryDate: dto.disposalDate,
      description: `Asset disposal: ${asset.name} (${asset.assetNumber})`,
      sourceType: JournalSourceType.ASSET_DISPOSAL,
      sourceId: asset.id,
      createdBy: userId,
      lines,
    });

    await this.scheduleRepo.update(
      { assetId: asset.id, status: AccrualPeriodStatus.PENDING },
      { status: AccrualPeriodStatus.CANCELLED },
    );

    asset.status = AssetStatus.DISPOSED;
    asset.disposalDate = dto.disposalDate;
    asset.disposalProceeds = dto.proceeds;
    asset.disposalJournalEntryId = entry.id;
    return this.assetRepo.save(asset);
  }

  private async defaultAccountId(code: string): Promise<string> {
    const account = await this.accounts.findByCode(code);
    if (!account) {
      throw new BadRequestException(`No account with code ${code} found; run the seed script first`);
    }
    return account.id;
  }
}
