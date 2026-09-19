import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateExpenseDto) {
    return this.service.create(dto);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.service.approve(id, user?.userId);
  }

  @Post(':id/schedule/:scheduleId/recognize')
  recognizePeriod(
    @Param('id') id: string,
    @Param('scheduleId') scheduleId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.recognizePeriod(id, scheduleId, user?.userId);
  }
}
