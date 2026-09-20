import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AccountBalanceSide, AccountType } from '../../common/enums';

@Entity('gl_accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  /** 1 = أعلى مستوى (الإيرادات/المصروفات/الأصول...) وحتى 7 = الحساب التفصيلي، حسب دليل الحساب الحكومي الموحد. */
  @Column()
  level: number;

  @Column({ type: 'varchar', nullable: true })
  parentCode?: string | null;

  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: Account | null;

  @Column({ type: 'varchar', nullable: true })
  parentId?: string | null;

  @Column({ type: 'enum', enum: AccountType })
  type: AccountType;

  @Column({ type: 'enum', enum: AccountBalanceSide, default: AccountBalanceSide.OTHER })
  balanceSide: AccountBalanceSide;

  /** حساب تفصيلي (فرعي) قابل للترحيل عليه مباشرة، أم حساب تجميعي لأغراض العرض/التقارير فقط. */
  @Column({ default: true })
  isPostable: boolean;

  @Column({ type: 'varchar', nullable: true })
  statementType?: string | null;

  /** أكواد كل الأسلاف من المستوى الأول وحتى هذا الحساب (بالترتيب)، لتسريع تجميع ميزان المراجعة حسب المستوى. */
  @Column('text', { array: true, default: '{}' })
  path: string[];

  /** تفعيل/إيقاف الحساب دون حذفه، نظرًا للعدد الكبير من الحسابات في الدليل الحكومي الموحد. */
  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  allowManualEntries: boolean;
}
