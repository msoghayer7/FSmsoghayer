import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AssetStatus, DepreciationMethod } from '../../common/enums';
import { AssetCategory } from './asset-category.entity';
import { BusinessPartner } from '../../organization/entities/business-partner.entity';
import { Department } from '../../organization/entities/department.entity';
import { Account } from '../../accounting/entities/account.entity';
import { JournalEntry } from '../../accounting/entities/journal-entry.entity';
import { DecimalColumnTransformer } from '../../common/transformers/decimal.transformer';
import { AssetDepreciationSchedule } from './asset-depreciation-schedule.entity';

@Entity('fixed_assets')
export class FixedAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  assetNumber: string;

  @Column()
  name: string;

  @ManyToOne(() => AssetCategory, { eager: true })
  @JoinColumn({ name: 'categoryId' })
  category: AssetCategory;

  @Column()
  categoryId: string;

  @ManyToOne(() => BusinessPartner, { nullable: true })
  vendor?: BusinessPartner | null;

  @Column({ nullable: true })
  vendorId?: string;

  @Column({ type: 'date' })
  acquisitionDate: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: new DecimalColumnTransformer() })
  acquisitionCost: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0, transformer: new DecimalColumnTransformer() })
  salvageValue: number;

  @Column()
  usefulLifeMonths: number;

  @Column({ type: 'enum', enum: DepreciationMethod, default: DepreciationMethod.STRAIGHT_LINE })
  depreciationMethod: DepreciationMethod;

  @ManyToOne(() => Department, { nullable: true })
  department?: Department | null;

  @Column({ nullable: true })
  departmentId?: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ type: 'enum', enum: AssetStatus, default: AssetStatus.ACTIVE })
  status: AssetStatus;

  @Column()
  assetAccountId: string;

  @Column()
  depreciationExpenseAccountId: string;

  @Column()
  accumulatedDepreciationAccountId: string;

  @ManyToOne(() => JournalEntry, { nullable: true })
  acquisitionJournalEntry?: JournalEntry | null;

  @Column({ nullable: true })
  acquisitionJournalEntryId?: string;

  @Column({ type: 'date', nullable: true })
  disposalDate?: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true, transformer: new DecimalColumnTransformer() })
  disposalProceeds?: number | null;

  @ManyToOne(() => JournalEntry, { nullable: true })
  disposalJournalEntry?: JournalEntry | null;

  @Column({ nullable: true })
  disposalJournalEntryId?: string;

  @OneToMany(() => AssetDepreciationSchedule, (schedule) => schedule.asset, { cascade: true, eager: true })
  schedule: AssetDepreciationSchedule[];

  @CreateDateColumn()
  createdAt: Date;
}
