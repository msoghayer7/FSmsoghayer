import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JournalEntryStatus, JournalSourceType } from '../../common/enums';
import { JournalEntryLine } from './journal-entry-line.entity';

@Entity('journal_entries')
export class JournalEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  entryNumber: string;

  @Column({ type: 'date' })
  entryDate: string;

  @Column()
  description: string;

  @Column({ type: 'enum', enum: JournalSourceType, default: JournalSourceType.MANUAL })
  sourceType: JournalSourceType;

  @Column({ nullable: true })
  sourceId?: string;

  @Column({ type: 'enum', enum: JournalEntryStatus, default: JournalEntryStatus.DRAFT })
  status: JournalEntryStatus;

  @Column({ nullable: true })
  createdBy?: string;

  @Column({ nullable: true })
  approvedBy?: string;

  @Column({ type: 'timestamptz', nullable: true })
  postedAt?: Date | null;

  @OneToMany(() => JournalEntryLine, (line) => line.journalEntry, { cascade: true })
  lines: JournalEntryLine[];

  @CreateDateColumn()
  createdAt: Date;
}
