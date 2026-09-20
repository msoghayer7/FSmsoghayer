import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';
import { ReconciliationService } from './reconciliation.service';
import { CreateReconciliationDto, AddReconciliationItemDto } from './dto/create-reconciliation.dto';

const CAN_EDIT_RECONCILIATIONS = [UserRole.ADMIN, UserRole.FINANCE_MANAGER, UserRole.ACCOUNTANT];
const CAN_FINALIZE_RECONCILIATIONS = [UserRole.ADMIN, UserRole.FINANCE_MANAGER];

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

  @UseGuards(RolesGuard)
  @Roles(...CAN_EDIT_RECONCILIATIONS)
  @Post()
  create(@Body() dto: CreateReconciliationDto) {
    return this.service.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(...CAN_EDIT_RECONCILIATIONS)
  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: AddReconciliationItemDto) {
    return this.service.addItem(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(...CAN_EDIT_RECONCILIATIONS)
  @Delete(':id/items/:itemId')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.service.removeItem(id, itemId);
  }

  @UseGuards(RolesGuard)
  @Roles(...CAN_FINALIZE_RECONCILIATIONS)
  @Post(':id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.service.complete(id, user?.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(...CAN_FINALIZE_RECONCILIATIONS)
  @Post(':id/reopen')
  reopen(@Param('id') id: string) {
    return this.service.reopen(id);
  }
}
