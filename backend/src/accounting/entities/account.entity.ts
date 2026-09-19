import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AccountType } from '../../common/enums';

@Entity('gl_accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AccountType })
  type: AccountType;

  @ManyToOne(() => Account, { nullable: true })
  parent?: Account | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  allowManualEntries: boolean;
}
