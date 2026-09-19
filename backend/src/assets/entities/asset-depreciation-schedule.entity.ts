import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FixedAsset } from './fixed-asset.entity';
import { JournalEntry } from '../../accounting/entities/journal-entry.entity';
import { AccrualPeriodStatus } from '../../common/enums';
import { DecimalColumnTransformer } from '../../common/transformers/decimal.transformer';

@Entity('asset_depreciation_schedule')
export class AssetDepreciationSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => FixedAsset, (asset) => asset.schedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assetId' })
  asset: FixedAsset;

  @Column()
  assetId: string;

  @Column()
  periodLabel: string;

  @Column({ type: 'date' })
  periodStart: string;

  @Column({ type: 'date' })
  periodEnd: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: new DecimalColumnTransformer() })
  depreciationAmount: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: new DecimalColumnTransformer() })
  accumulatedDepreciation: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: new DecimalColumnTransformer() })
  bookValue: number;

  @Column({ type: 'enum', enum: AccrualPeriodStatus, default: AccrualPeriodStatus.PENDING })
  status: AccrualPeriodStatus;

  @ManyToOne(() => JournalEntry, { nullable: true })
  journalEntry?: JournalEntry | null;

  @Column({ nullable: true })
  journalEntryId?: string;
}
