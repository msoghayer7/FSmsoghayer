import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { BusinessPartnersService } from './business-partners.service';
import { BusinessPartner } from './entities/business-partner.entity';

const CAN_MANAGE_PARTNERS = [UserRole.ADMIN, UserRole.FINANCE_MANAGER, UserRole.ACCOUNTANT, UserRole.PROCUREMENT];

@UseGuards(JwtAuthGuard)
@Controller('business-partners')
export class BusinessPartnersController {
  constructor(private readonly service: BusinessPartnersService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_PARTNERS)
  @Post()
  create(@Body() body: Partial<BusinessPartner>) {
    return this.service.create(body);
  }

  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_PARTNERS)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<BusinessPartner>) {
    return this.service.update(id, body);
  }
}
