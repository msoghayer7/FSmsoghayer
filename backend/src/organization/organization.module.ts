import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from './entities/department.entity';
import { BusinessPartner } from './entities/business-partner.entity';
import { EntityProfile } from './entities/entity-profile.entity';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { BusinessPartnersService } from './business-partners.service';
import { BusinessPartnersController } from './business-partners.controller';
import { EntityProfileService } from './entity-profile.service';
import { EntityProfileController } from './entity-profile.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Department, BusinessPartner, EntityProfile])],
  providers: [DepartmentsService, BusinessPartnersService, EntityProfileService],
  controllers: [DepartmentsController, BusinessPartnersController, EntityProfileController],
  exports: [TypeOrmModule, DepartmentsService, BusinessPartnersService],
})
export class OrganizationModule {}
