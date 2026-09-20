import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** سجل واحد فقط يحمل بيانات المنشأة العامة (اسم الجهة، السنة المالية...). */
@Entity('entity_profile')
export class EntityProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'اسم الجهة' })
  entityName: string;

  @Column({ nullable: true })
  entityNumber?: string;

  /** الشهر الذي تبدأ به السنة المالية (1 = يناير). */
  @Column({ default: 1 })
  fiscalYearStartMonth: number;

  @Column({ default: 'SAR' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
