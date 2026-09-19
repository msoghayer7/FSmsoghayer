import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JournalSourceType } from '../common/enums';
import { JournalEntriesService } from './journal-entries.service';
import { CreateManualJournalEntryDto } from './dto/journal-entry.dto';

@UseGuards(JwtAuthGuard)
@Controller('journal-entries')
export class JournalEntriesController {
  constructor(private readonly service: JournalEntriesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('manual')
  createManual(@Body() dto: CreateManualJournalEntryDto, @CurrentUser() user: { userId: string }) {
    return this.service.createAndPost({
      ...dto,
      sourceType: JournalSourceType.MANUAL,
      createdBy: user?.userId,
    });
  }
}
