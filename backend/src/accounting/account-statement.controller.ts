import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccountStatementService } from './account-statement.service';
import { ReportsExportService } from './reports-export.service';
import { sendReportFile } from './export-response.util';

@UseGuards(JwtAuthGuard)
@Controller('reports/account-statement')
export class AccountStatementController {
  constructor(
    private readonly service: AccountStatementService,
    private readonly exportService: ReportsExportService,
  ) {}

  @Get('export')
  async export(
    @Res() res: Response,
    @Query('accountId') accountId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format: 'xlsx' | 'pdf' = 'xlsx',
  ) {
    const statement = await this.service.getStatement(accountId, from, to);
    const buffer = format === 'pdf' ? await this.exportService.accountStatementToPdf(statement) : await this.exportService.accountStatementToExcel(statement);
    sendReportFile(res, buffer, format, 'account-statement');
  }

  @Get()
  get(@Query('accountId') accountId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getStatement(accountId, from, to);
  }
}
