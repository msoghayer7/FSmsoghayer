import { Body, Controller, Get, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JournalEntryStatus, JournalSourceType, UserRole } from '../common/enums';
import { JournalEntriesService } from './journal-entries.service';
import { CreateManualJournalEntryDto } from './dto/journal-entry.dto';
import { ReportsExportService } from './reports-export.service';
import { sendReportFile } from './export-response.util';
import { JournalEntriesImportService } from './journal-entries-import.service';

@UseGuards(JwtAuthGuard)
@Controller('journal-entries')
export class JournalEntriesController {
  constructor(
    private readonly service: JournalEntriesService,
    private readonly exportService: ReportsExportService,
    private readonly importService: JournalEntriesImportService,
  ) {}

  @Get('export')
  async export(@Res() res: Response, @Query('status') status?: JournalEntryStatus, @Query('format') format: 'xlsx' | 'pdf' = 'xlsx') {
    const entries = await this.service.findAll(status);
    const buffer = format === 'pdf' ? await this.exportService.journalEntriesToPdf(entries) : await this.exportService.journalEntriesToExcel(entries);
    sendReportFile(res, buffer, format, 'journal-entries');
  }

  @Get('import/template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.importService.buildTemplate();
    sendReportFile(res, buffer, 'xlsx', 'journal-entries-template');
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FINANCE_MANAGER, UserRole.ACCOUNTANT)
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importFile(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: { userId: string }) {
    return this.importService.importFromBuffer(file.buffer, user?.userId);
  }

  @Get()
  findAll(@Query('status') status?: JournalEntryStatus) {
    return this.service.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** ينشئ قيدًا يدويًا بحالة "مسودة" — لا يُرحّل إلا بعد اعتماده عبر /journal-entries/:id/approve */
  @Post('manual')
  createManual(@Body() dto: CreateManualJournalEntryDto, @CurrentUser() user: { userId: string }) {
    return this.service.create({
      ...dto,
      sourceType: JournalSourceType.MANUAL,
      createdBy: user?.userId,
    });
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FINANCE_MANAGER)
  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.service.approve(id, user?.userId);
  }
}
