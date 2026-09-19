import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BusinessPartnersService } from './business-partners.service';
import { BusinessPartner } from './entities/business-partner.entity';

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

  @Post()
  create(@Body() body: Partial<BusinessPartner>) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<BusinessPartner>) {
    return this.service.update(id, body);
  }
}
