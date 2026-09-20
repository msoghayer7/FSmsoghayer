import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { JournalSourceType } from '../../common/enums';

export class JournalLineDto {
  @IsString()
  accountId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  debit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  credit?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export type JournalLineInput = JournalLineDto;

export interface CreateJournalEntryInput {
  entryDate: string;
  description: string;
  sourceType: JournalSourceType;
  sourceId?: string;
  createdBy?: string;
  lines: JournalLineInput[];
}

export class CreateManualJournalEntryDto implements Omit<CreateJournalEntryInput, 'sourceType'> {
  @IsDateString()
  entryDate: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];
}
