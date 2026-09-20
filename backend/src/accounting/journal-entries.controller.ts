import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JournalEntryStatus, JournalSourceType, UserRole } from '../common/enums';
import { JournalEntriesService } from './journal-entries.service';
import { CreateManualJournalEntryDto } from './dto/journal-entry.dto';

@UseGuards(JwtAuthGuard)
@Controller('journal-entries')
export class JournalEntriesController {
  constructor(private readonly service: JournalEntriesService) {}

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
