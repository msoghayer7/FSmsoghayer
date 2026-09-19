import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BillingFrequency, ContractStatus, ContractType } from '../../common/enums';
import { BusinessPartner } from '../../organization/entities/business-partner.entity';
import { Department } from '../../organization/entities/department.entity';
import { Account } from '../../accounting/entities/account.entity';
import { DecimalColumnTransformer } from '../../common/transformers/decimal.transformer';
import { ContractLine } from './contract-line.entity';

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  contractNumber: string;

  @Column()
  title: string;

  @ManyToOne(() => BusinessPartner, { eager: true })
  @JoinColumn({ name: 'partnerId' })
  partner: BusinessPartner;

  @Column()
  partnerId: string;

  @Column({ type: 'enum', enum: ContractType, default: ContractType.SERVICE })
  type: ContractType;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: new DecimalColumnTransformer() })
  totalValue: number;

  @Column({ default: 'SAR' })
  currency: string;

  @Column({ type: 'enum', enum: BillingFrequency, default: BillingFrequency.MONTHLY })
  billingFrequency: BillingFrequency;

  @Column({ default: 30 })
  paymentTermsDays: number;

  @Column({ default: false })
  autoRenew: boolean;

  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.DRAFT })
  status: ContractStatus;

  @ManyToOne(() => Department, { nullable: true })
  department?: Department | null;

  @Column({ nullable: true })
  departmentId?: string;

  @ManyToOne(() => Account, { nullable: true })
  defaultExpenseAccount?: Account | null;

  @Column({ nullable: true })
  defaultExpenseAccountId?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => ContractLine, (line) => line.contract, { cascade: true })
  lines: ContractLine[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
