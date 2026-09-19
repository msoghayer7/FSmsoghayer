import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from './entities/contract.entity';
import { ContractLine } from './entities/contract-line.entity';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Contract, ContractLine])],
  providers: [ContractsService],
  controllers: [ContractsController],
  exports: [TypeOrmModule, ContractsService],
})
export class ContractsModule {}
