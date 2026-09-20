import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { PolicyCategory } from '../../common/enums';

/**
 * فهرس مرجعي (بيانات وصفية فقط) لدليل السياسات المحاسبية ودليل الإجراءات
 * ودليل المعايير (IPSAS/IAS/RPG) والنماذج المعتمدة. لا يخزّن الملفات الفعلية
 * في هذه المرحلة — مرجع سريع لعنوان/رمز كل وثيقة رسمية.
 */
@Entity('policy_documents')
export class PolicyDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PolicyCategory })
  category: PolicyCategory;

  @Column({ type: 'varchar', nullable: true })
  code?: string | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;
}
