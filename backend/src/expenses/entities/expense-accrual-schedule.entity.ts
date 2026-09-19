import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Expense } from './expense.entity';
import { JournalEntry } from '../../accounting/entities/journal-entry.entity';
import { AccrualPeriodStatus } from '../../common/enums';
import { DecimalColumnTransformer } from '../../common/transformers/decimal.transformer';

@Entity('expense_accrual_schedule')
export class ExpenseAccrualSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Expense, (expense) => expense.schedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'expenseId' })
  expense: Expense;

  @Column()
  expenseId: string;

  @Column()
  periodLabel: string;

  @Column({ type: 'date' })
  periodStart: string;

  @Column({ type: 'date' })
  periodEnd: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: new DecimalColumnTransformer() })
  amount: number;

  @Column({ type: 'enum', enum: AccrualPeriodStatus, default: AccrualPeriodStatus.PENDING })
  status: AccrualPeriodStatus;

  @ManyToOne(() => JournalEntry, { nullable: true })
  journalEntry?: JournalEntry | null;

  @Column({ nullable: true })
  journalEntryId?: string;
}
