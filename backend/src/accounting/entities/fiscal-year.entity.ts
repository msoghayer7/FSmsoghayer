import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { FiscalYearStatus } from '../../common/enums';

/** سنة مالية (تقويمية): من 1 يناير إلى 31 ديسمبر لنفس رقم السنة، ابتداءً من 2026. */
@Entity('fiscal_years')
export class FiscalYear {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  yearNumber: number;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'enum', enum: FiscalYearStatus, default: FiscalYearStatus.OPEN })
  status: FiscalYearStatus;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt?: Date | null;

  @Column({ type: 'varchar', nullable: true })
  closedBy?: string | null;
}
