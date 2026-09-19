import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExpenseRecognitionMethod, ExpenseStatus } from '../../common/enums';
import { Contract } from '../../contracts/entities/contract.entity';
import { BusinessPartner } from '../../organization/entities/business-partner.entity';
import { Department } from '../../organization/entities/department.entity';
import { Account } from '../../accounting/entities/account.entity';
import { JournalEntry } from '../../accounting/entities/journal-entry.entity';
import { DecimalColumnTransformer } from '../../common/transformers/decimal.transformer';
import { ExpenseAccrualSchedule } from './expense-accrual-schedule.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  expenseNumber: string;

  @ManyToOne(() => Contract, { nullable: true })
  @JoinColumn({ name: 'contractId' })
  contract?: Contract | null;

  @Column({ nullable: true })
  contractId?: string;

  @ManyToOne(() => BusinessPartner, { eager: true })
  @JoinColumn({ name: 'partnerId' })
  partner: BusinessPartner;

  @Column()
  partnerId: string;

  @Column()
  description: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: new DecimalColumnTransformer() })
  totalAmount: number;

  @Column({ default: 'SAR' })
  currency: string;

  @Column({ nullable: true })
  invoiceNumber?: string;

  @Column({ type: 'date' })
  invoiceDate: string;

  @Column({ type: 'date' })
  accrualStartDate: string;

  @Column({ type: 'date' })
  accrualEndDate: string;

  @Column({ type: 'enum', enum: ExpenseRecognitionMethod })
  recognitionMethod: ExpenseRecognitionMethod;

  @ManyToOne(() => Account, { eager: true })
  @JoinColumn({ name: 'expenseAccountId' })
  expenseAccount: Account;

  @Column()
  expenseAccountId: string;

  @ManyToOne(() => Account, { nullable: true })
  prepaidAccount?: Account | null;

  @Column({ nullable: true })
  prepaidAccountId?: string;

  @ManyToOne(() => Account, { nullable: true })
  payableAccount?: Account | null;

  @Column({ nullable: true })
  payableAccountId?: string;

  @ManyToOne(() => Department, { nullable: true })
  department?: Department | null;

  @Column({ nullable: true })
  departmentId?: string;

  @Column({ type: 'enum', enum: ExpenseStatus, default: ExpenseStatus.DRAFT })
  status: ExpenseStatus;

  @ManyToOne(() => JournalEntry, { nullable: true })
  initialJournalEntry?: JournalEntry | null;

  @Column({ nullable: true })
  initialJournalEntryId?: string;

  @OneToMany(() => ExpenseAccrualSchedule, (schedule) => schedule.expense, { cascade: true, eager: true })
  schedule: ExpenseAccrualSchedule[];

  @CreateDateColumn()
  createdAt: Date;
}
