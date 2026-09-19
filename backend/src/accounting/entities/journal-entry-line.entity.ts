import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DecimalColumnTransformer } from '../../common/transformers/decimal.transformer';
import { JournalEntry } from './journal-entry.entity';
import { Account } from './account.entity';
import { Department } from '../../organization/entities/department.entity';

@Entity('journal_entry_lines')
export class JournalEntryLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => JournalEntry, (entry) => entry.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'journalEntryId' })
  journalEntry: JournalEntry;

  @Column()
  journalEntryId: string;

  @ManyToOne(() => Account, { eager: true })
  account: Account;

  @Column()
  accountId: string;

  @ManyToOne(() => Department, { nullable: true })
  department?: Department | null;

  @Column({ nullable: true })
  departmentId?: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0, transformer: new DecimalColumnTransformer() })
  debit: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0, transformer: new DecimalColumnTransformer() })
  credit: number;

  @Column({ nullable: true })
  description?: string;
}
