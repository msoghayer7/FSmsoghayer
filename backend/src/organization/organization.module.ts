import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from './entities/department.entity';
import { BusinessPartner } from './entities/business-partner.entity';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { BusinessPartnersService } from './business-partners.service';
import { BusinessPartnersController } from './business-partners.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Department, BusinessPartner])],
  providers: [DepartmentsService, BusinessPartnersService],
  controllers: [DepartmentsController, BusinessPartnersController],
  exports: [TypeOrmModule, DepartmentsService, BusinessPartnersService],
})
export class OrganizationModule {}
