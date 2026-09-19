import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateFixedAssetDto {
  @IsString()
  name: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsDateString()
  acquisitionDate: string;

  @IsNumber()
  @Min(0.01)
  acquisitionCost: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salvageValue?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usefulLifeMonths?: number;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class CreateAssetCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultUsefulLifeMonths?: number;

  @IsString()
  assetAccountId: string;

  @IsString()
  depreciationExpenseAccountId: string;

  @IsString()
  accumulatedDepreciationAccountId: string;
}

export class DisposeAssetDto {
  @IsDateString()
  disposalDate: string;

  @IsNumber()
  @Min(0)
  proceeds: number;
}
