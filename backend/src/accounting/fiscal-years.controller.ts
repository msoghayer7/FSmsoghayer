import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';
import { FiscalYearsService } from './fiscal-years.service';

@UseGuards(JwtAuthGuard)
@Controller('fiscal-years')
export class FiscalYearsController {
  constructor(private readonly service: FiscalYearsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FINANCE_MANAGER)
  @Post()
  create(@Body() body: { yearNumber: number }) {
    return this.service.create(body.yearNumber);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FINANCE_MANAGER)
  @Post(':id/close')
  close(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.service.close(id, user?.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/reopen')
  reopen(@Param('id') id: string) {
    return this.service.reopen(id);
  }
}
