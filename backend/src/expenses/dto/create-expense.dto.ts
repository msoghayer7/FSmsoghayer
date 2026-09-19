import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ExpenseRecognitionMethod } from '../../common/enums';

export class CreateExpenseDto {
  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsNumber()
  @Min(0.01)
  totalAmount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsDateString()
  invoiceDate: string;

  @IsDateString()
  accrualStartDate: string;

  @IsDateString()
  accrualEndDate: string;

  @IsEnum(ExpenseRecognitionMethod)
  recognitionMethod: ExpenseRecognitionMethod;

  @IsOptional()
  @IsString()
  expenseAccountId?: string;

  @IsOptional()
  @IsString()
  prepaidAccountId?: string;

  @IsOptional()
  @IsString()
  payableAccountId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
