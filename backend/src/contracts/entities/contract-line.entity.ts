import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Contract } from './contract.entity';
import { DecimalColumnTransformer } from '../../common/transformers/decimal.transformer';

@Entity('contract_lines')
export class ContractLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Contract, (contract) => contract.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contractId' })
  contract: Contract;

  @Column()
  contractId: string;

  @Column()
  description: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 1, transformer: new DecimalColumnTransformer() })
  quantity: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: new DecimalColumnTransformer() })
  unitPrice: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: new DecimalColumnTransformer() })
  amount: number;
}
