import { JournalSourceType } from '../../common/enums';

export interface JournalLineInput {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
  departmentId?: string | null;
}

export interface CreateJournalEntryInput {
  entryDate: string;
  description: string;
  sourceType: JournalSourceType;
  sourceId?: string;
  createdBy?: string;
  lines: JournalLineInput[];
}

export class CreateManualJournalEntryDto implements Omit<CreateJournalEntryInput, 'sourceType'> {
  entryDate: string;
  description: string;
  sourceId?: string;
  createdBy?: string;
  lines: JournalLineInput[];
}
