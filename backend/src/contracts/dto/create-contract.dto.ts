import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { BillingFrequency, ContractType } from '../../common/enums';

class ContractLineDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateContractDto {
  @IsString()
  title: string;

  @IsString()
  partnerId: string;

  @IsEnum(ContractType)
  type: ContractType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Min(0)
  totalValue: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(BillingFrequency)
  billingFrequency: BillingFrequency;

  @IsOptional()
  @IsNumber()
  paymentTermsDays?: number;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  defaultExpenseAccountId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractLineDto)
  lines?: ContractLineDto[];
}
