import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TrialBalanceService } from './trial-balance.service';
import { ReportsExportService } from './reports-export.service';
import { sendReportFile } from './export-response.util';

@UseGuards(JwtAuthGuard)
@Controller('reports/trial-balance')
export class TrialBalanceController {
  constructor(
    private readonly service: TrialBalanceService,
    private readonly exportService: ReportsExportService,
  ) {}

  @Get('export')
  async export(
    @Res() res: Response,
    @Query('level') level = '7',
    @Query('hideZero') hideZero = 'true',
    @Query('format') format: 'xlsx' | 'pdf' = 'xlsx',
  ) {
    const rows = await this.service.getTrialBalance(Number(level), hideZero !== 'false');
    const buffer = format === 'pdf' ? await this.exportService.trialBalanceToPdf(rows, Number(level)) : await this.exportService.trialBalanceToExcel(rows, Number(level));
    sendReportFile(res, buffer, format, 'trial-balance');
  }

  @Get()
  get(@Query('level') level = '7', @Query('hideZero') hideZero = 'true') {
    return this.service.getTrialBalance(Number(level), hideZero !== 'false');
  }
}
