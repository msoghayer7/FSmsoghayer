import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** سجل واحد فقط يحمل بيانات المنشأة العامة (اسم الجهة، العنوان...). السنوات المالية تُدار عبر fiscal_years. */
@Entity('entity_profile')
export class EntityProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'اسم الجهة' })
  entityName: string;

  @Column({ nullable: true })
  entityNumber?: string;

  /** عملة النظام ثابتة: الريال السعودي. */
  @Column({ default: 'SAR' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
