import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { FiscalYear } from './entities/fiscal-year.entity';
import { FiscalYearStatus } from '../common/enums';

export const FIRST_FISCAL_YEAR = 2026;

@Injectable()
export class FiscalYearsService {
  constructor(@InjectRepository(FiscalYear) private readonly repo: Repository<FiscalYear>) {}

  findAll(): Promise<FiscalYear[]> {
    return this.repo.find({ order: { yearNumber: 'ASC' } });
  }

  async findOne(id: string): Promise<FiscalYear> {
    const year = await this.repo.findOneBy({ id });
    if (!year) {
      throw new NotFoundException(`Fiscal year ${id} not found`);
    }
    return year;
  }

  /** السنة المالية التي يقع فيها تاريخ معيّن، أو null إن لم تُنشأ بعد. */
  findYearForDate(date: string): Promise<FiscalYear | null> {
    return this.repo.findOne({ where: { startDate: LessThanOrEqual(date), endDate: MoreThanOrEqual(date) } });
  }

  async create(yearNumber: number): Promise<FiscalYear> {
    if (yearNumber < FIRST_FISCAL_YEAR) {
      throw new BadRequestException(`لا يمكن إنشاء سنة مالية قبل ${FIRST_FISCAL_YEAR}`);
    }
    const existing = await this.repo.findOneBy({ yearNumber });
    if (existing) {
      throw new BadRequestException(`السنة المالية ${yearNumber} موجودة بالفعل`);
    }

    const year = this.repo.create({
      yearNumber,
      startDate: `${yearNumber}-01-01`,
      endDate: `${yearNumber}-12-31`,
      status: FiscalYearStatus.OPEN,
    });
    return this.repo.save(year);
  }

  async close(id: string, userId?: string): Promise<FiscalYear> {
    const year = await this.findOne(id);
    if (year.status === FiscalYearStatus.CLOSED) {
      throw new BadRequestException(`السنة المالية ${year.yearNumber} مقفلة بالفعل`);
    }
    year.status = FiscalYearStatus.CLOSED;
    year.closedAt = new Date();
    year.closedBy = userId;
    return this.repo.save(year);
  }

  async reopen(id: string): Promise<FiscalYear> {
    const year = await this.findOne(id);
    if (year.status === FiscalYearStatus.OPEN) {
      throw new BadRequestException(`السنة المالية ${year.yearNumber} مفتوحة بالفعل`);
    }
    year.status = FiscalYearStatus.OPEN;
    year.closedAt = null;
    year.closedBy = null;
    return this.repo.save(year);
  }
}
