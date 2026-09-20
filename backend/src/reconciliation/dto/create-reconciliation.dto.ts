import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ReconciliationType } from '../../common/enums';

export class CreateReconciliationDto {
  @IsEnum(ReconciliationType)
  type: ReconciliationType;

  @IsString()
  accountId: string;

  @IsString()
  referenceLabel: string;

  @IsDateString()
  periodEnd: string;

  @IsNumber()
  externalBalance: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddReconciliationItemDto {
  @IsString()
  description: string;

  @IsNumber()
  amount: number;
}
