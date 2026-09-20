import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PolicyCategory } from '../common/enums';
import { PolicyLibraryService } from './policy-library.service';

@UseGuards(JwtAuthGuard)
@Controller('policy-documents')
export class PolicyLibraryController {
  constructor(private readonly service: PolicyLibraryService) {}

  @Get()
  findAll(@Query('category') category?: PolicyCategory, @Query('search') search?: string) {
    return this.service.findAll(category, search);
  }
}
