import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

const CAN_MANAGE_CONTRACTS = [UserRole.ADMIN, UserRole.FINANCE_MANAGER, UserRole.PROCUREMENT];

@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_CONTRACTS)
  @Post()
  create(@Body() dto: CreateContractDto) {
    return this.service.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_CONTRACTS)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_CONTRACTS)
  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_CONTRACTS)
  @Post(':id/renew')
  renew(@Param('id') id: string, @Body() body: { newEndDate: string; newTotalValue?: number }) {
    return this.service.renew(id, body.newEndDate, body.newTotalValue);
  }

  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_CONTRACTS)
  @Post(':id/terminate')
  terminate(@Param('id') id: string) {
    return this.service.terminate(id);
  }
}
