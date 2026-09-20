import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Reconciliation } from './reconciliation.entity';
import { DecimalColumnTransformer } from '../../common/transformers/decimal.transformer';

/** بند تسوية يفسّر جزءًا من الفرق بين رصيد الدفاتر والرصيد الخارجي (مثال: شيكات معلقة، إيداعات لم تظهر بعد). */
@Entity('reconciliation_items')
export class ReconciliationItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Reconciliation, (r) => r.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reconciliationId' })
  reconciliation: Reconciliation;

  @Column()
  reconciliationId: string;

  @Column()
  description: string;

  /** موجب يزيد رصيد الدفاتر نحو الرصيد الخارجي، سالب ينقصه. */
  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: new DecimalColumnTransformer() })
  amount: number;
}
