import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DepreciationMethod } from '../../common/enums';
import { Account } from '../../accounting/entities/account.entity';

@Entity('asset_categories')
export class AssetCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ default: 60 })
  defaultUsefulLifeMonths: number;

  @Column({ type: 'enum', enum: DepreciationMethod, default: DepreciationMethod.STRAIGHT_LINE })
  defaultDepreciationMethod: DepreciationMethod;

  @ManyToOne(() => Account, { eager: true })
  @JoinColumn({ name: 'assetAccountId' })
  assetAccount: Account;

  @Column()
  assetAccountId: string;

  @ManyToOne(() => Account, { eager: true })
  @JoinColumn({ name: 'depreciationExpenseAccountId' })
  depreciationExpenseAccount: Account;

  @Column()
  depreciationExpenseAccountId: string;

  @ManyToOne(() => Account, { eager: true })
  @JoinColumn({ name: 'accumulatedDepreciationAccountId' })
  accumulatedDepreciationAccount: Account;

  @Column()
  accumulatedDepreciationAccountId: string;
}
