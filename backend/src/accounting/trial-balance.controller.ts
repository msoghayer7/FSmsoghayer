import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TrialBalanceService } from './trial-balance.service';

@UseGuards(JwtAuthGuard)
@Controller('reports/trial-balance')
export class TrialBalanceController {
  constructor(private readonly service: TrialBalanceService) {}

  @Get()
  get(@Query('level') level = '7', @Query('hideZero') hideZero = 'true') {
    return this.service.getTrialBalance(Number(level), hideZero !== 'false');
  }
}
