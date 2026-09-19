import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

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

  @Post()
  create(@Body() dto: CreateContractDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  @Post(':id/renew')
  renew(@Param('id') id: string, @Body() body: { newEndDate: string; newTotalValue?: number }) {
    return this.service.renew(id, body.newEndDate, body.newTotalValue);
  }

  @Post(':id/terminate')
  terminate(@Param('id') id: string) {
    return this.service.terminate(id);
  }
}
