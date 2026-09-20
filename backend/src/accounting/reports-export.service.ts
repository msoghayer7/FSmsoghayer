import { Injectable, OnModuleDestroy } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { chromium, type Browser } from 'playwright';
import type { TrialBalanceRow } from './trial-balance.service';
import type { AccountStatement } from './account-statement.service';
import type { JournalEntry } from './entities/journal-entry.entity';

/**
 * Renders report data (already computed by the report services) to
 * downloadable Excel/PDF buffers.
 *
 * PDFs are rendered via a headless Chromium page rather than a low-level PDF
 * library (e.g. pdfkit): Arabic text needs bidi reordering and contextual
 * letter shaping (initial/medial/final forms) to display correctly, and
 * only a real browser text-layout engine does that out of the box.
 */
@Injectable()
export class ReportsExportService implements OnModuleDestroy {
  private browserPromise: Promise<Browser> | null = null;

  async onModuleDestroy() {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      await browser.close();
    }
  }

  private getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = chromium.launch();
    }
    return this.browserPromise;
  }

  private async htmlToPdf(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'networkidle' });
      return await page.pdf({ format: 'A4', landscape: true, margin: { top: '16mm', bottom: '16mm', left: '10mm', right: '10mm' } });
    } finally {
      await page.close();
    }
  }

  private pageShell(title: string, body: string): string {
    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; color: #1f2937; }
  h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
  p.meta { text-align: center; color: #6b7280; font-size: 11px; margin-top: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #d1d5db; padding: 4px 8px; text-align: right; }
  th { background: #eef1f4; }
  tfoot td { font-weight: bold; background: #f8fafc; }
  .num { text-align: left; font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
  <h1>${title}</h1>
  ${body}
</body>
</html>`;
  }

  async trialBalanceToExcel(rows: TrialBalanceRow[], level: number): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`ميزان المراجعة - مستوى ${level}`, { views: [{ rightToLeft: true }] });
    sheet.columns = [
      { header: 'الكود', key: 'code', width: 16 },
      { header: 'اسم الحساب', key: 'name', width: 45 },
      { header: 'مدين', key: 'debit', width: 16 },
      { header: 'دائن', key: 'credit', width: 16 },
      { header: 'الرصيد', key: 'balance', width: 16 },
    ];
    sheet.getRow(1).font = { bold: true };
    rows.forEach((r) => sheet.addRow(r));
    const totalRow = sheet.addRow({
      code: '',
      name: 'الإجمالي',
      debit: rows.reduce((s, r) => s + r.debit, 0),
      credit: rows.reduce((s, r) => s + r.credit, 0),
      balance: '',
    });
    totalRow.font = { bold: true };
    sheet.getColumn('debit').numFmt = '#,##0.00';
    sheet.getColumn('credit').numFmt = '#,##0.00';
    sheet.getColumn('balance').numFmt = '#,##0.00';

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  trialBalanceToPdf(rows: TrialBalanceRow[], level: number): Promise<Buffer> {
    const body = `
      <p class="meta">المستوى ${level}</p>
      <table>
        <thead><tr><th>الكود</th><th>اسم الحساب</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead>
        <tbody>
          ${rows.map((r) => `<tr><td>${r.code}</td><td>${r.name}</td><td class="num">${r.debit.toFixed(2)}</td><td class="num">${r.credit.toFixed(2)}</td><td class="num">${r.balance.toFixed(2)}</td></tr>`).join('')}
        </tbody>
        <tfoot>
          <tr><td></td><td>الإجمالي</td><td class="num">${rows.reduce((s, r) => s + r.debit, 0).toFixed(2)}</td><td class="num">${rows.reduce((s, r) => s + r.credit, 0).toFixed(2)}</td><td></td></tr>
        </tfoot>
      </table>`;
    return this.htmlToPdf(this.pageShell('ميزان المراجعة', body));
  }

  async accountStatementToExcel(statement: AccountStatement): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`كشف حساب ${statement.account.code}`, { views: [{ rightToLeft: true }] });
    sheet.addRow([`الحساب: ${statement.account.code} - ${statement.account.name}`]);
    sheet.addRow([`الفترة: ${statement.from ?? 'البداية'} → ${statement.to ?? 'الآن'}`]);
    sheet.addRow([]);
    sheet.addRow(['', '', '', 'الرصيد الافتتاحي', statement.openingBalance]);
    const headerRow = sheet.addRow(['رقم القيد', 'التاريخ', 'البيان', 'مدين', 'دائن', 'الرصيد المتحرك']);
    headerRow.font = { bold: true };
    statement.lines.forEach((l) => sheet.addRow([l.entryNumber, l.entryDate, l.description, l.debit, l.credit, l.runningBalance]));
    sheet.addRow(['', '', '', '', 'الرصيد الختامي', statement.closingBalance]).font = { bold: true };
    sheet.columns.forEach((c) => (c.width = 22));

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  accountStatementToPdf(statement: AccountStatement): Promise<Buffer> {
    const body = `
      <p class="meta">${statement.account.code} - ${statement.account.name} | الفترة: ${statement.from ?? 'البداية'} → ${statement.to ?? 'الآن'}</p>
      <table>
        <thead><tr><th>رقم القيد</th><th>التاريخ</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead>
        <tbody>
          <tr><td></td><td></td><td>رصيد افتتاحي</td><td></td><td></td><td class="num">${statement.openingBalance.toFixed(2)}</td></tr>
          ${statement.lines.map((l) => `<tr><td>${l.entryNumber}</td><td>${l.entryDate}</td><td>${l.description}</td><td class="num">${l.debit.toFixed(2)}</td><td class="num">${l.credit.toFixed(2)}</td><td class="num">${l.runningBalance.toFixed(2)}</td></tr>`).join('')}
        </tbody>
        <tfoot>
          <tr><td></td><td></td><td>رصيد ختامي</td><td></td><td></td><td class="num">${statement.closingBalance.toFixed(2)}</td></tr>
        </tfoot>
      </table>`;
    return this.htmlToPdf(this.pageShell('كشف حساب', body));
  }

  async journalEntriesToExcel(entries: JournalEntry[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('القيود اليومية', { views: [{ rightToLeft: true }] });
    sheet.columns = [
      { header: 'رقم القيد', key: 'entryNumber', width: 20 },
      { header: 'التاريخ', key: 'entryDate', width: 14 },
      { header: 'البيان', key: 'description', width: 40 },
      { header: 'الحساب', key: 'account', width: 40 },
      { header: 'مدين', key: 'debit', width: 16 },
      { header: 'دائن', key: 'credit', width: 16 },
      { header: 'الحالة', key: 'status', width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const entry of entries) {
      for (const line of entry.lines) {
        sheet.addRow({
          entryNumber: entry.entryNumber,
          entryDate: entry.entryDate,
          description: entry.description,
          account: `${line.account.code} - ${line.account.name}`,
          debit: Number(line.debit),
          credit: Number(line.credit),
          status: entry.status === 'POSTED' ? 'مرحّل' : 'مسودة',
        });
      }
    }
    sheet.getColumn('debit').numFmt = '#,##0.00';
    sheet.getColumn('credit').numFmt = '#,##0.00';

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  journalEntriesToPdf(entries: JournalEntry[]): Promise<Buffer> {
    const rows: string[] = [];
    for (const entry of entries) {
      for (const line of entry.lines) {
        rows.push(
          `<tr><td>${entry.entryNumber}</td><td>${entry.entryDate}</td><td>${line.account.code} - ${line.account.name}</td><td class="num">${Number(line.debit).toFixed(2)}</td><td class="num">${Number(line.credit).toFixed(2)}</td><td>${entry.status === 'POSTED' ? 'مرحّل' : 'مسودة'}</td></tr>`,
        );
      }
    }
    const body = `
      <table>
        <thead><tr><th>رقم القيد</th><th>التاريخ</th><th>الحساب</th><th>مدين</th><th>دائن</th><th>الحالة</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>`;
    return this.htmlToPdf(this.pageShell('سجل القيود اليومية', body));
  }
}
