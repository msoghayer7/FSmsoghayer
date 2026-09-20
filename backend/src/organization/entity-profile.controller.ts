import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { EntityProfileService } from './entity-profile.service';
import { EntityProfile } from './entities/entity-profile.entity';

@UseGuards(JwtAuthGuard)
@Controller('entity-profile')
export class EntityProfileController {
  constructor(private readonly service: EntityProfileService) {}

  @Get()
  get() {
    return this.service.get();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch()
  update(@Body() body: Partial<EntityProfile>) {
    return this.service.update(body);
  }
}
