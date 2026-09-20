import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { JournalEntriesService } from './journal-entries.service';
import { AccountsService } from './accounts.service';
import { JournalSourceType } from '../common/enums';

const TEMPLATE_HEADERS = ['رقم المرجع', 'التاريخ (YYYY-MM-DD)', 'كود الحساب', 'مدين', 'دائن', 'البيان'];

export interface ImportRowError {
  referenceGroup: string;
  message: string;
}

export interface ImportResult {
  createdCount: number;
  created: { referenceGroup: string; entryId: string; entryNumber: string }[];
  errors: ImportRowError[];
}

interface ParsedRow {
  referenceGroup: string;
  entryDate: string;
  accountCode: string;
  debit: number;
  credit: number;
  description: string;
}

/** استيراد قيود يومية بالجملة من ملف Excel: كل الأسطر التي تشترك في نفس "رقم المرجع" تُجمع في قيد واحد، يُنشأ كمسودة بانتظار الاعتماد. */
@Injectable()
export class JournalEntriesImportService {
  constructor(
    private readonly journalEntries: JournalEntriesService,
    private readonly accounts: AccountsService,
  ) {}

  async buildTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('قيود يومية', { views: [{ rightToLeft: true }] });
    sheet.columns = TEMPLATE_HEADERS.map((header) => ({ header, width: 24 }));
    sheet.getRow(1).font = { bold: true };
    sheet.addRow(['REF-0001', '2026-01-15', '311111001', 1000, '', 'مثال: مدين نقدية']);
    sheet.addRow(['REF-0001', '2026-01-15', '411110001', '', 1000, 'مثال: دائن ذمم دائنة']);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async importFromBuffer(buffer: Buffer, userId?: string): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];

    const rows: ParsedRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const [, referenceGroup, entryDate, accountCode, debit, credit, description] = row.values as unknown[];
      if (!referenceGroup && !accountCode) return;
      rows.push({
        referenceGroup: String(referenceGroup ?? '').trim(),
        entryDate: this.normalizeDate(entryDate),
        accountCode: String(accountCode ?? '').trim(),
        debit: Number(debit) || 0,
        credit: Number(credit) || 0,
        description: String(description ?? '').trim(),
      });
    });

    const groups = new Map<string, ParsedRow[]>();
    for (const row of rows) {
      if (!row.referenceGroup) continue;
      const list = groups.get(row.referenceGroup) ?? [];
      list.push(row);
      groups.set(row.referenceGroup, list);
    }

    const result: ImportResult = { createdCount: 0, created: [], errors: [] };

    for (const [referenceGroup, groupRows] of groups) {
      try {
        const lines = await Promise.all(
          groupRows.map(async (row) => {
            const account = await this.accounts.findByCode(row.accountCode);
            if (!account) {
              throw new Error(`لا يوجد حساب بالكود ${row.accountCode}`);
            }
            return {
              accountId: account.id,
              debit: row.debit,
              credit: row.credit,
              description: row.description || undefined,
            };
          }),
        );

        const entryDate = groupRows.find((r) => r.entryDate)?.entryDate;
        if (!entryDate) {
          throw new Error('لا يوجد تاريخ صالح لهذا القيد');
        }
        const description = groupRows.find((r) => r.description)?.description ?? `قيد مستورد - ${referenceGroup}`;

        const entry = await this.journalEntries.create({
          entryDate,
          description,
          sourceType: JournalSourceType.MANUAL_IMPORT,
          createdBy: userId,
          lines,
        });

        result.createdCount += 1;
        result.created.push({ referenceGroup, entryId: entry.id, entryNumber: entry.entryNumber });
      } catch (err) {
        result.errors.push({ referenceGroup, message: err instanceof Error ? err.message : 'خطأ غير معروف' });
      }
    }

    return result;
  }

  private normalizeDate(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    const str = String(value ?? '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : '';
  }
}
