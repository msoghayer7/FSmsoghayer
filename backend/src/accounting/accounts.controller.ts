import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AccountType, UserRole } from '../common/enums';
import { AccountsService } from './accounts.service';
import { Account } from './entities/account.entity';

@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly service: AccountsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('postable')
  findPostable(@Query('type') type?: AccountType) {
    return this.service.findPostable(type);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: Partial<Account>) {
    return this.service.create(body);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FINANCE_MANAGER)
  @Patch(':id/active')
  setActive(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.service.setActive(id, body.isActive);
  }
}
