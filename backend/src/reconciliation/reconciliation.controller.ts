import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReconciliationService } from './reconciliation.service';
import { CreateReconciliationDto, AddReconciliationItemDto } from './dto/create-reconciliation.dto';

@UseGuards(JwtAuthGuard)
@Controller('reconciliations')
export class ReconciliationController {
  constructor(private readonly service: ReconciliationService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateReconciliationDto) {
    return this.service.create(dto);
  }

  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: AddReconciliationItemDto) {
    return this.service.addItem(id, dto);
  }

  @Delete(':id/items/:itemId')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.service.removeItem(id, itemId);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.service.complete(id, user?.userId);
  }

  @Post(':id/reopen')
  reopen(@Param('id') id: string) {
    return this.service.reopen(id);
  }
}
