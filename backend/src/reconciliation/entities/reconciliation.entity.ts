import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReconciliationStatus, ReconciliationType } from '../../common/enums';
import { Account } from '../../accounting/entities/account.entity';
import { DecimalColumnTransformer } from '../../common/transformers/decimal.transformer';
import { ReconciliationItem } from './reconciliation-item.entity';

/** مطابقة رصيد حساب (بنكي، دائنين/مدينين، أو بين جهات) مع مصدر خارجي (كشف بنكي، مصادقة طرف آخر...). */
@Entity('reconciliations')
export class Reconciliation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  reconciliationNumber: string;

  @Column({ type: 'enum', enum: ReconciliationType })
  type: ReconciliationType;

  @ManyToOne(() => Account, { eager: true })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column()
  accountId: string;

  /** اسم الطرف الآخر: البنك، المورد/العميل، أو الجهة الحكومية الأخرى. */
  @Column()
  referenceLabel: string;

  @Column({ type: 'date' })
  periodEnd: string;

  /** رصيد دفتر الأستاذ المحسوب تلقائيًا حتى تاريخ الفترة (لحظة الإنشاء). */
  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: new DecimalColumnTransformer() })
  glBalance: number;

  /** الرصيد الخارجي المُدخل يدويًا (كشف حساب البنك، أو مصادقة الطرف الآخر). */
  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: new DecimalColumnTransformer() })
  externalBalance: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'enum', enum: ReconciliationStatus, default: ReconciliationStatus.DRAFT })
  status: ReconciliationStatus;

  @Column({ type: 'varchar', nullable: true })
  completedBy?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date | null;

  @OneToMany(() => ReconciliationItem, (item) => item.reconciliation, { cascade: true, eager: true })
  items: ReconciliationItem[];

  @CreateDateColumn()
  createdAt: Date;
}
